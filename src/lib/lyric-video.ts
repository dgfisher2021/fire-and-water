import {
  activeLyricsPosition,
  activeLyricsWord,
  isLyricsLabel,
} from '@dust-ui/ui'
import { type Track } from '@/data/tracks'

export type VideoAspect = '9:16' | '1:1' | '16:9'

const SIZES: Record<VideoAspect, [number, number]> = {
  '9:16': [720, 1280],
  '1:1': [960, 960],
  '16:9': [1280, 720],
}
const FPS = 30
/** Formats in order of preference; the browser records the first it can. */
const TYPES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm',
]

export type LyricVideoOptions = {
  track: Track
  aspect: VideoAspect
  /** Where to start, in seconds. */
  from: number
  /** How long to record, in seconds; the rest of the song if longer. */
  seconds: number
  onProgress?: (done: number) => void
  signal?: AbortSignal
}

export type LyricVideo = { blob: Blob; extension: 'mp4' | 'webm' }

/** True where the browser can record a canvas with sound. */
export const canRecordVideo = () =>
  typeof MediaRecorder !== 'undefined' &&
  typeof HTMLCanvasElement !== 'undefined' &&
  'captureStream' in HTMLCanvasElement.prototype &&
  TYPES.some((t) => MediaRecorder.isTypeSupported(t))

const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = new URL(src, document.baseURI).href
  })
}

/** Greedy word wrap to `width`, at the context's current font. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > width) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

/** Draw `img` to fill w by h, cropped like CSS object-fit: cover. */
function cover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const s = Math.max(w / img.width, h / img.height)
  const sw = w / s
  const sh = h / s
  ctx.drawImage(
    img,
    (img.width - sw) / 2,
    (img.height - sh) / 2,
    sw,
    sh,
    x,
    y,
    w,
    h
  )
}

/**
 * Record a lyric video of `track` in the browser: the art blurred behind,
 * the cover and title, the sung line large with its sung word lit in the
 * song's colour, the lines either side dimmed, and a progress bar, over the
 * song's own audio. Records in real time with MediaRecorder; resolves with
 * the file once `seconds` have played (or the song ends), rejects on abort.
 */
export async function recordLyricVideo({
  track,
  aspect,
  from,
  seconds,
  onProgress,
  signal,
}: LyricVideoOptions): Promise<LyricVideo> {
  const [W, H] = SIZES[aspect]
  const type = TYPES.find((t) => MediaRecorder.isTypeSupported(t))!
  const extension = type.startsWith('video/mp4') ? 'mp4' : 'webm'

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  await document.fonts.ready
  const art = await loadImage(track.art.full)
  const bright = css('--track-bright') || '#cbd5ff'
  const ink = css('--track-ink') || '#111'
  const display = css('--font-display') || 'serif'
  const body = css('--font-sans') || 'sans-serif'

  // The song plays through its own element, so the app's player is untouched.
  const audio = new Audio()
  audio.src = new URL(track.audioFile, document.baseURI).href
  audio.preload = 'auto'
  const actx = new AudioContext()
  const source = actx.createMediaElementSource(audio)
  const tape = actx.createMediaStreamDestination()
  source.connect(tape)
  source.connect(actx.destination)

  const stream = new MediaStream([
    ...canvas.captureStream(FPS).getVideoTracks(),
    ...tape.stream.getAudioTracks(),
  ])
  const recorder = new MediaRecorder(stream, {
    mimeType: type,
    videoBitsPerSecond: 5_000_000,
  })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)

  const stanzas = track.lyrics
  const timing = track.timing
  const sung = (s: number) => stanzas[s]?.filter((l) => !isLyricsLabel(l)) ?? []
  const end = Math.min(from + seconds, track.duration)
  const short = Math.min(W, H)
  const pad = short * 0.08

  const drawFrame = () => {
    const t = audio.currentTime
    // Background: the art, blurred and dimmed.
    ctx.save()
    ctx.filter = 'blur(28px) brightness(0.42) saturate(1.2)'
    cover(ctx, art, -40, -40, W + 80, H + 80)
    ctx.restore()
    const shade = ctx.createLinearGradient(0, 0, 0, H)
    shade.addColorStop(0, 'rgba(0,0,0,0.15)')
    shade.addColorStop(1, 'rgba(0,0,0,0.55)')
    ctx.fillStyle = shade
    ctx.fillRect(0, 0, W, H)

    // Cover and title.
    const card = aspect === '16:9' ? H * 0.42 : short * 0.36
    const cardX = aspect === '16:9' ? pad : (W - card) / 2
    const cardY = aspect === '16:9' ? (H - card) / 2 - H * 0.08 : pad * 1.2
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(cardX, cardY, card, card, card * 0.08)
    ctx.clip()
    cover(ctx, art, cardX, cardY, card, card)
    ctx.restore()
    ctx.textAlign = aspect === '16:9' ? 'left' : 'center'
    const titleX = aspect === '16:9' ? pad : W / 2
    ctx.fillStyle = bright
    ctx.font = `600 ${short * 0.058}px ${display}`
    ctx.fillText(track.title, titleX, cardY + card + short * 0.085, W - pad * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = `500 ${short * 0.03}px ${body}`
    ctx.fillText(
      track.dedication,
      titleX,
      cardY + card + short * 0.13,
      W - pad * 2
    )

    // Lyrics: the sung line, with the line before and after dimmed.
    const pos = timing ? activeLyricsPosition(timing, t) : null
    const lyricX = aspect === '16:9' ? W * 0.62 : W / 2
    const lyricW = aspect === '16:9' ? W * 0.62 - pad : W - pad * 2
    const lyricY =
      aspect === '16:9' ? H * 0.5 : H * (aspect === '1:1' ? 0.74 : 0.68)
    ctx.textAlign = 'center'
    if (pos) {
      const lines = stanzas[pos.stanza] ?? []
      const current = lines[pos.line] ?? ''
      const singable = !isLyricsLabel(current)
      const before = lines
        .slice(0, pos.line)
        .filter((l) => !isLyricsLabel(l))
        .at(-1)
      const after =
        lines.slice(pos.line + 1).find((l) => !isLyricsLabel(l)) ??
        sung(pos.stanza + 1)[0]
      const big = short * 0.068
      ctx.font = `500 ${big * 0.62}px ${display}`
      ctx.fillStyle = 'rgba(255,255,255,0.42)'
      if (before) ctx.fillText(before, lyricX, lyricY - big * 1.7, lyricW)
      if (after) ctx.fillText(after, lyricX, lyricY + big * 2.2, lyricW)
      if (singable) {
        ctx.font = `600 ${big}px ${display}`
        const rows = wrap(ctx, current, lyricW)
        const word = timing ? activeLyricsWord(timing, pos, t) : null
        let index = 0
        rows.forEach((row, r) => {
          const y = lyricY + (r - (rows.length - 1) / 2) * big * 1.18
          const words = row.split(' ')
          const space = ctx.measureText(' ').width
          let x = lyricX - ctx.measureText(row).width / 2
          ctx.textAlign = 'left'
          for (const w of words) {
            const width = ctx.measureText(w).width
            if (word !== null && index === word) {
              ctx.fillStyle = bright
              ctx.beginPath()
              ctx.roundRect(
                x - big * 0.16,
                y - big * 0.86,
                width + big * 0.32,
                big * 1.12,
                big * 0.2
              )
              ctx.fill()
              ctx.fillStyle = ink
            } else {
              ctx.fillStyle =
                word !== null && index > word ? 'rgba(255,255,255,0.8)' : '#fff'
            }
            ctx.fillText(w, x, y)
            x += width + space
            index++
          }
          ctx.textAlign = 'center'
        })
      }
    }

    // Progress through the song.
    const barY = H - pad * 0.7
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.fillRect(pad, barY, W - pad * 2, 4)
    ctx.fillStyle = bright
    ctx.fillRect(pad, barY, (W - pad * 2) * Math.min(1, t / track.duration), 4)
  }

  return new Promise<LyricVideo>((resolve, reject) => {
    let frame = 0
    const finish = (error?: unknown) => {
      cancelAnimationFrame(frame)
      audio.pause()
      if (recorder.state !== 'inactive') recorder.stop()
      void actx.close()
      if (error) reject(error)
    }
    recorder.onstop = () => {
      if (signal?.aborted) return
      resolve({
        blob: new Blob(chunks, { type: type.split(';')[0] }),
        extension,
      })
    }
    signal?.addEventListener('abort', () =>
      finish(new DOMException('Cancelled', 'AbortError'))
    )
    const tick = () => {
      drawFrame()
      onProgress?.(Math.min(1, (audio.currentTime - from) / (end - from)))
      if (audio.currentTime >= end || audio.ended) finish()
      else frame = requestAnimationFrame(tick)
    }
    audio.addEventListener(
      'canplay',
      () => {
        audio.currentTime = from
        drawFrame()
        void actx.resume()
        recorder.start(1000)
        audio.play().then(() => (frame = requestAnimationFrame(tick)), finish)
      },
      { once: true }
    )
    audio.addEventListener(
      'error',
      () => finish(new Error('The song would not load')),
      { once: true }
    )
    audio.load()
  })
}
