import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BEAT, CAM_Z, useScene } from './scene-state'

/*
 * The clockwork heart: a watch movement, not a drop of liquid. Three brass
 * gimbal rings turn about it, an escape wheel advances a tooth on every half
 * beat, a balance wheel swings against it, and the jewel at the centre takes
 * the song's lub-dub. It stands at the centre of the clockwork rings
 * (`stage.heart`), lights on its word and winds down into them.
 */

/** The movement's radius at scale 1, and how far in front of the z = 0 plane it stands. */
const RADIUS = 0.9
const FRONT = 0.4
const NEAR = (CAM_Z - FRONT) / CAM_Z

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (v: number) => {
  const x = clamp01(v)
  return x * x * (3 - 2 * x)
}
const backOut = (v: number) => {
  const x = clamp01(v) - 1
  return 1 + 2.4 * x * x * x + 1.4 * x * x
}

/** A flat gear: `teeth` square teeth on a rim, spokes to a hub, extruded. */
function gear(teeth: number, outer: number, depth: number, spokes: number) {
  const root = outer * 0.84
  const shape = new THREE.Shape()
  const step = (Math.PI * 2) / teeth
  for (let i = 0; i < teeth; i++) {
    const a = i * step
    const corners: [number, number][] = [
      [a, root],
      [a + step * 0.2, outer],
      [a + step * 0.5, outer],
      [a + step * 0.7, root],
    ]
    for (const [angle, r] of corners) {
      const x = Math.cos(angle) * r
      const y = Math.sin(angle) * r
      if (i === 0 && r === root && angle === a) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
  }
  shape.closePath()
  // Windows between the spokes, leaving a rim and a hub.
  const rim = root * 0.82
  const hub = outer * 0.24
  const gap = (Math.PI * 2) / spokes
  for (let k = 0; k < spokes; k++) {
    const from = k * gap + gap * 0.14
    const to = (k + 1) * gap - gap * 0.14
    const hole = new THREE.Path()
    hole.absarc(0, 0, rim, from, to, false)
    hole.absarc(0, 0, hub, to, from, true)
    hole.closePath()
    shape.holes.push(hole)
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.25,
    bevelSize: depth * 0.2,
    bevelSegments: 2,
    curveSegments: 24,
  })
  geometry.translate(0, 0, -depth / 2)
  return geometry
}

const ESCAPE_TEETH = 15

export function Heart() {
  const { ref } = useScene()
  const group = useRef<THREE.Group>(null)
  const rings = useRef<(THREE.Mesh | null)[]>([])
  const escape = useRef<THREE.Mesh>(null)
  const third = useRef<THREE.Mesh>(null)
  const balance = useRef<THREE.Group>(null)
  const jewel = useRef<THREE.Mesh>(null)
  const ruby = useRef<THREE.MeshStandardMaterial>(null)
  const peak = useRef(0)
  const onset = useRef(0)

  const parts = useMemo(() => {
    return {
      escape: gear(ESCAPE_TEETH, 0.4, 0.05, 5),
      third: gear(24, 0.27, 0.04, 4),
      rim: new THREE.TorusGeometry(0.33, 0.022, 10, 64),
      spoke: new THREE.BoxGeometry(0.62, 0.03, 0.02),
      gimbals: [0.9, 0.76, 0.62].map(
        (r) => new THREE.TorusGeometry(r, 0.018, 8, 96)
      ),
      jewel: new THREE.OctahedronGeometry(0.1, 0),
    }
  }, [])

  useFrame(() => {
    const s = ref.current
    const g = group.current
    if (!g) return
    const level = s.cues.orb
    g.visible = level > 0.004 || s.frames < 3
    if (level <= 0.004) peak.current = 0
    if (!g.visible) return
    if (level <= 0.004) {
      g.scale.setScalar(1e-4)
      return
    }
    if (s.onset.orb !== onset.current) {
      onset.current = s.onset.orb
      peak.current = 0
    }
    peak.current = Math.max(peak.current, level)
    const age = s.calm ? 99 : s.age.orb
    // Lighting up: a quick swell past its size. Leaving: smaller, lower, then gone.
    const arrive = backOut(age / 0.7)
    const held = age > 1.2 ? level / peak.current : 1
    const leave = 0.55 + 0.45 * smooth(held)
    const size = 0.6 + 0.4 * peak.current
    const [x, y, r] = s.heart
    g.position.set(x * NEAR, (y - (1 - held) * 0.45 * r) * NEAR, FRONT)
    g.scale.setScalar(
      ((r * 1.15 * NEAR) / RADIUS) *
        size *
        arrive *
        leave *
        clamp01((held - 0.42) / 0.25)
    )
    // The whole movement leans a little, so the brass catches the light.
    const t = s.motion
    g.rotation.set(
      -0.16 + Math.sin(t * 0.2) * 0.08,
      0.22 + Math.sin(t * 0.16) * 0.14,
      0
    )

    // The escapement: a tooth on every half beat, snapping, not gliding.
    const half = (s.calm ? 0 : s.song) / (BEAT / 2)
    const tick = Math.floor(half) + smooth((half - Math.floor(half)) / 0.22)
    const tooth = (Math.PI * 2) / ESCAPE_TEETH
    if (escape.current) escape.current.rotation.z = -tick * tooth
    if (third.current)
      third.current.rotation.z = tick * tooth * (ESCAPE_TEETH / 24) + 0.13
    // The balance swings once a beat against it.
    if (balance.current)
      balance.current.rotation.z = Math.sin(half * Math.PI) * 1.15
    // The gimbals turn slowly on their own axes, faster as the song lifts.
    const speed = 0.1 + 0.18 * s.energy
    rings.current.forEach((ring, i) => {
      if (!ring) return
      const a = t * speed * (i % 2 ? -1 : 1) * (1 + i * 0.35)
      ring.rotation.set(
        i === 0 ? a : Math.PI / 2,
        i === 1 ? a : 0.5 * i,
        i === 2 ? a : 0
      )
    })
    // The jewel takes the heartbeat.
    const beat = s.heartbeat
    if (jewel.current) {
      jewel.current.scale.setScalar(1 + 0.45 * beat)
      jewel.current.rotation.set(t * 0.6, t * 0.9, 0)
    }
    if (ruby.current) {
      ruby.current.emissive.copy(s.accent)
      ruby.current.emissiveIntensity = 0.7 + 2.4 * beat * (0.5 + 0.5 * s.energy)
    }
  })

  return (
    <group ref={group} visible={false}>
      {parts.gimbals.map((geometry, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            rings.current[i] = mesh
          }}
          geometry={geometry}
        >
          <meshStandardMaterial color='#7d7462' metalness={1} roughness={0.3} />
        </mesh>
      ))}
      <mesh ref={escape} geometry={parts.escape}>
        <meshStandardMaterial color='#7d7462' metalness={1} roughness={0.3} />
      </mesh>
      <mesh ref={third} geometry={parts.third} position={[0.5, -0.36, -0.06]}>
        <meshStandardMaterial color='#6f7f8a' metalness={1} roughness={0.22} />
      </mesh>
      <group ref={balance} position={[0, 0, 0.09]}>
        <mesh geometry={parts.rim}>
          <meshStandardMaterial
            color='#6f7f8a'
            metalness={1}
            roughness={0.22}
          />
        </mesh>
        <mesh geometry={parts.spoke}>
          <meshStandardMaterial
            color='#6f7f8a'
            metalness={1}
            roughness={0.22}
          />
        </mesh>
        <mesh geometry={parts.spoke} rotation-z={Math.PI / 2}>
          <meshStandardMaterial
            color='#6f7f8a'
            metalness={1}
            roughness={0.22}
          />
        </mesh>
      </group>
      <mesh ref={jewel} geometry={parts.jewel} position={[0, 0, 0.16]}>
        <meshStandardMaterial
          ref={ruby}
          color='#2a0a10'
          metalness={0.2}
          roughness={0.15}
          emissive='#91bfd7'
        />
      </mesh>
    </group>
  )
}
