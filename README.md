# Questify — Gamified Self-Help Quest App

Turn a real-life goal into an AI-generated **questline** (quests and subquests), earn **XP**, grow a **pet rock** companion, and track **skills** in a progress report — built for **HackHayward 2026** (React + Express + Perplexity).

---

## Overview

| Area | What it does |
| ---- | ------------- |
| **Quests** | Generate themed questlines from a goal; switch between saved runs; regenerate or delete runs. |
| **Home** | Today’s focus (first unchecked task), XP / tier, name your pet rock, preview. |
| **Pet** | Seesaw mini-game, **minerals** (from quizzes), feed & **color mood** unlocks. |
| **Skill** | Human-readable report + **Suggest what to learn next** (AI picks 3 topics). |

**AI (Perplexity)** powers: quest generation, quest regeneration, next-topic suggestions, and the **10-question knowledge quiz** on the Pet page.

---

## Features

### Quests & XP

- **Quest generation** — Goal + theme (fantasy, sci-fi, adventure); backend returns structured JSON (quests → subquests with difficulty and XP).
- **Tasks & XP** — Check off subquests on **Quests** or from **Home** (“Today’s focus”). XP uses easy / medium / hard (defaults in backend).
- **Regenerate** — Per run, **↻** re-rolls the questline with the **same goal & theme**; XP from completed tasks on that run is adjusted.
- **Lifetime XP** — Total XP is not reduced when you remove a quest run from the list (only task toggles change XP).

### Pet rock

- **Floating companion** — Draggable overlay (`PetRockFixed`) with moods, reactions, and short quips.
- **Growth** — Visual scale: **`rockScale = 1 + totalXP / 400`** (gentle growth vs raw XP).
- **Rarity tiers** — Common → Legendary; tier drives hue and the Home/Pet rock look.
- **Naming** — Default name **“Rock pet”**; editable on Home (stored in app state).

### Minerals & knowledge quiz

- **Earning** — Minerals come from the **Take knowledge quiz** flow only (not from checking off quest tasks). Pass threshold: **6 / 10** correct → **+1 mineral** (client-side grading using server-provided answers).
- **Spending** — **1 mineral** per feed; **5 minerals** per extra **color mood** tint (first tint is free). Stored as `petMineralBalance`.
- **Quiz** — `POST /pet-knowledge-quiz` sends `appState`; backend derives **learned topics** from the quest archive and asks Perplexity for **10** multiple-choice questions (4 options each). UI: `PetKnowledgeQuizModal` (portal).

### Skills & archive

- **Skill page** — Calls **`POST /progress-report`**, which merges `appState` into **`quest-report-archive.json`**, then writes **`progress-report.txt`**. The UI lists **one row per fully completed quest run** (every quest in the line has all subtasks done) — so two finished topics ≈ two skills, not one row per sub-quest.
- **Suggest next** — **`POST /suggest-next-topics`** sends archived goals/titles to Perplexity; returns 3 strings. Picking one can navigate to Quests and auto-run **Generate Quest** (see `App.jsx` navigation state).

### Persistence

- **Client** — `localStorage` key `quest-app-state`.
- **Server** — `POST /progress` saves **`quest-progress.txt`** (JSON app state). On load, frontend may hydrate from **`GET /progress`** when the backend is up.
- **Reset** — **Quests** page, **bottom**: **Reset Everything** opens a **confirm** dialog, then clears local + backend progress (`DELETE /progress` pattern via app reset).

### UI conventions

- **Primary actions** — **Generate Quest** (Quests), **Suggest what to learn next** (Skill), and similar CTAs use the shared **`btn-primary-gradient`** style (purple gradient).
- **Danger** — Full reset is separated at the **end** of the Quests page with confirmation.

### Routes

| Path | Page |
| ---- | ---- |
| `/` | Home |
| `/quests` | Create runs, list runs, active questline |
| `/pet` | Seesaw + minerals + quiz + tints |
| `/skill` | Report + suggest topics |
| `/progress` | Redirects to **Home** |

---

## Pet playground (`/pet`) — detail

- **Seesaw** — Idle → **Drop** animates the rock onto the plank → **Settle** uses weight vs. XP scale; **Reset** restarts the mini-scene.
- **Low XP** — Below a threshold you “wiggle” instead of a big launch; copy nudges you to Quests.
- **Accessibility** — `prefers-reduced-motion` short-circuits long motion.
- **Implementation** — `PetPage.jsx`, `PetPage.css`, `BlobPet.jsx` (pet rock UI; legacy filename), `rockAppearance.js` (`getBlobColors`, `getBlobSurfaceGradient`, tint presets).

---

## Tech stack

| Layer    | Stack |
| -------- | ----- |
| Frontend | React 19, Vite 8, React Router 7, CSS |
| Backend  | Node.js, Express 5, CORS, dotenv |
| AI       | Perplexity Chat Completions–compatible API |

---

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- **Perplexity API key** — [Perplexity API docs](https://docs.perplexity.ai/)

---

## Quick start

### 1. Clone and install

```bash
cd HackHayward2026

cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Backend environment

Create `backend/.env`:

```env
PERPLEXITY_API_KEY=your_key_here

# Optional (defaults are in backend/index.js)
# PORT=3001
# PERPLEXITY_API_URL=https://api.perplexity.ai/v1/sonar
# PERPLEXITY_MODEL=sonar-pro
```

> Your Perplexity account may require a different base URL or model — check `PERPLEXITY_API_URL` / `PERPLEXITY_MODEL` in `backend/index.js` and Perplexity’s docs.

### 3. Run the servers

**Terminal A — API (port 3001)**

```bash
cd backend
npm start
```

**Terminal B — Frontend**

```bash
cd frontend
npm run dev
```

Open the URL Vite prints (often **http://localhost:5173**).

If you change the API port or host, update **`API_BASE_URL`** in:

- `frontend/src/hooks/useQuestState.js`
- `frontend/src/App.jsx`
- `frontend/src/components/PetKnowledgeQuizModal.jsx` (and any other hardcoded `localhost:3001` callers)

### 4. Production build (frontend)

```bash
cd frontend
npm run build
npm run preview   # optional
```

Serve `frontend/dist` behind any static host; the browser must reach the API (CORS is enabled on the backend).

---

## API (backend)

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/` | Health / ping |
| `GET` | `/progress` | Load saved app state JSON |
| `POST` | `/progress` | Save app state JSON |
| `DELETE` | `/progress` | Clear saved progress and related files |
| `POST` | `/generate-quest` | `{ goal, theme }` → AI questline |
| `POST` | `/regenerate-quest` | `{ goal, theme }` → new questline JSON only |
| `POST` | `/progress-report` | `{ appState }` → merge archive, write `progress-report.txt` |
| `GET` | `/progress-report` | Read last report file |
| `POST` | `/pet-knowledge-quiz` | `{ appState }` → `{ questions, topicsUsed }` (10 MCQs) |
| `POST` | `/suggest-next-topics` | `{ appState }` → suggested topics for Skill page |

---

## Data files (backend folder)

| File | Purpose |
| ---- | ------- |
| `quest-progress.txt` | Last saved **app state** from the browser |
| `quest-report-archive.json` | Merged **quest runs** for reports, quizzes, and suggestions |
| `progress-report.txt` | Last **human-readable** Skill report |

These are typical **local dev artifacts**; add to `.gitignore` if you don’t want them in git.

---

## App state (saved in JSON)

Not exhaustive — important fields:

| Field | Role |
| ----- | ---- |
| `totalXP` | Lifetime XP |
| `questHistory` | Array of quest runs (`id`, `userGoal`, `theme`, `questline`, …) |
| `activeQuestRunId` | Selected run |
| `petName` | Display name for the rock |
| `petMineralBalance` | Currency for feed / tints |
| `petTintIndex`, `petUnlockedTints`, `petFeedCount` | Pet care |

---

## Architecture diagrams

- **`docs/DIAGRAMS.md`** — Mermaid sources; paste into [mermaid.live](https://mermaid.live) to export **PNG** / **SVG**.
- **`docs/diagrams-viewer.html`** — Open in a browser → **Print → Save as PDF** for a single PDF of diagrams.

---

## Project layout

```
HackHayward2026/
├── docs/
│   ├── DIAGRAMS.md
│   └── diagrams-viewer.html
├── backend/
│   ├── index.js          # Express, Perplexity calls, file persistence
│   ├── .env              # Create locally (not committed)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Routes, quest generation, Skill auto-nav
│   │   ├── pages/        # Home, Quests, Pet, Skill
│   │   ├── components/   # BlobPet (pet rock), PetRockFixed, forms, PetKnowledgeQuizModal, …
│   │   ├── hooks/        # useQuestState (state + sync)
│   │   └── utils/        # rockAppearance, todayFocus, parseProgressReport, …
│   └── package.json
└── README.md
```

---

## Scripts

| Location | Command | Description |
| -------- | ------- | ----------- |
| `frontend/` | `npm run dev` | Dev server (HMR) |
| `frontend/` | `npm run build` | Production bundle → `dist/` |
| `frontend/` | `npm run lint` | ESLint |
| `backend/` | `npm start` | API (`node index.js`) |

---

## Troubleshooting

| Issue | What to check |
| ----- | ------------- |
| Quest / quiz / suggest fails | `PERPLEXITY_API_KEY`, quota, and `PERPLEXITY_API_URL` / model |
| Network / CORS | Backend running; `API_BASE_URL` matches |
| Empty or stuck UI | Hard refresh; or use **Reset Everything** at the **bottom of Quests** (confirms before clearing) |
| Quiz: “no topics” | Generate/save quests so the archive has goals; open Skill once to merge archive |
| Skill list empty | A **skill** appears only when a **whole questline** in the archive is 100% complete |

---

## License

ISC (backend `package.json`) / see frontend `package.json` for dependency licenses.

---

*HackHayward 2026 — goals, XP, a pet rock, quizzes, and skills.*
