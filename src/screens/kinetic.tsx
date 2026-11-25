import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link, useParams, useSearch } from '@tanstack/react-router'
import { createListener, createSignals, type Signals } from '@/kinetic/signals'
import { KINETIC_SONGS } from '@/kinetic/songs'
import { fitStage, stageFor } from '@/kinetic/stage'
import {
  createTextEngine,
  type LineReport,
  type TextEngine,
} from '@/kinetic/text-engine'
import {
  buildTimeline,
  cardAt,
  createFrame,
  frameAt,
  lineIndexAt,
  type SectionCard,
} from '@/kinetic/timeline'
import type { FrameSource } from '@/kinetic/types'
import { Maximize, Minimize, Volume2, VolumeX, X } from 'lucide-react'
import { MotionSparkles, MotionText, MotionTextMorph } from '@dust-ui/motion'
import {
  Button,
  MediaPlayButton,
  MediaScrubber,
  cn,
  useHotkeys,
  useMediaQuery,
} from '@dust-ui/ui'
import { TRACKS } from '@/data/tracks'
import { getAudio, listenToAudio } from '@/lib/audio'
import { loadPulse, type Pulse } from '@/lib/pulse'
import { selectProgress, usePlayer } from '@/store/player'

const KineticScene = lazy(() =>
  import('@/kinetic/scene').then((m) => ({ default: m.KineticScene }))
)

const REDUCED = '(prefers-reduced-motion: reduce)'
const COARSE = '(pointer: coarse)'
const FONTS = [
  "900 100px 'Cinzel Variable'",
  "400 100px 'Cinzel Variable'",
  "italic 500 100px 'Cormorant Garamond'",
]
const IDLE_MS = 2600
const DISPLAY = "'Cinzel Variable', serif"
const ITALIC = "'Cormorant Garamond', serif"

/**
 * A song as a kinetic lyric film: full window, the 3D scene behind the
 * typography, both drawn from the one audio element's clock.
 */
export function KineticScreen() {
  const { track } = useParams({ from: '/kinetic/$track' })
  const { t: startAt, hold, check } = useSearch({ from: '/kinetic/$track' })
  const t = TRACKS[track]
  const song = KINETIC_SONGS[track]
  const reduced = useMediaQuery(REDUCED)
  const coarse = useMediaQuery(COARSE)
  // Wide windows get the 16:9 stage, a phone held upright the 9:16 one.
  const [stage, setStage] = useState(() =>
    stageFor(window.innerWidth, window.innerHeight)
  )

  const timeline = useMemo(
    () => (song && t.timing ? buildTimeline(t, song) : null),
    [song, t]
  )
  // What the film hears: the analyser while the song plays, else its pulse.
  const pulse = useRef<Pulse | null>(null)
  const [heard] = useState(createSignals)
  useEffect(() => {
    let live = true
    pulse.current = null
    void loadPulse(t.audioFile).then((p) => {
      if (live) pulse.current = p
    })
    return () => {
      live = false
    }
  }, [t.audioFile])

  const isCurrent = usePlayer((s) => s.track === track)
  const status = usePlayer((s) => s.status)
  const playing = isCurrent && status === 'playing'
  const loading = isCurrent && status === 'loading'
  const progress = usePlayer((s) => (isCurrent ? selectProgress(s) : 0))
  const duration = usePlayer((s) =>
    isCurrent && s.duration > 0 ? s.duration : t.duration
  )
  const play = usePlayer((s) => s.play)
  const pause = usePlayer((s) => s.pause)
  const seek = usePlayer((s) => s.seek)

  // The film's clock: the audio element while this song is loaded.
  const now = useCallback(() => {
    const from = startAt ?? 0
    if (hold) return from
    return usePlayer.getState().track === track ? getAudio().currentTime : from
  }, [track, startAt, hold])

  const toggle = () => {
    if (playing) return pause()
    const fresh = !isCurrent
    play(track)
    if (fresh && startAt) seek(startAt)
    // Inside the gesture, so the analyser's context may start.
    listenToAudio()
  }
  // A finished song hands off to the next; the film ends with its own song.
  useEffect(
    () =>
      usePlayer.subscribe((s, prev) => {
        if (prev.track === track && s.track && s.track !== track) s.pause()
      }),
    [track]
  )

  const [section, setSection] = useState<string | null>(null)
  const [card, setCard] = useState<SectionCard | null>(null)
  const [cardOn, setCardOn] = useState(false)
  const shownSection = useRef<string | null>(null)
  const shownCard = useRef<SectionCard | null>(null)

  const [report, setReport] = useState<LineReport[] | null>(null)

  /* The typography, laid out once the faces are in and again when the stage turns. */
  const textRef = useRef<HTMLDivElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = textRef.current
    if (!host || !timeline) return
    let engine: TextEngine | null = null
    let raf = 0
    let live = true
    const ear = createListener()
    const sig = heard
    // Dev only: the signals, for a script to sample.
    if (import.meta.env.DEV)
      (globalThis as { __kinetic?: Signals }).__kinetic = sig
    let frames = 0
    const draw = () => {
      const time = now()
      const player = usePlayer.getState()
      const sounding =
        !hold && player.track === track && player.status === 'playing'
      // The context may only wake after a gesture: keep asking while it plays.
      if (sounding && !sig.live && frames++ % 45 === 0) listenToAudio()
      ear.read(pulse.current, time, sounding, sig)
      engine?.render(time, sig)
      // The header and the section cards are React's: tell it when they change.
      const at = lineIndexAt(timeline, time)
      const lyric = time >= timeline.firstLyric && time < timeline.outro
      const next = lyric && at >= 0 ? timeline.lines[at].section : null
      if (next !== shownSection.current) {
        shownSection.current = next
        setSection(next)
      }
      const card = cardAt(timeline, time)
      if (card !== shownCard.current) {
        shownCard.current = card
        if (card) setCard(card)
        setCardOn(!!card)
      }
      raf = requestAnimationFrame(draw)
    }
    void Promise.all(FONTS.map((f) => document.fonts.load(f, 'AZaz’'))).then(
      () => {
        if (!live) return
        engine = createTextEngine(host, timeline, reduced, stage)
        if (import.meta.env.DEV && check) {
          const found = engine.check()
          setReport(found)
          document.documentElement.dataset.kineticCheck = JSON.stringify({
            stage: stage.name,
            lines: timeline.lines.length,
            problems: found,
          })
        }
        draw()
      }
    )
    return () => {
      live = false
      cancelAnimationFrame(raf)
      engine?.dispose()
    }
  }, [timeline, reduced, now, stage, check, hold, track, heard])

  // The stage, chosen for the window's shape and scaled to fit it.
  useEffect(() => {
    const root = rootRef.current
    const fit = fitRef.current
    if (!root || !fit) return
    const apply = () => {
      const { width, height } = root.getBoundingClientRect()
      const next = stageFor(width, height)
      setStage(next)
      const { scale, left, top } = fitStage(next, width, height)
      fit.style.width = `${next.w}px`
      fit.style.height = `${next.h}px`
      fit.style.transform = `translate(${left}px, ${top}px) scale(${scale})`
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  const frame = useMemo<FrameSource | null>(() => {
    if (!timeline) return null
    const into = createFrame()
    return () =>
      frameAt(
        timeline,
        heard,
        now(),
        usePlayer.getState().status === 'playing',
        into
      )
  }, [timeline, now, heard])

  /* Controls: shown on movement, hidden while the film plays untouched. */
  const [awake, setAwake] = useState(true)
  const idle = useRef(0)
  const wake = () => {
    setAwake(true)
    window.clearTimeout(idle.current)
    idle.current = window.setTimeout(() => setAwake(false), IDLE_MS)
  }
  useEffect(() => () => window.clearTimeout(idle.current), [])
  const shown = awake || !playing
  // A finger has no hover: a tap starts the film, then shows or hides the controls.
  const touched = useRef(false)
  const tap = () => {
    if (!touched.current) return toggle()
    if (!playing) {
      toggle()
      return wake()
    }
    if (!awake) return wake()
    window.clearTimeout(idle.current)
    setAwake(false)
  }

  const [muted, setMuted] = useState(() => getAudio().muted)
  const mute = () => {
    const audio = getAudio()
    audio.muted = !audio.muted
    setMuted(audio.muted)
  }
  const [full, setFull] = useState(false)
  useEffect(() => {
    const sync = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void rootRef.current?.requestFullscreen?.()
  }
  const nudge = (seconds: number) => {
    if (!isCurrent) return
    seek(Math.min(Math.max(getAudio().currentTime + seconds, 0), duration))
    wake()
  }
  useHotkeys({
    ' ': toggle,
    k: toggle,
    ArrowRight: () => nudge(5),
    ArrowLeft: () => nudge(-5),
    f: fullscreen,
    m: mute,
  })

  // Finger-sized targets where there is no mouse.
  const big = coarse ? 'icon-lg' : 'icon'
  const bigClass = coarse ? 'size-12' : undefined

  return (
    <div
      ref={rootRef}
      data-slot='kinetic'
      className={cn(
        'dark fixed inset-0 overflow-hidden bg-background text-foreground',
        !shown && 'cursor-none'
      )}
      onPointerMove={(e) => e.pointerType !== 'touch' && wake()}
      onPointerDown={(e) => {
        touched.current = e.pointerType === 'touch'
        if (!touched.current) wake()
      }}
    >
      {frame && (
        <Suspense fallback={null}>
          <KineticScene frame={frame} stage={stage} />
        </Suspense>
      )}
      <div
        ref={fitRef}
        className='pointer-events-none absolute top-0 left-0 origin-top-left'
      >
        <div ref={textRef} className='absolute inset-0' />
        {/* The running header: the song, and the section morphing beside it. */}
        <div
          className={cn(
            'absolute flex items-baseline gap-7 whitespace-nowrap text-foreground transition-opacity duration-700',
            section ? 'opacity-60' : 'opacity-0'
          )}
          style={{ left: stage.x0, top: stage.headerTop }}
        >
          <span style={{ font: `italic 500 30px ${ITALIC}`, lineHeight: 1 }}>
            {t.title}
          </span>
          <span
            style={{
              font: `600 14px ${DISPLAY}`,
              letterSpacing: '0.34em',
              lineHeight: 1,
            }}
          >
            <MotionTextMorph className='uppercase'>
              {section ?? ''}
            </MotionTextMorph>
          </span>
        </div>
        {/* A section's name in the quiet before its first line. */}
        <div
          aria-hidden={!cardOn}
          className={cn(
            'absolute transition-opacity duration-500',
            cardOn ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            left: stage.x0,
            top: stage.cy - 52,
            color: card?.accent,
            font: `600 ${stage.cardSize}px ${DISPLAY}`,
            letterSpacing: '0.42em',
            lineHeight: 1,
          }}
        >
          {card && (
            <MotionSparkles
              key={`${card.label}${card.from}`}
              count={5}
              size={30}
              color={card.accent}
            >
              <MotionText
                as='p'
                per='char'
                preset='blur'
                stagger={0.06}
                duration={0.8}
                className='whitespace-nowrap uppercase'
              >
                {card.label}
              </MotionText>
              <span
                className={cn(
                  'mt-5 block h-px origin-left bg-linear-to-r from-current to-transparent transition-transform duration-1000 ease-out',
                  cardOn ? 'scale-x-100' : 'scale-x-0'
                )}
              />
            </MotionSparkles>
          )}
        </div>
      </div>

      {!timeline && (
        <p className='absolute inset-0 grid place-items-center p-8 text-center text-muted-foreground'>
          {t.title} has no kinetic film yet.
        </p>
      )}

      {/* Click anywhere to play or pause. */}
      <button
        type='button'
        aria-label={playing ? 'Pause' : 'Play'}
        className='absolute inset-0 cursor-[inherit]'
        onClick={tap}
        tabIndex={-1}
      />

      {report && (
        <pre className='absolute top-2 left-2 max-h-[90%] max-w-[90%] overflow-auto rounded-md bg-background/90 p-3 text-xs text-foreground'>
          {report.length
            ? report
                .map((r) => `${r.line}\n  ${r.problems.join('\n  ')}`)
                .join('\n')
            : `${stage.name}: every line fits`}
        </pre>
      )}

      <div
        className={cn(
          'absolute inset-x-0 top-0 flex items-center justify-end pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] transition-opacity duration-300',
          shown ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <Button
          variant='glass-ghost'
          size={big}
          className={bigClass}
          aria-label='Close the film'
          nativeButton={false}
          render={<Link to='/lyrics/$track' params={{ track }} />}
        >
          <X />
        </Button>
      </div>

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-linear-to-t from-background/85 to-transparent pt-16 pr-[max(1.25rem,env(safe-area-inset-right))] pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))] transition-opacity duration-300',
          shown ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onPointerDown={wake}
      >
        <div
          className={cn(
            'mx-auto flex max-w-5xl items-center',
            coarse ? 'gap-3' : 'gap-4'
          )}
        >
          <MediaPlayButton
            className={coarse ? 'size-14' : undefined}
            playing={playing}
            loading={loading}
            onClick={toggle}
          />
          <MediaScrubber
            className='min-w-0 flex-1'
            progress={progress}
            duration={duration}
            timeLabels='total'
            onSeek={(p) => {
              if (!isCurrent) play(track)
              seek(p * duration)
            }}
          />
          <Button
            variant='glass-ghost'
            size={big}
            className={bigClass}
            aria-label={muted ? 'Unmute' : 'Mute'}
            onClick={mute}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </Button>
          <Button
            variant='glass-ghost'
            size={big}
            className={bigClass}
            aria-label={full ? 'Leave full screen' : 'Full screen'}
            onClick={fullscreen}
          >
            {full ? <Minimize /> : <Maximize />}
          </Button>
        </div>
      </div>
    </div>
  )
}
