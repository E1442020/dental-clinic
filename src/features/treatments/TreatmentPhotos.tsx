import * as React from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useTreatmentPhotoUrl } from './api'

function PhotoThumbnail({ path, label, onOpen }: { path: string; label: string; onOpen: (url: string) => void }) {
  const { data: url, isLoading } = useTreatmentPhotoUrl(path)

  if (isLoading || !url) {
    return (
      <div className="flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground">
        {label}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(url)}
      className="group relative size-16 shrink-0 overflow-hidden rounded-md border border-border"
    >
      <img src={url} alt={label} className="size-full object-cover transition-transform group-hover:scale-105" />
      <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[9px] font-semibold text-white">
        {label}
      </span>
    </button>
  )
}

/** Renders before/after treatment photo thumbnails (if any) with a click-to-enlarge lightbox. */
export function TreatmentPhotos({ beforeUrl, afterUrl }: { beforeUrl: string | null; afterUrl: string | null }) {
  const [lightbox, setLightbox] = React.useState<string | null>(null)

  if (!beforeUrl && !afterUrl) return null

  return (
    <>
      <div className="flex gap-2">
        {beforeUrl && <PhotoThumbnail path={beforeUrl} label="قبل" onOpen={setLightbox} />}
        {afterUrl && <PhotoThumbnail path={afterUrl} label="بعد" onOpen={setLightbox} />}
      </div>
      <Dialog open={!!lightbox} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-w-2xl p-2">
          {lightbox && <img src={lightbox} alt="" className="max-h-[80vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </>
  )
}
