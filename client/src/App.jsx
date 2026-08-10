import { useEffect, useState } from 'react'
import { api, getToken, setToken } from './api.js'
import Auth from './components/Auth.jsx'
import Challenge from './components/Challenge.jsx'
import ChallengeHistory from './components/ChallengeHistory.jsx'
import Gallery from './components/Gallery.jsx'
import Notes from './components/Notes.jsx'

const TABS = [
  { id: 'challenge', label: 'Postęp', icon: '🎯' },
  { id: 'history', label: 'Wyzwania', icon: '🏆' },
  { id: 'gallery', label: 'Galeria', icon: '🖼️' },
  { id: 'notes', label: 'Notatki', icon: '📝' },
]

export function BackgroundGlow() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-48 left-1/2 h-[28rem] w-[44rem] -translate-x-1/2 animate-[glow_7s_ease-in-out_infinite] rounded-full bg-amber-500/10 blur-3xl" />
      <div className="absolute -right-24 top-1/3 h-96 w-96 animate-[glow_9s_ease-in-out_1.5s_infinite] rounded-full bg-orange-600/10 blur-3xl" />
      <div className="absolute -left-24 bottom-0 h-80 w-80 animate-[glow_8s_ease-in-out_3s_infinite] rounded-full bg-purple-600/10 blur-3xl" />
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-400" />
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState('challenge')

  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener('auth-expired', onExpired)
    return () => window.removeEventListener('auth-expired', onExpired)
  }, [])

  useEffect(() => {
    if (!getToken()) {
      setChecking(false)
      return
    }
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setChecking(false))
  }, [])

  function logout() {
    setToken(null)
    setUser(null)
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Spinner />
      </div>
    )
  }

  if (!user) {
    return <Auth onLogin={setUser} />
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
      <BackgroundGlow />

      <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <h1 className="text-lg font-black tracking-tight">
            <span className="mr-1.5 inline-block animate-[float_5s_ease-in-out_infinite]">
              ✏️
            </span>
            Sketch
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Streak
            </span>
          </h1>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-black text-zinc-950 shadow-lg shadow-amber-500/25">
                {user.name[0]?.toUpperCase()}
              </span>
              <span className="text-sm text-zinc-400">{user.name}</span>
            </div>
            <button
              onClick={logout}
              className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm text-zinc-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
            >
              Wyloguj
            </button>
          </div>
        </div>

        <nav className="mx-auto max-w-3xl px-4 pb-3">
          <div className="flex gap-1 rounded-2xl border border-white/5 bg-white/5 p-1 backdrop-blur">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300 active:scale-95 ${
                  tab === t.id
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-zinc-950 shadow-lg shadow-amber-500/25'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                <span className="mr-1.5">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="relative mx-auto max-w-3xl px-4 py-6">
        <div key={tab} className="animate-[slide-up_.35s_ease_both]">
          {tab === 'challenge' && <Challenge />}
          {tab === 'history' && <ChallengeHistory />}
          {tab === 'gallery' && <Gallery />}
          {tab === 'notes' && <Notes />}
        </div>
      </main>
    </div>
  )
}

export default App
