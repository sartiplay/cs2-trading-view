# TraderMan — Steam Marketplace Item Tracker

A Next.js app for tracking Steam marketplace items, price changes, and investment performance.

---

## 0) What you need (with downloads)

- **Node.js 18 or newer** (includes npm) → [Download here](https://nodejs.org)
- **Package manager**:
  - Use **npm** (comes with Node), or
  - Install **pnpm** (faster, optional):
    ```bash
    npm install -g pnpm
    ```
- **Git (optional)** → Only needed if you want to use `git clone` → [Download here](https://git-scm.com/downloads)

> You do **not** need Git if you download the project as a ZIP.

---

## 1) Get the project

### Option A — No Git (simplest)

1. Go to the GitHub repository page in your browser
2. Click the green **Code** button → **Download ZIP**
3. Extract the ZIP to a folder (e.g., `C:\Users\YourName\Desktop\Traderman`)

### Option B — Using Git (if installed)

```bash
git clone <repository-url>
cd traderman
```

---

## 2) Install dependencies

Open a terminal in the project folder, then run:

```bash
npm install
```

If errors appear:

```bash
npm install --legacy-peer-deps
```

Update npm if needed:

```bash
npm install -g npm@latest
```

⚠️ Even if some warnings show up, the app should still run.

---

## 3) Setup data file

### Option A: Example data

Rename `example.data.json` → `data.json`

### Option B: Use existing data

Copy your own `data.json` into the project root

### Option C: Start fresh

The app will auto-create a new `data.json` on first run

---

## 4) Environment variables (optional) not recommended

Create a `.env.local` file in the project root:

```env
DISCORD_WEBHOOK_URL=your_webhook_url
STEAM_API_DELAY=1000
```

---

## 5) Start the development server

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Start scripts

### Windows (save as `start_traderman.bat`)

```bat
@echo off
cd C:\Users\YourName\Desktop\Traderman
npm run dev
pause
```

### Linux/macOS (save as `start_traderman.sh`)

```bash
#!/bin/bash
cd /home/yourname/Desktop/traderman
npm run dev
```

(make it executable with `chmod +x start_traderman.sh`)

---

## Tip: Find project path

- **Windows**: Open folder → Click address bar → Copy path
- **Linux/macOS**: Open terminal → `cd` into folder → Run `pwd`

---
