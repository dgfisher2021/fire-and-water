import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CAM_Z, type SceneState, shown, useScene } from './scene-state'
import { NOISE, PALETTE, SHARED, shaderArgs } from './scene-util'

const LAYER_VERT = /* glsl */ `
uniform vec2 uOrigin;
varying vec2 vP;
void main() {
  vP = position.xy + uOrigin;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
const SCREEN_VERT = /* glsl */ `
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`
const HEAD = /* glsl */ `
${SHARED}
uniform float uLevel;
varying vec2 vP;
${PALETTE}
${NOISE}
`

type Uniforms = Record<string, THREE.IUniform>

type LayerProps = {
  /** The layer's 0 to 1 presence this frame; at 0 it is skipped. */
  level: (s: SceneState) => number
  /** Fragment body: reads vP (plane units) and uLevel, writes gl_FragColor. */
  fragment: string
  /** Plane size in z = 0 units; the default covers any window. */
  size?: [number, number]
  /** Centre in 16:9 z = 0 units; x follows the window's width. */
  at?: [number, number]
  /**
   * Keep vP in screen-plane units although the plane is a smaller window at
   * `at` (a band of the frame), so the shader only runs where it draws.
   */
  windowed?: boolean
  /** Depth, for parallax; the plane is scaled so its units stay screen units. */
  z?: number
  /** Additive light (default) or an occluding surface (premultiplied alpha). */
  add?: boolean
  order?: number
  uniforms?: Uniforms
  onFrame?: (u: Uniforms, s: SceneState, mesh: THREE.Mesh) => void
}

const FULL: [number, number] = [64, 14]
const ORIGIN: [number, number] = [0, 0]

/** One shader-drawn plane of the scene, authored in screen-plane units. */
export function Layer({
  level,
  fragment,
  size = FULL,
  at = ORIGIN,
  windowed = false,
  z = 0,
  add = true,
  order = 0,
  uniforms,
  onFrame,
}: LayerProps) {
  const { ref, shared } = useScene()
  const mesh = useRef<THREE.Mesh>(null)
  const material = useRef<THREE.ShaderMaterial>(null)
  const args = useMemo(
    () =>
      shaderArgs(
        {
          ...shared,
          uLevel: { value: 0 },
          uOrigin: { value: new THREE.Vector2() },
          ...uniforms,
        },
        LAYER_VERT,
        HEAD + fragment,
        add
          ? undefined
          : { blending: THREE.NormalBlending, premultipliedAlpha: true }
      ),
    [shared, uniforms, fragment, add]
  )

  useFrame(() => {
    const s = ref.current
    const m = mesh.current
    const mat = material.current
    if (!m || !mat) return
    const l = level(s)
    m.visible = shown(s, l)
    if (!m.visible) return
    mat.uniforms.uLevel.value = l
    const k = (CAM_Z - z) / CAM_Z
    m.position.set(at[0] * s.sx * k, at[1] * k, z)
    m.scale.setScalar(k)
    if (windowed) mat.uniforms.uOrigin.value.set(at[0] * s.sx, at[1])
    onFrame?.(mat.uniforms, s, m)
  })

  return (
    <mesh ref={mesh} renderOrder={order} frustumCulled={false}>
      <planeGeometry args={size} />
      <shaderMaterial ref={material} args={args} />
    </mesh>
  )
}

const SHADE_FRAG = /* glsl */ `
uniform float uLevel;
void main() {
  gl_FragColor = vec4(0.0, 0.0, 0.0, uLevel);
}
`

/** A black veil over everything drawn before it (by render order). */
export function Shade({
  level,
  order,
}: {
  level: (s: SceneState) => number
  order: number
}) {
  const { ref } = useScene()
  const mesh = useRef<THREE.Mesh>(null)
  const material = useRef<THREE.ShaderMaterial>(null)
  const args = useMemo(
    () =>
      shaderArgs({ uLevel: { value: 0 } }, SCREEN_VERT, SHADE_FRAG, {
        blending: THREE.NormalBlending,
        depthTest: false,
      }),
    []
  )

  useFrame(() => {
    const m = mesh.current
    const mat = material.current
    if (!m || !mat) return
    const l = level(ref.current)
    m.visible = l > 0.002
    mat.uniforms.uLevel.value = l
  })

  return (
    <mesh ref={mesh} renderOrder={order} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={material} args={args} />
    </mesh>
  )
}
