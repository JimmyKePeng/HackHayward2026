# Gamified Self-Help Quest App

Turn a real-life goal into an AI-generated **questline** (quests and subquests), earn **XP**, grow a **blob pet**, and keep a **progress report** — built for **HackHayward 2026 using Cursor**.

## Features

- **Quest generation** — Enter a goal + theme (fantasy, sci-fi, adventure); the backend calls the **Perplexity** API to produce structured JSON questlines.
- **Tasks & XP** — Check off subquests on the Quests page or from **Home** (“Today’s focus”). Difficulty maps to XP (easy / medium / hard).
- **Pet blob** — Draggable corner pet with moods, reactions, and tier-based colors that scale with XP. Optional **`compactGround`** mode (used on the Pet page) uses a smaller drop shadow and bottom-anchored scaling so the blob sits cleanly on surfaces.
- **Rarity tiers** — Common → Legendary; XP bar shows progress within the current tier.
- **Regenerate** — Per quest run, **↻** re-rolls the questline with the **same goal & theme** (XP from completed tasks on that run is adjusted).
- **Persistence** — State syncs to `localStorage` and the backend (`quest-progress.txt`).
- **Progress report** — Separate archive (`quest-report-archive.json`) keeps **all** quest runs (including removed ones); **Get Report** writes `progress-report.txt` and shows it in a modal.
- **Routes** — **Home** (focus + blob preview + XP bar), **Quests** (create, list, questline), **Pet** (interactive seesaw — see below), **Progress** (full XP panel, blob anchor, report).

### Pet page (`/pet`)

- **Idle** — You stand near the **left** end of a narrow plank; the right side is empty. The board tilts toward you (your side is heavier).
- **Drop** — A **Drop** button beside the scene spawns the blob **above** the right end; it falls onto the board while the beam reacts.
- **Launch** — Your jump height scales with blob size / XP. Below a small XP threshold, you only **wiggle** and the UI nudges you toward **Quests** to grow the blob.
- **Settle** — When the sequence ends, both you and the blob stay on the board; final tilt follows **relative weight** (you vs. blob scale). **Reset** returns to the idle setup so you can play again.
- **Polish** — Falling blob uses a stable silhouette (no wobble during the fall), deck area sized so tall blobs aren’t clipped after landing, `prefers-reduced-motion` skips the long animation, and the fixed corner pet stays off the Progress anchor as before.

Implementation: `frontend/src/pages/PetPage.jsx`, `frontend/src/pages/PetPage.css`; blob props in `frontend/src/components/BlobPet.jsx` + `BlobPet.css`.

## Tech stack

| Layer    | Stack                                      |
| -------- | ------------------------------------------ |
| Frontend | React 19, Vite 8, React Router 7, CSS      |
| Backend  | Node.js, Express 5, CORS, dotenv           |
| AI       | Perplexity Chat Completions–compatible API |

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- A **Perplexity API key** ([Perplexity API](https://docs.perplexity.ai/)) for quest generation

## Quick start

### 1. Clone and install

```bash
cd HackHayward2026

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 2. Backend environment

Create `backend/.env`:

```env
PERPLEXITY_API_KEY=your_key_here

# Optional overrides
# PORT=3001
# PERPLEXITY_API_URL=https://api.perplexity.ai/chat/completions
# PERPLEXITY_MODEL=sonar-pro
```

> The app expects the chat URL to include a path that ends with chat completions (see `backend/index.js`). Adjust `PERPLEXITY_API_URL` if your account uses a different base URL.

### 3. Run the servers

**Terminal A — API (default port 3001)**

```bash
cd backend
npm start
# or: node index.js
```

You should see: `Server running on http://localhost:3001`

**Terminal B — Frontend (Vite dev server)**

```bash
cd frontend
npm run dev
```

Open the URL Vite prints (usually **http://localhost:5173**).

The frontend is configured to call the API at **`http://localhost:3001`**. If you change the port, update `API_BASE_URL` in:

- `frontend/src/hooks/useQuestState.js`
- `frontend/src/App.jsx`
- `frontend/src/components/ProgressReportModal.jsx` (hint text only)

### 4. Production build (frontend)

```bash
cd frontend
npm run build
npm run preview   # optional local preview of dist/
```

Serve `frontend/dist` with any static host; ensure the API is reachable (CORS is enabled on the backend).

## API overview (backend)

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/` | Health / ping |
| `GET` | `/progress` | Load saved app state JSON |
| `POST` | `/progress` | Save app state JSON |
| `DELETE` | `/progress` | Clear progress + report files |
| `POST` | `/generate-quest` | Body: `{ goal, theme }` → AI questline |
| `POST` | `/regenerate-quest` | Body: `{ goal, theme }` → new questline only |
| `POST` | `/progress-report` | Build report, merge archive, write `progress-report.txt` |
| `GET` | `/progress-report` | Read last report file |

## Data files (backend folder)

| File | Purpose |
| ---- | ------- |
| `quest-progress.txt` | Latest app state from the browser |
| `quest-report-archive.json` | Historical quest runs for reports |
| `progress-report.txt` | Last generated human-readable report |

These are **local dev artifacts**; add them to `.gitignore` if you don’t want them committed.

## Project layout

```
HackHayward2026/
├── backend/
│   ├── index.js          # Express app + AI + persistence
│   ├── .env              # Create locally (not committed)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Routes (incl. /pet), quest generation, report modal
│   │   ├── pages/        # Home, Quests, PetPage (seesaw), Progress
│   │   ├── components/   # BlobPet, panels, forms, PetRockFixed, etc.
│   │   └── hooks/        # useQuestState (sync + XP)
│   └── package.json
└── README.md
```

## Scripts reference

| Location | Command | Description |
| -------- | ------- | ----------- |
| `frontend/` | `npm run dev` | Dev server with HMR |
| `frontend/` | `npm run build` | Production bundle to `dist/` |
| `frontend/` | `npm run lint` | ESLint |
| `backend/` | `npm start` | Start API (`node index.js`) |

## Troubleshooting

- **“Failed to generate quest”** — Check `PERPLEXITY_API_KEY`, quota, and that `PERPLEXITY_API_URL` matches your Perplexity endpoint.
- **CORS / network errors** — Backend must be running; frontend must target the correct host/port.
- **Empty or stale UI** — Clear site data or use **Reset Everything** on the Quests form (clears local + backend progress).

## License

ISC (backend `package.json`) / see individual packages for frontend deps.

---

*Made for HackHayward 2026 — ship goals, XP, a supportive blob, and a seesaw on the Pet page.*
