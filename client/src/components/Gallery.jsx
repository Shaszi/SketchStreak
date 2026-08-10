import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Spinner } from '../App.jsx'
import ConfirmModal from './Modal.jsx'

export default function Gallery() {
  const [artworks, setArtworks] = useState(null)
  const [error, setError] = useState('')
  const [zoomed, setZoomed] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  useEffect(() => {
    api('/artworks')
      .then((data) => setArtworks(data.artworks))
      .catch((err) => setError(err.message))
  }, [])

  async function remove() {
    const id = toDelete
    setToDelete(null)
    try {
      await api(`/artworks/${id}`, { method: 'DELETE' })
      setArtworks((list) => list.filter((a) => a._id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  if (error)
    return (
      <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
        {error}
      </p>
    )
  if (!artworks) return <Spinner />

  if (artworks.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-xl">
        <span className="inline-block animate-[float_5s_ease-in-out_infinite] text-5xl">
          🎨
        </span>
        <p className="mt-4 font-semibold text-zinc-300">Galeria jest pusta</p>
        <p className="mt-1 text-sm text-zinc-500">
          Dodaj pierwszy rysunek w zakładce „Postęp”
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {artworks.map((a, i) => (
          <div
            key={a._id}
            className="group animate-[slide-up_.4s_ease_both] overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl hover:shadow-black/50"
            style={{ animationDelay: `${Math.min(i * 60, 600)}ms` }}
          >
            <button
              onClick={() => setZoomed(a)}
              className="relative block w-full cursor-zoom-in overflow-hidden"
            >
              <img
                src={a.image}
                alt={a.title || 'Rysunek'}
                className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="absolute bottom-2 left-3 text-xs font-semibold text-white opacity-0 transition-all duration-300 group-hover:opacity-100">
                Powiększ 🔍
              </span>
            </button>
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {a.title || 'Bez tytułu'}
                </p>
                <p className="text-xs text-zinc-500">{a.date}</p>
              </div>
              <button
                onClick={() => setToDelete(a._id)}
                title="Usuń"
                className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-all hover:bg-red-500/15 hover:text-red-400 active:scale-90"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex animate-[fade-in_.2s_ease_both] cursor-zoom-out items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setZoomed(null)}
        >
          <div className="max-h-full max-w-3xl animate-[scale-in_.3s_cubic-bezier(.34,1.56,.64,1)_both]">
            <img
              src={zoomed.image}
              alt={zoomed.title || 'Rysunek'}
              className="max-h-[85vh] w-auto rounded-2xl shadow-2xl shadow-black/80"
            />
            <p className="mt-3 text-center text-sm text-zinc-300">
              <span className="font-semibold">
                {zoomed.title || 'Bez tytułu'}
              </span>
              <span className="mx-2 text-zinc-600">·</span>
              {zoomed.date}
            </p>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(toDelete)}
        icon="🗑️"
        danger
        title="Usunąć ten rysunek?"
        message="Rysunek zniknie z galerii, ale postęp wyzwania zostaje bez zmian."
        confirmLabel="Usuń"
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </>
  )
}
