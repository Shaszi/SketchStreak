import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Spinner } from '../App.jsx'
import ConfirmModal from './Modal.jsx'

function formatDate(str) {
  if (!str) return '?'
  return new Date(`${str}T00:00:00`).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function ChallengeDetail({ id, onBack }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [zoomIdx, setZoomIdx] = useState(null)

  useEffect(() => {
    api(`/challenges/history/${id}`)
      .then(setData)
      .catch((err) => setError(err.message))
  }, [id])

  async function setCover(artworkId) {
    setError('')
    try {
      await api(`/challenges/history/${id}`, {
        method: 'PUT',
        body: { coverArtworkId: artworkId },
      })
      setData((d) => ({
        ...d,
        finished: { ...d.finished, coverArtworkId: artworkId },
      }))
    } catch (err) {
      setError(err.message)
    }
  }

  if (error)
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-sm text-zinc-400 hover:text-amber-300">
          ← Wróć do listy
        </button>
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      </div>
    )
  if (!data) return <Spinner />

  const { finished, artworks } = data
  const zoomed = zoomIdx !== null ? artworks[zoomIdx] : null

  return (
    <div className="animate-[slide-up_.3s_ease_both] space-y-5">
      <button
        onClick={onBack}
        className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm font-semibold text-zinc-300 transition-all hover:bg-white/10 active:scale-95"
      >
        ← Wróć do listy
      </button>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">
              Wyzwanie {finished.targetDays} dni 🏆
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {formatDate(finished.startDate)} → {formatDate(finished.endDate)}
              <span className="mx-2 text-zinc-700">·</span>
              {artworks.length}{' '}
              {artworks.length === 1 ? 'rysunek' : 'rysunków'}
            </p>
          </div>
          <span className="text-4xl">🎨</span>
        </div>
        <p className="mt-3 text-xs text-zinc-600">
          Kliknij rysunek, aby obejrzeć postęp dzień po dniu. Gwiazdką ★
          ustawisz okładkę wyzwania.
        </p>
      </div>

      {artworks.length === 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur-xl">
          <span className="text-4xl">🫥</span>
          <p className="mt-3 text-sm text-zinc-500">
            Rysunki z tego wyzwania zostały usunięte z galerii
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {artworks.map((a, i) => {
          const isCover = finished.coverArtworkId === a._id
          return (
            <div
              key={a._id}
              className="group animate-[slide-up_.4s_ease_both] overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl hover:shadow-black/50"
              style={{ animationDelay: `${Math.min(i * 60, 600)}ms` }}
            >
              <button
                onClick={() => setZoomIdx(i)}
                className="relative block w-full cursor-zoom-in overflow-hidden"
              >
                <img
                  src={a.image}
                  alt={a.title || `Dzień ${i + 1}`}
                  className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <span className="absolute left-2 top-2 rounded-lg bg-zinc-950/70 px-2 py-0.5 text-xs font-bold text-amber-300 backdrop-blur">
                  Dzień {i + 1}
                </span>
              </button>
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {a.title || 'Bez tytułu'}
                  </p>
                  <p className="text-xs text-zinc-500">{formatDate(a.date)}</p>
                </div>
                <button
                  onClick={() => setCover(a._id)}
                  title={isCover ? 'Okładka wyzwania' : 'Ustaw jako okładkę'}
                  className={`ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-lg transition-all active:scale-90 ${
                    isCover
                      ? 'text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,.6)]'
                      : 'text-zinc-600 hover:bg-amber-400/10 hover:text-amber-300'
                  }`}
                >
                  {isCover ? '★' : '☆'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex animate-[fade-in_.2s_ease_both] items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setZoomIdx(null)}
        >
          <div
            className="max-h-full max-w-3xl animate-[scale-in_.3s_cubic-bezier(.34,1.56,.64,1)_both]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              key={zoomed._id}
              src={zoomed.image}
              alt={zoomed.title || 'Rysunek'}
              className="max-h-[75vh] w-auto animate-[fade-in_.25s_ease_both] rounded-2xl shadow-2xl shadow-black/80"
            />
            <p className="mt-3 text-center text-sm text-zinc-300">
              <span className="font-bold text-amber-300">
                Dzień {zoomIdx + 1}/{artworks.length}
              </span>
              <span className="mx-2 text-zinc-600">·</span>
              <span className="font-semibold">
                {zoomed.title || 'Bez tytułu'}
              </span>
              <span className="mx-2 text-zinc-600">·</span>
              {formatDate(zoomed.date)}
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
                disabled={zoomIdx === 0}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 font-bold text-zinc-200 transition-all hover:bg-white/10 active:scale-95 disabled:opacity-30"
              >
                ‹ Poprzedni
              </button>
              <button
                onClick={() => setZoomIdx(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-400 transition-all hover:bg-white/10 active:scale-95"
              >
                Zamknij
              </button>
              <button
                onClick={() =>
                  setZoomIdx((i) => Math.min(artworks.length - 1, i + 1))
                }
                disabled={zoomIdx === artworks.length - 1}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 font-bold text-zinc-200 transition-all hover:bg-white/10 active:scale-95 disabled:opacity-30"
              >
                Następny ›
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChallengeHistory() {
  const [finished, setFinished] = useState(null)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  useEffect(() => {
    if (openId) return
    api('/challenges/history')
      .then((data) => setFinished(data.finished))
      .catch((err) => setError(err.message))
  }, [openId])

  async function remove() {
    const id = toDelete
    setToDelete(null)
    try {
      await api(`/challenges/history/${id}`, { method: 'DELETE' })
      setFinished((list) => list.filter((f) => f._id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  if (openId) {
    return <ChallengeDetail id={openId} onBack={() => setOpenId(null)} />
  }

  if (error)
    return (
      <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
        {error}
      </p>
    )
  if (!finished) return <Spinner />

  if (finished.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-xl">
        <span className="inline-block animate-[float_5s_ease-in-out_infinite] text-5xl">
          🏆
        </span>
        <p className="mt-4 font-semibold text-zinc-300">
          Brak ukończonych wyzwań
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Gdy dokończysz wyzwanie, trafi tutaj razem ze wszystkimi rysunkami —
          będzie można obejrzeć cały postęp dzień po dniu
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black">Ukończone wyzwania 🏆</h2>

      {finished.map((f, i) => (
        <div
          key={f._id}
          className="group flex animate-[slide-up_.4s_ease_both] items-stretch gap-4 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-3 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-400/30 hover:shadow-xl hover:shadow-black/40"
          style={{ animationDelay: `${Math.min(i * 70, 500)}ms` }}
        >
          <button
            onClick={() => setOpenId(f._id)}
            className="flex min-w-0 flex-1 items-center gap-4 text-left"
          >
            {f.cover ? (
              <img
                src={f.cover.image}
                alt={f.cover.title || 'Okładka'}
                className="h-20 w-20 shrink-0 rounded-2xl border border-white/10 object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/60 text-3xl">
                🎨
              </span>
            )}
            <div className="min-w-0">
              <p className="font-black text-zinc-100">
                Wyzwanie {f.targetDays} dni
                <span className="ml-2 inline-block rounded-lg bg-emerald-400/10 px-2 py-0.5 text-xs font-bold text-emerald-300">
                  ukończone ✓
                </span>
              </p>
              <p className="mt-1 truncate text-sm text-zinc-500">
                {formatDate(f.startDate)} → {formatDate(f.endDate)}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600">
                {f.artworkCount}{' '}
                {f.artworkCount === 1 ? 'rysunek' : 'rysunków'} · kliknij, aby
                obejrzeć postęp
              </p>
            </div>
          </button>
          <button
            onClick={() => setToDelete(f._id)}
            title="Usuń z historii"
            className="flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-lg text-zinc-600 transition-all hover:bg-red-500/15 hover:text-red-400 active:scale-90"
          >
            ✕
          </button>
        </div>
      ))}

      <ConfirmModal
        open={Boolean(toDelete)}
        icon="🗑️"
        danger
        title="Usunąć wpis z historii?"
        message="Rysunki zostaną w galerii — zniknie tylko wpis o ukończonym wyzwaniu."
        confirmLabel="Usuń"
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}
