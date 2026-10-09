/**
 * On-device debugging for phones with no devtools. `?debug` turns it on
 * (kept in localStorage until `?nodebug`): Eruda's console loads from the
 * CDN, and errors plus a heartbeat (song, time, frame rate) are logged to
 * localStorage `fw-debug-log`, so the last moments before a freeze survive
 * a reload.
 */
const FLAG = 'fw-debug'
const LOG = 'fw-debug-log'
const KEEP = 80

type Entry = { at: string; kind: string; detail: string }

const read = (): Entry[] => {
  try {
    return JSON.parse(localStorage.getItem(LOG) ?? '[]') as Entry[]
  } catch {
    return []
  }
}

function log(kind: string, detail: string) {
  try {
    const entries = read()
    entries.push({ at: new Date().toISOString(), kind, detail })
    localStorage.setItem(LOG, JSON.stringify(entries.slice(-KEEP)))
  } catch {
    // Storage full or blocked: nothing to keep.
  }
}

function enabled() {
  const search = new URLSearchParams(location.search)
  try {
    if (search.has('nodebug')) localStorage.removeItem(FLAG)
    else if (search.has('debug')) localStorage.setItem(FLAG, '1')
    return localStorage.getItem(FLAG) === '1'
  } catch {
    return search.has('debug')
  }
}

/** Starts the debug tools when the flag is on; `now` reads the player. */
export function startDebug(now: () => string) {
  if (!enabled()) return
  log('load', `${location.pathname}${location.search} ${navigator.userAgent}`)
  addEventListener('error', (e) =>
    log('error', `${e.message} @ ${e.filename}:${e.lineno}`)
  )
  addEventListener('unhandledrejection', (e) =>
    log('rejection', String(e.reason))
  )
  addEventListener('pagehide', () => log('pagehide', now()))
  document.addEventListener('visibilitychange', () =>
    log('visibility', `${document.visibilityState} ${now()}`)
  )

  // Frames counted between beats: a freeze shows as a collapsing fps.
  let frames = 0
  const count = () => {
    frames++
    requestAnimationFrame(count)
  }
  requestAnimationFrame(count)
  setInterval(() => {
    log('beat', `${now()} fps=${Math.round(frames / 3)}`)
    frames = 0
  }, 3000)

  const script = document.createElement('script')
  script.src = 'https://cdn.jsdelivr.net/npm/eruda'
  script.onload = () =>
    (window as unknown as { eruda?: { init: () => void } }).eruda?.init()
  document.head.append(script)
}
