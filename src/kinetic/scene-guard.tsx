import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useScene } from './scene-state'

/*
 * A soft shade behind the words. The effects (comets, wings, runes, the
 * heart) keep their full strength in the open frame and fall back where
 * a line stands, so every word reads. It has no edge to see: a wide
 * feather into nothing.
 */

/** How far past the words the shade reaches before it is gone, in world units. */
const FEATHER = 2.6
const DEPTH = 0.62

const VERTEX = /* glsl */ `
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
const FRAGMENT = /* glsl */ `
uniform vec2 uHalf;
uniform vec2 uSize;
uniform float uFeather;
uniform float uLevel;
varying vec2 vP;
void main() {
  // In world units, so the feather is as wide above the words as beside them.
  vec2 d = max(abs(vP * uSize) - uHalf, 0.0);
  float a = 1.0 - smoothstep(0.0, uFeather, length(d));
  gl_FragColor = vec4(0.0, 0.0, 0.0, a * a * a * uLevel);
}
`

export function TextGuard() {
  const { ref } = useScene()
  const mesh = useRef<THREE.Mesh>(null)
  const material = useRef<THREE.ShaderMaterial>(null)
  const args = useMemo(
    () =>
      [
        {
          vertexShader: VERTEX,
          fragmentShader: FRAGMENT,
          uniforms: {
            uHalf: { value: new THREE.Vector2(1, 1) },
            uSize: { value: new THREE.Vector2(1, 1) },
            uFeather: { value: FEATHER },
            uLevel: { value: 0 },
          },
          transparent: true,
          depthWrite: false,
          depthTest: false,
          side: THREE.DoubleSide,
        },
      ] satisfies [THREE.ShaderMaterialParameters],
    []
  )

  useFrame(() => {
    const s = ref.current
    const m = mesh.current
    const u = material.current?.uniforms
    if (!m || !u) return
    const [x, y, hw, hh, level] = s.guard
    m.visible = s.frames < 3 || level > 0.01
    if (!m.visible) return
    m.position.set(x, y, 0)
    m.scale.set(hw + FEATHER, hh + FEATHER, 1)
    u.uSize.value.set(hw + FEATHER, hh + FEATHER)
    // Drawn in a little from the words' edge, so the shade is deepest under them.
    u.uHalf.value.set(Math.max(hw - 0.5, 0), Math.max(hh - 0.5, 0))
    u.uLevel.value = DEPTH * level * s.fade
  })

  return (
    <mesh ref={mesh} renderOrder={62} frustumCulled={false} visible={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={material} args={args} />
    </mesh>
  )
}
