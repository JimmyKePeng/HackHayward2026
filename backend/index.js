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

/** True when every subquest is done (or quest.completed flag set). */
function isQuestFullyCompleted(quest) {
    if (quest?.completed === true) return true;
    const subs = quest?.subquests ?? [];
    if (subs.length === 0) return false;
    return subs.every((sq) => sq.completed === true);
}

/** Entire questline finished — one Skill entry per run/topic, not per quest. */
function isRunFullyCompleted(run) {
    const quests = run.questline?.quests ?? [];
    if (quests.length === 0) return false;
    return quests.every((q) => isQuestFullyCompleted(q));
}

/** Unique user goals + quest titles from archive runs (for “what you learned” context). */
function extractLearnedTopics(archiveRuns) {
    const topics = [];
    const seen = new Set();
    for (const run of archiveRuns ?? []) {
        const goal = typeof run.userGoal === "string" ? run.userGoal.trim() : "";
        const title =
            typeof run.questline?.quest_title === "string"
                ? run.questline.quest_title.trim()
                : "";
        for (const p of [goal, title]) {
            if (!p || p === "—") continue;
            const key = p.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            topics.push(p);
        }
    }
    return topics;
}

function normalizeNextTopicSuggestions(parsed) {
    const raw = parsed?.suggestions;
    if (!Array.isArray(raw)) return null;
    const out = [];
    const seen = new Set();
    for (const item of raw) {
        if (typeof item !== "string") continue;
        const t = item.trim().slice(0, 200);
        if (!t) continue;
        const k = t.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(t);
        if (out.length >= 3) break;
    }
    return out.length >= 3 ? out : null;
}

async function suggestNextTopicsWithPerplexity(learnedTopics) {
    const apiKey = process.env.PERPLEXITY_API_KEY?.trim();
    if (!apiKey) {
        throw new Error("Missing PERPLEXITY_API_KEY in backend .env (backend/index.js folder).");
    }

    const listText =
        learnedTopics.length > 0
            ? learnedTopics.map((t, i) => `${i + 1}. ${t}`).join("\n")
            : "(No saved quest history yet — suggest broadly useful starter learning topics.)";

    const systemPrompt = [
        "You suggest concise next learning goals for a self-improvement app.",
        "Return ONLY valid JSON, no markdown or extra text.",
        'Schema: {"suggestions":["string","string","string"]}',
        "Rules:",
        "- Exactly 3 strings.",
        "- Each 8–140 characters: specific, actionable learning topics (not vague like 'learn more').",
        "- Build on or complement what the user already explored; do not copy their list verbatim.",
        "- If the list is empty, suggest 3 engaging starter topics anyone could pick up.",
    ].join("\n");

    const userPrompt = [
        "Areas the user has already worked on (goals and/or quest titles):",
        listText,
        "",
        "Suggest exactly 3 NEW topics they could learn next.",
    ].join("\n");

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
            temperature: 0.35,
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
    const suggestions = normalizeNextTopicSuggestions(parsed);
    if (!suggestions) {
        throw new Error("Perplexity did not return 3 valid suggestions. Try again.");
    }
    return suggestions;
}

function normalizeKnowledgeQuiz(parsed) {
    const raw = parsed?.questions;
    if (!Array.isArray(raw) || raw.length !== 10) return null;

    const out = [];
    for (const item of raw) {
        const question = typeof item?.question === "string" ? item.question.trim() : "";
        const options = Array.isArray(item?.options)
            ? item.options.map((o) => String(o).trim()).slice(0, 4)
            : [];
        const correctIndex = Math.floor(Number(item?.correctIndex));

        if (!question || options.length !== 4) return null;
        if (!Number.isFinite(correctIndex) || correctIndex < 0 || correctIndex > 3) return null;

        out.push({ question, options, correctIndex });
    }
    return out.length === 10 ? out : null;
}

async function generateKnowledgeQuizWithPerplexity(learnedTopics) {
    const apiKey = process.env.PERPLEXITY_API_KEY?.trim();
    if (!apiKey) {
        throw new Error("Missing PERPLEXITY_API_KEY in backend .env (backend/index.js folder).");
    }

    if (!learnedTopics.length) {
        throw new Error(
            "No quest topics in your archive yet. Generate a quest and save progress, then try again.",
        );
    }

    const listText = learnedTopics.map((t, i) => `${i + 1}. ${t}`).join("\n");

    const systemPrompt = [
        "You write short knowledge-check quizzes for a self-improvement app.",
        "Return ONLY valid JSON, no markdown or extra text.",
        'Schema: {"questions":[{"question":"string","options":["A","B","C","D"],"correctIndex":0}]}',
        "Rules:",
        "- Exactly 10 questions.",
        "- Each question: clear, non-trick multiple choice.",
        "- Each options array must have exactly 4 distinct strings (no empty strings).",
        "- correctIndex is 0, 1, 2, or 3 (index into options for the only correct answer).",
        "- Base questions ONLY on the topics the user lists; do not invent unrelated trivia.",
        "- Difficulty: mixed recall and light application suitable for someone who studied those goals.",
    ].join("\n");

    const userPrompt = [
        "The user has worked on these goals / quest titles (topics they learned):",
        listText,
        "",
        "Create exactly 10 multiple-choice questions that test understanding of these topics combined.",
    ].join("\n");

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
            temperature: 0.25,
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
    const questions = normalizeKnowledgeQuiz(parsed);
    if (!questions) {
        throw new Error("Perplexity did not return 10 valid quiz questions. Try again.");
    }
    return questions;
}

function formatProgressReport(appState, generatedAtIso, archiveRuns) {
    const lines = [];
    lines.push("=== Gamified Self-Help Quest — Progress Report ===");
    lines.push(`Generated (UTC): ${generatedAtIso}`);
    lines.push("");
    lines.push(
        "The Skill page lists one achievement per quest topic/run when the whole questline is done.",
    );
    lines.push(
        "Runs you remove from the app still contribute archived snapshots for suggestions & quizzes.",
    );
    lines.push("");

    const activeIds = new Set(
        (appState?.questHistory ?? []).map((r) => r?.id).filter(Boolean),
    );

    const totalXP =
        appState && typeof appState === "object"
            ? Math.max(0, Number(appState.totalXP) || 0)
            : null;

    const runs = Array.isArray(archiveRuns) ? archiveRuns : [];

    const completedRuns = runs.filter((run) => isRunFullyCompleted(run));

    lines.push("--- Summary ---");
    if (totalXP !== null) {
        lines.push(`Total XP (lifetime, current): ${totalXP}`);
    } else {
        lines.push("Total XP: — (no saved app state)");
    }
    lines.push(`Quest runs in report archive: ${runs.length}`);
    lines.push(`Skills achieved (fully completed topics): ${completedRuns.length}`);
    lines.push("");

    lines.push(`--- Skills achieved (${completedRuns.length} completed topics) ---`);

    if (completedRuns.length === 0) {
        lines.push(
            "(none yet — finish every subtask in every quest in a run to earn one skill for that topic.)",
        );
    } else {
        completedRuns.forEach((run, i) => {
            const runTitle = run.questline?.quest_title || "Untitled";
            const goal = run.userGoal || "—";
            const created = run.createdAt
                ? new Date(run.createdAt).toISOString()
                : "—";
            const { completed, total } = countSubquests(run);
            const inApp = run.id && activeIds.has(run.id);
            const removedFromApp = Boolean(run.id && !inApp);

            lines.push("");
            lines.push(`[${i + 1}] ${runTitle}`);
            lines.push(`    Goal: ${goal}`);
            lines.push(`    Created: ${created}`);
            lines.push(`    Tasks done: ${completed} / ${total}`);
            if (run.id && run.id === appState?.activeQuestRunId) {
                lines.push("    (run currently selected in app)");
            }
            if (removedFromApp) {
                lines.push("    (run removed from app — last snapshot kept in archive)");
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

/**
 * POST { appState? } — merge archive like /progress-report, extract learned topics,
 * ask Perplexity for 3 next topics to learn. Returns { suggestions: string[3], topicsUsed: string[] }.
 */
app.post("/suggest-next-topics", async (req, res) => {
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
        const topicsUsed = extractLearnedTopics(merged.runs);
        const suggestions = await suggestNextTopicsWithPerplexity(topicsUsed);

        res.json({ suggestions, topicsUsed });
    } catch (error) {
        console.error("Error suggesting next topics:", error);
        const message =
            error instanceof Error ? error.message : "Something went wrong.";
        res.status(500).json({ error: message });
    }
});

/**
 * POST { appState? } — merge archive, extract learned topics, Perplexity returns
 * 10 multiple-choice questions (4 options each, correctIndex 0–3).
 */
app.post("/pet-knowledge-quiz", async (req, res) => {
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
        const topicsUsed = extractLearnedTopics(merged.runs);
        const questions = await generateKnowledgeQuizWithPerplexity(topicsUsed);

        res.json({ questions, topicsUsed });
    } catch (error) {
        console.error("Error building pet knowledge quiz:", error);
        const message =
            error instanceof Error ? error.message : "Something went wrong.";
        res.status(500).json({ error: message });
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