import { createContext, useContext, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api } from '../api.js'
import { Spinner } from '../App.jsx'
import ConfirmModal from './Modal.jsx'

const CONTENT_PLACEHOLDER = `## Plan na dziś

- [ ] rozgrzewka: 10 min szkiców
- [ ] główne ćwiczenie: perspektywa
- [x] obejrzeć tutorial

**Cel:** narysować dłoń w 3 ujęciach

> Wskazówka: zakładka „Formatowanie” pokazuje całą składnię`

const FORMAT_EXAMPLES = [
  { label: 'Nagłówki', code: '## Duży nagłówek\n### Mniejszy nagłówek' },
  { label: 'Wyróżnienia', code: '**pogrubienie**, *kursywa*, ~~przekreślenie~~' },
  { label: 'Lista', code: '- szkicowanie\n- anatomia\n- światłocień' },
  { label: 'Lista numerowana', code: '1. rozgrzewka\n2. ćwiczenie\n3. praca końcowa' },
  { label: 'Lista zadań', code: '- [ ] do zrobienia\n- [x] zrobione' },
  { label: 'Cytat', code: '> Każdy mistrz był kiedyś amatorem' },
  { label: 'Kod / oznaczenie', code: 'ołówek `HB` i `2B`' },
  { label: 'Link', code: '[Proko](https://proko.com)' },
  { label: 'Linia oddzielająca', code: 'sekcja 1\n\n---\n\nsekcja 2' },
]

const TASK_RE = /^(\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\]/

function taskStats(content) {
  let total = 0
  let done = 0
  for (const line of content.split('\n')) {
    const m = line.match(TASK_RE)
    if (m) {
      total++
      if (m[2] !== ' ') done++
    }
  }
  return { total, done }
}

function toggleTaskAtLine(content, line) {
  const lines = content.split('\n')
  const i = line - 1
  if (i < 0 || i >= lines.length) return content
  lines[i] = lines[i].replace(
    TASK_RE,
    (_, prefix, mark) => `${prefix}[${mark === ' ' ? 'x' : ' '}]`,
  )
  return lines.join('\n')
}

const TaskToggleContext = createContext(null)

const markdownComponents = {
  h1: (props) => <h1 className="mt-3 mb-2 text-xl font-black" {...props} />,
  h2: (props) => <h2 className="mt-3 mb-2 text-lg font-bold" {...props} />,
  h3: (props) => <h3 className="mt-2 mb-1 font-bold" {...props} />,
  p: (props) => <p className="mb-2 leading-relaxed" {...props} />,
  ul: (props) => <ul className="mb-2 list-disc space-y-1 pl-5" {...props} />,
  ol: (props) => <ol className="mb-2 list-decimal space-y-1 pl-5" {...props} />,
  li: function Li({ children, className, node, ...props }) {
    const onToggleTask = useContext(TaskToggleContext)
    if (className !== 'task-list-item') {
      return (
        <li className="marker:text-amber-400" {...props}>
          {children}
        </li>
      )
    }
    return (
      <li
        className="task-li"
        onClick={
          onToggleTask
            ? (e) => {
                if (e.target instanceof HTMLInputElement)
                  onToggleTask(node.position.start.line)
              }
            : undefined
        }
        {...props}
      >
        {children}
      </li>
    )
  },
  input: function Checkbox({ node: _node, disabled, ...props }) {
    const interactive = Boolean(useContext(TaskToggleContext))
    return (
      <input
        className="task-checkbox"
        disabled={interactive ? false : disabled}
        onChange={() => {}}
        {...props}
      />
    )
  },
  strong: (props) => <strong className="font-bold text-amber-300" {...props} />,
  em: (props) => <em className="italic text-zinc-300" {...props} />,
  del: (props) => <del className="text-zinc-500 line-through" {...props} />,
  code: (props) => (
    <code
      className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-sm text-amber-200"
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote
      className="mb-2 border-l-4 border-amber-400/50 bg-amber-400/5 py-1 pl-3 text-zinc-400 italic"
      {...props}
    />
  ),
  a: (props) => (
    <a
      className="text-amber-400 underline underline-offset-2 transition-colors hover:text-amber-300"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  hr: () => <hr className="my-4 border-white/10" />,
  table: (props) => (
    <div className="mb-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th
      className="border border-white/10 bg-white/5 px-3 py-1.5 text-left font-bold"
      {...props}
    />
  ),
  td: (props) => (
    <td className="border border-white/10 px-3 py-1.5" {...props} />
  ),
}

function Markdown({ children, onToggleTask = null }) {
  return (
    <TaskToggleContext.Provider value={onToggleTask}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {children}
      </ReactMarkdown>
    </TaskToggleContext.Provider>
  )
}

function NoteProgress({ content }) {
  const { total, done } = taskStats(content)
  if (!total) return null
  const pct = Math.round((done / total) * 100)
  const full = done === total
  return (
    <div className="mb-3 animate-[fade-in_.3s_ease_both]">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-400">
          {full ? 'Wszystko zrobione! 🎉' : 'Postęp'}
        </span>
        <span
          className={`font-bold tabular-nums transition-colors duration-500 ${
            full ? 'text-emerald-300' : 'text-amber-300'
          }`}
        >
          {done}/{total} · {pct}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full border border-white/5 bg-zinc-950/60">
        <div
          className={`relative h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-[cubic-bezier(.34,1.56,.64,1)] ${
            full
              ? 'from-emerald-400 to-teal-400 shadow-[0_0_12px_rgba(52,211,153,.5)]'
              : 'from-amber-400 to-orange-400 shadow-[0_0_12px_rgba(251,191,36,.4)]'
          }`}
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-0 animate-[shimmer_2.2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>
      </div>
    </div>
  )
}

function EditorTabs({ view, setView }) {
  const tabs = [
    ['edit', '✍️ Edycja'],
    ['preview', '👁️ Podgląd'],
    ['help', '💡 Formatowanie'],
  ]
  return (
    <div className="flex gap-1 rounded-xl border border-white/5 bg-zinc-950/60 p-1 text-sm">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          onClick={() => setView(id)}
          className={`flex-1 rounded-lg py-2 font-semibold transition-all duration-300 ${
            view === id
              ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-zinc-950 shadow-lg shadow-amber-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function FormatHelp() {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <p className="text-xs text-zinc-500">
        Tak piszesz → tak to wygląda. Składnia Markdown:
      </p>
      {FORMAT_EXAMPLES.map((ex, i) => (
        <div
          key={ex.label}
          className="animate-[slide-up_.35s_ease_both] grid gap-2 rounded-xl border border-white/5 bg-zinc-950/50 p-3 sm:grid-cols-2"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div>
            <p className="mb-1.5 text-xs font-bold text-amber-400/80">
              {ex.label}
            </p>
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-400">
              {ex.code}
            </pre>
          </div>
          <div className="border-t border-white/5 pt-2 text-sm text-zinc-200 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
            <Markdown>{ex.code}</Markdown>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Notes() {
  const [notes, setNotes] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // { _id?, title, content }
  const [view, setView] = useState('edit')
  const [busy, setBusy] = useState(false)
  const [toDelete, setToDelete] = useState(null)

  useEffect(() => {
    api('/notes')
      .then((data) => setNotes(data.notes))
      .catch((err) => setError(err.message))
  }, [])

  function startNew() {
    setEditing({ title: '', content: '' })
    setView('edit')
    setError('')
  }

  async function save() {
    if (!editing.title.trim()) {
      setError('Podaj tytuł notatki')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (editing._id) {
        const data = await api(`/notes/${editing._id}`, {
          method: 'PUT',
          body: { title: editing.title, content: editing.content },
        })
        setNotes((list) =>
          list.map((n) => (n._id === editing._id ? data.note : n)),
        )
      } else {
        const data = await api('/notes', {
          method: 'POST',
          body: { title: editing.title, content: editing.content },
        })
        setNotes((list) => [data.note, ...list])
      }
      setEditing(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function toggleTask(note, line) {
    const content = toggleTaskAtLine(note.content, line)
    if (content === note.content) return
    setNotes((list) =>
      list.map((n) => (n._id === note._id ? { ...n, content } : n)),
    )
    try {
      const data = await api(`/notes/${note._id}`, {
        method: 'PUT',
        body: { title: note.title, content },
      })
      setNotes((list) =>
        list.map((n) =>
          n._id === note._id ? { ...n, updatedAt: data.note.updatedAt } : n,
        ),
      )
    } catch (err) {
      setError(err.message)
      setNotes((list) =>
        list.map((n) =>
          n._id === note._id
            ? { ...n, content: toggleTaskAtLine(n.content, line) }
            : n,
        ),
      )
    }
  }

  async function remove() {
    const id = toDelete
    setToDelete(null)
    try {
      await api(`/notes/${id}`, { method: 'DELETE' })
      setNotes((list) => list.filter((n) => n._id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  if (!notes && !error) return <Spinner />

  if (editing) {
    return (
      <div className="animate-[slide-up_.3s_ease_both] space-y-3">
        <input
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-zinc-100 placeholder-zinc-500 outline-none transition-all focus:border-amber-400/60 focus:bg-white/10"
          placeholder="Tytuł, np. „Dzień 3 — dłonie”"
          value={editing.title}
          onChange={(e) => setEditing({ ...editing, title: e.target.value })}
          maxLength={100}
        />

        <EditorTabs view={view} setView={setView} />

        {view === 'edit' && (
          <textarea
            className="min-h-72 w-full resize-y rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm leading-relaxed text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-amber-400/60 focus:bg-white/10"
            placeholder={CONTENT_PLACEHOLDER}
            value={editing.content}
            onChange={(e) =>
              setEditing({ ...editing, content: e.target.value })
            }
          />
        )}

        {view === 'preview' && (
          <div className="min-h-72 animate-[fade-in_.25s_ease_both] rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-zinc-200 backdrop-blur">
            {editing.content.trim() ? (
              <>
                <NoteProgress content={editing.content} />
                <Markdown>{editing.content}</Markdown>
              </>
            ) : (
              <p className="text-sm italic text-zinc-500">
                Pusta notatka — wpisz coś w zakładce „Edycja”
              </p>
            )}
          </div>
        )}

        {view === 'help' && (
          <div className="animate-[fade-in_.25s_ease_both]">
            <FormatHelp />
          </div>
        )}

        {error && (
          <p className="animate-[scale-in_.25s_ease_both] rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 py-3 font-bold text-zinc-950 shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:shadow-amber-500/40 active:scale-[.98] disabled:opacity-50"
          >
            {busy ? 'Zapisywanie…' : 'Zapisz notatkę'}
          </button>
          <button
            onClick={() => {
              setEditing(null)
              setError('')
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-zinc-300 transition-all hover:bg-white/10 active:scale-95"
          >
            Anuluj
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">Plan nauki 📚</h2>
        <button
          onClick={startNew}
          className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:shadow-amber-500/40 active:scale-95"
        >
          + Nowa notatka
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}

      {notes?.length === 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-xl">
          <span className="inline-block animate-[float_5s_ease-in-out_infinite] text-5xl">
            ✍️
          </span>
          <p className="mt-4 font-semibold text-zinc-300">Brak notatek</p>
          <p className="mt-1 text-sm text-zinc-500">
            Rozpisz sobie, czego chcesz się uczyć każdego dnia
          </p>
        </div>
      )}

      {notes?.map((n, i) => (
        <div
          key={n._id}
          className="animate-[slide-up_.4s_ease_both] rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur transition-all duration-300 hover:border-white/20"
          style={{ animationDelay: `${Math.min(i * 70, 500)}ms` }}
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-zinc-100">{n.title}</h3>
              <p className="text-xs text-zinc-500">
                {new Date(n.updatedAt).toLocaleDateString('pl-PL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="flex shrink-0 gap-1 text-sm">
              <button
                onClick={() => {
                  setEditing({
                    _id: n._id,
                    title: n.title,
                    content: n.content,
                  })
                  setView('edit')
                  setError('')
                }}
                className="rounded-lg px-2.5 py-1 text-zinc-400 transition-all hover:bg-amber-400/10 hover:text-amber-300 active:scale-95"
              >
                Edytuj
              </button>
              <button
                onClick={() => setToDelete(n._id)}
                className="rounded-lg px-2.5 py-1 text-zinc-600 transition-all hover:bg-red-500/10 hover:text-red-400 active:scale-95"
              >
                Usuń
              </button>
            </div>
          </div>
          <NoteProgress content={n.content} />
          <div className="text-sm text-zinc-300">
            <Markdown onToggleTask={(line) => toggleTask(n, line)}>
              {n.content}
            </Markdown>
          </div>
        </div>
      ))}

      <ConfirmModal
        open={Boolean(toDelete)}
        icon="🗑️"
        danger
        title="Usunąć tę notatkę?"
        message="Tej operacji nie można cofnąć."
        confirmLabel="Usuń"
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}
