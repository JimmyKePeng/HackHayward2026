# Gamified Self-Help Quest App

Turn a real-life goal into an AI-generated **questline** (quests and subquests), earn **XP**, grow a **blob pet**, and keep a **progress report** — built for **HackHayward 2026 using Cursor**.

## Features

- **Quest generation** — Enter a goal + theme (fantasy, sci-fi, adventure); the backend calls the **Perplexity** API to produce structured JSON questlines.
- **Tasks & XP** — Check off subquests on the Quests page or from **Home** (“Today’s focus”). Difficulty maps to XP (easy / medium / hard).
- **Pet blob** — Draggable corner pet with moods, reactions, and tier-based colors. Visual size grows gently: **`rockScale = 1 + totalXP / 400`**. Optional **`compactGround`** mode (Pet page) uses a smaller drop shadow and bottom-anchored scaling.
- **Rarity tiers** — Common → Legendary; XP bar shows progress within the current tier.
- **Regenerate** — Per quest run, **↻** re-rolls the questline with the **same goal & theme** (XP from completed tasks on that run is adjusted).
- **Persistence** — State syncs to `localStorage` and the backend (`quest-progress.txt`).
- **Skills / achievements** — **One skill per quest run/topic** when the **entire questline** is finished (every quest’s subtasks checked). Two topics fully done → two rows (`POST /progress-report` → `progress-report.txt`). **Suggest next** uses **`POST /suggest-next-topics`** (Perplexity).
- **Routes** — **Home** (focus + blob preview + XP / tier + lifetime XP hint + pet anchor behavior), **Quests** (create, list, questline), **Pet** (seesaw + minerals / tints — see below), **Skill** (scrollable achievement report). Old **`/progress`** URLs redirect to **Home**.

### Pet page (`/pet`)

- **Idle** — You stand near the **left** end of a narrow plank; the right side is empty. The board tilts toward you (your side is heavier).
- **Drop** — A **Drop** button beside the scene spawns the blob **above** the right end; it falls onto the board while the beam reacts.
- **Launch** — Your jump height scales with blob size / XP. Below a small XP threshold, you only **wiggle** and the UI nudges you toward **Quests** to grow the blob.
- **Settle** — When the sequence ends, both you and the blob stay on the board; final tilt follows **relative weight** (you vs. blob scale). **Reset** returns to the idle setup so you can play again.
- **Polish** — Falling blob uses a stable silhouette (no wobble during the fall), deck area sized so tall blobs aren’t clipped after landing, and `prefers-reduced-motion` skips the long animation.
- **Minerals & looks** — Open **Take knowledge quiz** on the Pet page: the client sends saved quest topics to **`POST /pet-knowledge-quiz`**; Perplexity returns **10** multiple-choice questions. React grades locally; **6+ correct** earns **1 mineral**. Spend minerals to **feed** the pet or **unlock color moods** (tints on top of tier colors). **Color mood** swatches use the same gradient as the blob (`getBlobSurfaceGradient`). Saved in app state / `quest-progress.txt`.

Implementation: `frontend/src/pages/PetPage.jsx`, `frontend/src/pages/PetPage.css`; `PetMineralCare.jsx`; `PetKnowledgeQuizModal.jsx`; `rockAppearance.js` (`getBlobColors`, `getBlobSurfaceGradient`, `PET_TINT_PRESETS`); blob in `BlobPet.jsx` + `BlobPet.css`.

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
| `POST` | `/progress-report` | Merge archive, write `progress-report.txt` (Skill: **fully completed runs** only) |
| `GET` | `/progress-report` | Read last report file |
| `POST` | `/pet-knowledge-quiz` | Body: `{ appState }` → Perplexity builds 10 MCQs from learned topics; returns `{ questions, topicsUsed }` |
| `POST` | `/suggest-next-topics` | Body: `{ appState }` → suggested follow-up topics (Skill page) |

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
│   │   ├── App.jsx       # Routes (incl. /pet, /skill; /progress → home), quest generation
│   │   ├── pages/        # Home, Quests, PetPage, Skill (report)
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
