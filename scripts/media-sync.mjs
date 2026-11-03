#!/usr/bin/env node
// The songs and hook videos live in Cloudflare R2 (bucket fire-and-water-media,
// served at https://media.dgfisher.com), not in the app deploy. Each file is
// versioned by its content: src/data/media.json maps "fire-and-water.m4a" to a
// short hash the app appends as ?v=, so a replaced song gets a fresh URL and
// everything else caches for a year.
//
//   node scripts/media-sync.mjs           hash, write media.json, upload what changed
//   node scripts/media-sync.mjs --check   fail if media.json is stale (CI)
//   node scripts/media-sync.mjs --verify  fail unless every file answers at MEDIA_BASE (CI, before deploy)
//
// Uploads go through `wrangler r2 object put` (your `wrangler login`, or
// CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID), six at a time. Set WRANGLER
// to a wrangler.js path to skip npx's per-call registry check. The bucket
// keeps its own copy of media.json, so only new or changed files upload.
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  createReadStream,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { promisify } from 'node:util'

const ROOT = new URL('..', import.meta.url).pathname
const PUBLIC = join(ROOT, 'public')
const MANIFEST = join(ROOT, 'src/data/media.json')
const BUCKET = process.env.MEDIA_BUCKET ?? 'fire-and-water-media'
const BASE = process.env.MEDIA_BASE ?? 'https://media.dgfisher.com/'
const CONCURRENCY = Number(process.env.MEDIA_CONCURRENCY ?? 6)
const TYPES = { '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' }
const CACHE = 'public, max-age=31536000, immutable'
const run = promisify(execFile)

const extOf = (file) => file.slice(file.lastIndexOf('.'))

/** Every song and hook video under public/, as paths relative to it. */
function mediaFiles(dir = PUBLIC) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return mediaFiles(path)
    return TYPES[extOf(entry.name)] ? [relative(PUBLIC, path)] : []
  })
}

const hashOf = (path) =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex').slice(0, 10)))
      .on('error', reject)
  })

async function currentVersions() {
  const versions = {}
  for (const file of mediaFiles().sort())
    versions[file] = await hashOf(join(PUBLIC, file))
  return versions
}

const readManifest = () =>
  existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {}
const writeManifest = (versions) =>
  writeFileSync(MANIFEST, `${JSON.stringify(versions, null, 2)}\n`)

function wrangler(...args) {
  const [cmd, pre] = process.env.WRANGLER
    ? ['node', [process.env.WRANGLER]]
    : ['npx', ['-y', 'wrangler@4']]
  return run(cmd, [...pre, 'r2', 'object', ...args, '--remote'], {
    cwd: ROOT,
    maxBuffer: 16 * 1024 * 1024,
  })
}

/** What the bucket says it holds: its copy of media.json, or nothing yet. */
async function remoteVersions() {
  const out = join(mkdtempSync(join(tmpdir(), 'media-')), 'media.json')
  try {
    await wrangler('get', `${BUCKET}/media.json`, '--file', out)
    return JSON.parse(readFileSync(out, 'utf8'))
  } catch {
    return {}
  }
}

/** The bucket's own record, so the next sync only sends what changed. */
async function saveRecord(versions) {
  const record = join(mkdtempSync(join(tmpdir(), 'media-')), 'media.json')
  writeFileSync(record, JSON.stringify(versions, null, 2))
  await wrangler(
    'put',
    `${BUCKET}/media.json`,
    '--file',
    record,
    '--content-type',
    'application/json',
    '--cache-control',
    'no-cache'
  )
}

function upload(file) {
  const args = [
    'put',
    `${BUCKET}/${file}`,
    '--file',
    join(PUBLIC, file),
    '--content-type',
    TYPES[extOf(file)],
    '--cache-control',
    CACHE,
  ]
  // A song downloads under its own name; a hook only ever plays.
  if (!file.startsWith('hooks/'))
    args.push('--content-disposition', `attachment; filename="${file}"`)
  return wrangler(...args)
}

async function check() {
  const want = await currentVersions()
  const have = readManifest()
  const stale = Object.keys({ ...want, ...have }).filter(
    (file) => want[file] !== have[file]
  )
  if (stale.length) {
    console.error(
      `src/data/media.json is out of date for ${stale.length} file(s): ${stale.join(', ')}`
    )
    console.error('Run `pnpm media:sync` and commit src/data/media.json.')
    process.exit(1)
  }
  console.log(`media.json matches ${Object.keys(want).length} files`)
}

async function verify() {
  const versions = readManifest()
  const missing = []
  await Promise.all(
    Object.entries(versions).map(async ([file, version]) => {
      const res = await fetch(`${BASE}${file}?v=${version}`, { method: 'HEAD' })
      const size = Number(res.headers.get('content-length'))
      if (!res.ok || size !== statSync(join(PUBLIC, file)).size)
        missing.push(`${file} (${res.status}, ${size} bytes)`)
    })
  )
  if (missing.length) {
    console.error(
      `${missing.length} file(s) not live at ${BASE}: ${missing.join(', ')}`
    )
    console.error(
      'Run `pnpm media:sync` with Cloudflare access, then re-run the deploy.'
    )
    process.exit(1)
  }
  console.log(`all ${Object.keys(versions).length} files answer at ${BASE}`)
}

async function sync() {
  const want = await currentVersions()
  writeManifest(want)
  const have = await remoteVersions()
  const todo = Object.keys(want).filter((file) => have[file] !== want[file])
  console.log(
    `${Object.keys(want).length} files, ${todo.length} to upload to ${BUCKET}`
  )
  const done = Object.fromEntries(
    Object.entries(have).filter(([file]) => file in want)
  )
  let next = 0
  let finished = 0
  let failed = 0
  const worker = async () => {
    while (next < todo.length) {
      const file = todo[next++]
      try {
        await upload(file)
        done[file] = want[file]
        console.log(`  [${++finished}/${todo.length}] ${file}`)
        if (finished % 10 === 0) await saveRecord(done)
      } catch (error) {
        failed++
        const reason = String(error.stderr || error.message)
          .trim()
          .split('\n')
          .at(-1)
        console.error(`  ${file} FAILED: ${reason}`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  await saveRecord(done)
  if (failed) {
    console.error(`${failed} upload(s) failed; run it again to retry them.`)
    process.exit(1)
  }
  console.log('done')
}

const mode = process.argv[2]
await (mode === '--check' ? check() : mode === '--verify' ? verify() : sync())
