const { OpenAI } = require('openai');
const { UserQuestion, AIResponse } = require('../models');
const { validationResult } = require('express-validator');

const openai = new OpenAI(process.env.OPENAI_API_KEY);

exports.askQuestion = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { question } = req.body;
        const userId = req.user.id;

        // Save user question
        const userQuestion = await UserQuestion.create({
            user_id: userId,
            question,
            asked_at: new Date()
        });

        // Get context from database if needed (e.g., related tutorials)
        // const relatedTutorials = await Tutorial.findAll(...);

        // Create prompt with context
        const prompt = `
        You are an AI tutor for college freshmen. The student has asked:
        "${question}"

        Please provide a clear, concise answer suitable for a college freshman.
        Break down complex concepts into simpler terms when appropriate.
        If the question relates to specific academic subjects (math, science, writing),
        provide accurate information and examples where helpful.
        `;

        // Call OpenAI API
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a helpful tutor for college freshmen." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        const answer = response.choices[0].message.content;

        // Save AI response
        await AIResponse.create({
            question_id: userQuestion.id,
            answer,
            responded_at: new Date()
        });

        res.json({ answer });
    } catch (err) {
        console.error('Error in AI question handling:', err);
        res.status(500).json({ message: 'Error processing your question' });
    }
};

exports.getChatHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const history = await UserQuestion.findAll({
            where: { user_id: userId },
            include: [{
                model: AIResponse,
                required: false
            }],
            order: [['asked_at', 'DESC']],
            limit: 20
        });

        res.json(history);
    } catch (err) {
        console.error('Error fetching chat history:', err);
        res.status(500).json({ message: 'Error fetching chat history' });
    }
};