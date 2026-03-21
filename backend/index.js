import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const XP_MAP = {
    easy: 5,
    medium: 10,
    hard: 20,
};

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

app.get("/", (req, res) => {
    res.json({ message: "Quest backend is running." });
});

app.post("/generate-quest", async (req, res) => {
    try {
        const { goal, theme } = req.body;

        if (!goal || !theme) {
            return res.status(400).json({ error: "Goal and theme are required." });
        }

        // Mock response for now
        const mockQuestline = {
            quest_title:
                theme === "fantasy"
                    ? "The Path of Focus"
                    : theme === "sci-fi"
                        ? "Mission: Reclaim Productivity"
                        : "Level Up Your Goal",
            quests: [
                {
                    title: "Prepare Your Base",
                    difficulty: "easy",
                    subquests: [
                        { title: "Write down your main obstacle", difficulty: "easy" },
                        { title: "Clear one distraction from your workspace", difficulty: "easy" }
                    ]
                },
                {
                    title: "Take the First Action",
                    difficulty: "medium",
                    subquests: [
                        { title: "Work on the goal for 10 minutes", difficulty: "easy" },
                        { title: "List the next 3 tiny steps", difficulty: "medium" }
                    ]
                },
                {
                    title: "Build Momentum",
                    difficulty: "hard",
                    subquests: [
                        { title: "Complete one full focused session", difficulty: "medium" },
                        { title: "Reflect on what worked", difficulty: "easy" },
                        { title: "Plan tomorrow's first step", difficulty: "easy" }
                    ]
                }
            ]
        };

        const questline = addIdsAndXp(mockQuestline);

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