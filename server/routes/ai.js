const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const Course  = require('../models/Course');

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
// Alpha AI floating chat — Gemini-powered, public (no auth required)
router.post('/chat', async (req, res, next) => {
    try {
        const { message, history = [], systemContext } = req.body;
        if (!message) return res.status(400).json({ success: false, message: 'message is required' });

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.json({ success: false, offline: true, message: 'No Gemini key configured' });
        }

        // Build conversation for Gemini
        const axios = require('axios');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

        // Convert history to Gemini format (last 6 turns)
        const contents = (history || []).slice(-6).map(m => ({
            role:  m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));
        contents.push({ role: 'user', parts: [{ text: message }] });

        const response = await axios.post(url, {
            system_instruction: systemContext
                ? { parts: [{ text: systemContext }] }
                : undefined,
            contents,
            generationConfig: {
                temperature:     0.72,
                maxOutputTokens: 600,
                topP:            0.9
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
            ]
        }, { timeout: 12000 });

        const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!reply) return res.json({ success: false, message: 'Empty response from Gemini' });

        res.json({ success: true, reply });
    } catch (error) {
        // Don't crash server — let client use local fallback
        console.error('[AI/chat]', error.message);
        res.json({ success: false, message: error.message });
    }
});

// ── POST /api/ai/generate ─────────────────────────────────────────────────────
// Generates quiz or notes using Gemini, else returns offline flag for client fallback
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
