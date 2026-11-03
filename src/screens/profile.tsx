import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { MobileAppScreen, useMobileShellFramed } from '@dust-ui/blocks'
import { Button, MobilePageHeader, Pill, Provenance } from '@dust-ui/ui'
import { INSIGHTS, type StyleName } from '@/data/creator-insights'
import { ALBUM } from '@/data/tracks'
import { KpiTiles } from '@/components/insights/kpi-tiles'
import { PublishingRhythm } from '@/components/insights/publishing-rhythm'
import { StyleConstellation } from '@/components/insights/style-constellation'
import { StyleDiversity } from '@/components/insights/style-diversity'
import { StyleDurations } from '@/components/insights/style-durations'
import { StyleEvolution } from '@/components/insights/style-evolution'
import { StyleRelationships } from '@/components/insights/style-relationships'
import { StyleSongsSheet } from '@/components/insights/style-songs-sheet'
import { styleVar } from '@/components/insights/style-var'
import { TopStyles } from '@/components/insights/top-styles'

/** "Nov 2, 2026" from the export's ISO date. */
const AS_OF = new Date(`${INSIGHTS.asOf}T12:00:00`).toLocaleDateString(
  'en-US',
  { month: 'short', day: 'numeric', year: 'numeric' }
)
const LEAD = INSIGHTS.topStyles.allTime.styles[0]

/**
 * Dustin as a Suno creator: who he is with a way to his Suno page, then
 * his latest creator insights, one glass panel per figure. A style tapped
 * anywhere opens this album's songs in it.
 */
export function ProfileScreen() {
  const framed = useMobileShellFramed()
  const navigate = useNavigate()
  const [style, setStyle] = useState<StyleName | null>(null)

  return (
    <MobileAppScreen
      className='style-ramp'
      header={
        <MobilePageHeader
          eyebrow={`${INSIGHTS.handle} on Suno`}
          title={
            <span className='font-display text-[26px] font-medium'>
              Profile
            </span>
          }
          subtitle={`Creator insights · as of ${AS_OF}`}
          trailing={
            <Button
              variant='ghost'
              onClick={() => void navigate({ to: '/more' })}
              className='rounded-md bg-card/60 px-3 text-[13px] backdrop-blur-md'
            >
              Done
            </Button>
          }
          statusBarInset={framed}
        />
      }
    >
      <div className='flex flex-col gap-5 px-4 pt-1 pb-6'>
        <section
          aria-label='About the creator'
          className='flex flex-col gap-4 rounded-lg border border-border bg-card/85 p-4 backdrop-blur-md'
        >
          <div className='flex items-center gap-4'>
            <img
              src='assets/icon-192.png'
              alt=''
              className='size-18 shrink-0 rounded-lg shadow-[-6px_6px_22px_-8px_var(--chart-1),6px_6px_22px_-8px_var(--chart-10)]'
            />
            <div className='min-w-0'>
              <p className='font-display text-[28px] leading-none font-medium text-foreground'>
                {ALBUM.handle}
              </p>
              <p className='mt-1.5 text-[13px] text-muted-foreground'>
                Written and performed by Dustin
              </p>
              <div className='mt-2 flex flex-wrap gap-1.5'>
                <Pill color='var(--chart-6)'>{INSIGHTS.diversity.band}</Pill>
                <Pill color={styleVar(LEAD.style)}>
                  Mostly {LEAD.style.toLowerCase()}
                </Pill>
              </div>
            </div>
          </div>
          <p className='font-display text-[19px] leading-snug text-foreground/90 italic'>
            {INSIGHTS.totals.publicSongs} public songs in{' '}
            {INSIGHTS.diversity.recognizedStyles} styles, and at his steadiest a
            new one every week for {INSIGHTS.rhythm.longestWeeklyStreak} weeks
            straight.
          </p>
          <Button
            variant='outline'
            nativeButton={false}
            render={
              <a
                href={ALBUM.sunoUrl}
                target='_blank'
                rel='noopener noreferrer'
              />
            }
            className='w-full gap-2 rounded-md bg-card/60'
          >
            Open {ALBUM.handle} on Suno
            <ExternalLink className='size-4' aria-hidden />
          </Button>
        </section>

        <KpiTiles />
        <TopStyles onStyle={setStyle} />
        <StyleConstellation onStyle={setStyle} />
        <StyleEvolution />
        <PublishingRhythm />
        <StyleDiversity />
        <StyleRelationships />
        <StyleDurations onStyle={setStyle} />

        <Provenance
          count={INSIGHTS.analyzed}
          total={INSIGHTS.totals.publicSongs}
          unit='public songs analysed'
          asOf={AS_OF}
          items={['Suno creator insights']}
          className='px-1'
        />
      </div>

      {style && (
        <StyleSongsSheet style={style} onClose={() => setStyle(null)} />
      )}
    </MobileAppScreen>
  )
}
