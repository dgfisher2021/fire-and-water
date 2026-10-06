import { useState } from 'react'
import { ArrowUpDown, Check } from 'lucide-react'
import { Button, SheetAction, type SheetActionAction } from '@dust-ui/ui'
import { ALBUM_SORTS, type AlbumSort } from '@/lib/sort'
import { useShellRoot } from '@/components/shell-context'

const SORT_LABELS: Record<AlbumSort, string> = {
  album: 'Album order',
  title: 'A to Z',
  written: 'Date written',
  collection: 'By collection',
}

export type SortButtonProps = {
  value: AlbumSort
  onChange: (sort: AlbumSort) => void
}

/**
 * A quiet icon button that opens an action sheet of the list orders, the
 * current one in the primary tone with a check; the sheet pins inside the
 * shell root, over the nav.
 */
export function SortButton({ value, onChange }: SortButtonProps) {
  const shellRoot = useShellRoot()
  const [open, setOpen] = useState(false)
  const actions: SheetActionAction[] = ALBUM_SORTS.map((sort) => ({
    label:
      sort === value ? (
        <span className='inline-flex items-center gap-1.5 font-semibold'>
          {SORT_LABELS[sort]}
          <Check className='size-4' aria-hidden />
          <span className='sr-only'>(current)</span>
        </span>
      ) : (
        <span className='text-foreground'>{SORT_LABELS[sort]}</span>
      ),
    onClick: () => onChange(sort),
  }))
  return (
    <>
      <Button
        variant='ghost'
        size='icon'
        aria-label='Sort songs'
        aria-haspopup='dialog'
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className='shrink-0 rounded-full bg-card text-muted-foreground hover:text-foreground'
      >
        <ArrowUpDown aria-hidden />
      </Button>
      {open && (
        <SheetAction
          title='Sort songs'
          actions={actions}
          onClose={() => setOpen(false)}
          container={shellRoot}
        />
      )}
    </>
  )
}
