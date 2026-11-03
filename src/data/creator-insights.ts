/**
 * dgfisher's Suno creator insights, transcribed from the dashboard export
 * `songs/creator insights/dgfisher-creator-insights-as-of-2026-11-02.png`
 * (1028x2912), read section by section from crops of the original.
 *
 * To refresh from the next export: crop each section at full size with
 * Pillow, read every figure, replace the blocks below and `asOf`, then run
 * `pnpm test` (creator-insights.test.ts checks the figures agree with each
 * other: shares against counts, week bars against their total, and so on).
 * Values the export draws but does not print are marked where they appear.
 */

export type StyleName =
  | 'Cinematic'
  | 'Electronic'
  | 'Trance'
  | 'Folk'
  | 'Pop'
  | 'Orchestral'
  | 'Classical'
  | 'Acoustic'
  | 'Rap'
  | 'Rock'
  | 'EDM'
  | 'Ambient'
  | 'Alternative Pop'
  | 'Country'
  | 'Dream Pop'
  | 'Dubstep'

export type StyleCount = { style: StyleName; songs: number }
/** A ranked style with its share of the styled songs, as printed. */
export type StyleShare = StyleCount & { percent: number }

export type DiversityBand = 'Focused' | 'Balanced' | 'Exploratory'

/** Seconds; `range` and `middle` are read off the bars, to about 5 s. */
export type StyleDuration = StyleCount & {
  average: number
  range: readonly [number, number]
  middle: readonly [number, number]
  /** The range runs past the chart's 7:00+ edge (the max is 7:00 or more). */
  pastEdge?: boolean
}

export type CreatorInsights = {
  asOf: string
  handle: string
  source: string
  analyzed: number
  totals: {
    publicSongs: number
    playlists: number
    averageSeconds: number
    last30Days: number
  }
  topStyles: Record<
    'allTime' | 'last30Days',
    { songs: number; styled: number; styles: readonly StyleShare[] }
  >
  constellation: readonly StyleCount[]
  evolution: readonly { month: string; style: StyleName; songs: number }[]
  rhythm: {
    activeWeeks: { active: number; of: number }
    activeMonths: { active: number; of: number }
    longestWeeklyStreak: number
    longestMonthlyStreak: number
    latestWeeksSongs: number
    weeks: readonly { start: string; songs: number }[]
    months: readonly { month: string; songs: number; derived?: boolean }[]
  }
  diversity: {
    index: number
    band: DiversityBand
    bands: readonly DiversityBand[]
    note: string
    recognizedStyles: number
    top3Share: number
    styledSongs: number
  }
  relationships: {
    styles: readonly StyleName[]
    pairs: readonly { a: StyleName; b: StyleName; songs: number }[]
    links: readonly { a: StyleName; b: StyleName }[]
  }
  durations: readonly StyleDuration[]
}

export const INSIGHTS: CreatorInsights = {
  asOf: '2026-11-02',
  handle: 'dgfisher',
  source: 'Suno creator insights export, 2026-11-02',
  /** "118 of 118 public songs analyzed." */
  analyzed: 118,

  totals: {
    publicSongs: 118,
    playlists: 4,
    /** 4:53 */
    averageSeconds: 293,
    last30Days: 16,
  },

  topStyles: {
    /** 97 of 118 songs had recognized style signals; shares are of the 97. */
    allTime: {
      songs: 118,
      styled: 97,
      styles: [
        { style: 'Cinematic', songs: 48, percent: 49 },
        { style: 'Electronic', songs: 24, percent: 25 },
        { style: 'Trance', songs: 18, percent: 19 },
        { style: 'Folk', songs: 17, percent: 18 },
        { style: 'Pop', songs: 16, percent: 16 },
      ],
    },
    /** The rolling 30-day window: 16 songs, all 16 styled. */
    last30Days: {
      songs: 16,
      styled: 16,
      styles: [
        { style: 'Cinematic', songs: 8, percent: 50 },
        { style: 'EDM', songs: 5, percent: 31 },
        { style: 'Trance', songs: 4, percent: 25 },
        { style: 'Dream Pop', songs: 3, percent: 19 },
      ],
    },
  },

  /** Every style the constellation draws, sized by song count. */
  constellation: [
    { style: 'Cinematic', songs: 48 },
    { style: 'Electronic', songs: 24 },
    { style: 'Trance', songs: 18 },
    { style: 'Folk', songs: 17 },
    { style: 'Pop', songs: 16 },
    { style: 'Orchestral', songs: 13 },
    { style: 'Classical', songs: 11 },
    { style: 'Acoustic', songs: 10 },
    { style: 'Rap', songs: 10 },
    { style: 'Rock', songs: 9 },
    { style: 'EDM', songs: 7 },
    // Its label sits on a white cover; 6 fits the bubble's size and order.
    { style: 'Ambient', songs: 6 },
    { style: 'Alternative Pop', songs: 5 },
    { style: 'Country', songs: 5 },
  ],

  /** The leading style per month and that month's public songs. */
  evolution: [
    { month: '2026-06', style: 'Cinematic', songs: 30 },
    { month: '2026-07', style: 'Cinematic', songs: 11 },
    { month: '2026-08', style: 'Cinematic', songs: 18 },
    { month: '2026-09', style: 'Cinematic', songs: 19 },
    { month: '2026-10', style: 'Cinematic', songs: 15 },
    { month: '2026-11', style: 'Dubstep', songs: 1 },
  ],

  rhythm: {
    activeWeeks: { active: 16, of: 16 },
    activeMonths: { active: 7, of: 12 },
    longestWeeklyStreak: 18,
    longestMonthlyStreak: 7,
    /** "Latest 16 weeks: 57 songs". */
    latestWeeksSongs: 57,
    /**
     * Songs per week, oldest first, from the bar heights (one song is one
     * step; they add to 57). Weeks start on Monday, ending with the export's
     * own week: inferred, and it agrees with the month totals.
     */
    weeks: [
      { start: '2026-07-20', songs: 4 },
      { start: '2026-07-27', songs: 3 },
      { start: '2026-08-03', songs: 1 },
      { start: '2026-08-10', songs: 5 },
      { start: '2026-08-17', songs: 6 },
      { start: '2026-08-24', songs: 3 },
      { start: '2026-08-31', songs: 3 },
      { start: '2026-09-07', songs: 5 },
      { start: '2026-09-14', songs: 4 },
      { start: '2026-09-21', songs: 5 },
      { start: '2026-09-28', songs: 3 },
      { start: '2026-10-05', songs: 7 },
      { start: '2026-10-12', songs: 1 },
      { start: '2026-10-19', songs: 3 },
      { start: '2026-10-26', songs: 3 },
      { start: '2026-11-02', songs: 1 },
    ],
    /**
     * The last 12 months. Jun to Nov from Style evolution; Dec to Apr are
     * the inactive chips. May prints no number: 24 is the 118 less the rest,
     * and its chip's shade agrees.
     */
    months: [
      { month: '2025-12', songs: 0 },
      { month: '2026-01', songs: 0 },
      { month: '2026-02', songs: 0 },
      { month: '2026-03', songs: 0 },
      { month: '2026-04', songs: 0 },
      { month: '2026-05', songs: 24, derived: true },
      { month: '2026-06', songs: 30 },
      { month: '2026-07', songs: 11 },
      { month: '2026-08', songs: 18 },
      { month: '2026-09', songs: 19 },
      { month: '2026-10', songs: 15 },
      { month: '2026-11', songs: 1 },
    ],
  },

  diversity: {
    index: 81,
    band: 'Exploratory',
    /** Low to high, drawn as equal thirds of the scale. */
    bands: ['Focused', 'Balanced', 'Exploratory'],
    note: 'Style signals are spread broadly, with no small group dominating the catalog.',
    recognizedStyles: 37,
    /** The top three styles' share of every style signal, percent. */
    top3Share: 38,
    styledSongs: 97,
  },

  relationships: {
    /** The styles in the network, with their song counts. */
    styles: [
      'Cinematic',
      'Electronic',
      'Trance',
      'Folk',
      'Pop',
      'Orchestral',
      'Classical',
      'Acoustic',
    ],
    /** The pairs the export lists, most shared first. */
    pairs: [
      { a: 'Cinematic', b: 'Electronic', songs: 13 },
      { a: 'Cinematic', b: 'Orchestral', songs: 11 },
      { a: 'Cinematic', b: 'Folk', songs: 10 },
      { a: 'Acoustic', b: 'Cinematic', songs: 9 },
      { a: 'Cinematic', b: 'Pop', songs: 9 },
      { a: 'Cinematic', b: 'Trance', songs: 8 },
    ],
    /** Lines the network draws with no printed count (fewer shared songs). */
    links: [
      { a: 'Classical', b: 'Cinematic' },
      { a: 'Electronic', b: 'Trance' },
      { a: 'Trance', b: 'Folk' },
      { a: 'Acoustic', b: 'Electronic' },
      { a: 'Acoustic', b: 'Folk' },
      { a: 'Acoustic', b: 'Pop' },
    ],
  },

  /** Styles with at least two timed songs. The chart's edge is 7:00+. */
  durations: [
    {
      style: 'Cinematic',
      songs: 48,
      average: 303,
      range: [180, 420],
      middle: [275, 330],
      pastEdge: true,
    },
    {
      style: 'Electronic',
      songs: 24,
      average: 287,
      range: [205, 420],
      middle: [255, 305],
      pastEdge: true,
    },
    {
      style: 'Trance',
      songs: 18,
      average: 292,
      range: [225, 385],
      middle: [265, 315],
    },
    {
      style: 'Folk',
      songs: 17,
      average: 291,
      range: [180, 415],
      middle: [265, 315],
    },
    {
      style: 'Pop',
      songs: 16,
      average: 245,
      range: [180, 335],
      middle: [220, 275],
    },
    {
      style: 'Orchestral',
      songs: 13,
      average: 316,
      range: [180, 415],
      middle: [285, 365],
    },
    {
      style: 'Classical',
      songs: 11,
      average: 322,
      range: [235, 375],
      middle: [285, 360],
    },
    {
      style: 'Acoustic',
      songs: 10,
      average: 289,
      range: [220, 365],
      middle: [245, 315],
    },
  ],
}

/** A style's song count in the constellation (every networked style has one). */
export const styleSongs = (style: StyleName): number | undefined =>
  INSIGHTS.constellation.find((s) => s.style === style)?.songs
