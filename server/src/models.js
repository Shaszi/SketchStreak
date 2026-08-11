import 'dotenv/config'

// Z MONGODB_URI używamy Mongoose; bez niego — lokalnego magazynu plikowego
// (server/data/), który udostępnia te same modele o tym samym API.
let User, Challenge, Artwork, Note, FinishedChallenge

if (process.env.MONGODB_URI) {
  const { default: mongoose } = await import('mongoose')

  const userSchema = new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true, maxlength: 50 },
      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },
      passwordHash: { type: String, required: true },
    },
    { timestamps: true },
  )

  const challengeSchema = new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },
      targetDays: { type: Number, required: true, min: 1, max: 365 },
      completedDays: { type: Number, default: 0 },
      // daty w formacie YYYY-MM-DD wg strefy czasowej klienta
      startDate: { type: String, default: null },
      lastEntryDate: { type: String, default: null },
      completed: { type: Boolean, default: false },
    },
    { timestamps: true },
  )

  const artworkSchema = new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },
      image: { type: String, required: true }, // data URL (jpeg, skompresowany po stronie klienta)
      title: { type: String, trim: true, maxlength: 80, default: '' },
      date: { type: String, required: true },
      // wyzwanie, w trakcie którego powstała praca (null dla starych wpisów)
      challengeId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        index: true,
      },
    },
    { timestamps: true },
  )

  // Archiwum ukończonych wyzwań — wpis powstaje w momencie ukończenia
  // i zostaje na stałe, nawet gdy aktywne wyzwanie zostanie skasowane.
  const finishedChallengeSchema = new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },
      challengeId: { type: mongoose.Schema.Types.ObjectId, required: true },
      targetDays: { type: Number, required: true },
      startDate: { type: String, default: null },
      endDate: { type: String, required: true },
      coverArtworkId: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
    { timestamps: true },
  )

  const noteSchema = new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },
      title: { type: String, required: true, trim: true, maxlength: 100 },
      content: { type: String, default: '', maxlength: 20000 },
    },
    { timestamps: true },
  )

  User = mongoose.model('User', userSchema)
  Challenge = mongoose.model('Challenge', challengeSchema)
  Artwork = mongoose.model('Artwork', artworkSchema)
  Note = mongoose.model('Note', noteSchema)
  FinishedChallenge = mongoose.model(
    'FinishedChallenge',
    finishedChallengeSchema,
  )
} else {
  ;({ User, Challenge, Artwork, Note, FinishedChallenge } = await import(
    './localdb.js'
  ))
}

export { User, Challenge, Artwork, Note, FinishedChallenge }
