# Questify — system diagrams & flow charts

Use this file in [Mermaid Live Editor](https://mermaid.live) (paste a diagram, then **Actions → PNG/SVG**) or open **`docs/diagrams-viewer.html`** in your browser and use **Print → Save as PDF**.

---

## 1. High-level system architecture

```mermaid
flowchart TB
  U[Browser]
  FE[React App + useQuestState]
  LS[(localStorage)]
  API[Express REST :3001]
  FILES[(quest-progress.txt + archive + reports)]
  PP[(Perplexity API)]
  U --> FE
  FE --> LS
  FE <-->|POST GET /progress| API
  FE -->|generate / quiz / suggest / report| API
  API --> FILES
  API --> PP
```

---

## 2. Data persistence flow

```mermaid
sequenceDiagram
  participant R as React UI
  participant H as useQuestState
  participant L as localStorage
  participant S as Express /progress
  participant F as quest-progress.txt

  Note over R,F: On change
  H->>L: JSON.stringify appState
  H->>S: POST /progress body appState
  S->>F: write file

  Note over R,F: On load / hydrate
  H->>L: read STORAGE_KEY
  alt backend reachable
    H->>S: GET /progress
    S->>F: read
    S-->>H: appState JSON
    H->>R: migrateAppState merge
  end
```

---

## 3. Quest generation flow

```mermaid
flowchart TD
  A[User enters goal + theme] --> B[Generate Quest click]
  B --> C[POST /generate-quest]
  C --> D{Perplexity OK?}
  D -->|yes| E[questline JSON]
  E --> F[New quest run id + append questHistory]
  F --> G[activeQuestRunId = new run]
  G --> H[Persist localStorage + POST /progress]
  D -->|no| I[Show error]
```

---

## 4. App routes (user navigation)

```mermaid
flowchart LR
  H["/ Home<br/>focus + pet rock + XP"]
  Q["/quests<br/>create runs + questline"]
  P["/pet<br/>seesaw + minerals + quiz"]
  S["/skill<br/>report + suggest topics"]

  H --- Q
  Q --- P
  P --- S
```

---

## 5. Skill page & archive flow

```mermaid
flowchart TD
  A[Open Skill page] --> B[POST /progress-report + appState]
  B --> C[mergeQuestArchive]
  C --> D[write quest-report-archive.json]
  D --> E[formatProgressReport<br/>fully completed runs only]
  E --> F[write progress-report.txt]
  F --> G[Return report text to UI]

  A2[Suggest next topics] --> H[POST /suggest-next-topics]
  H --> I[extractLearnedTopics from archive]
  I --> J[Perplexity → 3 strings]
```

---

## 6. Pet knowledge quiz & minerals

```mermaid
flowchart TD
  A[Take knowledge quiz] --> B[POST /pet-knowledge-quiz appState]
  B --> C[extractLearnedTopics]
  C --> D[Perplexity → 10 MCQ JSON]
  D --> E[Modal shows questions]
  E --> F[React grades vs correctIndex]
  F --> G{6+ correct?}
  G -->|yes| H[+1 petMineralBalance]
  G -->|no| I[No mineral]
  H --> J[Persist state]
```

---

## 7. State model (simplified)

```mermaid
classDiagram
  class AppState {
    totalXP
    questHistory[]
    activeQuestRunId
    petName
    petMineralBalance
    petTintIndex
    petUnlockedTints
    petFeedCount
  }
  class QuestRun {
    id
    createdAt
    userGoal
    theme
    questline
  }
  class Questline {
    quest_title
    quests[]
  }
  AppState "1" *-- "many" QuestRun
```

---

## How to download as image or PDF

| Method | Steps |
|--------|--------|
| **Mermaid Live** | Copy any `mermaid` block above → [mermaid.live](https://mermaid.live) → paste → **Actions** → Export **PNG** or **SVG**. |
| **Local HTML** | Open `docs/diagrams-viewer.html` in Chrome/Firefox → **Print** → **Save as PDF**, or screenshot. |
| **VS Code** | Install a Mermaid preview extension and export from the preview. |

---

*HackHayward 2026 — Questify*
