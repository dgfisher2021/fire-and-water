import { useEffect, useRef, useState } from 'react'
import { Download, Film, Share2 } from 'lucide-react'
import { useMobileShellRoot } from '@dust-ui/blocks'
import {
  Button,
  downloadUrl,
  formatTime,
  SegmentedControl,
  SheetBottom,
} from '@dust-ui/ui'
import type { Track } from '@/data/tracks'
import {
  canRecordVideo,
  recordLyricVideo,
  type LyricVideo,
} from '@/lib/lyric-video'
import { usePlayer } from '@/store/player'
import { usePrefs } from '@/store/prefs'

const LENGTHS: Record<string, number> = { '30': 30, '60': 60 }

export type LyricVideoSheetProps = {
  track: Track
  onClose: () => void
}

type Phase =
  | { at: 'ready' }
  | { at: 'recording'; done: number }
  | { at: 'done'; video: LyricVideo; url: string }
  | { at: 'failed'; message: string }

/**
 * Make a lyric video of the song in the browser: choose where it starts,
 * record (in real time, out loud), then share or download the file. The
 * shape and length come from Settings, Lyric video.
 */
export function LyricVideoSheet({ track, onClose }: LyricVideoSheetProps) {
  const root = useMobileShellRoot()
  const aspect = usePrefs((s) => s.videoAspect)
  const length = usePrefs((s) => s.videoLength)
  const pause = usePlayer((s) => s.pause)
  const here = usePlayer((s) => (s.track === track.id ? s.currentTime : 0))
  const [start, setStart] = useState<'top' | 'here'>(here > 1 ? 'here' : 'top')
  const [phase, setPhase] = useState<Phase>({ at: 'ready' })
  const abort = useRef<AbortController | null>(null)

  // Stop a recording in progress and free the preview when the sheet goes.
  useEffect(
    () => () => {
      abort.current?.abort()
    },
    []
  )
  useEffect(() => {
    if (phase.at !== 'done') return
    const url = phase.url
    return () => URL.revokeObjectURL(url)
  }, [phase])

  const from = start === 'here' ? Math.floor(here) : 0
  const seconds = LENGTHS[length] ?? track.duration - from
  const name = `${track.audioFile.replace(/\.[^.]+$/, '')}-lyric-video`

  const record = async () => {
    pause()
    abort.current = new AbortController()
    setPhase({ at: 'recording', done: 0 })
    try {
      const video = await recordLyricVideo({
        track,
        aspect,
        from,
        seconds,
        signal: abort.current.signal,
        onProgress: (done) => setPhase({ at: 'recording', done }),
      })
      setPhase({ at: 'done', video, url: URL.createObjectURL(video.blob) })
    } catch (e) {
      if ((e as Error).name === 'AbortError') setPhase({ at: 'ready' })
      else setPhase({ at: 'failed', message: (e as Error).message })
    }
  }

  const share = async (video: LyricVideo, url: string) => {
    const file = new File([video.blob], `${name}.${video.extension}`, {
      type: video.blob.type,
    })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator
        .share({ files: [file], title: track.title })
        .catch(() => {})
    } else downloadUrl(url, file.name)
  }

  return (
    <SheetBottom
      title='Lyric video'
      onClose={onClose}
      grabber
      scrim
      maxHeight='86%'
      container={root}
    >
      <div className='flex flex-col gap-4 px-4 pb-6'>
        {!canRecordVideo() ? (
          <p className='text-[13px] text-muted-foreground'>
            This browser can’t record video. Try Chrome, Edge or a recent
            Safari.
          </p>
        ) : phase.at === 'done' ? (
          <>
            <video
              src={phase.url}
              controls
              playsInline
              className='mx-auto max-h-[46dvh] rounded-lg bg-background'
            />
            <div className='flex gap-2'>
              <Button
                className='flex-1 gap-2'
                onClick={() => void share(phase.video, phase.url)}
              >
                <Share2 className='size-4' aria-hidden />
                Share
              </Button>
              <Button
                variant='outline'
                className='flex-1 gap-2'
                onClick={() =>
                  downloadUrl(phase.url, `${name}.${phase.video.extension}`)
                }
              >
                <Download className='size-4' aria-hidden />
                Download
              </Button>
            </div>
            <Button variant='ghost' onClick={() => setPhase({ at: 'ready' })}>
              Record another
            </Button>
          </>
        ) : (
          <>
            <p className='text-[13px] leading-normal text-muted-foreground'>
              {track.title} as a {aspect} video,{' '}
              {LENGTHS[length]
                ? `${LENGTHS[length]} seconds`
                : 'the whole song'}
              {start === 'here'
                ? ` from ${formatTime(from)}`
                : ' from the start'}
              . It records in real time and plays out loud while it does. Change
              the shape and length in Settings.
            </p>
            {here > 1 && phase.at === 'ready' && (
              <SegmentedControl
                options={[
                  { value: 'top', label: 'From the start' },
                  { value: 'here', label: `From ${formatTime(here)}` },
                ]}
                value={start}
                onChange={(v) => setStart(v as 'top' | 'here')}
                height={44}
              />
            )}
            {phase.at === 'recording' ? (
              <>
                <div className='h-1.5 w-full overflow-hidden rounded-full bg-foreground/15'>
                  <div
                    className='h-full bg-linear-to-r from-track-deep to-track-bright transition-[width] duration-200'
                    style={{ width: `${Math.round(phase.done * 100)}%` }}
                  />
                </div>
                <Button
                  variant='outline'
                  onClick={() => abort.current?.abort()}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button className='gap-2' onClick={() => void record()}>
                <Film className='size-4' aria-hidden />
                Record
              </Button>
            )}
            {phase.at === 'failed' && (
              <p className='text-[13px] text-destructive'>{phase.message}</p>
            )}
          </>
        )}
      </div>
    </SheetBottom>
  )
}
