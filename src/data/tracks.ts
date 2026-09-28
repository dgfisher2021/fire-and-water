import { z } from 'zod'

export const trackIdSchema = z.enum(['pencil', 'fire', 'water'])
export type TrackId = z.infer<typeof trackIdSchema>

const trackSchema = z.object({
  id: trackIdSchema,
  title: z.string(),
  /** Short dedication for the home card. */
  dedication: z.string(),
  /** Full dedication with the date, for the lyrics header. */
  dedicationDated: z.string(),
  voice: z.string(),
  description: z.string(),
  audioFile: z.string(),
  /** Fallback length in seconds until the element reports metadata. */
  duration: z.number().positive(),
  art: z.object({ full: z.string(), thumb: z.string() }),
  /** Browser chrome color while this track is showing. */
  themeColor: z.string(),
  driveLink: z.url(),
  lyrics: z.array(z.array(z.string()).min(1)).min(1),
})
export type Track = z.infer<typeof trackSchema>

export const TRACK_ORDER: readonly TrackId[] = ['pencil', 'fire', 'water']

export const ALBUM = {
  title: 'Fire & Water',
  artist: 'Dustin & Alex',
  tagline: '“You can’t tame the flame.”',
} as const

/** The pair the side-by-side view compares. */
export const SPLIT_PAIR = { left: 'fire', right: 'water' } as const satisfies {
  left: TrackId
  right: TrackId
}

export const TRACKS: Record<TrackId, Track> = {
  pencil: trackSchema.parse({
    id: 'pencil',
    title: 'Pencil and Pen',
    dedication: 'For Alex, from Dustin',
    dedicationDated: 'For Alex, from Dustin — March 2, 2026',
    voice: 'Dustin’s voice',
    description:
      'A boy who only trusted pencil—erasable, safe, fixable—watches his sister fill journals in permanent ink. Her anger, sadness, and grief poured out fearlessly while he suppressed everything, prayed at night, and bought their lies.',
    audioFile: 'pencil-and-pen.m4a',
    duration: 190,
    art: { full: 'assets/pencil.jpg', thumb: 'assets/pencil-512.jpg' },
    themeColor: '#161009',
    driveLink:
      'https://drive.google.com/file/d/1alDGqv4GfkOC7aRniQswafWXkRDxqAkS/view?usp=drivesdk',
    lyrics: [
      [
        'My dear sister,',
        'you know.. it’s true.',
        'The fire in me',
        'was lit by you.',
      ],
      [
        'I remember this rebel,',
        'so wild and free..',
        'Transforming feelings',
        'to poetry.',
      ],
      [
        'With journal open,',
        'and pen in hand..',
        'You’d fill the pages',
        'without a plan.',
      ],
      [
        'Drawn to pencil,',
        'I hated pen..',
        'Could not erase',
        'or start again.',
      ],
      [
        'With pencil I could',
        'fix mistakes..',
        'Erase the parts',
        'that I would hate.',
      ],
      [
        'Your anger, sadness,',
        'pain and grief..',
        'Your pen gave every',
        'hurt relief.',
      ],
      [
        'You felt it all',
        'and wrote it free..',
        'Your words flowed out',
        'authentically.',
      ],
      ['So much I felt', 'I couldn’t say..', 'Just wanted it', 'to go away.'],
      [
        'So much inside,',
        'held in, suppressed..',
        'So much of me',
        'forced down, repressed.',
      ],
      [
        'I tried so hard',
        'to get it right..',
        'The perfect boy',
        'who prayed at night.',
      ],
      [
        'I learned “the truth.”',
        'I stayed in line..',
        'Followed their rules',
        'and bought their lies.',
      ],
      [
        'You got put down,',
        'called difficult..',
        'While I got sucked',
        'into that cult.',
      ],
      [
        'But watching you',
        'just write it out..',
        'The anger, sadness,',
        'fear and doubt..',
      ],
      [
        'Inspired me',
        'more than you knew..',
        'Couldn’t feel yet',
        'but wanted to.',
      ],
      [
        'You didn’t give up,',
        'you figured it out..',
        'Forced me to face',
        'my own self-doubt.',
      ],
    ],
  }),
  fire: trackSchema.parse({
    id: 'fire',
    title: 'Fire and Water',
    dedication: 'From Dustin, to Alex',
    dedicationDated: 'From Dustin, to Alex — March 8, 2026',
    voice: 'Dustin’s voice',
    description:
      'She was fire—bold, roaring, untamed. He was water—patient, adaptive, persistent. She gave him the courage to speak. He showed her that temperance isn’t weakness. Their parents’ guilt was never hers to carry.',
    audioFile: 'fire-and-water.m4a',
    duration: 400,
    art: { full: 'assets/fire.jpg', thumb: 'assets/fire-512.jpg' },
    themeColor: '#170c06',
    driveLink:
      'https://drive.google.com/file/d/1xaNe-xR3muX_Ptnk9gaGRnwNnCzhpg1T/view?usp=drivesdk',
    lyrics: [
      [
        'You lit the fire',
        'inside of me..',
        'My words now flow,',
        'I’m finally free.',
      ],
      [
        'I had to learn',
        'your element..',
        'To speak my truth,',
        'say what I meant.',
      ],
      [
        'Your fire gave me',
        'strength and pride..',
        'Unlocked the voice',
        'I kept inside.',
      ],
      [
        'To stand my ground,',
        'to roar, be bold..',
        'Stop being quiet,',
        'do what I’m told.',
      ],
      [
        'But somewhere in',
        'the years between..',
        'You needed something',
        'you learned from me.',
      ],
      [
        'The years had shaped',
        'a different you..',
        'Fierce but nurturing,',
        'more patient too.',
      ],
      [
        'Our roles reversed,',
        'our stories turned..',
        'My element',
        'you slowly learned.',
      ],
      [
        'From bridges burned,',
        'to second chance..',
        'Your temper turned',
        'to temperance.',
      ],
      [
        'Water adapts,',
        'it is not weak..',
        'It’s knowing how',
        'to act or speak.',
      ],
      [
        'When water’s frozen,',
        'as solid ice..',
        'It’s cold, unmoving,',
        'sharp and precise.',
      ],
      [
        'When boiling hot,',
        'it turns to steam..',
        'Which burns like fire,',
        'its heat unseen.',
      ],
      [
        'A river with',
        'persistence flows..',
        'With time and patience,',
        'it’ll carve through stone.',
      ],
      [
        'And water falls',
        'as tears or rain..',
        'Refreshing, cleansing,',
        'healing pain.',
      ],
      [
        'Floods can rise',
        'beyond control..',
        'A tidal wave',
        'that swallows whole.',
      ],
      [
        'Our parents’ voice,',
        'their weight and blame..',
        'As if YOUR fire',
        'was theirs to tame.',
      ],
      [
        'When they expect',
        'a fast reply..',
        'You don’t owe them',
        'a reason why.',
      ],
      [
        'Two girls to teach,',
        'a home to build..',
        'Still expectations',
        'are not fulfilled.',
      ],
      [
        'Their guilt, their weight,',
        'their keeping scores..',
        'Let go of theirs,',
        'they are not yours.',
      ],
      [
        'Your feelings strong,',
        'a swelling tide..',
        'Your currents pull',
        'from deep inside.',
      ],
      [
        'But feelings pass',
        'and wash away..',
        'Redirect,',
        'don’t let them stay.',
      ],
      [
        'The anger that',
        'would once explode..',
        'You’ve channeled into',
        'inner growth.',
      ],
      [
        'You bend and flow,',
        'you hold and give..',
        'You teach with patience',
        'and forgive.',
      ],
      [
        'Both raging storm',
        'and peaceful calm..',
        'The fiercest sister,',
        'the loving mom.',
      ],
      [
        'We learn from each other',
        'again and again..',
        'Both fire and water,',
        'with pencil or pen.',
      ],
      [
        'My dear sister,',
        'you know it’s true..',
        'The best parts of me',
        'are inspired by you.',
      ],
    ],
  }),
  water: trackSchema.parse({
    id: 'water',
    title: 'Water and Fire',
    dedication: 'By Dustin, as Alex',
    dedicationDated: 'By Dustin, as Alex — March 8, 2026',
    voice: 'Alex’s voice',
    description:
      'The same story through her eyes. Her fire was never theirs to tame. She channels what used to explode into raising her girls, building a home, and letting go of weight that was never hers to hold.',
    audioFile: 'water-and-fire.m4a',
    duration: 295,
    art: { full: 'assets/water.jpg', thumb: 'assets/water-512.jpg' },
    themeColor: '#0a0e1a',
    driveLink:
      'https://drive.google.com/file/d/1YYdTRD2NAwVekt9VPjAajvD8GQyl727Y/view?usp=drivesdk',
    lyrics: [
      [
        'Your fire’s lit,',
        'I always knew..',
        'You had the words',
        'inside of you.',
      ],
      [
        'While you learned',
        'my element..',
        'To speak your truth,',
        'say what you meant.',
      ],
      [
        'I see you full',
        'of strength and pride..',
        'Unlocked the voice',
        'you kept inside.',
      ],
      [
        'To stand your ground,',
        'to roar, be bold..',
        'Stop being quiet,',
        'do what you’re told.',
      ],
      [
        'But somewhere in',
        'the years between..',
        'I needed something',
        'I learned from you.',
      ],
      [
        'The years had shaped',
        'a different me..',
        'Fierce but nurturing,',
        'more patient, free.',
      ],
      [
        'Our roles reversed,',
        'our stories turned..',
        'Your element',
        'I’ve slowly learned.',
      ],
      [
        'From bridges burned,',
        'to second chance..',
        'My temper turned',
        'to temperance.',
      ],
      [
        'Water adapts,',
        'it is not weak..',
        'It’s knowing how',
        'to act or speak.',
      ],
      [
        'When water’s frozen,',
        'as solid ice..',
        'It’s cold, unmoving,',
        'sharp, precise.',
      ],
      [
        'When boiling hot,',
        'it turns to steam..',
        'Which burns like fire,',
        'its heat unseen.',
      ],
      [
        'A river with',
        'persistence flows..',
        'With patience, time',
        'will carve through stone.',
      ],
      [
        'And water falls',
        'as tears or rain..',
        'Refreshing, cleansing,',
        'healing pain.',
      ],
      [
        'Floods can rise',
        'beyond control..',
        'A tidal wave',
        'that swallows whole.',
      ],
      [
        'I hold no guilt,',
        'no weight or blame..',
        'MY fire was never',
        'theirs to tame.',
      ],
      [
        'I will respect..',
        'and always try',
        'those that show',
        'a reason why.',
      ],
      [
        'My girls I teach,',
        'a home I build..',
        'And still more dreams',
        'not yet fulfilled.',
      ],
      [
        'The anger that',
        'would once explode..',
        'I’ve channeled into',
        'inner growth.',
      ],
      [
        'Let go of thoughts',
        'that are not mine..',
        'The guilt, the weight',
        'will fade in time.',
      ],
      [
        'My feelings strong,',
        'a swelling tide..',
        'My currents pull',
        'from deep inside.',
      ],
      [
        'Past feelings pass',
        'and wash away..',
        'Redirect,',
        'don’t let them stay.',
      ],
      [
        'I bend and flow,',
        'I hold and give..',
        'I teach with patience',
        'and forgive.',
      ],
      [
        'Both raging storm',
        'and peaceful calm..',
        'The fiercest sister,',
        'the loving mom.',
      ],
      [
        'We learn from each other',
        'again and again..',
        'Both fire and water,',
        'with pencil or pen.',
      ],
      [
        'My dear brother,',
        'you know it’s true..',
        'The best parts of me',
        'are inspired by you.',
      ],
    ],
  }),
}

export function adjacentTrack(id: TrackId, direction: 1 | -1): TrackId {
  const i = TRACK_ORDER.indexOf(id)
  return TRACK_ORDER[(i + direction + TRACK_ORDER.length) % TRACK_ORDER.length]
}

export function isLastTrack(id: TrackId) {
  return TRACK_ORDER.indexOf(id) === TRACK_ORDER.length - 1
}
