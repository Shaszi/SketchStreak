# ✏️ SketchStreak

Aplikacja do codziennego rysowania z systemem wyzwań (streak), galerią prac i notatkami do planowania nauki. Każdy użytkownik ma własne konto, swój progres, swoje rysunki i notatki.

## Funkcje

- **Wyzwanie** — wybierz 7 / 14 / 30 dni, codziennie dodaj jeden rysunek, a progress bar rośnie. Opuścisz dzień → postęp resetuje się do zera.
- **Galeria** — wszystkie dodane prace z powiększaniem (resety wyzwania nie kasują prac).
- **Notatki** — plan nauki z formatowaniem Markdown (nagłówki, listy, pogrubienie, cytaty…).
- **Konta użytkowników** — rejestracja/logowanie (email + hasło, JWT), dane rozdzielone per użytkownik.

## Stack

- **Frontend:** React 19 + Vite + Tailwind CSS 4 (zero plików `.css` w projekcie — style tylko klasami)
- **Backend:** Node.js + Express 5 + Mongoose (MongoDB)

## Uruchomienie lokalne

Terminal 1 — backend (bez konfiguracji użyje bazy w pamięci, dane znikają po restarcie):

```
cd server
npm install
npm run dev
```

Terminal 2 — frontend:

```
cd client
npm install
npm run dev
```

Aplikacja: http://localhost:5173 (żądania `/api` są proxowane na port 4000).

Aby dane były trwałe lokalnie, skopiuj `server/.env.example` do `server/.env` i wpisz `MONGODB_URI`.

## Darmowy hosting

### 1. Baza — MongoDB Atlas (free tier M0)

1. Załóż konto na https://www.mongodb.com/atlas i utwórz darmowy klaster **M0**.
2. W **Database Access** dodaj użytkownika z hasłem.
3. W **Network Access** dodaj `0.0.0.0/0` (dostęp z serwera).
4. Skopiuj connection string (`mongodb+srv://...`) — to będzie `MONGODB_URI`.

### 2. Backend — Oracle Cloud Free Tier (Always Free VM)

Oracle daje na stałe darmową maszynę wirtualną (ARM Ampere A1: do 4 rdzeni / 24 GB RAM), która nie usypia.

#### 2.1. Utwórz maszynę

1. Załóż konto na https://www.oracle.com/cloud/free/ (wymaga karty do weryfikacji, nic nie pobiera).
2. **Compute → Instances → Create instance**:
   - Image: **Ubuntu 24.04**
   - Shape: **VM.Standard.A1.Flex** (oznaczony „Always Free-eligible"), np. 2 OCPU / 12 GB
   - Wygeneruj i **pobierz klucz SSH** (`.key`) — bez niego nie wejdziesz na maszynę!
3. Po utworzeniu zapisz **publiczny adres IP** instancji.

#### 2.2. Otwórz porty 80 i 443

1. W panelu instancji kliknij swoją **Virtual Cloud Network → Security Lists → Default Security List → Add Ingress Rules**:
   - Source CIDR: `0.0.0.0/0`, protokół TCP, port **80** — i drugi wpis na port **443**.
2. Obrazy Ubuntu w Oracle mają też własny firewall (iptables). Po zalogowaniu na maszynę:

```bash
sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

#### 2.3. Zainstaluj i uruchom backend

Zaloguj się: `ssh -i sciezka/do/klucza.key ubuntu@ADRES_IP`, a potem:

```bash
# Node.js 22 + git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git

# kod aplikacji
git clone https://github.com/TWOJ-LOGIN/NAZWA-REPO.git
cd NAZWA-REPO/server
npm install --omit=dev

# konfiguracja — wklej MONGODB_URI z Atlasa i losowy JWT_SECRET
nano .env

# menedżer procesów: auto-restart po awarii i po reboocie maszyny
sudo npm install -g pm2
pm2 start src/index.js --name sketchstreak
pm2 save
pm2 startup   # wykonaj komendę, którą wypisze
```

#### 2.4. Darmowa domena + HTTPS (wymagane!)

GitHub Pages działa po HTTPS, więc przeglądarka **zablokuje** żądania do backendu po zwykłym `http://IP:4000`
(mixed content). Potrzebujesz domeny z certyfikatem — za darmo załatwia to DuckDNS + Caddy:

1. Na https://www.duckdns.org (logowanie GitHubem) utwórz subdomenę, np. `twoja-apka.duckdns.org`,
   i wpisz w nią publiczny IP maszyny.
2. Na maszynie zainstaluj **Caddy** (reverse proxy z automatycznym Let's Encrypt):

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy

sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
twoja-apka.duckdns.org {
    reverse_proxy localhost:4000
}
EOF
sudo systemctl reload caddy
```

3. Gotowe — backend jest dostępny pod `https://twoja-apka.duckdns.org`, certyfikat odnawia się sam.
4. W `server/.env` na maszynie ustaw `CLIENT_ORIGIN=https://TWOJ-LOGIN.github.io` i zrestartuj: `pm2 restart sketchstreak`.

### 3a. Frontend — GitHub Pages (free)

> GitHub Pages hostuje tylko pliki statyczne, więc backend i tak musi działać na maszynie Oracle (krok 2).

1. Wrzuć projekt na GitHub (gałąź `main`). Workflow jest już gotowy w `.github/workflows/deploy-pages.yml`.
2. W repo: **Settings → Pages → Source: GitHub Actions**.
3. W repo: **Settings → Secrets and variables → Actions → Variables** dodaj zmienną
   `VITE_API_URL` = adres backendu z kroku 2.4, np. `https://twoja-apka.duckdns.org`.
4. Zrób push na `main` (albo odpal workflow ręcznie w zakładce Actions) — frontend wyląduje pod
   `https://TWOJ-LOGIN.github.io/NAZWA-REPO/`.
5. W `.env` na maszynie Oracle ustaw `CLIENT_ORIGIN` = `https://TWOJ-LOGIN.github.io`
   (bez nazwy repo — CORS patrzy tylko na domenę).

### 3b. Frontend — Vercel (free tier, alternatywa)

1. Na https://vercel.com zaimportuj to samo repo:
   - Root Directory: `client`
   - Framework: Vite (wykryje automatycznie)
2. W `client/vite.config.js` proxy działa tylko lokalnie — na produkcji dodaj w Vercelu przepisywanie: utwórz plik `client/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://twoja-apka.duckdns.org/api/:path*" }
  ]
}
```

3. Po deployu wpisz adres z Vercela do zmiennej `CLIENT_ORIGIN` w `.env` na maszynie Oracle.

## Struktura

```
client/          React + Tailwind (frontend)
  src/App.jsx           zakładki + sesja użytkownika
  src/api.js            fetch + token JWT
  src/components/
    Auth.jsx            logowanie / rejestracja
    Challenge.jsx       progress bar + dodawanie rysunku
    Gallery.jsx         galeria prac
    Notes.jsx           notatki Markdown
server/          Express + MongoDB (backend)
  src/index.js          API (auth, wyzwanie, prace, notatki)
  src/models.js         schematy Mongoose
  src/auth.js           JWT
```
