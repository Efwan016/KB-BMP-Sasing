import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Photo {
  id: string
  storage_path: string
  public_url: string
  created_at: string
  event_id?: string | null
}

export default function PhotoFeed() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [shareNotice, setShareNotice] = useState<string | null>(null)

  const loadPhotos = async () => {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error loading photos:', error)
      setError('Gagal memuat foto')
    } else {
      setPhotos(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    // Defer the first request so React does not synchronously set state while
    // mounting this component (React 19 flags that as a cascading render).
    const initialLoad = window.setTimeout(() => { void loadPhotos() }, 0)
    window.addEventListener('photo-booth-uploaded', loadPhotos)
    return () => {
      window.removeEventListener('photo-booth-uploaded', loadPhotos)
      clearTimeout(initialLoad)
    }
  }, [])

  const deletePhoto = async (id: string, storagePath: string) => {
    if (!confirm('Hapus foto ini?')) return

    const { error: delError } = await supabase
      .from('photos')
      .delete()
      .eq('id', id)

    if (!delError) {
      await supabase.storage.from('photo-booth').remove([storagePath])
      setPhotos((prev) => prev.filter((p) => p.id !== id))
      if (selectedPhoto?.id === id) setSelectedPhoto(null)
      setMenuOpenId((prev) => (prev === id ? null : prev))
    } else {
      console.error('Delete photo failed:', delError)
      setError('Foto tidak dapat dihapus. Coba lagi.')
    }
  }

  const downloadPhoto = (photo: Photo) => {
    const link = document.createElement('a')
    link.href = photo.public_url
    link.download = `memory-lane-${photo.id}.png`
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setMenuOpenId(null)
  }

  const sharePhoto = async (photo: Photo) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Memory Lane',
          text: 'Lihat foto saya dari Memory Lane ✨',
          url: photo.public_url,
        })
      } else {
        await navigator.clipboard.writeText(photo.public_url)
        setShareNotice('Tautan foto berhasil disalin.')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      console.error('Share failed:', error)
      try {
        await navigator.clipboard.writeText(photo.public_url)
        setShareNotice('Dialog share tidak tersedia. Tautan foto sudah disalin.')
      } catch {
        setShareNotice('Tidak dapat membagikan foto saat ini.')
      }
    } finally {
      setMenuOpenId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 rounded-full border-2 border-gray-600 border-t-white animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm text-center">
        {error}
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        Belum ada foto. Foto akan muncul di sini setelah diupload.
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300">
            Feed Foto ({photos.length})
          </h3>
          <button
            type="button"
            onClick={loadPhotos}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden"
            >
              <div className="absolute right-2 top-2 z-10">
                <button
                  type="button"
                  onClick={() => setMenuOpenId((prev) => (prev === photo.id ? null : photo.id))}
                  className="flex size-8 items-center justify-center rounded-full bg-black/50 text-lg text-white hover:bg-black/70"
                  aria-label="Opsi foto"
                >
                  ⋯
                </button>

                {menuOpenId === photo.id && (
                  <div className="absolute right-0 top-10 min-w-36 rounded-lg border border-white/10 bg-slate-900/95 p-1 shadow-lg backdrop-blur-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPhoto(photo)
                        setMenuOpenId(null)
                      }}
                      className="block w-full rounded px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                    >
                      Lihat
                    </button>
                    <button
                      type="button"
                      onClick={() => sharePhoto(photo)}
                      className="block w-full rounded px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                    >
                      Share
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadPhoto(photo)}
                      className="block w-full rounded px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePhoto(photo.id, photo.storage_path)}
                      className="block w-full rounded px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10"
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedPhoto(photo)}
                className="block aspect-square w-full overflow-hidden"
              >
                <img
                  src={photo.public_url}
                  alt={`Photo ${photo.created_at}`}
                  className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                  loading="lazy"
                />
              </button>

              <div className="text-[10px] text-gray-500 text-center mt-1 truncate px-2 pb-2">
                {new Date(photo.created_at).toLocaleString('id-ID')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedPhoto && (
        <div className="memory-modal-backdrop" role="presentation" onMouseDown={() => { setSelectedPhoto(null); setShareNotice(null) }}>
          <div className="memory-modal" role="dialog" aria-modal="true" aria-label="Preview foto Memory Lane" onMouseDown={(event) => event.stopPropagation()}>
            <p className="memory-modal-kicker">Memory Lane · UT English Studies</p>
            <button
              type="button"
              onClick={() => { setSelectedPhoto(null); setShareNotice(null) }}
              className="memory-modal-close"
              aria-label="Tutup preview"
            >
              ×
            </button>

            <div className="memory-modal-photo"><img src={selectedPhoto.public_url} alt="Preview foto memory lane" /></div>

            <div className="memory-modal-footer">
              <span>
                {new Date(selectedPhoto.created_at).toLocaleString('id-ID')}
              </span>

              <div className="memory-modal-actions">
                <button
                  type="button"
                  onClick={() => sharePhoto(selectedPhoto)}
                  className="memory-modal-button memory-modal-share"
                >
                  ↗ Bagikan
                </button>
                <button
                  type="button"
                  onClick={() => downloadPhoto(selectedPhoto)}
                  className="memory-modal-button memory-modal-download"
                >
                  ↓ Unduh
                </button>
                <button
                  type="button"
                  onClick={() => deletePhoto(selectedPhoto.id, selectedPhoto.storage_path)}
                  className="memory-modal-button memory-modal-delete"
                >
                  Hapus
                </button>
              </div>
            </div>
            {shareNotice && <p className="memory-modal-notice" role="status">{shareNotice}</p>}
          </div>
        </div>
      )}
    </>
  )
}
