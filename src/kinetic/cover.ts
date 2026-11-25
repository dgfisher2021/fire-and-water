import * as THREE from 'three'
import { rng } from './scene-util'

/**
 * A song's cover, read once into what the scene makes of it: the picture as
 * a texture (shown whole, and for a figure cut out of it), grains of its
 * gold that gather onto it, and a blurred copy for a watercolour wash. The image is the
 * app's own artwork; nothing is fetched from elsewhere.
 */
export type Cover = {
  /** Width over height. */
  aspect: number
  /** Per grain: x and y in the picture (0 to 1, y down), then its colour. */
  grains: Float32Array
  colors: Float32Array
  texture: THREE.Texture
  wash: THREE.Texture
}

export const COVER_GRAINS = 16000
const SAMPLE_W = 320

/** How much of a pixel is picture rather than paper, 0 to 1. */
export function coverInk(r: number, g: number, b: number) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const dark = 1 - min / 255
  const sat = max ? (max - min) / max : 0
  const v = Math.max(dark * 1.15 - 0.12, sat * 1.1 - 0.08)
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/**
 * A grain's colour for a pixel, as light on dark: gold stays gold, the
 * colours brighten, and the darkest ink becomes a dim blue so it still reads.
 */
export function glowOf(r: number, g: number, b: number, out: number[]) {
  const max = Math.max(r, g, b, 1)
  const lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255
  // Normalised hue, lifted by how light the pixel is.
  const lift = 0.25 + 0.9 * lum
  const warm = r > b * 1.25 && r > 110 ? 1.35 : 1
  out[0] = Math.max((r / max) * lift * warm, 0.05)
  out[1] = Math.max((g / max) * lift * warm, 0.1)
  out[2] = Math.max((b / max) * lift, 0.16)
  return out
}

function load(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`cover ${src} did not load`))
    img.src = new URL(src, document.baseURI).href
  })
}

async function read(src: string): Promise<Cover> {
  const img = await load(src)
  const aspect = img.width / img.height
  const w = SAMPLE_W
  const h = Math.round(w / aspect)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  // Grains land on the picture's gold, a few on the rest of it.
  const random = rng(Math.round(aspect * 1000) + w)
  const grains = new Float32Array(COVER_GRAINS * 2)
  const colors = new Float32Array(COVER_GRAINS * 3)
  const c = [0, 0, 0]
  let n = 0
  for (let tries = 0; n < COVER_GRAINS && tries < COVER_GRAINS * 80; tries++) {
    const x = random() * w
    const y = random() * h
    const i = (Math.floor(y) * w + Math.floor(x)) * 4
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const gold = r > b * 1.25 && r > 110 ? 1 : 0.06
    if (random() > coverInk(r, g, b) * gold) continue
    grains[n * 2] = x / w
    grains[n * 2 + 1] = y / h
    glowOf(r, g, b, c)
    colors.set(c, n * 3)
    n++
  }

  const texture = new THREE.Texture(img)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true

  // The wash: the picture small and soft, so only its stains remain.
  const soft = document.createElement('canvas')
  soft.width = 96
  soft.height = Math.round(96 / aspect)
  const sctx = soft.getContext('2d')!
  sctx.filter = 'blur(3px)'
  sctx.drawImage(img, 0, 0, soft.width, soft.height)
  const wash = new THREE.CanvasTexture(soft)
  wash.colorSpace = THREE.SRGBColorSpace

  return { aspect, grains, colors, texture, wash }
}

const cache = new Map<string, Promise<Cover | null>>()

/** The cover at `src` (a path under public/), or null if it cannot be read. */
export function loadCover(src: string) {
  let hit = cache.get(src)
  if (!hit) {
    hit = read(src).catch(() => null)
    cache.set(src, hit)
  }
  return hit
}
