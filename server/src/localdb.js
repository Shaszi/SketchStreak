// Lokalny magazyn danych — używany, gdy nie ustawiono MONGODB_URI.
// Metadane lądują w server/data/db.json, a obrazki jako zwykłe pliki
// w server/data/uploads/. Całość udaje podzbiór API Mongoose używany
// w index.js (find/findOne/create/save itd.), więc trasy działają bez zmian.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const DATA_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'data',
)
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')
const DB_FILE = path.join(DATA_DIR, 'db.json')

fs.mkdirSync(UPLOADS_DIR, { recursive: true })

// ---------- wczytanie i zapis bazy ----------

const collections = {
  users: [],
  challenges: [],
  artworks: [],
  notes: [],
  finishedChallenges: [],
}

function reviveRecord(record) {
  // JSON trzyma daty jako stringi ISO — przywracamy obiekty Date,
  // żeby np. challenge.createdAt.toISOString() działało jak w Mongoose
  for (const key of ['createdAt', 'updatedAt']) {
    if (typeof record[key] === 'string') record[key] = new Date(record[key])
  }
  return record
}

if (fs.existsSync(DB_FILE)) {
  const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  for (const name of Object.keys(collections)) {
    collections[name] = (raw[name] || []).map(reviveRecord)
  }
}

function persist() {
  // zapis przez plik tymczasowy, żeby przerwany zapis nie uszkodził bazy
  const tmp = `${DB_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(collections, null, 2))
  fs.renameSync(tmp, DB_FILE)
}

// ---------- pomocnicze ----------

function newId() {
  return crypto.randomBytes(12).toString('hex')
}

function eq(a, b) {
  if (a === b) return true
  if (a == null || b == null) return false
  return String(a) === String(b)
}

function matches(record, filter = {}) {
  return Object.entries(filter).every(([key, value]) => eq(record[key], value))
}

function sortRecords(records, spec) {
  if (!spec) return records
  const [key, dir] = Object.entries(spec)[0]
  return [...records].sort((a, b) =>
    a[key] > b[key] ? dir : a[key] < b[key] ? -dir : 0,
  )
}

// Zapytanie z łańcuchowaniem .sort().limit().select() — awaitowalne jak w Mongoose
class Query {
  constructor(run) {
    this._run = run
    this._sort = null
    this._limit = Infinity
  }
  sort(spec) {
    this._sort = spec
    return this
  }
  limit(n) {
    this._limit = n
    return this
  }
  select() {
    return this
  }
  then(onOk, onErr) {
    return Promise.resolve()
      .then(() => this._run(this._sort, this._limit))
      .then(onOk, onErr)
  }
}

class Model {
  constructor(name, { defaults, hydrate, onCreate, onDelete } = {}) {
    this.name = name
    // odpowiednik domyślnych wartości ze schematów Mongoose
    this._defaults = defaults || {}
    this._hydrate = hydrate || ((record) => record)
    this._onCreate = onCreate || ((data) => data)
    this._onDelete = onDelete || (() => {})
  }

  get records() {
    return collections[this.name]
  }

  find(filter) {
    return new Query((sortSpec, limit) =>
      sortRecords(
        this.records.filter((r) => matches(r, filter)),
        sortSpec,
      )
        .slice(0, limit === Infinity ? undefined : limit)
        .map((r) => this._hydrate(r)),
    )
  }

  findOne(filter) {
    return new Query(() => {
      const record = this.records.find((r) => matches(r, filter))
      return record ? this._hydrate(record) : null
    })
  }

  findById(id) {
    return this.findOne({ _id: id })
  }

  async create(data) {
    const now = new Date()
    const record = {
      _id: newId(),
      ...this._defaults,
      ...data,
      createdAt: now,
      updatedAt: now,
    }
    this._onCreate(record)
    // save() jako właściwość niewyliczalna — nie trafia do JSON-a ani odpowiedzi API
    Object.defineProperty(record, 'save', {
      value: async () => {
        record.updatedAt = new Date()
        persist()
      },
    })
    this.records.push(record)
    persist()
    return this._hydrate(record)
  }

  async countDocuments(filter) {
    return this.records.filter((r) => matches(r, filter)).length
  }

  async deleteOne(filter) {
    const idx = this.records.findIndex((r) => matches(r, filter))
    if (idx !== -1) {
      this._onDelete(this.records[idx])
      this.records.splice(idx, 1)
      persist()
    }
    return { deletedCount: idx === -1 ? 0 : 1 }
  }

  async deleteMany(filter) {
    const removed = this.records.filter((r) => matches(r, filter))
    if (removed.length) {
      collections[this.name] = this.records.filter((r) => !matches(r, filter))
      removed.forEach((r) => this._onDelete(r))
      persist()
    }
    return { deletedCount: removed.length }
  }

  async findOneAndUpdate(filter, update) {
    const record = this.records.find((r) => matches(r, filter))
    if (!record) return null
    Object.assign(record, update)
    record.updatedAt = new Date()
    persist()
    return this._hydrate(record)
  }
}

// Dokumenty wczytane z pliku też muszą mieć save()
for (const records of Object.values(collections)) {
  for (const record of records) {
    Object.defineProperty(record, 'save', {
      value: async () => {
        record.updatedAt = new Date()
        persist()
      },
    })
  }
}

// ---------- obrazki na dysku ----------

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

function imagePath(record) {
  return path.join(UPLOADS_DIR, record.imageFile)
}

// Przy zapisie pracy wycinamy data URL z rekordu i zapisujemy go jako plik
function saveImageToDisk(record) {
  const match = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(record.image)
  if (!match) throw new Error('Nieprawidłowy data URL obrazka')
  const [, mime, base64] = match
  record.imageMime = mime
  record.imageFile = `${record._id}.${EXT_BY_MIME[mime] || 'bin'}`
  fs.writeFileSync(imagePath(record), Buffer.from(base64, 'base64'))
  delete record.image
}

// Przy odczycie odtwarzamy data URL, więc klient dostaje dokładnie to,
// co dostałby z MongoDB
function hydrateArtwork(record) {
  let image = null
  try {
    const data = fs.readFileSync(imagePath(record))
    image = `data:${record.imageMime};base64,${data.toString('base64')}`
  } catch {
    // plik usunięty ręcznie — praca zostanie bez podglądu
  }
  const { imageFile, imageMime, ...rest } = record
  return { ...rest, image }
}

function deleteImageFromDisk(record) {
  try {
    fs.unlinkSync(imagePath(record))
  } catch {
    // brak pliku nie powinien blokować usunięcia rekordu
  }
}

// ---------- modele ----------

export const User = new Model('users', {
  onCreate: (record) => {
    // schemat Mongoose ma lowercase+trim na emailu — robimy to samo
    record.email = String(record.email).toLowerCase().trim()
  },
})
export const Challenge = new Model('challenges', {
  defaults: {
    completedDays: 0,
    startDate: null,
    lastEntryDate: null,
    completed: false,
  },
})
export const Note = new Model('notes', {
  defaults: { content: '' },
})
export const FinishedChallenge = new Model('finishedChallenges', {
  defaults: { startDate: null, coverArtworkId: null },
})
export const Artwork = new Model('artworks', {
  defaults: { title: '', challengeId: null },
  hydrate: hydrateArtwork,
  onCreate: saveImageToDisk,
  onDelete: deleteImageFromDisk,
})
