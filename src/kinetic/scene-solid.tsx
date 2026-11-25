import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Font, type FontData } from 'three/examples/jsm/loaders/FontLoader.js'
import typeface from './cinzel-black.typeface.json'
import { BEAT, CAM_Z, HALF_H, useScene } from './scene-state'
import { STAGE_H, STAGE_W, project } from './stage'
import type { HeroWord, Solid } from './types'

const POOL = 12
/** How far in front of the camera the letters stand: ahead of every layer. */
const DISTANCE = 7
const LETTER = 0.55
const STAGGER = 0.038
const FONT = new Font(typeface as unknown as FontData)
const GLYPHS = (
  typeface as unknown as { glyphs: Record<string, { ha: number }> }
).glyphs
const EM = (typeface as unknown as { resolution: number }).resolution

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (v: number) => {
  const x = clamp01(v)
  return x * x * (3 - 2 * x)
}
const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 4)
const frac = (v: number) => v - Math.floor(v)
const hash = (n: number) => frac(Math.sin(n * 127.1) * 43758.5453)
const noise = (x: number) => {
  const i = Math.floor(x)
  const f = x - i
  return hash(i) + (hash(i + 1) - hash(i)) * f * f * (3 - 2 * f)
}
/** A turn that arrives in three ticks of the sixteenth-note grid. */
const ticked = (dt: number) => {
  const f = dt / (BEAT / 4)
  const step = Math.floor(f)
  const x = clamp01((f - step) / 0.55) - 1
  return clamp01((step + 1 + 2.4 * x * x * x + 1.4 * x * x) / 3)
}

/** One capital, extruded and bevelled, an em tall; its origin on the baseline. */
function letterGeometry(ch: string) {
  const geometry = new THREE.ExtrudeGeometry(FONT.generateShapes(ch, 1), {
    depth: 0.13,
    bevelEnabled: true,
    bevelThickness: 0.028,
    bevelSize: 0.016,
    bevelSegments: 4,
    curveSegments: 8,
  })
  geometry.translate(0, 0, -0.065)
  return geometry
}

const look = (solid: Solid): THREE.Material => {
  const common = { transparent: true, depthWrite: true }
  switch (solid) {
    case 'gold':
      return new THREE.MeshStandardMaterial({
        ...common,
        color: '#ffc95a',
        metalness: 1,
        roughness: 0.24,
        envMapIntensity: 1.25,
        emissive: '#6b4204',
        emissiveIntensity: 0.55,
      })
    case 'silver':
      return new THREE.MeshStandardMaterial({
        ...common,
        color: '#e6edf3',
        metalness: 1,
        roughness: 0.16,
        envMapIntensity: 1.5,
        emissive: '#14222c',
        emissiveIntensity: 0.6,
      })
    case 'brass':
      return new THREE.MeshStandardMaterial({
        ...common,
        color: '#d08a45',
        metalness: 1,
        roughness: 0.3,
        envMapIntensity: 1.5,
        emissive: '#3a1a06',
        emissiveIntensity: 0.7,
      })
    case 'steel':
      return new THREE.MeshStandardMaterial({
        ...common,
        color: '#93a2ae',
        metalness: 1,
        roughness: 0.28,
        envMapIntensity: 1.4,
      })
    case 'ice':
      return new THREE.MeshPhysicalMaterial({
        ...common,
        color: '#cfeeff',
        metalness: 0.1,
        roughness: 0.06,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        iridescence: 0.7,
        envMapIntensity: 2.2,
        emissive: '#2f7fb8',
        emissiveIntensity: 0.55,
      })
    case 'light':
      return new THREE.MeshBasicMaterial({
        ...common,
        color: new THREE.Color(1.5, 1.42, 1.2),
        toneMapped: false,
      })
  }
}

const SOLIDS: Solid[] = ['gold', 'silver', 'brass', 'steel', 'ice', 'light']
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const P: [number, number, number] = [0, 0, 0]
const RAY = new THREE.Vector3()
const FORWARD = new THREE.Vector3()
const TURN = new THREE.Quaternion()
const EULER = new THREE.Euler(0, 0, 0, 'YXZ')
const RAD = Math.PI / 180

/**
 * A hero word cast in solid letters: extruded bevelled capitals (the Text3D
 * of the Epoxy Resin and Sparks showpieces, built once per letter) in gold,
 * silver, brass, steel, ice or light, standing where the DOM word would and
 * assembling from the song's clock, so any time gives the same picture.
 */
export function SolidWord() {
  const { ref } = useScene()
  const group = useRef<THREE.Group>(null)
  const geometries = useRef(new Map<string, THREE.ExtrudeGeometry>())
  const materials = useRef(new Map<Solid, THREE.Material[]>())
  const held = useRef<HeroWord | null>(null)
  const advances = useRef(new Float32Array(POOL + 1))
  useFrame(({ camera }) => {
    const s = ref.current
    const g = group.current
    if (!g) return
    const meshes = g.children as THREE.Mesh[]
    const cut = (ch: string) => {
      let geometry = geometries.current.get(ch)
      if (!geometry) geometries.current.set(ch, (geometry = letterGeometry(ch)))
      return geometry
    }
    const cast = (solid: Solid) => {
      let pool = materials.current.get(solid)
      if (!pool) {
        const first = look(solid)
        pool = Array.from({ length: POOL }, (_, i) =>
          i ? first.clone() : first
        )
        materials.current.set(solid, pool)
      }
      return pool
    }
    // The first frames draw every look once, far too small to see, so no
    // shader compiles mid-song; then a capital is cut each frame until all are.
    if (s.frames < 3) {
      g.visible = true
      held.current = null
      SOLIDS.forEach((solid, i) => {
        const mesh = meshes[i]
        mesh.visible = true
        mesh.geometry = cut('H')
        mesh.material = cast(solid)[0]
        mesh.material.opacity = 1
        mesh.position
          .copy(camera.position)
          .add(camera.getWorldDirection(FORWARD).multiplyScalar(DISTANCE))
        mesh.scale.setScalar(1e-4)
      })
      return
    }
    if (s.frames - 3 < ALPHABET.length) cut(ALPHABET[s.frames - 3])
    const word = s.solid
    g.visible = !!word?.solid && word.box[2] > 0
    if (!word?.solid || !g.visible) return
    const letters = [...word.text].slice(0, POOL)
    const n = letters.length
    if (held.current !== word) {
      held.current = word
      const pool = cast(word.solid)
      let x = 0
      letters.forEach((ch, i) => {
        meshes[i].geometry = cut(ch)
        meshes[i].material = pool[i]
        advances.current[i] = x
        x += (GLYPHS[ch]?.ha ?? EM * 0.6) / EM
      })
      advances.current[n] = x
    }
    const [left, top, width, height] = word.box
    const total = advances.current[n]
    const t = s.calm ? word.t + 9 : s.shared.uSong.value
    const dt = t - word.t
    const out = s.calm ? 0 : clamp01((t - word.exitAt) / word.exitDur)
    const plan = s.calm ? undefined : word.sand
    const erode =
      plan && plan.mode === 'scatter' ? clamp01((t - plan.out0) / 0.5) : 0
    const m = smooth((dt - 0.5) / 0.7)
    const metal = word.solid === 'brass' || word.solid === 'steel'
    camera.getWorldDirection(FORWARD)
    const unit = s.stageUnit * (DISTANCE / CAM_Z)
    for (let i = 0; i < POOL; i++) {
      const mesh = meshes[i]
      mesh.visible = i < n
      if (i >= n) continue
      const e = metal
        ? ticked(dt - i * (BEAT / 8))
        : easeOut((dt - i * STAGGER) / LETTER)
      let dy = (1 - e) * 0.42 * height
      let rotX = metal ? (1 - e) * 270 : (1 - e) * 78
      let rotY = 0
      let rotZ = 0
      let dx = 0
      // The letters keep turning a little, so the metal's reflections travel.
      if (!s.calm) {
        rotY += m * 9 * Math.sin(t * 0.9 + i * 0.7)
        rotX += m * 5 * Math.sin(t * 0.7 + i * 1.1)
        if (word.motion === 'rise')
          dy -=
            m *
            height *
            ((0.02 + (0.1 * i) / n) * smooth(dt / 3) +
              0.03 * Math.sin(t * 1.3 + i * 0.8))
        else if (word.motion === 'tick')
          rotX +=
            (i % 2 ? 1 : -1) *
            (Math.floor(t / BEAT) % 2 ? 22 : -22) *
            Math.exp(-frac(t / BEAT) * 6) *
            m
        else if (word.motion === 'tremble') {
          dx += m * (noise(t * 19 + i * 7.3) - 0.5) * 0.05 * height
          dy += m * (noise(t * 23 + i * 3.1 + 40) - 0.5) * 0.06 * height
          rotZ += m * (noise(t * 13 + i * 5.7 + 80) - 0.5) * 5
        }
      }
      dy -= out * out * 0.5 * height
      const x = left + (advances.current[i] / total) * width + dx
      project(word.pose, x, top + height + dy, (1 - e) * -160, P)
      // Stage px to a point DISTANCE ahead of the camera.
      RAY.set(
        ((P[0] - STAGE_W / 2) * s.stageUnit) / s.halfW,
        (-(P[1] - STAGE_H / 2) * s.stageUnit) / HALF_H,
        0.5
      )
        .unproject(camera)
        .sub(camera.position)
        .normalize()
      mesh.position
        .copy(camera.position)
        .addScaledVector(RAY, DISTANCE / RAY.dot(FORWARD))
      EULER.set(
        (-word.pose.rotX + rotX) * RAD,
        word.pose.rotY * RAD + rotY * RAD,
        rotZ * RAD
      )
      mesh.quaternion.copy(camera.quaternion).multiply(TURN.setFromEuler(EULER))
      mesh.scale.setScalar(
        (width / total) * unit * P[2] * (1 + 0.03 * s.kick * m)
      )
      const material = mesh.material as THREE.Material
      material.opacity =
        clamp01(e * 2.2) *
        (1 - out) *
        (1 - smooth(erode * 1.6 - (1 - (i + 0.5) / n) * 0.6))
      mesh.visible = material.opacity > 0.004
    }
  })

  return (
    <group ref={group} visible={false}>
      {Array.from({ length: POOL }, (_, i) => (
        <mesh key={i} renderOrder={80} frustumCulled={false} />
      ))}
    </group>
  )
}
