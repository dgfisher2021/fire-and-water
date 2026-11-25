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
import { KINETIC_SONGS } from '@/kinetic/songs'
import { STAGE_H, STAGE_W, X0 } from '@/kinetic/stage'
import { createTextEngine, type TextEngine } from '@/kinetic/text-engine'
import {
  buildTimeline,
  cardAt,
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
import { getAudio } from '@/lib/audio'
import { loadPulse, type Pulse } from '@/lib/pulse'
import { selectProgress, usePlayer } from '@/store/player'

const KineticScene = lazy(() =>
  import('@/kinetic/scene').then((m) => ({ default: m.KineticScene }))
)

const REDUCED = '(prefers-reduced-motion: reduce)'
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
  const { t: startAt, hold } = useSearch({ from: '/kinetic/$track' })
  const t = TRACKS[track]
  const song = KINETIC_SONGS[track]
  const reduced = useMediaQuery(REDUCED)

  const timeline = useMemo(
    () => (song && t.timing ? buildTimeline(t, song) : null),
    [song, t]
  )
  const [pulse, setPulse] = useState<Pulse | null>(null)
  useEffect(() => {
    let live = true
    void loadPulse(t.audioFile).then((p) => live && setPulse(p))
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

  /* The typography, laid out once the faces are in. */
  const textRef = useRef<HTMLDivElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = textRef.current
    if (!host || !timeline) return
    let engine: TextEngine | null = null
    let raf = 0
    let live = true
    const draw = () => {
      const time = now()
      engine?.render(time)
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
        engine = createTextEngine(host, timeline, pulse, reduced)
        draw()
      }
    )
    return () => {
      live = false
      cancelAnimationFrame(raf)
      engine?.dispose()
    }
  }, [timeline, pulse, reduced, now])

  // The 1920x1080 stage, scaled to fit the window.
  useEffect(() => {
    const root = rootRef.current
    const fit = fitRef.current
    if (!root || !fit) return
    const apply = () => {
      const { width, height } = root.getBoundingClientRect()
      const scale = Math.min(width / STAGE_W, height / STAGE_H)
      fit.style.transform = `translate(${(width - STAGE_W * scale) / 2}px, ${(height - STAGE_H * scale) / 2}px) scale(${scale})`
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  const frame = useMemo<FrameSource | null>(
    () =>
      timeline
        ? () =>
            frameAt(
              timeline,
              pulse,
              now(),
              usePlayer.getState().status === 'playing'
            )
        : null,
    [timeline, pulse, now]
  )

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

  return (
    <div
      ref={rootRef}
      data-slot='kinetic'
      className={cn(
        'dark fixed inset-0 overflow-hidden bg-background text-foreground',
        !shown && 'cursor-none'
      )}
      onPointerMove={wake}
      onPointerDown={wake}
    >
      {frame && (
        <Suspense fallback={null}>
          <KineticScene frame={frame} />
        </Suspense>
      )}
      <div
        ref={fitRef}
        className='pointer-events-none absolute top-0 left-0 origin-top-left'
        style={{ width: STAGE_W, height: STAGE_H }}
      >
        <div ref={textRef} className='absolute inset-0' />
        {/* The running header: the song, and the section morphing beside it. */}
        <div
          className={cn(
            'absolute flex items-baseline gap-7 whitespace-nowrap text-foreground transition-opacity duration-700',
            section ? 'opacity-60' : 'opacity-0'
          )}
          style={{ left: X0, top: 88 }}
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
            left: X0,
            top: STAGE_H / 2 - 52,
            color: card?.accent,
            font: `600 58px ${DISPLAY}`,
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
        onClick={toggle}
        tabIndex={-1}
      />

      <div
        className={cn(
          'absolute inset-x-0 top-0 flex items-center justify-end p-4 transition-opacity duration-300',
          shown ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <Button
          variant='glass-ghost'
          size='icon'
          aria-label='Close the film'
          nativeButton={false}
          render={<Link to='/lyrics/$track' params={{ track }} />}
        >
          <X />
        </Button>
      </div>

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-linear-to-t from-background/85 to-transparent px-5 pt-16 pb-5 transition-opacity duration-300',
          shown ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <div className='mx-auto flex max-w-5xl items-center gap-4'>
          <MediaPlayButton
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
            size='icon'
            aria-label={muted ? 'Unmute' : 'Mute'}
            onClick={mute}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </Button>
          <Button
            variant='glass-ghost'
            size='icon'
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
