import { useEffect } from 'react'

export default function ConfirmModal({
  open,
  icon = '⚠️',
  title,
  message,
  confirmLabel = 'Potwierdź',
  cancelLabel = 'Anuluj',
  danger = false,
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex animate-[fade-in_.2s_ease_both] items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm animate-[scale-in_.25s_cubic-bezier(.34,1.56,.64,1)_both] rounded-3xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl"
      >
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${
            danger
              ? 'bg-red-500/15 shadow-lg shadow-red-500/10'
              : 'bg-amber-400/15 shadow-lg shadow-amber-400/10'
          }`}
        >
          {icon}
        </div>
        <h3 className="mt-4 text-center text-lg font-bold text-zinc-100">
          {title}
        </h3>
        {message && (
          <p className="mt-1.5 text-center text-sm leading-relaxed text-zinc-400">
            {message}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-zinc-300 transition-all hover:bg-white/10 active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-95 ${
              danger
                ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40'
                : 'bg-gradient-to-r from-amber-400 to-orange-400 text-zinc-950 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
