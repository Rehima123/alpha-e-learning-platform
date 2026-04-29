// ─── Alpha AI Engine — Offline Quiz & Note Generator ─────────────────────────
// Works 100% offline using rule-based NLP + course content
// Optionally uses cloud AI (Gemini/OpenAI) when online

class AlphaAIEngine {
    constructor() {
        this.db = typeof offlineDB !== 'undefined' ? offlineDB : null;
        this.cloudEndpoint = '/api/ai/generate'; // backend proxy to cloud AI
    }

    // ── Main entry: generate quiz from course/lesson ──────────────────────────
    async generateQuiz(source, options = {}) {
        const { count = 5, difficulty = 'medium', type = 'mcq' } = options;

        // Try cloud AI first if online
        if (navigator.onLine) {
            try {
                const res = await api.request('/ai/generate', {
                    method: 'POST',
                    body: JSON.stringify({ type: 'quiz', source, count, difficulty })
                });
                if (res.success && res.questions) {
                    await this._cacheQuiz(source.id, res.questions);
                    return res.questions;
                }
            } catch { /* fall through to offline */ }
        }

        // Offline: check cache first
        const cached = await this._getCachedQuiz(source.id);
        if (cached) return cached.slice(0, count);

        // Generate locally
        return this._generateOfflineQuiz(source, count, difficulty);
    }

    // ── Generate short notes from lesson/course ───────────────────────────────
    async generateNotes(source, options = {}) {
        const { style = 'bullet' } = options; // 'bullet' | 'summary' | 'mindmap'

        if (navigator.onLine) {
            try {
                const res = await api.request('/ai/generate', {
                    method: 'POST',
                    body: JSON.stringify({ type: 'notes', source, style })
                });
                if (res.success && res.notes) {
                    await this._cacheNotes(source.id, res.notes);
                    return res.notes;
                }
            } catch {}
        }

        const cached = await this._getCachedNotes(source.id);
        if (cached) return cached;

        return this._generateOfflineNotes(source, style);
    }

    // ── OFFLINE QUIZ GENERATOR ────────────────────────────────────────────────
    _generateOfflineQuiz(source, count, difficulty) {
        const title   = source.title || '';
        const desc    = source.description || '';
        const lessons = source.lessons || [];
        const category = source.category || '';

        const questions = [];

        // 1. Generate from lesson titles
        lessons.forEach((lesson, idx) => {
            if (questions.length >= count) return;
            const q = this._lessonToQuestion(lesson, idx, title, difficulty);
            if (q) questions.push(q);
        });

        // 2. Fill remaining with category-based questions
        const catQuestions = this._getCategoryQuestions(category, title, desc);
        for (const q of catQuestions) {
            if (questions.length >= count) break;
            questions.push(q);
        }

        // 3. Fill any remaining with generic course questions
        const generic = this._getGenericQuestions(title, desc);
        for (const q of generic) {
            if (questions.length >= count) break;
            questions.push(q);
        }

        return this._shuffle(questions).slice(0, count);
    }

    _lessonToQuestion(lesson, idx, courseTitle, difficulty) {
        const title = lesson.title || '';
        const words = title.split(/\s+/).filter(w => w.length > 3);
        if (words.length < 2) return null;

        const templates = [
            {
                q: `What is the main focus of "${title}"?`,
                correct: `Understanding the core concepts of ${title.toLowerCase()}`,
                wrong: [
                    `Memorizing unrelated historical dates`,
                    `Practicing physical exercises`,
                    `Learning a foreign language`
                ]
            },
            {
                q: `Which topic is covered in Lesson ${idx + 1}: "${title}"?`,
                correct: title,
                wrong: [
                    `Advanced quantum mechanics`,
                    `Medieval European history`,
                    `Marine biology`
                ]
            },
            {
                q: `"${title}" is part of which course?`,
                correct: courseTitle,
                wrong: [
                    `Advanced Calculus II`,
                    `Organic Chemistry Lab`,
                    `International Relations`
                ]
            }
        ];

        const t = templates[idx % templates.length];
        const options = this._shuffle([t.correct, ...t.wrong]).slice(0, 4);
        return {
            question: t.q,
            options,
            answer: options.indexOf(t.correct),
            explanation: `This question is about "${title}" from the course content.`,
            difficulty
        };
    }

    _getCategoryQuestions(category, title, desc) {
        const banks = {
            semester1: [
                { question: 'Which of the following is a First Semester common course?', options: ['Critical Thinking', 'Entrepreneurship', 'Advanced History', 'General Chemistry'], answer: 0, explanation: 'Critical Thinking is a core First Semester course.' },
                { question: 'What is the purpose of General Psychology in freshman year?', options: ['Understanding human behavior and mental processes', 'Learning advanced mathematics', 'Studying chemical reactions', 'Analyzing geographic data'], answer: 0, explanation: 'General Psychology introduces students to human behavior and mental processes.' },
                { question: 'Physical Fitness is graded as:', options: ['Pass/Fail', 'A-F letter grade', 'Percentage only', 'Not graded'], answer: 0, explanation: 'Physical Fitness uses a Pass/Fail grading system.' },
                { question: 'Which course helps students develop logical reasoning skills?', options: ['Critical Thinking', 'Physical Fitness', 'Geography', 'Economics'], answer: 0, explanation: 'Critical Thinking specifically develops logical reasoning and argumentation.' }
            ],
            semester2: [
                { question: 'Entrepreneurship in Semester 2 focuses on:', options: ['Business planning and innovation mindset', 'Advanced physics problems', 'Historical analysis', 'Geographic mapping'], answer: 0, explanation: 'Entrepreneurship covers startup thinking, business planning, and innovation.' },
                { question: 'What does ICT stand for in "Introduction to Emerging Technologies"?', options: ['Information and Communication Technology', 'International Cultural Training', 'Integrated Circuit Technology', 'Industrial Control Theory'], answer: 0, explanation: 'ICT stands for Information and Communication Technology.' },
                { question: 'Economics in Semester 2 covers:', options: ['Supply & demand, market systems, Ethiopian economy', 'Chemical equations and reactions', 'Physical fitness training', 'Language grammar rules'], answer: 0, explanation: 'Economics covers microeconomics, macroeconomics, and the Ethiopian economic context.' }
            ],
            natural: [
                { question: 'Which stream leads to Engineering and Medicine?', options: ['Natural Science', 'Social Science', 'Business', 'Arts'], answer: 0, explanation: 'Natural Science stream leads to Engineering, Medicine, and Natural Sciences.' },
                { question: 'General Biology covers:', options: ['Cell biology, genetics, ecology, and evolution', 'Market economics and trade', 'Historical civilizations', 'Communication skills'], answer: 0, explanation: 'General Biology covers life sciences fundamentals.' },
                { question: 'What is the study of chemical reactions and atomic structure?', options: ['Chemistry', 'Biology', 'Geography', 'Psychology'], answer: 0, explanation: 'Chemistry studies atomic structure, chemical bonding, and reactions.' },
                { question: 'Calculus is primarily used in:', options: ['Engineering and Physics calculations', 'Historical research', 'Language learning', 'Social studies'], answer: 0, explanation: 'Calculus is fundamental to engineering, physics, and natural sciences.' }
            ],
            social: [
                { question: 'Which stream leads to Law and Business?', options: ['Social Science', 'Natural Science', 'Engineering', 'Medicine'], answer: 0, explanation: 'Social Science stream leads to Law, Business, Education, and Social Sciences.' },
                { question: 'Advanced History focuses on:', options: ['Historical analysis and research methods', 'Chemical experiments', 'Mathematical proofs', 'Physical training'], answer: 0, explanation: 'Advanced History covers historiography, primary sources, and world history.' },
                { question: 'What does Social Anthropology study?', options: ['Human societies and cultural diversity', 'Chemical compounds', 'Mathematical functions', 'Physical geography only'], answer: 0, explanation: 'Social Anthropology studies human societies, culture, kinship, and social structures.' }
            ]
        };

        return (banks[category] || []).map(q => ({ ...q, difficulty: 'medium' }));
    }

    _getGenericQuestions(title, desc) {
        const keywords = [...title.split(/\s+/), ...desc.split(/\s+/)]
            .filter(w => w.length > 4)
            .slice(0, 5);

        return [
            {
                question: `What is the primary goal of studying "${title}"?`,
                options: [
                    `To gain foundational knowledge and skills in ${keywords[0] || 'this subject'}`,
                    `To memorize unrelated facts`,
                    `To avoid other subjects`,
                    `To complete a physical task`
                ],
                answer: 0,
                explanation: `The primary goal is to build foundational knowledge in ${title}.`,
                difficulty: 'easy'
            },
            {
                question: `Ethiopian freshman students study "${title}" during:`,
                options: ['Their first year at university', 'Their final year', 'Graduate school', 'High school only'],
                answer: 0,
                explanation: `${title} is part of the Ethiopian freshman year curriculum.`,
                difficulty: 'easy'
            },
            {
                question: `Which best describes the content of "${title}"?`,
                options: [
                    desc.slice(0, 80) + '...',
                    'Advanced post-graduate research',
                    'Unrelated technical training',
                    'Physical education only'
                ],
                answer: 0,
                explanation: `The course description accurately summarizes the content.`,
                difficulty: 'medium'
            }
        ];
    }

    // ── OFFLINE NOTES GENERATOR ───────────────────────────────────────────────
    _generateOfflineNotes(source, style) {
        const title   = source.title || 'Course';
        const desc    = source.description || '';
        const lessons = source.lessons || [];
        const category = source.category || '';

        if (style === 'summary') {
            return this._generateSummary(title, desc, lessons, category);
        } else if (style === 'mindmap') {
            return this._generateMindmap(title, lessons, category);
        } else {
            return this._generateBulletNotes(title, desc, lessons, category);
        }
    }

    _generateBulletNotes(title, desc, lessons, category) {
        const streamInfo = {
            natural: 'Leads to: Engineering, Medicine, Natural Sciences',
            social:  'Leads to: Law, Business, Education, Social Sciences',
            semester1: 'Common course for all freshman students — Semester 1',
            semester2: 'Common course for all freshman students — Semester 2'
        };

        let notes = `# 📝 Study Notes: ${title}\n\n`;
        notes += `## 📌 Overview\n`;
        notes += `- **Course:** ${title}\n`;
        notes += `- **Stream:** ${streamInfo[category] || 'Ethiopian Freshman Curriculum'}\n`;
        notes += `- **Total Lessons:** ${lessons.length}\n\n`;

        notes += `## 📖 Course Summary\n`;
        const sentences = desc.split(/[.!?]+/).filter(s => s.trim().length > 10);
        sentences.slice(0, 4).forEach(s => {
            notes += `- ${s.trim()}\n`;
        });
        notes += '\n';

        if (lessons.length > 0) {
            notes += `## 📚 Lesson Breakdown\n`;
            lessons.forEach((l, i) => {
                notes += `### ${i + 1}. ${l.title}\n`;
                if (l.description) notes += `> ${l.description}\n`;
                notes += `- Duration: ${l.duration || 'N/A'}\n`;
                notes += `- Key focus: ${this._extractKeyFocus(l.title)}\n\n`;
            });
        }

        notes += `## 🎯 Key Takeaways\n`;
        notes += this._getKeyTakeaways(title, category);

        notes += `\n## 📝 Exam Tips\n`;
        notes += this._getExamTips(category);

        return notes;
    }

    _generateSummary(title, desc, lessons, category) {
        const lessonTitles = lessons.map(l => l.title).join(', ');
        return `# 📋 Summary: ${title}

## What You'll Learn
${desc}

## Topics Covered
${lessonTitles ? lessonTitles.split(', ').map(t => `• ${t}`).join('\n') : '• See lesson list'}

## Why It Matters
${this._getWhyItMatters(title, category)}

## Quick Review
${this._getKeyTakeaways(title, category)}`;
    }

    _generateMindmap(title, lessons, category) {
        const branches = lessons.slice(0, 6).map(l =>
            `  ├── ${l.title}\n  │   └── ${this._extractKeyFocus(l.title)}`
        ).join('\n');

        return `# 🗺️ Mind Map: ${title}

${title}
${branches || '  ├── Core Concepts\n  ├── Applications\n  └── Review'}
  └── Key Outcomes
      └── ${this._getStreamOutcome(category)}`;
    }

    _extractKeyFocus(lessonTitle) {
        const keywords = {
            'introduction': 'Foundational concepts and overview',
            'basic': 'Core principles and fundamentals',
            'advanced': 'In-depth analysis and application',
            'review': 'Consolidation and exam preparation',
            'application': 'Practical use and real-world examples',
            'analysis': 'Critical examination and evaluation',
            'history': 'Historical context and timeline',
            'theory': 'Theoretical framework and models',
            'practice': 'Hands-on exercises and examples',
            'system': 'Structure, components, and interactions'
        };
        const lower = lessonTitle.toLowerCase();
        for (const [key, val] of Object.entries(keywords)) {
            if (lower.includes(key)) return val;
        }
        return `Understanding ${lessonTitle.toLowerCase()}`;
    }

    _getKeyTakeaways(title, category) {
        const takeaways = {
            semester1: `- Master the foundational concepts early\n- Connect theory to real Ethiopian context\n- Build strong study habits from day one\n- Participate actively in all sessions`,
            semester2: `- Build on Semester 1 knowledge\n- Focus on practical applications\n- Prepare for stream selection\n- Develop critical thinking skills`,
            natural: `- Strong mathematical foundation is essential\n- Lab work reinforces theoretical concepts\n- Connect concepts across Physics, Chemistry, Biology\n- Aim for 3.5+ GPA for competitive programs`,
            social: `- Reading and writing skills are critical\n- Understand Ethiopian and global contexts\n- Develop analytical and research skills\n- Build communication and presentation abilities`
        };
        return takeaways[category] || `- Study consistently, not just before exams\n- Make connections between topics\n- Use past exam questions for practice\n- Form study groups with classmates`;
    }

    _getExamTips(category) {
        const tips = {
            natural: `- Practice problem-solving daily\n- Memorize key formulas and constants\n- Draw diagrams for complex concepts\n- Time yourself on practice problems`,
            social: `- Read widely beyond the textbook\n- Practice essay writing\n- Create timelines for historical events\n- Use mnemonics for key terms`,
            semester1: `- Review lecture notes within 24 hours\n- Create summary cards for each topic\n- Practice past exam questions\n- Focus on understanding, not memorization`,
            semester2: `- Connect new material to Semester 1\n- Focus on application questions\n- Review all assignments before exams\n- Ask instructors about exam format`
        };
        return tips[category] || `- Start revision 2 weeks before exams\n- Focus on weak areas first\n- Get enough sleep before exam day\n- Read questions carefully during the exam`;
    }

    _getWhyItMatters(title, category) {
        const reasons = {
            natural: `This course is foundational for Engineering, Medicine, and Natural Science programs. Strong performance directly impacts your department placement.`,
            social: `This course builds critical skills for Law, Business, Education, and Social Science programs. It develops analytical thinking essential for your career.`,
            semester1: `As a common freshman course, this builds the foundation for all future studies and contributes to your GPA for department placement.`,
            semester2: `This course expands your knowledge base and helps determine your academic stream for the rest of your university career.`
        };
        return reasons[category] || `This course is part of the Ethiopian freshman curriculum and contributes to your overall GPA and academic development.`;
    }

    _getStreamOutcome(category) {
        const outcomes = {
            natural: 'Engineering / Medicine / Natural Sciences',
            social: 'Law / Business / Education / Social Sciences',
            semester1: 'Foundation for all streams',
            semester2: 'Stream selection preparation'
        };
        return outcomes[category] || 'Academic excellence';
    }

    // ── Cache helpers ─────────────────────────────────────────────────────────
    async _cacheQuiz(id, questions) {
        if (!this.db) return;
        try { await this.db.put('quizzes', { _id: `quiz-${id}`, questions, cachedAt: Date.now() }); } catch {}
    }

    async _getCachedQuiz(id) {
        if (!this.db) return null;
        try {
            const cached = await this.db.get('quizzes', `quiz-${id}`);
            if (cached && Date.now() - cached.cachedAt < 7 * 86400000) return cached.questions;
        } catch {}
        return null;
    }

    async _cacheNotes(id, notes) {
        if (!this.db) return;
        try { await this.db.put('notes', { _id: `notes-${id}`, notes, cachedAt: Date.now() }); } catch {}
    }

    async _getCachedNotes(id) {
        if (!this.db) return null;
        try {
            const cached = await this.db.get('notes', `notes-${id}`);
            if (cached && Date.now() - cached.cachedAt < 7 * 86400000) return cached.notes;
        } catch {}
        return null;
    }

    _shuffle(arr) {
        return [...arr].sort(() => Math.random() - 0.5);
    }
}

const aiEngine = new AlphaAIEngine();
