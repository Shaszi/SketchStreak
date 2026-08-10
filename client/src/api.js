const TOKEN_KEY = 'sketchstreak_token'

// Na GitHub Pages nie ma proxy, więc adres backendu podajemy przy buildzie
// (zmienna VITE_API_URL, np. https://twoj-backend.onrender.com).
// Lokalnie zostaje pusty string — żądania /api łapie proxy Vite.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function todayStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    setToken(null)
    window.dispatchEvent(new Event('auth-expired'))
    throw new Error('Sesja wygasła — zaloguj się ponownie')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Błąd serwera (${res.status})`)
  return data
}
