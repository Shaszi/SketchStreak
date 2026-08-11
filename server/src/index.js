import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import {
  User,
  Challenge,
  Artwork,
  Note,
  FinishedChallenge,
} from './models.js'
import { signToken, requireAuth } from './auth.js'

const PORT = process.env.PORT || 4000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const app = express()
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }))
app.use(express.json({ limit: '8mb' }))

// ---------- pomocnicze ----------

function daysBetween(fromStr, toStr) {
  const from = Date.parse(`${fromStr}T00:00:00Z`)
  const to = Date.parse(`${toStr}T00:00:00Z`)
  return Math.round((to - from) / 86400000)
}

function validDate(str) {
  return typeof str === 'string' && DATE_RE.test(str)
}

// Sprawdza, czy seria została przerwana (ostatni wpis wcześniej niż wczoraj)
// i jeśli tak — zeruje postęp. Zwraca true, gdy nastąpił reset.
async function applyResetIfBroken(challenge, today) {
  if (
    !challenge ||
    challenge.completed ||
    challenge.completedDays === 0 ||
    !challenge.lastEntryDate
  )
    return false
  if (daysBetween(challenge.lastEntryDate, today) > 1) {
    challenge.completedDays = 0
    challenge.lastEntryDate = null
    await challenge.save()
    return true
  }
  return false
}

function challengeJson(challenge, today) {
  return {
    targetDays: challenge.targetDays,
    completedDays: challenge.completedDays,
    completed: challenge.completed,
    doneToday: challenge.lastEntryDate === today,
  }
}

// ---------- auth ----------

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name?.trim() || name.trim().length < 2)
    return res.status(400).json({ error: 'Podaj imię (min. 2 znaki)' })
  if (!email?.includes('@'))
    return res.status(400).json({ error: 'Nieprawidłowy email' })
  if (!password || password.length < 6)
    return res.status(400).json({ error: 'Hasło musi mieć min. 6 znaków' })

  const existing = await User.findOne({ email: email.toLowerCase().trim() })
  if (existing)
    return res.status(409).json({ error: 'Konto z tym emailem już istnieje' })

  const user = await User.create({
    name: name.trim(),
    email,
    passwordHash: await bcrypt.hash(password, 10),
  })
  res.json({
    token: signToken(user),
    user: { id: user._id, name: user.name, email: user.email },
  })
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  const user = await User.findOne({ email: (email || '').toLowerCase().trim() })
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash)))
    return res.status(401).json({ error: 'Zły email lub hasło' })
  res.json({
    token: signToken(user),
    user: { id: user._id, name: user.name, email: user.email },
  })
})

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) return res.status(401).json({ error: 'Nie znaleziono konta' })
  res.json({ user: { id: user._id, name: user.name, email: user.email } })
})

// ---------- wyzwanie ----------

app.get('/api/challenge', requireAuth, async (req, res) => {
  const today = validDate(req.query.date) ? req.query.date : null
  if (!today) return res.status(400).json({ error: 'Brak parametru date' })

  const challenge = await Challenge.findOne({ userId: req.userId })
  if (!challenge) return res.json({ challenge: null })

  const wasReset = await applyResetIfBroken(challenge, today)
  res.json({ challenge: challengeJson(challenge, today), wasReset })
})

app.post('/api/challenge', requireAuth, async (req, res) => {
  const { targetDays, date } = req.body || {}
  if (!Number.isInteger(targetDays) || targetDays < 1 || targetDays > 365)
    return res.status(400).json({ error: 'Nieprawidłowa liczba dni' })
  if (!validDate(date)) return res.status(400).json({ error: 'Brak daty' })

  await Challenge.deleteMany({ userId: req.userId })
  const challenge = await Challenge.create({
    userId: req.userId,
    targetDays,
    startDate: date,
  })
  res.json({ challenge: challengeJson(challenge, date) })
})

app.delete('/api/challenge', requireAuth, async (req, res) => {
  await Challenge.deleteMany({ userId: req.userId })
  res.json({ ok: true })
})

// ---------- prace ----------

app.get('/api/artworks', requireAuth, async (req, res) => {
  const artworks = await Artwork.find({ userId: req.userId })
    .sort({ createdAt: -1 })
    .limit(500)
  res.json({ artworks })
})

app.post('/api/artworks', requireAuth, async (req, res) => {
  const { image, title, date } = req.body || {}
  if (typeof image !== 'string' || !image.startsWith('data:image/'))
    return res.status(400).json({ error: 'Nieprawidłowy obrazek' })
  if (image.length > 6_000_000)
    return res.status(400).json({ error: 'Obrazek jest za duży' })
  if (!validDate(date)) return res.status(400).json({ error: 'Brak daty' })

  const challenge = await Challenge.findOne({ userId: req.userId })
  if (!challenge)
    return res.status(400).json({ error: 'Najpierw rozpocznij wyzwanie' })
  if (challenge.completed)
    return res
      .status(400)
      .json({ error: 'Wyzwanie ukończone — rozpocznij nowe' })
  if (challenge.lastEntryDate === date)
    return res.status(409).json({ error: 'Dzisiejszy rysunek już dodany' })

  const wasReset = await applyResetIfBroken(challenge, date)

  const artwork = await Artwork.create({
    userId: req.userId,
    image,
    title: (title || '').slice(0, 80),
    date,
    challengeId: challenge._id,
  })

  challenge.completedDays += 1
  challenge.lastEntryDate = date
  if (challenge.completedDays >= challenge.targetDays) {
    challenge.completed = true
    // wpis do archiwum — ostatnia praca zostaje domyślną okładką
    await FinishedChallenge.create({
      userId: req.userId,
      challengeId: challenge._id,
      targetDays: challenge.targetDays,
      startDate:
        challenge.startDate ||
        challenge.createdAt?.toISOString().slice(0, 10) ||
        date,
      endDate: date,
      coverArtworkId: artwork._id,
    })
  }
  await challenge.save()

  res.json({ challenge: challengeJson(challenge, date), wasReset })
})

app.delete('/api/artworks/:id', requireAuth, async (req, res) => {
  await Artwork.deleteOne({ _id: req.params.id, userId: req.userId })
  res.json({ ok: true })
})

// ---------- historia ukończonych wyzwań ----------

app.get('/api/challenges/history', requireAuth, async (req, res) => {
  const finished = await FinishedChallenge.find({ userId: req.userId }).sort({
    createdAt: -1,
  })
  const items = await Promise.all(
    finished.map(async (f) => {
      const [artworkCount, cover] = await Promise.all([
        Artwork.countDocuments({
          userId: req.userId,
          challengeId: f.challengeId,
        }),
        f.coverArtworkId
          ? Artwork.findOne({
              _id: f.coverArtworkId,
              userId: req.userId,
            }).select('image title')
          : null,
      ])
      return {
        _id: f._id,
        targetDays: f.targetDays,
        startDate: f.startDate,
        endDate: f.endDate,
        artworkCount,
        cover: cover ? { image: cover.image, title: cover.title } : null,
      }
    }),
  )
  res.json({ finished: items })
})

app.get('/api/challenges/history/:id', requireAuth, async (req, res) => {
  const f = await FinishedChallenge.findOne({
    _id: req.params.id,
    userId: req.userId,
  })
  if (!f) return res.status(404).json({ error: 'Nie znaleziono wyzwania' })
  const artworks = await Artwork.find({
    userId: req.userId,
    challengeId: f.challengeId,
  }).sort({ createdAt: 1 })
  res.json({
    finished: {
      _id: f._id,
      targetDays: f.targetDays,
      startDate: f.startDate,
      endDate: f.endDate,
      coverArtworkId: f.coverArtworkId,
    },
    artworks,
  })
})

app.put('/api/challenges/history/:id', requireAuth, async (req, res) => {
  const { coverArtworkId } = req.body || {}
  const f = await FinishedChallenge.findOne({
    _id: req.params.id,
    userId: req.userId,
  })
  if (!f) return res.status(404).json({ error: 'Nie znaleziono wyzwania' })
  const artwork = await Artwork.findOne({
    _id: coverArtworkId,
    userId: req.userId,
    challengeId: f.challengeId,
  })
  if (!artwork)
    return res
      .status(400)
      .json({ error: 'Ten rysunek nie należy do tego wyzwania' })
  f.coverArtworkId = artwork._id
  await f.save()
  res.json({ ok: true })
})

app.delete('/api/challenges/history/:id', requireAuth, async (req, res) => {
  await FinishedChallenge.deleteOne({ _id: req.params.id, userId: req.userId })
  res.json({ ok: true })
})

// ---------- notatki ----------

app.get('/api/notes', requireAuth, async (req, res) => {
  const notes = await Note.find({ userId: req.userId }).sort({ updatedAt: -1 })
  res.json({ notes })
})

app.post('/api/notes', requireAuth, async (req, res) => {
  const { title, content } = req.body || {}
  if (!title?.trim()) return res.status(400).json({ error: 'Podaj tytuł' })
  const note = await Note.create({
    userId: req.userId,
    title: title.trim(),
    content: content || '',
  })
  res.json({ note })
})

app.put('/api/notes/:id', requireAuth, async (req, res) => {
  const { title, content } = req.body || {}
  if (!title?.trim()) return res.status(400).json({ error: 'Podaj tytuł' })
  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { title: title.trim(), content: content || '' },
    { new: true },
  )
  if (!note) return res.status(404).json({ error: 'Nie znaleziono notatki' })
  res.json({ note })
})

app.delete('/api/notes/:id', requireAuth, async (req, res) => {
  await Note.deleteOne({ _id: req.params.id, userId: req.userId })
  res.json({ ok: true })
})

// ---------- obsługa błędów ----------

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Błąd serwera' })
})

// ---------- start ----------

async function connectDb() {
  if (!process.env.MONGODB_URI) {
    // Tryb lokalny: dane w server/data/db.json, obrazki w server/data/uploads/.
    // Magazyn inicjalizuje się przy imporcie modeli (localdb.js).
    console.log(
      'Brak MONGODB_URI — dane zapisuję lokalnie w server/data/ (db.json + uploads/)',
    )
    return
  }
  const { default: mongoose } = await import('mongoose')
  try {
    await mongoose.connect(process.env.MONGODB_URI)
  } catch (err) {
    // Resolver Node'a (c-ares) potrafi na Windowsie trafić w serwer DNS,
    // który odrzuca zapytania SRV wymagane przez mongodb+srv:// —
    // wtedy przełączamy się na publiczne DNS-y i próbujemy raz jeszcze.
    if (err?.syscall !== 'querySrv') throw err
    console.warn(
      'Zapytanie DNS SRV odrzucone — ponawiam przez publiczne DNS (1.1.1.1, 8.8.8.8)…',
    )
    const dns = await import('node:dns')
    dns.setServers(['1.1.1.1', '8.8.8.8'])
    await mongoose.connect(process.env.MONGODB_URI)
  }
  console.log('Połączono z MongoDB (MONGODB_URI)')
}

connectDb()
  .then(() => {
    app.listen(PORT, () => console.log(`API działa na http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('Nie udało się połączyć z bazą:', err)
    process.exit(1)
  })
