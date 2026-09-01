import PhotoBooth from '../components/PhotoBooth.tsx'
import PhotoFeed from '../components/PhotoFeed'

export default function PhotoBoothPage() {
  return (
    <>
      <PhotoBooth />
      <section className="booth-feed-section">
        <div className="booth-feed-heading">
          <p>memory lane</p>
          <h2>Foto terbaru</h2>
        </div>
        <PhotoFeed />
      </section>
    </>
  )
}
