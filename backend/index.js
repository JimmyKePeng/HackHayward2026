import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROGRESS_FILE = path.join(__dirname, "quest-progress.txt");

app.use(cors());
app.use(express.json());

const XP_MAP = {
    easy: 5,
    medium: 10,
    hard: 20,
};
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL || "sonar";

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

async function generateQuestlineWithPerplexity(goal, theme) {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
        throw new Error("Missing PERPLEXITY_API_KEY in backend environment.");
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
        throw new Error(`Perplexity API error (${response.status}): ${rawText}`);
    }

    const payload = JSON.parse(rawText);
    const content = payload?.choices?.[0]?.message?.content;
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
        res.json({ ok: true });
    } catch (error) {
        console.error("Error saving progress:", error);
        res.status(500).json({ error: "Failed to save progress." });
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
        res.status(500).json({ error: "Something went wrong." });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});