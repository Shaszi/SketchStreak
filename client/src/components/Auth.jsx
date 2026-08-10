import { useState } from 'react'
import { api, setToken } from '../api.js'
import { BackgroundGlow } from '../App.jsx'

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register'
      const body =
        mode === 'login' ? { email, password } : { name, email, password }
      const data = await api(path, { method: 'POST', body })
      setToken(data.token)
      onLogin(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-zinc-100 placeholder-zinc-500 outline-none transition-all focus:border-amber-400/60 focus:bg-white/10 focus:shadow-lg focus:shadow-amber-500/10'

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 antialiased">
      <BackgroundGlow />

      <div className="relative w-full max-w-sm animate-[slide-up_.5s_ease_both]">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-block animate-[float_5s_ease-in-out_infinite] text-5xl drop-shadow-[0_0_25px_rgba(251,191,36,.35)]">
            ✏️
          </div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-100">
            Sketch
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Streak
            </span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Rysuj codziennie. Śledź swój postęp.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl"
        >
          <div className="flex rounded-xl border border-white/5 bg-zinc-950/60 p-1">
            {[
              ['login', 'Logowanie'],
              ['register', 'Rejestracja'],
            ].map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setError('')
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-300 ${
                  mode === m
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-zinc-950 shadow-lg shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'register' && (
            <div className="animate-[slide-up_.3s_ease_both]">
              <input
                className={inputCls}
                placeholder="Twoje imię"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>
          )}
          <input
            className={inputCls}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={inputCls}
            type="password"
            placeholder="Hasło (min. 6 znaków)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          {error && (
            <p className="animate-[scale-in_.25s_ease_both] rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 py-3 font-bold text-zinc-950 shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:shadow-amber-500/40 active:scale-[.98] disabled:opacity-50"
          >
            {busy ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950 align-middle" />
            ) : mode === 'login' ? (
              'Zaloguj się'
            ) : (
              'Załóż konto'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
