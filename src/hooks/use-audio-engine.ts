import { useEffect } from 'react'
import { getAudio } from '@/lib/audio'
import { usePlayer } from '@/store/player'

/**
 * Binds the singleton <audio> element to the player store. Mount once at the
 * root: element events drive status, a requestAnimationFrame loop drives the
 * playhead only while playing (so the scrubber stays smooth without timers).
 */
export function useAudioEngine() {
  const sync = usePlayer((s) => s._sync)
  const ended = usePlayer((s) => s._ended)

  useEffect(() => {
    const audio = getAudio()
    let frame = 0

    const tick = () => {
      sync({ currentTime: audio.currentTime })
      frame = requestAnimationFrame(tick)
    }
    const startTicking = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(tick)
    }
    const stopTicking = () => cancelAnimationFrame(frame)

    const onMetadata = () => sync({ duration: audio.duration || 0 })
    const onPlaying = () => {
      sync({ status: 'playing' })
      startTicking()
    }
    const onWaiting = () => sync({ status: 'loading' })
    const onPause = () => {
      stopTicking()
      sync({ status: 'paused', currentTime: audio.currentTime })
    }
    const onEnded = () => {
      stopTicking()
      ended()
    }
    const onSeeked = () => sync({ currentTime: audio.currentTime })

    audio.addEventListener('loadedmetadata', onMetadata)
    audio.addEventListener('durationchange', onMetadata)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('seeked', onSeeked)
    return () => {
      stopTicking()
      audio.removeEventListener('loadedmetadata', onMetadata)
      audio.removeEventListener('durationchange', onMetadata)
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('seeked', onSeeked)
    }
  }, [sync, ended])
}
