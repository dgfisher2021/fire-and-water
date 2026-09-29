/** Seconds to m:ss, floored, for time labels. */
export function formatTime(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds || 0))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}
