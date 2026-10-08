import { useMemo, useRef } from 'react'
import { PointMaterial, Points } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import * as random from 'maath/random'
import * as THREE from 'three'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useShellRoot } from '@/components/shell-context'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/** A small seeded RNG, so each cloud is the same on every render. */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A CSS colour (a token, oklch, anything) as 0..255 RGB, via a 1px canvas. */
function rgb(css: string): [number, number, number] {
  const c = document.createElement('canvas')
  c.width = c.height = 1
  const ctx = c.getContext('2d')!
  ctx.fillStyle = css
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

/** A soft gas cloud drawn onto a canvas: overlapping blooms, faded edges. */
function nebulaTexture(seed: number, [r, g, b]: [number, number, number]) {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const rand = seeded(seed)
  for (let i = 0; i < 14; i++) {
    const cx = size * (0.2 + rand() * 0.6)
    const cy = size * (0.2 + rand() * 0.6)
    const radius = size * (0.12 + rand() * 0.28)
    const alpha = 0.05 + rand() * 0.13
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`)
    grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.35})`)
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  const edge = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.25,
    size / 2,
    size / 2,
    size * 0.5
  )
  edge.addColorStop(0, 'rgba(0,0,0,0)')
  edge.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

type Live = { root: HTMLElement | null; still: boolean }

/** The bass level the shell writes, 0 to 1. */
const bassOf = (live: Live) =>
  parseFloat(live.root?.style.getPropertyValue('--pulse-bass') || '0') || 0

function StarLayer({
  count,
  radius,
  color,
  size,
  speed,
  live,
}: {
  count: number
  radius: number
  color: string
  size: number
  speed: number
  live: Live
}) {
  const ref = useRef<THREE.Points>(null!)
  const positions = useMemo(
    () =>
      random.inSphere(new Float32Array(count * 3), { radius }) as Float32Array,
    [count, radius]
  )
  useFrame((_state, delta) => {
    if (live.still) return
    // The bass pushes the field along: up to three times the resting drift.
    const push = speed * (1 + bassOf(live) * 2)
    ref.current.rotation.x -= (delta / 10) * push
    ref.current.rotation.y -= (delta / 15) * push
  })
  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={size}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  )
}

function Cloud({
  seed,
  tint,
  z,
  scale,
  spin,
  live,
}: {
  seed: number
  tint: [number, number, number]
  z: number
  scale: number
  spin: number
  live: Live
}) {
  const ref = useRef<THREE.Mesh>(null!)
  const texture = useMemo(() => nebulaTexture(seed, tint), [seed, tint])
  useFrame((_state, delta) => {
    if (!live.still) ref.current.rotation.z += delta * spin
  })
  return (
    <mesh ref={ref} position={[0, 0, z]} scale={scale}>
      <planeGeometry />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

/**
 * A starfield (two shells of stars at different depths and speeds) over
 * slowly turning gas clouds, in the song's colours. The bass speeds the
 * drift; reduced motion holds it still. Loads three.js only when chosen.
 * Ported from Dustin's StarsScene in react-ui-animation-examples.
 */
export default function StarsBackdrop({ theme }: { theme: string }) {
  const root = useShellRoot()
  const still = useMediaQuery(REDUCED_MOTION)
  const live = useMemo<Live>(() => ({ root, still }), [root, still])
  // The song's voice: bright, deep and glow, re-read when the song changes.
  const colours = useMemo(() => {
    const s = getComputedStyle(document.documentElement)
    const css = (name: string) => s.getPropertyValue(name).trim()
    return {
      bright: css('--track-bright'),
      deep: rgb(css('--track-deep')),
      glow: rgb(css('--track-bright')),
      ink: rgb(css('--track-ink')),
    }
    // theme: the song changed, so did its colours.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme])

  return (
    <div
      aria-hidden
      data-slot='stars-backdrop'
      className='pointer-events-none absolute inset-0 z-0 overflow-hidden bg-background'
    >
      <Canvas camera={{ position: [0, 0, 1] }} dpr={[1, 1.5]}>
        <Cloud
          seed={12}
          tint={colours.glow}
          z={-1.6}
          scale={5.5}
          spin={0.008}
          live={live}
        />
        <Cloud
          seed={77}
          tint={colours.deep}
          z={-1.2}
          scale={4.2}
          spin={-0.012}
          live={live}
        />
        <Cloud
          seed={903}
          tint={colours.ink}
          z={-2.1}
          scale={6.5}
          spin={0.005}
          live={live}
        />
        <group rotation={[0, 0, Math.PI / 4]}>
          <StarLayer
            count={2600}
            radius={1.5}
            color='#c8d4ff'
            size={0.004}
            speed={0.6}
            live={live}
          />
          <StarLayer
            count={900}
            radius={1.1}
            color={colours.bright}
            size={0.008}
            speed={1.4}
            live={live}
          />
        </group>
      </Canvas>
    </div>
  )
}
