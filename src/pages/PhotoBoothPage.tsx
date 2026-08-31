import PhotoBooth from '../components/PhotoBooth'
import PhotoFeed from '../components/PhotoFeed'

export default function PhotoBoothPage() {
  return (
    <>
      <PhotoBooth />
      <section className="max-w-5xl mx-auto mt-12">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold">Foto Terbaru</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-gray-700/50 to-transparent" />
        </div>
        <PhotoFeed />
      </section>
    </>
  )
}
