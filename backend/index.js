import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from this folder (works even if you start Node from repo root)
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3001;
const PROGRESS_FILE = path.join(__dirname, "quest-progress.txt");
const PROGRESS_REPORT_FILE = path.join(__dirname, "progress-report.txt");
/** Persistent quest history for reports: merges on each save; runs stay when deleted from the app. */
const QUEST_REPORT_ARCHIVE_FILE = path.join(__dirname, "quest-report-archive.json");

async function loadQuestArchive() {
    try {
        const raw = await fs.readFile(QUEST_REPORT_ARCHIVE_FILE, "utf8");
        const data = JSON.parse(raw);
        const runs = Array.isArray(data.runs) ? data.runs : [];
        return { runs };
    } catch (error) {
        if (error.code === "ENOENT") {
            return { runs: [] };
        }
        throw error;
    }
}

async function saveQuestArchive(archive) {
    await fs.writeFile(QUEST_REPORT_ARCHIVE_FILE, JSON.stringify(archive, null, 2), "utf8");
}

/**
 * Merge current app quest list into the archive. IDs still in the app get the latest snapshot;
 * IDs only in the archive (removed from app) are left unchanged — deleted quests stay in the report.
 */
function mergeQuestArchive(archive, appState) {
    const byId = new Map(archive.runs.map((r) => [r.id, r]));
    if (appState && Array.isArray(appState.questHistory)) {
        for (const run of appState.questHistory) {
            if (run && run.id) {
                byId.set(run.id, JSON.parse(JSON.stringify(run)));
            }
        }
    }
    const runs = Array.from(byId.values()).sort((a, b) => {
        const ta = typeof a.createdAt === "number" ? a.createdAt : 0;
        const tb = typeof b.createdAt === "number" ? b.createdAt : 0;
        return ta - tb;
    });
    return { runs };
}

function countSubquests(run) {
    let completed = 0;
    let total = 0;
    for (const q of run.questline?.quests ?? []) {
        for (const sq of q.subquests ?? []) {
            total += 1;
            if (sq.completed) completed += 1;
        }
    }
    return { completed, total };
}

function formatProgressReport(appState, generatedAtIso, archiveRuns) {
    const lines = [];
    lines.push("=== Gamified Self-Help Quest — Progress Report ===");
    lines.push(`Generated (UTC): ${generatedAtIso}`);
    lines.push("");
    lines.push(
        "Quest history is stored separately from your active list. Quests you remove from the app",
    );
    lines.push("remain below as their last saved snapshot.");
    lines.push("");

    const activeIds = new Set(
        (appState?.questHistory ?? []).map((r) => r?.id).filter(Boolean),
    );

    const totalXP =
        appState && typeof appState === "object"
            ? Math.max(0, Number(appState.totalXP) || 0)
            : null;

    lines.push("--- Summary ---");
    if (totalXP !== null) {
        lines.push(`Total XP (lifetime, current): ${totalXP}`);
    } else {
        lines.push("Total XP: — (no saved app state)");
    }
    const runs = Array.isArray(archiveRuns) ? archiveRuns : [];
    lines.push(`Quest runs in report archive: ${runs.length}`);
    lines.push("");

    lines.push(`--- All quest runs (${runs.length}) ---`);

    if (runs.length === 0) {
        lines.push("(none yet — generate a quest and save progress.)");
    } else {
        runs.forEach((run, i) => {
            const title = run.questline?.quest_title || "Untitled";
            const goal = run.userGoal || "—";
            const created = run.createdAt
                ? new Date(run.createdAt).toISOString()
                : "—";
            const { completed, total } = countSubquests(run);
            const inApp = run.id && activeIds.has(run.id);
            const removedFromApp = Boolean(run.id && !inApp);

            lines.push("");
            lines.push(`[${i + 1}] ${title}`);
            lines.push(`    Goal: ${goal}`);
            lines.push(`    Created: ${created}`);
            lines.push(`    Tasks done: ${completed} / ${total}`);
            if (run.id && run.id === appState?.activeQuestRunId) {
                lines.push("    (currently selected in app)");
            }
            if (removedFromApp) {
                lines.push("    (removed from app — last snapshot kept in report)");
            }
        });
    }

    lines.push("");
    lines.push("--- End of report ---");
    return lines.join("\n");
}

app.use(cors());
app.use(express.json());

const XP_MAP = {
    easy: 5,
    medium: 10,
    hard: 20,
};
// OpenAI-compatible base: must include /v1/chat/completions (not /chat/completions)
const PERPLEXITY_API_URL =
    process.env.PERPLEXITY_API_URL || "https://api.perplexity.ai/v1/sonar";
// Docs often use sonar-pro; "sonar" may not be valid on all accounts
const PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL || "sonar-pro";

function addIdsAndXp(questline) {
    return {
        ...questline,
        quests: questline.quests.map((quest, questIndex) => ({
            ...quest,
            id: `quest-${questIndex + 1}`,
            completed: false,
            subquests: quest.subquests.map((subquest, subIndex) => ({
                ...subquest,
                id: `quest-${questIndex + 1}-sub-${subIndex + 1}`,
                completed: false,
                xp: XP_MAP[subquest.difficulty] || 5,
            })),
        })),
    };
}

function normalizeDifficulty(value) {
    const raw = String(value || "").toLowerCase();
    if (raw === "easy" || raw === "medium" || raw === "hard") {
        return raw;
    }
    return "easy";
}

function sanitizeQuestline(rawQuestline) {
    const safeQuestline = rawQuestline && typeof rawQuestline === "object" ? rawQuestline : {};
    const safeTitle = typeof safeQuestline.quest_title === "string" && safeQuestline.quest_title.trim()
        ? safeQuestline.quest_title.trim()
        : "Your Goal Questline";
    const safeQuests = Array.isArray(safeQuestline.quests) ? safeQuestline.quests : [];

    return {
        quest_title: safeTitle,
        quests: safeQuests.slice(0, 6).map((quest, questIndex) => {
            const questTitle = typeof quest?.title === "string" && quest.title.trim()
                ? quest.title.trim()
                : `Quest ${questIndex + 1}`;
            const difficulty = normalizeDifficulty(quest?.difficulty);
            const subquests = Array.isArray(quest?.subquests) ? quest.subquests : [];

            return {
                title: questTitle,
                difficulty,
                subquests: subquests.slice(0, 8).map((subquest, subIndex) => ({
                    title: typeof subquest?.title === "string" && subquest.title.trim()
                        ? subquest.title.trim()
                        : `Task ${subIndex + 1}`,
                    difficulty: normalizeDifficulty(subquest?.difficulty),
                })),
            };
        }).filter((quest) => quest.subquests.length > 0),
    };
}

function extractJsonObject(text) {
    if (!text || typeof text !== "string") return null;

    try {
        return JSON.parse(text);
    } catch {
        // Continue to fallback extraction.
    }

    const fencedMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/i);
    const candidate = fencedMatch ? fencedMatch[1] : text;

    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;

    try {
        return JSON.parse(candidate.slice(start, end + 1));
    } catch {
        return null;
    }
}

function messageContentToString(content) {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content
            .map((part) => (typeof part?.text === "string" ? part.text : part?.content || ""))
            .join("");
    }
    return "";
}

async function generateQuestlineWithPerplexity(goal, theme) {
    const apiKey = process.env.PERPLEXITY_API_KEY?.trim();
    if (!apiKey) {
        throw new Error("Missing PERPLEXITY_API_KEY in backend .env (backend/index.js folder).");
    }

    const systemPrompt = [
        "You are a quest designer for a gamified self-improvement app.",
        "Return ONLY valid JSON and no extra text.",
        "Use this schema exactly:",
        "{",
        '  "quest_title": "string",',
        '  "quests": [',
        "    {",
        '      "title": "string",',
        '      "difficulty": "easy|medium|hard",',
        '      "subquests": [',
        '        { "title": "string", "difficulty": "easy|medium|hard" }',
        "      ]",
        "    }",
        "  ]",
        "}",
        "Constraints:",
        "- 3 to 5 quests.",
        "- 2 to 4 subquests per quest.",
        "- Keep steps specific, practical, and beginner-friendly.",
    ].join("\n");

    const userPrompt = `Goal: ${goal}\nTheme: ${theme}\nGenerate a questline JSON now.`;

    const response = await fetch(PERPLEXITY_API_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: PERPLEXITY_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
        }),
    });

    const rawText = await response.text();
    if (!response.ok) {
        let detail = rawText;
        try {
            const errJson = JSON.parse(rawText);
            detail = errJson.error?.message || errJson.message || rawText;
        } catch {
            // keep rawText
        }
        throw new Error(`Perplexity API error (${response.status}): ${detail}`);
    }

    let payload;
    try {
        payload = JSON.parse(rawText);
    } catch {
        throw new Error(`Perplexity returned non-JSON: ${rawText.slice(0, 200)}`);
    }

    const content = messageContentToString(payload?.choices?.[0]?.message?.content);
    const parsed = extractJsonObject(content);

    if (!parsed) {
        throw new Error("Perplexity returned a non-JSON response.");
    }

    return sanitizeQuestline(parsed);
}

app.get("/", (req, res) => {
    res.json({ message: "Quest backend is running." });
});

app.get("/progress", async (req, res) => {
    try {
        const raw = await fs.readFile(PROGRESS_FILE, "utf8");
        const appState = JSON.parse(raw);
        res.json({ appState });
    } catch (error) {
        if (error.code === "ENOENT") {
            return res.json({ appState: null });
        }
        console.error("Error loading progress:", error);
        res.status(500).json({ error: "Failed to load progress." });
    }
});

app.post("/progress", async (req, res) => {
    try {
        const { appState } = req.body;
        await fs.writeFile(PROGRESS_FILE, JSON.stringify(appState, null, 2), "utf8");

        const archive = await loadQuestArchive();
        const merged = mergeQuestArchive(archive, appState);
        await saveQuestArchive(merged);

        res.json({ ok: true });
    } catch (error) {
        console.error("Error saving progress:", error);
        res.status(500).json({ error: "Failed to save progress." });
    }
});

/**
 * Build a human-readable report from quest-report-archive.json (+ current XP from app state),
 * save to progress-report.txt, return JSON.
 * Body may include { appState } (from browser); otherwise reads quest-progress.txt.
 * Merges appState into the archive so new quests appear before writing the report.
 */
app.post("/progress-report", async (req, res) => {
    try {
        let appState = req.body?.appState;

        if (appState === undefined || appState === null) {
            try {
                const raw = await fs.readFile(PROGRESS_FILE, "utf8");
                appState = JSON.parse(raw);
            } catch (error) {
                if (error.code === "ENOENT") {
                    appState = null;
                } else {
                    throw error;
                }
            }
        }

        const archive = await loadQuestArchive();
        const merged = mergeQuestArchive(archive, appState);
        await saveQuestArchive(merged);

        const generatedAtIso = new Date().toISOString();
        const reportText = formatProgressReport(appState, generatedAtIso, merged.runs);

        await fs.writeFile(PROGRESS_REPORT_FILE, reportText, "utf8");

        res.json({
            report: reportText,
            savedTo: "progress-report.txt",
            archiveFile: "quest-report-archive.json",
        });
    } catch (error) {
        console.error("Error building progress report:", error);
        res.status(500).json({ error: "Failed to build progress report." });
    }
});

/** Read last written report file (optional). */
app.get("/progress-report", async (req, res) => {
    try {
        const reportText = await fs.readFile(PROGRESS_REPORT_FILE, "utf8");
        res.json({ report: reportText });
    } catch (error) {
        if (error.code === "ENOENT") {
            return res.status(404).json({ error: "No progress-report.txt yet. POST /progress-report first." });
        }
        console.error("Error reading progress report:", error);
        res.status(500).json({ error: "Failed to read progress report." });
    }
});

app.delete("/progress", async (req, res) => {
    try {
        await fs.unlink(PROGRESS_FILE);
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.error("Error clearing progress:", error);
            return res.status(500).json({ error: "Failed to clear progress." });
        }
    }

    try {
        await fs.unlink(QUEST_REPORT_ARCHIVE_FILE);
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.error("Error clearing quest report archive:", error);
            return res.status(500).json({ error: "Failed to clear report archive." });
        }
    }

    try {
        await fs.unlink(PROGRESS_REPORT_FILE);
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.error("Error clearing progress report:", error);
            return res.status(500).json({ error: "Failed to clear progress report file." });
        }
    }

    res.json({ ok: true });
});

app.post("/generate-quest", async (req, res) => {
    try {
        const { goal, theme } = req.body;

        if (!goal || !theme) {
            return res.status(400).json({ error: "Goal and theme are required." });
        }

        const generatedQuestline = await generateQuestlineWithPerplexity(goal, theme);
        const questline = addIdsAndXp(generatedQuestline);

        res.json({
            userGoal: goal,
            theme,
            totalXP: 0,
            questline,
        });
    } catch (error) {
        console.error("Error generating quest:", error);
        const message =
            error instanceof Error ? error.message : "Something went wrong.";
        res.status(500).json({ error: message });
    }
});

/**
 * Same AI generation as /generate-quest, but only returns the new questline.
 * Use the original run's userGoal + theme so the new line matches the same intent/style.
 */
app.post("/regenerate-quest", async (req, res) => {
    try {
        const { goal, theme } = req.body;

        if (!goal || !theme) {
            return res.status(400).json({ error: "Goal and theme are required." });
        }

        const generatedQuestline = await generateQuestlineWithPerplexity(goal, theme);
        const questline = addIdsAndXp(generatedQuestline);

        res.json({ questline });
    } catch (error) {
        console.error("Error regenerating quest:", error);
        const message =
            error instanceof Error ? error.message : "Something went wrong.";
        res.status(500).json({ error: message });
    }
});

/** If the archive is empty but quest-progress.txt exists, import runs once (existing installs). */
async function bootstrapArchiveFromProgressIfNeeded() {
    try {
        const archive = await loadQuestArchive();
        if (archive.runs.length > 0) return;

        let raw;
        try {
            raw = await fs.readFile(PROGRESS_FILE, "utf8");
        } catch (error) {
            if (error.code === "ENOENT") return;
            throw error;
        }

        const appState = JSON.parse(raw);
        const merged = mergeQuestArchive(archive, appState);
        if (merged.runs.length > 0) {
            await saveQuestArchive(merged);
            console.log(
                `[progress] Migrated ${merged.runs.length} quest run(s) into quest-report-archive.json`,
            );
        }
    } catch (error) {
        console.warn("[progress] Archive bootstrap skipped:", error?.message || error);
    }
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    bootstrapArchiveFromProgressIfNeeded();
});