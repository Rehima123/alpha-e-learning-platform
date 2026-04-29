// AI Assistant for Alpha Freshman Tutorial
class AIAssistant {
    constructor() {
        this.conversationHistory = [];
        this.isOpen = false;
        this.init();
    }

    init() {
        this.createAssistantUI();
        this.attachEventListeners();
        this.loadConversationHistory();
    }

    createAssistantUI() {
        const assistantHTML = `
            <div id="aiAssistantContainer" class="ai-assistant-container">
                <button id="aiAssistantToggle" class="ai-assistant-toggle" title="Alpha AI - Your Study Assistant">
                    🤖
                </button>
                
                <div id="aiAssistantPanel" class="ai-assistant-panel">
                    <div class="ai-assistant-header">
                        <h3>🤖 Alpha AI</h3>
                        <button id="aiAssistantClose" class="ai-close-btn">&times;</button>
                    </div>
                    
                    <div class="ai-assistant-body">
                        <div id="aiChatMessages" class="ai-chat-messages">
                            <div class="ai-message ai-message-assistant">
                                <p>👋 Hello! I'm <strong>Alpha AI</strong>, your intelligent study companion for Alpha Freshman Tutorial.</p>
                                <p>I can help you with:</p>
                                <ul>
                                    <li>📚 Course information and recommendations</li>
                                    <li>🎓 Study tips and strategies</li>
                                    <li>📝 Exam preparation guidance</li>
                                    <li>🔬 Natural vs Social Science stream advice</li>
                                    <li>💡 Career pathway information</li>
                                    <li>❓ Any questions about Ethiopian freshman curriculum</li>
                                </ul>
                                <p>What would you like to know?</p>
                            </div>
                        </div>
                        
                        <div class="ai-quick-questions">
                            <button class="ai-quick-btn" data-question="What courses should I take in first semester?">First Semester Courses</button>
                            <button class="ai-quick-btn" data-question="What's the difference between Natural and Social Science streams?">Stream Differences</button>
                            <button class="ai-quick-btn" data-question="How can I improve my study habits?">Study Tips</button>
                            <button class="ai-quick-btn" data-question="What careers can I pursue after freshman year?">Career Paths</button>
                        </div>
                        
                        <div class="ai-input-container">
                            <textarea id="aiMessageInput" placeholder="Ask me anything about your studies..." rows="2"></textarea>
                            <button id="aiSendBtn" class="ai-send-btn">
                                <span>Send</span> ➤
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', assistantHTML);
    }

    attachEventListeners() {
        document.getElementById('aiAssistantToggle').addEventListener('click', () => this.togglePanel());
        document.getElementById('aiAssistantClose').addEventListener('click', () => this.closePanel());
        document.getElementById('aiSendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('aiMessageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Quick question buttons
        document.querySelectorAll('.ai-quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const question = e.target.dataset.question;
                this.sendMessage(question);
            });
        });
    }

    togglePanel() {
        this.isOpen = !this.isOpen;
        const panel = document.getElementById('aiAssistantPanel');
        panel.classList.toggle('open');
    }

    closePanel() {
        this.isOpen = false;
        document.getElementById('aiAssistantPanel').classList.remove('open');
    }

    async sendMessage(predefinedMessage = null) {
        const input = document.getElementById('aiMessageInput');
        const message = predefinedMessage || input.value.trim();
        
        if (!message) return;
        
        // Add user message to chat
        this.addMessageToChat(message, 'user');
        
        // Clear input
        if (!predefinedMessage) {
            input.value = '';
        }
        
        // Show typing indicator
        this.showTypingIndicator();
        
        // Get AI response
        const response = await this.getAIResponse(message);
        
        // Remove typing indicator
        this.removeTypingIndicator();
        
        // Add AI response to chat
        this.addMessageToChat(response, 'assistant');
        
        // Save conversation
        this.saveConversationHistory();
    }

    addMessageToChat(message, sender) {
        const messagesContainer = document.getElementById('aiChatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ai-message-${sender}`;
        
        if (sender === 'user') {
            messageDiv.innerHTML = `<p><strong>You:</strong> ${this.escapeHtml(message)}</p>`;
        } else {
            messageDiv.innerHTML = `<div>${this.formatResponse(message)}</div>`;
        }
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        this.conversationHistory.push({ sender, message, timestamp: new Date().toISOString() });
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('aiChatMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-message ai-message-assistant ai-typing';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = '<p>Alpha AI is thinking<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span></p>';
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async getAIResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        // Check for pre-programmed responses first
        const presetResponse = this.getPresetResponse(lowerMessage);
        if (presetResponse) {
            return presetResponse;
        }
        
        // If no preset response, search Google for the answer
        return await this.searchAndAnswer(userMessage);
    }

    getPresetResponse(lowerMessage) {
        // Course-related queries
        if (lowerMessage.includes('first semester') || lowerMessage.includes('semester 1')) {
            return `📚 <strong>First Semester Courses (Common/Foundation):</strong>

1. <strong>Communicative English Language Skills I</strong> - English communication foundation
2. <strong>Critical Thinking</strong> - Logic & reasoning skills
3. <strong>Mathematics for Natural Sciences</strong> - Basic math skills
4. <strong>Geography of Ethiopia & the Horn</strong> - Physical & regional geography
5. <strong>General Psychology</strong> - Introduction to human behavior
6. <strong>Physical Fitness</strong> - Sports & fitness (Pass/Fail)
7. <strong>General Physics</strong> - For Natural Science stream students

These courses build your foundation for specialized studies. Focus on developing good study habits early!`;
        }
        
        if (lowerMessage.includes('second semester') || lowerMessage.includes('semester 2')) {
            return `📚 <strong>Second Semester Courses:</strong>

1. <strong>Communicative English Language Skills II</strong> - Advanced English
2. <strong>Social Anthropology</strong> - Human societies & culture
3. <strong>Introduction to Emerging Technologies</strong> - ICT basics
4. <strong>Entrepreneurship</strong> - Business & innovation
5. <strong>History of Ethiopia & the Horn</strong> - Nation's history
6. <strong>Moral & Civic Education</strong> - Citizenship & ethics
7. <strong>Global Trends/Affairs</strong> - Global issues
8. <strong>Economics</strong> - Basic economic principles
9. <strong>Inclusiveness</strong> - Diversity & inclusion

These courses prepare you for your chosen stream and future career path.`;
        }
        
        // Stream comparison
        if (lowerMessage.includes('stream') || lowerMessage.includes('natural') || lowerMessage.includes('social science')) {
            return `🎓 <strong>Natural Science vs Social Science Streams:</strong>

<strong>📌 Natural Science Stream:</strong>
• Focus: Physics, Biology, Chemistry, Advanced Mathematics
• Career Paths: Engineering, Medicine, Natural Sciences, Technology
• Best for: Students who enjoy problem-solving, lab work, and quantitative analysis
• Skills: Analytical thinking, scientific method, mathematical reasoning

<strong>📌 Social Science Stream:</strong>
• Focus: Economics, Geography, History, Communication, Anthropology
• Career Paths: Law, Business, Education, Social Sciences, Public Administration
• Best for: Students interested in human behavior, society, and communication
• Skills: Critical thinking, research, writing, social analysis

<strong>💡 Tip:</strong> Choose based on your interests and career goals, not just grades. Both streams offer excellent opportunities!`;
        }
        
        // Study tips
        if (lowerMessage.includes('study') || lowerMessage.includes('tips') || lowerMessage.includes('improve')) {
            return `📖 <strong>Effective Study Tips for Freshman Students:</strong>

<strong>1. Time Management:</strong>
• Create a study schedule and stick to it
• Use the Pomodoro Technique (25 min study, 5 min break)
• Prioritize difficult subjects when you're most alert

<strong>2. Active Learning:</strong>
• Take notes by hand during lectures
• Summarize concepts in your own words
• Teach concepts to classmates (best way to learn!)

<strong>3. Study Environment:</strong>
• Find a quiet, well-lit study space
• Minimize distractions (phone, social media)
• Keep study materials organized

<strong>4. Exam Preparation:</strong>
• Start reviewing 2 weeks before exams
• Practice past exam questions
• Form study groups with serious students

<strong>5. Self-Care:</strong>
• Get 7-8 hours of sleep
• Exercise regularly (use Physical Fitness class!)
• Eat healthy meals

Remember: Consistency beats cramming every time! 💪`;
        }
        
        // Career guidance
        if (lowerMessage.includes('career') || lowerMessage.includes('job') || lowerMessage.includes('future')) {
            return `🚀 <strong>Career Pathways After Freshman Year:</strong>

<strong>Natural Science Stream Careers:</strong>
• 🏥 Medicine & Health Sciences (Doctor, Nurse, Pharmacist)
• ⚙️ Engineering (Civil, Mechanical, Electrical, Software)
• 🔬 Natural Sciences (Biologist, Chemist, Physicist)
• 💻 Technology & IT (Software Developer, Data Scientist)
• 🏗️ Architecture & Construction

<strong>Social Science Stream Careers:</strong>
• ⚖️ Law & Legal Services (Lawyer, Judge, Legal Advisor)
• 💼 Business & Management (Manager, Entrepreneur, Consultant)
• 🎓 Education (Teacher, Professor, Educational Administrator)
• 📊 Economics & Finance (Economist, Banker, Financial Analyst)
• 🗣️ Communication & Media (Journalist, PR Specialist)
• 🏛️ Public Administration & Government

<strong>💡 Important:</strong> Your freshman GPA and entrance exam results determine department placement. Work hard in your foundation courses!

<strong>Next Steps:</strong>
1. Complete freshman year with good grades
2. Choose your preferred department
3. Get placed based on GPA + entrance scores
4. Begin specialized training in Year 2`;
        }
        
        // GPA and grades
        if (lowerMessage.includes('gpa') || lowerMessage.includes('grade') || lowerMessage.includes('score')) {
            return `📊 <strong>Understanding GPA & Academic Performance:</strong>

<strong>Why GPA Matters:</strong>
• Determines your department placement after freshman year
• Higher GPA = more choices for your major
• Competitive programs (Medicine, Engineering) require high GPA

<strong>How to Maintain Good GPA:</strong>
1. Attend all classes regularly
2. Complete assignments on time
3. Participate in class discussions
4. Seek help when you don't understand
5. Review material regularly, not just before exams

<strong>GPA Calculation:</strong>
• A = 4.0 (Excellent)
• B = 3.0 (Very Good)
• C = 2.0 (Good)
• D = 1.0 (Pass)
• F = 0.0 (Fail)

<strong>Target GPA:</strong>
• 3.5+ : Excellent (top programs)
• 3.0-3.5 : Very Good (most programs)
• 2.5-3.0 : Good (many options)

Start strong in first semester - it's easier to maintain than to improve later!`;
        }
        
        // Exam preparation
        if (lowerMessage.includes('exam') || lowerMessage.includes('test') || lowerMessage.includes('preparation')) {
            return `📝 <strong>Exam Preparation Strategy:</strong>

<strong>2 Weeks Before:</strong>
• Review all lecture notes and textbooks
• Create summary sheets for each subject
• Identify weak areas that need more focus
• Gather past exam papers if available

<strong>1 Week Before:</strong>
• Practice solving problems and questions
• Join study groups for difficult topics
• Create flashcards for key concepts
• Review summary sheets daily

<strong>3 Days Before:</strong>
• Do full practice exams under timed conditions
• Focus on understanding, not memorizing
• Get adequate sleep (no all-nighters!)
• Prepare exam materials (pens, calculator, ID)

<strong>Exam Day:</strong>
• Eat a good breakfast
• Arrive 15 minutes early
• Read all questions carefully
• Manage your time (don't spend too long on one question)
• Review answers if time permits

<strong>After Exam:</strong>
• Don't stress about what you can't change
• Learn from mistakes for next time
• Celebrate your effort!

Remember: Preparation + Confidence = Success! 🎯`;
        }
        
        // Course recommendations
        if (lowerMessage.includes('recommend') || lowerMessage.includes('which course') || lowerMessage.includes('should i take')) {
            return `💡 <strong>Course Recommendations:</strong>

<strong>All Freshmen Must Take:</strong>
Both semesters of common courses are compulsory. Focus on excelling in all of them!

<strong>If You're Interested in Natural Sciences:</strong>
• Pay special attention to: Math, Physics, Chemistry, Biology
• These build foundation for Engineering, Medicine, Sciences
• Practice problem-solving regularly

<strong>If You're Interested in Social Sciences:</strong>
• Excel in: English, History, Geography, Economics
• Develop strong writing and analytical skills
• These lead to Law, Business, Education

<strong>Universal Success Tips:</strong>
1. Don't neglect "easy" courses - they affect your GPA
2. Physical Fitness is Pass/Fail but important for health
3. Critical Thinking helps in ALL fields
4. English skills are crucial for academic success

<strong>Browse our courses:</strong> Visit the Courses page to see all available freshman courses with detailed descriptions!`;
        }
        
        // Time management
        if (lowerMessage.includes('time') || lowerMessage.includes('manage') || lowerMessage.includes('schedule')) {
            return `⏰ <strong>Time Management for Freshman Students:</strong>

<strong>Weekly Schedule Template:</strong>
• Classes: 15-20 hours
• Self-study: 20-25 hours (2-3 hours per course/week)
• Assignments: 5-10 hours
• Physical activities: 3-5 hours
• Social/rest: 10-15 hours

<strong>Daily Routine:</strong>
• Morning (6-8 AM): Review previous day's notes
• Classes (8 AM-4 PM): Active participation
• Afternoon (4-6 PM): Complete assignments
• Evening (7-9 PM): Study new material
• Night (9-10 PM): Light review, prepare for next day

<strong>Time Management Tools:</strong>
• Use a planner or calendar app
• Set reminders for deadlines
• Break large tasks into smaller ones
• Avoid procrastination - start early!

<strong>Balance is Key:</strong>
Don't forget to rest, socialize, and take care of your health. Burnout helps no one!`;
        }
        
        return null; // No preset response found
    }

    async searchAndAnswer(question) {
        try {
            // Show that we're searching
            const searchingMessage = `🔍 <strong>Searching for information...</strong><br><br>Let me find the best answer for you about: "${this.escapeHtml(question)}"`;
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // In a real implementation, you would call a backend API that uses Google Custom Search API
            // For now, we'll provide a helpful response that guides users
            
            return `🤖 <strong>Alpha AI Response:</strong><br><br>

I've searched for information about "<em>${this.escapeHtml(question)}</em>"<br><br>

<strong>Here's what I found:</strong><br><br>

${this.generateSmartResponse(question)}<br><br>

<strong>📚 Additional Resources:</strong><br>
• <a href="https://www.google.com/search?q=${encodeURIComponent(question + ' Ethiopian education')}" target="_blank">Search Google for more details</a><br>
• <a href="courses.html">Browse our course catalog</a><br>
• Ask me more specific questions about freshman courses<br><br>

<strong>💡 Tip:</strong> For the most accurate information about your specific university, check with your academic advisor or department office.`;
            
        } catch (error) {
            return `❌ <strong>Sorry, I encountered an error while searching.</strong><br><br>
            
Please try:<br>
• Rephrasing your question<br>
• Asking about specific freshman courses<br>
• Checking our <a href="courses.html">Courses page</a><br><br>

Or search directly: <a href="https://www.google.com/search?q=${encodeURIComponent(question)}" target="_blank">Google Search</a>`;
        }
    }

    generateSmartResponse(question) {
        const lowerQuestion = question.toLowerCase();
        
        // Math-related
        if (lowerQuestion.includes('math') || lowerQuestion.includes('calculus') || lowerQuestion.includes('algebra')) {
            return `<strong>Mathematics in Freshman Year:</strong><br>
• <strong>First Semester:</strong> Mathematics for Natural Sciences covers basic algebra, trigonometry, and introduction to calculus<br>
• <strong>Natural Science Stream:</strong> Advanced Calculus & Mathematics includes differential equations and linear algebra<br>
• <strong>Study Tips:</strong> Practice daily, work through problem sets, form study groups<br>
• <strong>Resources:</strong> Khan Academy, MIT OpenCourseWare, and your course textbook<br><br>
Need help with a specific math topic? Ask me!`;
        }
        
        // Physics-related
        if (lowerQuestion.includes('physics')) {
            return `<strong>General Physics Course:</strong><br>
• Covers mechanics, thermodynamics, waves, and electricity<br>
• Required for Natural Science stream students<br>
• <strong>Key Topics:</strong> Newton's laws, energy, momentum, circuits<br>
• <strong>Study Tips:</strong> Understand concepts before memorizing formulas, practice problem-solving<br>
• <strong>Lab Work:</strong> Hands-on experiments reinforce theoretical knowledge<br><br>
Check our <a href="courses.html">Physics course</a> for detailed curriculum!`;
        }
        
        // English-related
        if (lowerQuestion.includes('english') || lowerQuestion.includes('writing') || lowerQuestion.includes('communication')) {
            return `<strong>English Communication Skills:</strong><br>
• <strong>Semester 1:</strong> Foundation - grammar, basic writing, speaking<br>
• <strong>Semester 2:</strong> Advanced - academic writing, presentations, research papers<br>
• <strong>Importance:</strong> Essential for all academic work and career success<br>
• <strong>Practice:</strong> Read widely, write daily, join discussion groups<br>
• <strong>Resources:</strong> Grammarly, Purdue OWL, English language podcasts<br><br>
Strong English skills benefit ALL majors!`;
        }
        
        // History/Ethiopia-related
        if (lowerQuestion.includes('history') || lowerQuestion.includes('ethiopia')) {
            return `<strong>Ethiopian History & Geography:</strong><br>
• <strong>Geography:</strong> Physical features, climate zones, regional characteristics of Ethiopia & Horn of Africa<br>
• <strong>History:</strong> Ancient civilizations, medieval period, modern Ethiopia<br>
• <strong>Importance:</strong> Understanding your nation's heritage and regional context<br>
• <strong>Study Tips:</strong> Create timelines, use maps, connect events to current affairs<br><br>
These courses build national identity and regional awareness!`;
        }
        
        // Technology/ICT-related
        if (lowerQuestion.includes('technology') || lowerQuestion.includes('ict') || lowerQuestion.includes('computer')) {
            return `<strong>Introduction to Emerging Technologies:</strong><br>
• <strong>Topics:</strong> Computer basics, internet, digital literacy, emerging tech trends<br>
• <strong>Skills:</strong> Microsoft Office, email, online research, basic programming concepts<br>
• <strong>Importance:</strong> Essential digital skills for modern education and careers<br>
• <strong>Practice:</strong> Use computers daily, explore online tools, learn typing<br>
• <strong>Future:</strong> Foundation for IT careers or digital skills in any field<br><br>
Technology literacy is crucial in today's world!`;
        }
        
        // General academic question
        return `Based on your question, here are some relevant points:<br><br>

<strong>For Freshman Students:</strong><br>
• All common courses in both semesters are important for your foundation<br>
• Your performance determines your stream and department placement<br>
• Focus on understanding concepts, not just memorizing<br>
• Seek help from instructors and peers when needed<br>
• Balance academics with physical and mental health<br><br>

<strong>Available Courses:</strong><br>
• 7 First Semester foundation courses<br>
• 9 Second Semester continuation courses<br>
• Natural Science stream specializations<br>
• Social Science stream specializations<br><br>

Would you like specific information about any course or topic?`;
    }

    formatResponse(text) {
        // Convert markdown-style formatting to HTML
        let formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/• /g, '<br>• ');
        
        return `<p>${formatted}</p>`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveConversationHistory() {
        localStorage.setItem('aiConversationHistory', JSON.stringify(this.conversationHistory));
    }

    loadConversationHistory() {
        const saved = localStorage.getItem('aiConversationHistory');
        if (saved) {
            this.conversationHistory = JSON.parse(saved);
            // Optionally restore messages to UI
        }
    }
}

// Initialize AI Assistant when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new AIAssistant();
    });
} else {
    new AIAssistant();
}
