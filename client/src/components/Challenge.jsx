import { useEffect, useMemo, useRef, useState } from 'react'
import { api, todayStr } from '../api.js'
import { Spinner } from '../App.jsx'
import ConfirmModal from './Modal.jsx'

const DURATIONS = [
  { days: 7, label: 'Tydzień', emoji: '🌱' },
  { days: 14, label: 'Dwa tygodnie', emoji: '🔥' },
  { days: 30, label: 'Miesiąc', emoji: '💎' },
]

const CONFETTI_EMOJI = ['🎉', '✨', '🎨', '⭐', '🧡', '🖌️']

async function compressImage(file, maxSize = 1200, quality = 0.82) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 3,
        duration: 3.5 + Math.random() * 2.5,
        size: 1 + Math.random() * 0.8,
        emoji: CONFETTI_EMOJI[i % CONFETTI_EMOJI.length],
      })),
    [],
  )
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}rem`,
            animation: `confetti ${p.duration}s linear ${p.delay}s infinite`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  )
}

function StatTile({ value, label, delay }) {
  return (
    <div
      className="animate-[slide-up_.4s_ease_both] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-2xl font-black text-transparent">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
    </div>
  )
}

export default function Challenge() {
  const [challenge, setChallenge] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wasReset, setWasReset] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [preview, setPreview] = useState(null)
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const [customDays, setCustomDays] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    api(`/challenge?date=${todayStr()}`)
      .then((data) => {
        setChallenge(data.challenge)
        setWasReset(Boolean(data.wasReset))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function start(days) {
    setError('')
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setError('Podaj liczbę dni od 1 do 365')
      return
    }
    try {
      const data = await api('/challenge', {
        method: 'POST',
        body: { targetDays: days, date: todayStr() },
      })
      setChallenge(data.challenge)
      setWasReset(false)
    } catch (err) {
      setError(err.message)
    }
  }

  async function abandon() {
    setConfirmAbandon(false)
    try {
      await api('/challenge', { method: 'DELETE' })
      setChallenge(null)
      setWasReset(false)
    } catch (err) {
      setError(err.message)
    }
  }

  async function onFilePicked(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      const dataUrl = await compressImage(file)
      setPreview(dataUrl)
    } catch {
      setError('Nie udało się wczytać obrazka')
    }
  }

  async function submitArtwork() {
    if (!preview) return
    setUploading(true)
    setError('')
    try {
      const data = await api('/artworks', {
        method: 'POST',
        body: { image: preview, title: title.trim(), date: todayStr() },
      })
      setChallenge(data.challenge)
      setWasReset(false)
      setPreview(null)
      setTitle('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <Spinner />

  if (!challenge) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="mb-2 inline-block animate-[float_5s_ease-in-out_infinite] text-5xl">
          🎯
        </div>
        <h2 className="text-2xl font-black">Rozpocznij wyzwanie</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
          Wybierz, przez ile dni z rzędu chcesz codziennie dodać jeden rysunek.
          Jeśli opuścisz dzień — pasek wraca do zera!
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {DURATIONS.map((d, i) => (
            <button
              key={d.days}
              onClick={() => start(d.days)}
              className="group animate-[slide-up_.4s_ease_both] rounded-2xl border border-white/10 bg-white/5 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/50 hover:bg-amber-400/10 hover:shadow-xl hover:shadow-amber-500/10 active:scale-95"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <span className="block text-3xl transition-transform duration-300 group-hover:scale-125">
                {d.emoji}
              </span>
              <span className="mt-2 block text-xl font-black text-zinc-100 group-hover:text-amber-300">
                {d.days} dni
              </span>
              <span className="text-xs text-zinc-500">{d.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 animate-[slide-up_.4s_ease_.27s_both]">
          <div className="mb-3 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
              albo własna liczba dni
            </span>
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              start(Number(customDays))
            }}
            className="mx-auto flex max-w-xs gap-2"
          >
            <input
              type="number"
              min={1}
              max={365}
              placeholder="np. 3 albo 100"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center font-bold text-zinc-100 placeholder-zinc-600 outline-none transition-all [appearance:textfield] focus:border-amber-400/60 focus:bg-white/10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="submit"
              disabled={!customDays}
              className="shrink-0 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-2.5 font-bold text-zinc-950 shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:shadow-amber-500/40 active:scale-95 disabled:opacity-40 disabled:shadow-none"
            >
              Start 🚀
            </button>
          </form>
          <p className="mt-2 text-center text-xs text-zinc-600">od 1 do 365 dni</p>
        </div>

        {error && (
          <p className="mt-4 animate-[scale-in_.25s_ease_both] rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            {error}
          </p>
        )}
      </div>
    )
  }

  const { targetDays, completedDays, doneToday, completed } = challenge
  const pct = Math.round((completedDays / targetDays) * 100)

  return (
    <div className="space-y-5">
      {completed && <Confetti />}

      {wasReset && (
        <div className="animate-[scale-in_.3s_ease_both] rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm leading-relaxed text-red-300 backdrop-blur">
          <span className="mr-1.5 text-base">😿</span>
          <strong>Przerwa w serii!</strong> Opuszczono dzień, więc postęp wrócił
          do zera. Dzisiejszy rysunek liczy się jako dzień 1 — do dzieła!
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <StatTile value={`${completedDays}`} label="dni z rzędu" delay={0} />
        <StatTile value={`${pct}%`} label="ukończono" delay={70} />
        <StatTile
          value={`${targetDays - completedDays}`}
          label="dni do celu"
          delay={140}
        />
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-black">
            Wyzwanie {targetDays} dni{' '}
            <span className="inline-block">
              {completed ? '🏆' : '🔥'}
            </span>
          </h2>
          <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-3xl font-black text-transparent">
            {completedDays}
            <span className="text-base font-semibold text-zinc-600">
              /{targetDays}
            </span>
          </span>
        </div>

        <div className="h-5 overflow-hidden rounded-full border border-white/5 bg-zinc-900/80">
          <div
            className={`relative h-full overflow-hidden rounded-full transition-all duration-1000 ease-out ${
              completed
                ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 shadow-[0_0_18px_rgba(16,185,129,.5)]'
                : 'bg-gradient-to-r from-amber-500 via-amber-400 to-orange-300 shadow-[0_0_18px_rgba(251,191,36,.4)]'
            }`}
            style={{ width: `${Math.max(pct, completedDays > 0 ? 4 : 0)}%` }}
          >
            <div className="absolute inset-0 animate-[shimmer_2.2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          </div>
        </div>

        <p className="mt-2.5 text-right text-xs text-zinc-500">
          {completed
            ? 'Ukończone — brawo! 🎉'
            : doneToday
              ? 'Dzisiejszy rysunek dodany ✅'
              : 'Dodaj dzisiejszy rysunek, aby podbić pasek'}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {Array.from({ length: targetDays }, (_, i) => (
            <div
              key={`${i}-${i < completedDays}`}
              title={`Dzień ${i + 1}`}
              className={`flex items-center justify-center rounded-xl font-bold transition-all duration-300 ${
                targetDays > 30
                  ? 'h-7 w-7 text-[10px]'
                  : 'h-9 w-9 text-xs'
              } ${
                i < completedDays
                  ? completed
                    ? 'animate-[pop_.45s_cubic-bezier(.5,1.8,.5,1)_both] bg-gradient-to-br from-emerald-400 to-teal-500 text-zinc-950 shadow-lg shadow-emerald-500/25'
                    : 'animate-[pop_.45s_cubic-bezier(.5,1.8,.5,1)_both] bg-gradient-to-br from-amber-400 to-orange-500 text-zinc-950 shadow-lg shadow-amber-500/25'
                  : 'border border-white/5 bg-zinc-900/60 text-zinc-600'
              }`}
              style={
                i < completedDays
                  ? { animationDelay: `${Math.min(i * 40, 1200)}ms` }
                  : undefined
              }
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {completed ? (
        <div className="animate-[scale-in_.4s_cubic-bezier(.34,1.56,.64,1)_both] rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-8 text-center backdrop-blur-xl">
          <span className="inline-block animate-bounce text-5xl">🏆</span>
          <p className="mt-3 text-xl font-black text-emerald-300">
            Ukończono wyzwanie {targetDays} dni!
          </p>
          <p className="mt-1 text-sm text-emerald-400/70">
            Niezła seria. Czas podnieść poprzeczkę?
          </p>
          <p className="mt-2 text-xs text-emerald-400/60">
            Wyzwanie trafiło do zakładki „Wyzwania” 🏆 — obejrzysz tam cały
            postęp dzień po dniu i wybierzesz okładkę.
          </p>
          <button
            onClick={abandon}
            className="mt-5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 px-6 py-2.5 font-bold text-zinc-950 shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/40 active:scale-95"
          >
            Rozpocznij nowe wyzwanie
          </button>
        </div>
      ) : doneToday ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
          <span className="text-3xl">☕</span>
          <p className="mt-2 font-semibold text-zinc-300">Na dziś gotowe!</p>
          <p className="mt-1 text-sm text-zinc-500">
            Wróć jutro z kolejnym rysunkiem, aby utrzymać serię.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <h3 className="mb-4 font-bold">Dzisiejszy rysunek</h3>

          {preview ? (
            <div className="animate-[scale-in_.3s_ease_both] space-y-3">
              <img
                src={preview}
                alt="Podgląd"
                className="max-h-80 w-full rounded-2xl border border-white/10 bg-zinc-950/60 object-contain"
              />
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all focus:border-amber-400/60 focus:bg-white/10"
                placeholder="Tytuł pracy (opcjonalnie)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
              />
              <div className="flex gap-2">
                <button
                  onClick={submitArtwork}
                  disabled={uploading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 py-3 font-bold text-zinc-950 shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:shadow-amber-500/40 active:scale-[.98] disabled:opacity-50"
                >
                  {uploading ? 'Wysyłanie…' : 'Dodaj i podbij pasek 🔥'}
                </button>
                <button
                  onClick={() => {
                    setPreview(null)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-zinc-300 transition-all hover:bg-white/10 active:scale-95"
                >
                  Anuluj
                </button>
              </div>
            </div>
          ) : (
            <label className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 py-12 text-zinc-400 transition-all duration-300 hover:border-amber-400/60 hover:bg-amber-400/5 hover:text-amber-300">
              <span className="text-4xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110">
                📷
              </span>
              <span className="mt-3 text-sm font-semibold">
                Kliknij, aby wybrać zdjęcie rysunku
              </span>
              <span className="mt-1 text-xs text-zinc-600">
                JPG, PNG — skompresujemy je automatycznie
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFilePicked}
              />
            </label>
          )}
        </div>
      )}

      {error && (
        <p className="animate-[scale-in_.25s_ease_both] rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}

      {!completed && (
        <div className="text-center">
          <button
            onClick={() => setConfirmAbandon(true)}
            className="text-xs text-zinc-600 underline-offset-4 transition-colors hover:text-red-400 hover:underline"
          >
            Porzuć wyzwanie i zacznij od nowa
          </button>
        </div>
      )}

      <ConfirmModal
        open={confirmAbandon}
        icon="🗑️"
        danger
        title="Porzucić wyzwanie?"
        message="Postęp paska zostanie skasowany, ale wszystkie rysunki zostaną w galerii."
        confirmLabel="Porzuć"
        onConfirm={abandon}
        onClose={() => setConfirmAbandon(false)}
      />
    </div>
  )
}
