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
    loadPhotos()
    // Poll every 5 seconds for new photos
    const interval = setInterval(loadPhotos, 5000)
    return () => clearInterval(interval)
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
            <div className="aspect-square overflow-hidden">
              <img
                src={photo.public_url}
                alt={`Photo ${photo.created_at}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
              <button
                type="button"
                onClick={() => deletePhoto(photo.id, photo.storage_path)}
                className="px-2 py-1 bg-red-600/90 hover:bg-red-600 rounded text-xs text-white transition"
                title="Hapus foto"
              >
                Hapus
              </button>
            </div>
            <div className="text-[10px] text-gray-500 text-center mt-1 truncate">
              {new Date(photo.created_at).toLocaleString('id-ID')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
