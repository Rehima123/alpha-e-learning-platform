const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const Course  = require('../models/Course');

// POST /api/ai/generate
// Generates quiz or notes using cloud AI (Gemini) if key is set, else returns empty for client fallback
router.post('/generate', protect, async (req, res, next) => {
    try {
        const { type, source, count = 5, difficulty = 'medium', style = 'bullet' } = req.body;

        const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

        if (!apiKey) {
            // No cloud AI key — tell client to use offline engine
            return res.json({ success: false, offline: true, message: 'No AI key configured — using offline engine' });
        }

        // Fetch full course if only ID provided
        let courseData = source;
        if (source._id && !source.lessons) {
            const course = await Course.findById(source._id);
            if (course) courseData = course.toObject();
        }

        const prompt = buildPrompt(type, courseData, count, difficulty, style);

        // Try Gemini first
        if (process.env.GEMINI_API_KEY) {
            const result = await callGemini(prompt, process.env.GEMINI_API_KEY);
            return res.json({ success: true, ...result });
        }

        res.json({ success: false, offline: true });
    } catch (error) {
        next(error);
    }
});

function buildPrompt(type, course, count, difficulty, style) {
    const lessonList = (course.lessons || []).map(l => `- ${l.title}`).join('\n');

    if (type === 'quiz') {
        return `Generate ${count} multiple-choice quiz questions about "${course.title}" for Ethiopian freshman university students.
Course description: ${course.description}
Lessons covered:
${lessonList}

Difficulty: ${difficulty}

Return ONLY valid JSON array:
[
  {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "answer": 0,
    "explanation": "...",
    "difficulty": "${difficulty}"
  }
]`;
    } else {
        return `Generate ${style} study notes for "${course.title}" for Ethiopian freshman university students.
Course description: ${course.description}
Lessons:
${lessonList}

Format: ${style === 'bullet' ? 'Bullet points with headers' : style === 'summary' ? 'Concise paragraph summary' : 'Mind map text format'}
Keep it practical and focused on exam preparation.`;
    }
}

async function callGemini(prompt, apiKey) {
    const axios = require('axios');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    const response = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
    });

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Try to parse JSON for quiz
    try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const questions = JSON.parse(jsonMatch[0]);
            return { questions };
        }
    } catch {}

    return { notes: text };
}

module.exports = router;
