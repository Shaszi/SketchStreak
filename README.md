# ✏️ SketchStreak

Aplikacja webowa do budowania nawyku codziennego rysowania. Wybierasz wyzwanie, każdego dnia dodajesz jeden rysunek i patrzysz, jak rośnie Twoja seria (streak). Każdy użytkownik ma własne konto, a wraz z nim swój postęp, swoją galerię i swoje notatki.

## Funkcjonalności

- 🔥 **Wyzwania (streak)** — wybierz wyzwanie na **7, 14 lub 30 dni** i codziennie dodawaj jeden rysunek. Pasek postępu rośnie z każdym dniem, ale jeśli opuścisz dzień — postęp resetuje się do zera i zaczynasz od nowa.
- 🖼️ **Galeria prac** — wszystkie dodane rysunki trafiają do galerii z podglądem i powiększaniem. Reset wyzwania **nie kasuje** zapisanych prac — historia Twojej nauki zostaje.
- 📝 **Notatki** — miejsce na plan nauki i przemyślenia, z pełnym formatowaniem **Markdown** (nagłówki, listy, pogrubienia, cytaty…).
- 👤 **Konta użytkowników** — rejestracja i logowanie (email + hasło, tokeny JWT). Dane każdego użytkownika są całkowicie rozdzielone.

## Stack technologiczny

- **Frontend:** React 19 + Vite + Tailwind CSS 4
- **Backend:** Node.js + Express 5 + Mongoose (MongoDB)

## Pobranie projektu

Wymagany jest zainstalowany [Node.js](https://nodejs.org/) (v18+) oraz [Git](https://git-scm.com/).

```
git clone https://github.com/Shaszi/SketchStreak.git
cd SketchStreak
```

## Konfiguracja — plik `.env`

Backend wymaga pliku `.env` w folderze `server/`. Najprościej skopiować gotowy szablon:

```
cd server
copy .env.example .env
```

…a następnie otworzyć `server/.env` i uzupełnić wartości:

```env
# OPCJONALNE: connection string z MongoDB Atlas — login i hasło są jego częścią.
# Bez tej zmiennej aplikacja działa w pełni lokalnie (patrz niżej).
# MONGODB_URI=mongodb+srv://TWOJ_LOGIN:TWOJE_HASLO@cluster0.xxxxx.mongodb.net/sketchstreak

# Losowy sekret do podpisywania tokenów JWT (nie udostępniaj go nikomu).
JWT_SECRET=wpisz_tu_losowy_dlugi_ciag_znakow

# Port backendu
PORT=4000
```

> 💡 Aplikacja działa w dwóch trybach:
>
> - **Lokalny (domyślny)** — bez `MONGODB_URI` wszystkie dane zapisują się na dysku: metadane w `server/data/db.json`, a rysunki jako zwykłe pliki obrazków w `server/data/uploads/`. Nic nie znika po restarcie i nie potrzebujesz żadnego konta w chmurze.
> - **MongoDB** — po ustawieniu `MONGODB_URI` dane trafiają do bazy MongoDB. Darmowy klaster **M0** założysz na [MongoDB Atlas](https://www.mongodb.com/atlas).

## Uruchomienie

Po pobraniu projektu i skonfigurowaniu `.env` wystarczy kliknąć **`start.bat`** w głównym folderze projektu.

Skrypt sam zainstaluje zależności, uruchomi backend i frontend, a następnie otworzy aplikację w przeglądarce pod adresem **http://localhost:5173**. 🎉
