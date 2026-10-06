/** What a song is searched by: its title, who it is for, and the voice. */
export type Searchable = { title: string; dedication: string; voice: string }

/** Lowercase, accents stripped, spaces collapsed: "Café" and "cafe" meet. */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/** True when every word of the query appears in the song's title, dedication or voice. */
export function matchesTrack(t: Searchable, query: string): boolean {
  const words = fold(query).split(' ').filter(Boolean)
  if (words.length === 0) return true
  const hay = fold(`${t.title} ${t.dedication} ${t.voice}`)
  return words.every((w) => hay.includes(w))
}

/** The ids that match, in the order given. */
export function filterTracks<Id extends string>(
  ids: ReadonlyArray<Id>,
  lookup: (id: Id) => Searchable,
  query: string
): Id[] {
  return ids.filter((id) => matchesTrack(lookup(id), query))
}
