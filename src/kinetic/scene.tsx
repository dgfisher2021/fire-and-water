import { useMemo, useRef, useState } from 'react'
import { PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import type { BloomEffect } from 'postprocessing'
import * as THREE from 'three'
import { cn, useMediaQuery } from '@dust-ui/ui'
import { Comets } from './scene-comets'
import { Constellations } from './scene-constellation'
import { CoverArt, Wings } from './scene-cover'
import { TextGuard } from './scene-guard'
import { Heart } from './scene-heart'
import {
  Beam,
  Bright,
  Candle,
  Clockwork,
  Ghosts,
  LoneStar,
  Mist,
  Moon,
  Sea,
  Shafts,
  Storm,
  Veils,
} from './scene-layers'
import { Thread } from './scene-lines'
import { OrbGlow, Studio } from './scene-orb'
import { Embers, GoldDust, HeroBursts, Rain, Stars } from './scene-particles'
import { Sigils } from './scene-runes'
import { Sand } from './scene-sand'
import { SolidWord } from './scene-solid'
import {
  CAM_Z,
  FOV,
  GROUND,
  type SceneApi,
  SceneContext,
  createScene,
  stepScene,
  useScene,
} from './scene-state'
import type { Stage } from './stage'
import type { FrameSource } from './types'

/** The comets' colours: voices pale and warm, the wire hot and electric. */
const CHOIR_LIGHT = ['#f6ecd6', '#e6bc63', '#bcd7e6', '#fff7e8'] as const
const WIRE_LIGHT = ['#fff3d0', '#e6bc63', '#9fe6ff', '#ffffff'] as const

const GROUND_SRGB = new THREE.Color(GROUND).convertLinearToSRGB()

/** Reads the frame once, before every other subscriber, and moves the camera. */
function Driver({
  frame,
  stage,
  calm,
  onAccent,
}: {
  frame: FrameSource
  stage: Stage
  calm: boolean
  onAccent: (hex: string) => void
}) {
  const { ref } = useScene()

  useFrame(({ camera, scene, size, gl }, delta) => {
    const s = ref.current
    const f = frame()
    if (f.accent !== s.accentHex) onAccent(f.accent)
    stepScene(
      s,
      f,
      delta,
      size.width,
      size.height,
      gl.getPixelRatio(),
      calm,
      stage
    )
    s.accentHex = f.accent
    s.frames++

    const t = s.motion
    camera.position.set(
      Math.sin(t * 0.07) * 0.45,
      Math.sin(t * 0.05 + 1) * 0.25 - s.cues.rise * 0.3,
      CAM_Z
    )
    camera.lookAt(0, s.cues.rise * 0.25, 0)

    // The ground mixed 7% toward the accent, as CSS would mix it (in sRGB).
    if (scene.background instanceof THREE.Color)
      scene.background
        .copy(s.accent)
        .convertLinearToSRGB()
        .lerp(GROUND_SRGB, 0.93)
        .convertSRGBToLinear()
  }, -1)

  return null
}

function Post() {
  const { ref } = useScene()
  const bloom = useRef<BloomEffect>(null)

  useFrame(() => {
    const s = ref.current
    if (bloom.current)
      bloom.current.intensity =
        0.75 + s.kick * 0.24 + s.snare * 0.05 + s.cues.bright * 0.45
  })

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        ref={bloom}
        mipmapBlur
        luminanceThreshold={0.18}
        luminanceSmoothing={0.25}
        intensity={0.75}
        radius={0.7}
      />
      <Vignette offset={0.28} darkness={0.72} />
    </EffectComposer>
  )
}

/**
 * The 3D backdrop of the kinetic lyric video: stars, mist and one visual per
 * cue, all driven by the frame the timeline hands over.
 */
export function KineticScene({
  frame,
  stage,
  art,
  className,
}: {
  frame: FrameSource
  stage: Stage
  art?: SceneApi['art']
  className?: string
}) {
  const calm = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [scene] = useState(createScene)
  const ref = useRef(scene)
  const [accentHex, setAccentHex] = useState('#4fc0ae')
  // Steps the resolution down, never back up, if the frame rate sags.
  const [dprCap, setDprCap] = useState(1.75)
  // A phone held upright: fewer pixels to fill, a weaker chip to fill them.
  const cap = stage.name === 'portrait' ? Math.min(dprCap, 1.5) : dprCap
  const api = useMemo(
    () => ({ ref, shared: scene.shared, accentHex, art }),
    [scene, accentHex, art]
  )

  return (
    <div aria-hidden className={cn('absolute inset-0', className)}>
      <Canvas
        flat
        dpr={[Math.min(1, cap), cap]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ fov: FOV, position: [0, 0, CAM_Z], near: 0.1, far: 120 }}
      >
        <PerformanceMonitor
          onDecline={() => setDprCap((cap) => Math.max(0.75, cap - 0.25))}
        />
        <color attach='background' args={[GROUND]} />
        <ambientLight intensity={1.1} />
        <directionalLight
          position={[6, 8, 6]}
          intensity={1.6}
          color='#cfe4f2'
        />
        <Studio />
        <SceneContext value={api}>
          <Driver
            frame={frame}
            stage={stage}
            calm={calm}
            onAccent={setAccentHex}
          />
          <Mist />
          <CoverArt />
          <Stars />
          <Moon />
          <Storm />
          <Clockwork />
          <Shafts />
          <Comets
            cue='choir'
            count={7}
            seed={7}
            colors={CHOIR_LIGHT}
            spread={6}
            at={[2.6, 1.7, -2.2]}
            turn={Math.PI / 2}
            pace={0.55}
          />
          <Beam />
          <Bright />
          <Constellations />
          <Wings />
          <Ghosts />
          <GoldDust />
          <Rain />
          <Embers />
          <Sea />
          <Thread />
          <Comets
            cue='wire'
            count={9}
            seed={23}
            colors={WIRE_LIGHT}
            spread={6.5}
            at={[2.2, -1.5, -1.2]}
            pace={1.5}
          />
          <Sigils />
          <Veils />
          <Candle />
          <LoneStar />
          <TextGuard />
          <HeroBursts />
          <OrbGlow />
          <Heart />
          <SolidWord />
          <Sand />
          <Post />
        </SceneContext>
      </Canvas>
    </div>
  )
}
