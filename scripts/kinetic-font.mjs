// Writes the capitals of Cinzel Black (OFL, from @fontsource/cinzel) as a
// three.js typeface for the kinetic film's extruded hero words.
// Run: node scripts/kinetic-font.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

// three-stdlib (a drei dependency) bundles the font parser.
const drei = createRequire(import.meta.url).resolve('@react-three/drei')
const { TTFLoader } = createRequire(drei)('three-stdlib')

const KEEP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'’"
const source = new URL(
  '../node_modules/@fontsource/cinzel/files/cinzel-latin-900-normal.woff',
  import.meta.url
)
const out = new URL(
  '../src/kinetic/cinzel-black.typeface.json',
  import.meta.url
)

const file = readFileSync(source)
const font = new TTFLoader().parse(
  file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
)
font.glyphs = Object.fromEntries(
  Object.entries(font.glyphs).filter(([ch]) => KEEP.includes(ch))
)
writeFileSync(out, JSON.stringify(font))
console.log(Object.keys(font.glyphs).length, 'glyphs', font.resolution)
