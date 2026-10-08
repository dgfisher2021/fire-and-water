import { useEffect, useRef, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { Copy, Download, RotateCcw, Undo2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import { MotionNumber } from '@dust-ui/motion'
import {
  Button,
  downloadText,
  isLyricsLabel,
  MediaPlayer,
  MobileConfirmDialog,
  MobilePageHeader,
  useHotkeys,
} from '@dust-ui/ui'
import { TRACKS } from '@/data/tracks'
import { toaster } from '@/lib/toaster'
import { selectProgress, usePlayer } from '@/store/player'
import { Screen } from '@/components/screen'
import { useFramed, useShellRoot } from '@/components/shell-context'

type Marks = Map<string, number>
type Step = { key: string; before: number | undefined }

/** m:ss.t for a mark. */
const stamp = (s: number) =>
  `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`

/**
 * The timing.json entry for a song from the lines marked so far, by the
 * aligner's rules: an unmarked line keeps the previous mark, a label takes
 * the line after it, a stanza starts at its first sung line.
 */
function timingFromMarks(
  stanzas: ReadonlyArray<ReadonlyArray<string>>,
  marks: Marks
) {
  let prev = 0
  const lines = stanzas.map((stanza, i) => {
    const row = stanza.map((line, j) => {
      if (isLyricsLabel(line)) return NaN
      prev = marks.get(`${i}.${j}`) ?? prev
      return prev
    })
    for (let j = row.length - 1, after = prev; j >= 0; j--) {
      if (Number.isNaN(row[j])) row[j] = after
      else after = row[j]
    }
    return row.map((v) => Math.round(v * 100) / 100)
  })
  const starts = lines.map((row, i) => {
    const sung = row.filter((_, j) => !isLyricsLabel(stanzas[i][j]))
    return sung.length ? Math.min(...sung) : (row[0] ?? 0)
  })
  return { stanzas: starts, lines }
}

/**
 * Tap-to-time: play the song and mark each line as it starts (the Mark
 * button, or Space); tap any line to mark it again. Copy or download the
 * result as the song's timing.json entry.
 */
export function TimeScreen() {
  const { track } = useParams({ from: '/time/$track' })
  const t = TRACKS[track]
  const framed = useFramed()
  const shellRoot = useShellRoot()
  const loaded = usePlayer((s) => s.track)
  const status = usePlayer((s) => s.status)
  const isCurrent = loaded === track
  const playing = isCurrent && status === 'playing'
  const progress = usePlayer((s) => (isCurrent ? selectProgress(s) : 0))
  const duration = usePlayer((s) =>
    isCurrent && s.duration > 0 ? s.duration : t.duration
  )
  const play = usePlayer((s) => s.play)
  const pause = usePlayer((s) => s.pause)
  const seek = usePlayer((s) => s.seek)
  const [marks, setMarks] = useState<Marks>(() => new Map())
  const [steps, setSteps] = useState<Step[]>([])
  const [confirmReset, setConfirmReset] = useState(false)
  const pane = useRef<HTMLDivElement>(null)

  const sung = t.lyrics.flatMap((stanza, i) =>
    stanza.flatMap((line, j) => (isLyricsLabel(line) ? [] : [`${i}.${j}`]))
  )
  const next = sung.find((key) => !marks.has(key))

  const mark = (key: string) => {
    if (!isCurrent) return
    const time = usePlayer.getState().currentTime
    setSteps((s) => [...s, { key, before: marks.get(key) }])
    setMarks((m) => new Map(m).set(key, time))
  }
  const undo = () => {
    const last = steps.at(-1)
    if (!last) return
    setSteps((s) => s.slice(0, -1))
    setMarks((m) => {
      const out = new Map(m)
      if (last.before === undefined) out.delete(last.key)
      else out.set(last.key, last.before)
      return out
    })
  }
  const reset = () => {
    setMarks(new Map())
    setSteps([])
    setConfirmReset(false)
  }
  const json = () =>
    JSON.stringify({ [track]: timingFromMarks(t.lyrics, marks) })
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json())
      toaster.push('Timing copied', 'success')
    } catch {
      toaster.push('Could not copy the timing', 'error')
    }
  }

  // Space marks the next line; the player bar handles play and pause.
  useHotkeys({
    ' ': (e) => {
      if (!next) return
      e.preventDefault()
      mark(next)
    },
  })
  useEffect(() => {
    pane.current
      ?.querySelector('[data-next]')
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [next])

  return (
    <Screen
      scroll={false}
      header={
        <MobilePageHeader
          eyebrow='Time the lyrics'
          title={
            <span className='font-display text-[22px] leading-tight font-medium text-primary'>
              {t.title}
            </span>
          }
          subtitle={
            <>
              <MotionNumber
                value={marks.size}
                formatter={(v) => String(Math.round(v))}
                className='tabular-nums'
              />{' '}
              of {sung.length} lines marked · Mark or Space as each line starts
            </>
          }
          statusBarInset={framed}
        />
      }
    >
      <div className='shrink-0 px-4 pb-2'>
        <MediaPlayer
          variant='bar'
          glass
          title={t.title}
          duration={duration}
          progress={progress}
          onSeek={(ratio) => {
            if (!isCurrent) play(track)
            seek(ratio * duration)
          }}
          playing={playing}
          loading={isCurrent && status === 'loading'}
          onPlayPause={() => (playing ? pause() : play(track))}
        />
      </div>
      <div
        ref={pane}
        className='no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6'
      >
        {t.lyrics.map((stanza, i) => (
          <div key={i} className='mb-5'>
            {stanza.map((line, j) =>
              isLyricsLabel(line) ? (
                <div
                  key={j}
                  className='px-3 py-1 font-sans text-[11px] font-medium tracking-[3px] text-primary uppercase'
                >
                  {line.slice(1, -1)}
                </div>
              ) : (
                <button
                  key={j}
                  type='button'
                  data-next={next === `${i}.${j}` || undefined}
                  onClick={() => mark(`${i}.${j}`)}
                  className='flex w-full items-baseline gap-3 rounded-lg px-3 py-1.5 text-left text-foreground/70 data-next:bg-card data-next:text-foreground'
                >
                  <span className='w-14 shrink-0 font-mono text-[12px] text-muted-foreground tabular-nums'>
                    {marks.has(`${i}.${j}`)
                      ? stamp(marks.get(`${i}.${j}`)!)
                      : '–:––.–'}
                  </span>
                  <span className='font-display text-[17px] leading-snug'>
                    {line}
                  </span>
                </button>
              )
            )}
          </div>
        ))}
      </div>
      <div className='flex shrink-0 items-center gap-2 border-t border-border bg-card/85 px-4 pt-3 pb-[calc(var(--shell-bottom,0px)+12px)] backdrop-blur-md'>
        <Button
          size='lg'
          disabled={!isCurrent || !next}
          onClick={() => next && mark(next)}
          className='flex-1 rounded-full bg-linear-to-br from-track-bright to-track-deep text-track-foreground'
        >
          {!isCurrent ? 'Press play first' : next ? 'Mark' : 'All marked'}
        </Button>
        <Button
          variant='ghost'
          size='icon'
          aria-label='Undo last mark'
          disabled={!steps.length}
          onClick={undo}
        >
          <Undo2 aria-hidden />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          aria-label='Clear all marks'
          disabled={!marks.size}
          onClick={() => setConfirmReset(true)}
        >
          <RotateCcw aria-hidden />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          aria-label='Copy timing'
          disabled={!marks.size}
          onClick={() => void copy()}
        >
          <Copy aria-hidden />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          aria-label='Download timing'
          disabled={!marks.size}
          onClick={() =>
            downloadText(`timing-${track}.json`, json(), 'application/json')
          }
        >
          <Download aria-hidden />
        </Button>
      </div>
      {confirmReset &&
        shellRoot &&
        createPortal(
          <MobileConfirmDialog
            title='Clear all marks?'
            message={`The ${marks.size} ${marks.size === 1 ? 'line' : 'lines'} you have timed on this song will be forgotten.`}
            confirmLabel='Clear'
            onConfirm={reset}
            onCancel={() => setConfirmReset(false)}
          />,
          shellRoot
        )}
    </Screen>
  )
}
