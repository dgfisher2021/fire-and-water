// The one <audio> element for the whole app, created lazily so the player
// survives route changes and never mounts twice under StrictMode; and the
// one Web Audio graph on it, for whoever wants to listen in (the kinetic
// film's analyser). A song from another origin may only feed Web Audio when
// it was fetched with CORS, and an element without CORS routed into a graph
// plays silence, so the graph is only built once the source is known clean.
let element: HTMLAudioElement | null = null
let context: AudioContext | null = null
let analyser: AnalyserNode | null = null
/** Whether the media origin answers this page with CORS: unknown until probed. */
let cors: boolean | null = null
let probing: Promise<boolean> | null = null
/** True when the loaded source may be read by Web Audio. */
let clean = false

export function getAudio(): HTMLAudioElement {
  if (!element) {
    element = new Audio()
    element.preload = 'metadata'
    // A CORS load the server refuses: go back to a plain one, for good.
    element.addEventListener('error', () => {
      const audio = element!
      if (!audio.crossOrigin || analyser || !audio.src) return
      cors = false
      clean = false
      const wanted = !audio.paused
      const src = audio.src
      audio.removeAttribute('crossorigin')
      audio.src = src
      if (wanted) void audio.play().catch(() => {})
    })
  }
  return element
}

/**
 * iOS and iPadOS suspend an AudioContext when the page is hidden, which
 * would silence a song playing on the lock screen: no graph there.
 */
const isIos = () =>
  typeof navigator !== 'undefined' &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

const isCross = (url: string) =>
  new URL(url, document.baseURI).origin !== location.origin

/**
 * Asks the media origin, once, whether this page may read its files (a HEAD
 * with CORS). Call it early with any song's URL; same-origin files need no asking.
 */
export function probeAudioCors(url: string): Promise<boolean> {
  if (!isCross(url)) return Promise.resolve(true)
  if (isIos() || typeof AudioContext === 'undefined')
    return Promise.resolve(false)
  probing ??= fetch(new URL(url, document.baseURI).href, {
    method: 'HEAD',
    mode: 'cors',
    cache: 'no-store',
  })
    .then((r) => r.ok)
    .catch(() => false)
    .then((ok) => {
      // A refused load has already settled it.
      cors ??= ok
      return cors
    })
  return probing
}

/**
 * Loads `url` into the element. With CORS when the media origin is known to
 * allow it, so the song can feed the analyser; plainly otherwise, as ever.
 */
export function setAudioSource(url: string) {
  const audio = getAudio()
  if (isCross(url)) {
    // Once the graph exists the element must stay CORS-clean.
    clean = !!analyser || cors === true
    if (clean) audio.crossOrigin = 'anonymous'
    else audio.removeAttribute('crossorigin')
    if (cors === null) void probeAudioCors(url)
  } else clean = true
  audio.src = url
}

/** The app's one AudioContext, made on first use (inside a user gesture). */
export function getAudioContext(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  context ??= new AudioContext()
  return context
}

/**
 * The analyser on the app's audio element, or null where it cannot listen
 * (iOS, no Web Audio, a source without CORS, a context not yet allowed to
 * run). Call it from a play gesture and again while playing: it builds the
 * graph once the context runs. Once built, the
 * element plays through the graph for the rest of the session.
 */
export function listenToAudio(): AnalyserNode | null {
  if (analyser) {
    if (context?.state === 'suspended') void context.resume()
    return analyser
  }
  if (!clean || isIos()) return null
  const ctx = getAudioContext()
  if (!ctx) return null
  // An element wired into a sleeping context is silent: wait until it runs.
  if (ctx.state !== 'running') {
    void ctx.resume().catch(() => {})
    return null
  }
  try {
    const source = ctx.createMediaElementSource(getAudio())
    const node = ctx.createAnalyser()
    node.fftSize = 2048
    node.minDecibels = -100
    node.maxDecibels = -20
    node.smoothingTimeConstant = 0.4
    source.connect(node)
    source.connect(ctx.destination)
    analyser = node
    // The song must never wait on a sleeping context.
    const wake = () => {
      if (ctx.state === 'suspended') void ctx.resume()
    }
    getAudio().addEventListener('play', wake)
    ctx.addEventListener('statechange', () => {
      if (!getAudio().paused) wake()
    })
    document.addEventListener('visibilitychange', wake)
    wake()
  } catch {
    return null
  }
  return analyser
}

/** The analyser if it is already listening and awake; never builds it. */
export const liveAnalyser = () =>
  analyser && context?.state === 'running' ? analyser : null
