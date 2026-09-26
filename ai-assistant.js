/**
 * Alpha AI Assistant — Gemini-powered floating chat widget
 * Covers: Freshman courses, streams, career paths, GPA, study tips
 */

// ── System context that shapes every Gemini response ─────────────────────────
const ALPHA_AI_SYSTEM = `You are Alpha AI, the official intelligent study assistant for Alpha Freshman Tutorial — the #1 Ethiopian university freshman learning platform. You are friendly, professional, and expert in:

PLATFORM INFO:
- Alpha Freshman Tutorial offers Ethiopian Freshman Curriculum & Health Science CoC Preparation
- Regular Freshman Courses (1st & 2nd Semester, Natural & Social Science): 399 ETB
- COC Health Science Preparation (Special Offer): 299 ETB
- 6 months full access, video lessons, PDF notes, quizzes, and offline downloads

FRESHMAN CURRICULUM (Ethiopia):
FIRST SEMESTER — Natural Science: Communicative English I, Applied Mathematics I, General Physics, General Chemistry, Critical Thinking & Logic, Geography of Ethiopia, General Psychology, Physical Education
FIRST SEMESTER — Social Science: Communicative English I, General Mathematics (Social), Introduction to Economics, Geography of Ethiopia, Critical Thinking & Logic, General Psychology, Physical Education
SECOND SEMESTER — Natural Science: Academic Writing (English II), Applied Mathematics II, General Biology, Emerging Technologies/ICT, History of Ethiopia, Moral & Civic Education, Inclusiveness
SECOND SEMESTER — Social Science: Academic Writing (English II), Entrepreneurship, Social Anthropology, ICT, History of Ethiopia, Moral & Civic Education, Inclusiveness

COC HEALTH SCIENCE PREPARATION:
Human Anatomy & Physiology, General Biology, General Chemistry, Public Health & Epidemiology, Basic Pharmacology, English Language Competency, Aptitude Test (CoC), Model Exams 1 & 2

STREAMS & PLACEMENT:
- Natural Science → Engineering, Medicine, Pharmacy, Natural Sciences, Agriculture (requires GPA 3.75+ for competitive programs like Medicine/Engineering)
- Social Science → Law, Business Administration, Economics, Education, Social Sciences (requires GPA 3.5+ for competitive programs like Law)
- Department placement is based on Freshman Year GPA + National Entrance Exam results

STUDY TIPS:
- Use active recall and spaced repetition
- Study in focused 25-minute Pomodoro sessions
- Form study groups for difficult subjects
- Use past exam papers for practice
- Start exam prep 3 weeks before finals
- Watch video lessons, then read PDF notes, then attempt quizzes

Always answer in clear, helpful English. Keep responses concise (2-4 paragraphs max unless explaining a complex topic). Be encouraging and supportive. If asked about pricing, always mention 399 ETB for Freshman courses and 299 ETB for COC. End responses with a brief follow-up question to keep the conversation going.`;

// ── Quick-action chip prompts ────────────────────────────────────────────────
const QUICK_CHIPS = [
    { label: '📚 1st Semester Courses',  q: 'What courses are in the first semester?' },
    { label: '🔬 Natural vs Social',      q: "What's the difference between Natural and Social Science streams?" },
    { label: '💡 Study Tips',             q: 'Give me the best study tips for freshman year.' },
    { label: '🏥 COC Preparation',        q: 'Tell me about the COC Health Science preparation program.' },
    { label: '🎓 Career Paths',           q: 'What career paths can I pursue after freshman year?' },
    { label: '📊 GPA Requirements',       q: 'What GPA do I need for competitive programs like Medicine and Engineering?' }
];

// ── Local fallback answers when no Gemini key ────────────────────────────────
const LOCAL_ANSWERS = {
    'first semester': `**First Semester Courses**\n\n**Natural Science stream:** Communicative English I, Applied Mathematics I, General Physics, General Chemistry, Critical Thinking & Logic, Geography of Ethiopia, General Psychology, and Physical Education.\n\n**Social Science stream:** Communicative English I, General Mathematics, Introduction to Economics, Geography, Critical Thinking, Psychology, and Physical Education.\n\nAll courses are available on Alpha Freshman Tutorial for **399 ETB** with 6 months of full access. What else would you like to know?`,
    'natural.*social|stream': `**Natural Science** focuses on Physics, Biology, Chemistry, and Mathematics — leading to careers in Engineering, Medicine, Pharmacy, and Sciences. Competitive programs require GPA **3.75+**.\n\n**Social Science** covers Economics, History, Geography, and Communication — leading to Law, Business, Education, and Social Sciences. Competitive programs require GPA **3.5+**.\n\nYour stream choice shapes your entire academic career, so choose based on your strengths and interests! Which stream are you considering?`,
    'study tip|study habit': `**Top Study Tips for Freshman Year:**\n\n1. **Pomodoro Technique** — Study in focused 25-minute sessions with 5-minute breaks\n2. **Active Recall** — Test yourself instead of re-reading notes\n3. **Spaced Repetition** — Review material at increasing intervals\n4. **Past Papers** — Practice with previous exam questions\n5. **Start Early** — Begin exam prep 3 weeks before finals\n\nAlpha Freshman Tutorial's video lessons + PDF notes + quizzes system is designed exactly around these principles. Want tips for a specific subject?`,
    'coc|health science|299': `**COC Health Science Preparation** is available for a special price of **299 ETB** (was 399 ETB)!\n\nIt covers: Human Anatomy & Physiology, General Biology, General Chemistry, Public Health & Epidemiology, Basic Pharmacology, English Competency, and 2 Full Model Exams.\n\nThis program is designed for all health science students (Nursing, Pharmacy, Medicine, Medical Lab, etc.) preparing for the national CoC license exam. Would you like to enroll?`,
    'career|after freshman': `**Career Pathways After Freshman Year:**\n\n**Natural Science graduates** can pursue: ⚕️ Medicine, 💊 Pharmacy, 🏗️ Engineering (Civil, Electrical, Mechanical), 🔬 Natural Sciences, 🌾 Agriculture\n\n**Social Science graduates** can pursue: ⚖️ Law, 💼 Business Administration, 📊 Economics, 🎓 Education, 🌍 International Relations\n\nYour Freshman GPA directly determines which department you're placed in. Alpha Freshman Tutorial helps you maximize your GPA! What career interests you most?`,
    'gpa|grade|placement': `**GPA Requirements for Competitive Programs:**\n\n| Program | Minimum GPA |\n|---|---|\n| Medicine / Pharmacy | 3.75+ |\n| Engineering (all fields) | 3.75+ |\n| Law | 3.50+ |\n| Business Administration | 3.50+ |\n| Education | 3.25+ |\n\nAlpha Freshman Tutorial's structured video lessons, PDF notes, and practice quizzes are designed to help you achieve these GPAs. Start preparing today for **399 ETB**. Do you want study strategies for a specific subject?`
};

// ── Gemini API call ───────────────────────────────────────────────────────────
async function callGeminiAPI(userMessage, history) {
    // Try backend first (more secure — key stays server-side)
    try {
        const token = localStorage.getItem('authToken');
        const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': 'Bearer ' + token })
            },
            body: JSON.stringify({
                message: userMessage,
                history: history.slice(-6), // last 3 exchanges
                systemContext: ALPHA_AI_SYSTEM
            }),
            signal: AbortSignal.timeout(12000)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.reply) return data.reply;
        }
    } catch (e) { /* fall through to local */ }

    // Client-side Gemini fallback (if key injected via window)
    const geminiKey = window.GEMINI_API_KEY;
    if (geminiKey) {
        try {
            const contents = [];
            history.slice(-4).forEach(function(m) {
                contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
            });
            contents.push({ role: 'user', parts: [{ text: userMessage }] });

            const res = await fetch(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + geminiKey,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: { parts: [{ text: ALPHA_AI_SYSTEM }] },
                        contents: contents,
                        generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
                    }),
                    signal: AbortSignal.timeout(12000)
                }
            );
            if (res.ok) {
                const data = await res.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) return text;
            }
        } catch (e) { /* fall through to local */ }
    }

    // Local smart fallback
    return localAnswer(userMessage);
}

function localAnswer(q) {
    var ql = q.toLowerCase();
    for (var key in LOCAL_ANSWERS) {
        if (new RegExp(key, 'i').test(ql)) return LOCAL_ANSWERS[key];
    }
    return "I'm Alpha AI, your study assistant! I can help with freshman courses, stream differences, study tips, career paths, and COC preparation (299 ETB).\n\nFor the best experience, try one of the quick-action buttons below, or ask me anything about the Ethiopian freshman curriculum! 🎓";
}

// ── Markdown-lite renderer ────────────────────────────────────────────────────
function renderMarkdown(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code style="background:rgba(99,102,241,0.15);padding:1px 5px;border-radius:4px;font-size:0.85em">$1</code>')
        .replace(/\n\n/g, '</p><p style="margin:8px 0 0">')
        .replace(/\n/g, '<br>')
        .replace(/\| (.+?) \|/g, function(m) {
            return '<span style="display:inline-flex;gap:16px;font-size:0.8em;opacity:0.85">'+m+'</span>';
        });
}

// ── Main AI Assistant class ───────────────────────────────────────────────────
class AIAssistant {
    constructor() {
        this.history      = [];
        this.isOpen       = false;
        this.isTyping     = false;
        this.init();
    }

    init() {
        this.inject();
        this.bind();
        this.loadHistory();
    }

    inject() {
        // Remove old if exists
        var old = document.getElementById('alphaAIRoot');
        if (old) old.remove();

        var root = document.createElement('div');
        root.id = 'alphaAIRoot';
        root.innerHTML = `
<!-- ── FLOATING WIDGET ────────────────────────────────────────────────── -->
<button id="aiFab" aria-label="Open Alpha AI" onclick="window._alphaAI.toggle()">
    <span id="aiFabRing" class="aiFabRing"></span>
    <span class="aiFabInner">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="14" rx="3"/>
            <path d="M8 17v2M12 17v2M16 17v2"/>
            <circle cx="9" cy="10" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="15" cy="10" r="1.5" fill="currentColor" stroke="none"/>
        </svg>
        <span class="aiFabLabel">Alpha AI</span>
    </span>
    <span class="aiFabBadge">&#x1F916;</span>
</button>

<!-- ── CHAT PANEL ─────────────────────────────────────────────────────── -->
<div id="aiPanel" aria-hidden="true">
    <!-- Header -->
    <div class="aiHeader">
        <div class="aiHeaderGlow"></div>
        <div class="aiHeaderContent">
            <div class="aiHeaderLeft">
                <div class="aiAvatar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <rect x="3" y="3" width="18" height="14" rx="3"/>
                        <path d="M8 17v2M12 17v2M16 17v2"/>
                        <circle cx="9" cy="10" r="1.5" fill="white" stroke="none"/>
                        <circle cx="15" cy="10" r="1.5" fill="white" stroke="none"/>
                    </svg>
                </div>
                <div>
                    <div class="aiHeaderTitle">Alpha AI</div>
                    <div class="aiStatus"><span class="aiDot"></span> Online &mdash; Powered by Gemini</div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
                <button class="aiHeaderBtn" onclick="window._alphaAI.clear()" title="Clear chat">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
                <button class="aiHeaderBtn aiCloseBtn" onclick="window._alphaAI.close()" title="Close">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        </div>
    </div>

    <!-- Messages -->
    <div id="aiMessages"></div>

    <!-- Quick chips -->
    <div id="aiChips" class="aiChips"></div>

    <!-- Input -->
    <div class="aiInputRow">
        <textarea id="aiInput" placeholder="Ask about courses, streams, career paths..." rows="1"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window._alphaAI.send()}"
            oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px'"></textarea>
        <button id="aiSendBtn" onclick="window._alphaAI.send()" aria-label="Send">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
        </button>
    </div>
</div>

<style>
/* ── FAB ── */
#aiFab {
    position: fixed;
    bottom: 80px;
    right: 18px;
    /* above bottom nav (9999) and chat panel (9997) */
    z-index: 10000;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.2s;
}
@media (min-width: 769px) { #aiFab { bottom: 28px; right: 28px; } }
#aiFab:hover { transform: scale(1.06); }
#aiFab:active { transform: scale(0.94); }
.aiFabRing {
    position: absolute;
    inset: -6px;
    border-radius: 50px;
    background: conic-gradient(from 0deg, #6366f1, #8b5cf6, #06b6d4, #6366f1);
    animation: fabSpin 4s linear infinite;
    opacity: 0.55;
    filter: blur(3px);
}
@keyframes fabSpin { to { transform: rotate(360deg); } }
.aiFabInner {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #4f46e5, #7c3aed, #06b6d4);
    color: white;
    padding: 11px 18px 11px 14px;
    border-radius: 50px;
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    box-shadow: 0 8px 28px rgba(99,102,241,0.5);
}
.aiFabLabel { line-height: 1; }
.aiFabBadge {
    position: absolute;
    top: -4px;
    right: -4px;
    font-size: 1rem;
    animation: fabBounce 2.5s ease-in-out infinite;
}
@keyframes fabBounce {
    0%,100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-4px) rotate(8deg); }
}

/* ── PANEL ── */
#aiPanel {
    position: fixed;
    bottom: 80px;
    right: 18px;
    width: 360px;
    max-width: calc(100vw - 24px);
    height: 540px;
    max-height: calc(100vh - 100px);
    background: rgba(10,15,30,0.97);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(99,102,241,0.3);
    border-radius: 22px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 9998;
    box-shadow: 0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05);
    transform: scale(0.88) translateY(20px);
    opacity: 0;
    pointer-events: none;
    transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease;
}
#aiPanel.open {
    transform: scale(1) translateY(0);
    opacity: 1;
    pointer-events: all;
}
@media (min-width: 769px) { #aiPanel { bottom: 88px; right: 28px; } }
@media (max-width: 480px) {
    #aiPanel {
        bottom: 0; right: 0;
        width: 100vw; max-width: 100vw;
        /* leave room for iOS home bar + bottom nav */
        height: calc(100vh - 68px);
        max-height: calc(100vh - 68px);
        border-radius: 22px 22px 0 0;
        transform: translateY(40px);
    }
    #aiPanel.open { transform: translateY(0); }
    #aiFab { bottom: 70px; }
}

/* ── HEADER ── */
.aiHeader { position: relative; flex-shrink: 0; }
.aiHeaderGlow {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #4f46e5, #7c3aed, #06b6d4);
    opacity: 1;
}
.aiHeaderContent {
    position: relative;
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 14px 14px 12px;
}
.aiHeaderLeft { display: flex; align-items: center; gap: 10px; }
.aiAvatar {
    width: 38px; height: 38px;
    background: rgba(255,255,255,0.18);
    border: 1.5px solid rgba(255,255,255,0.3);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
}
.aiHeaderTitle { font-weight: 800; font-size: 0.9rem; color: white; line-height: 1.2; }
.aiStatus {
    font-size: 0.62rem; color: rgba(255,255,255,0.78);
    display: flex; align-items: center; gap: 5px; margin-top: 2px;
}
.aiDot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #22d3ee;
    animation: dotPulse 1.8s ease-in-out infinite;
    flex-shrink: 0;
}
@keyframes dotPulse {
    0%,100% { opacity:1; box-shadow:0 0 0 0 rgba(34,211,238,0.5); }
    50% { opacity:0.7; box-shadow:0 0 0 4px rgba(34,211,238,0); }
}
.aiHeaderBtn {
    width: 28px; height: 28px;
    background: rgba(255,255,255,0.14);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 8px;
    color: white; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.18s;
    -webkit-tap-highlight-color: transparent;
}
.aiHeaderBtn:hover { background: rgba(255,255,255,0.25); }

/* ── MESSAGES ── */
#aiMessages {
    flex: 1;
    /* Critical: min-height:0 allows flex child to shrink below content size */
    min-height: 0;
    overflow-y: auto;
    padding: 14px 14px 8px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scroll-behavior: smooth;
}
#aiMessages::-webkit-scrollbar { width: 4px; }
#aiMessages::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.35); border-radius: 4px; }
.aiMsg {
    display: flex;
    gap: 8px;
    max-width: 92%;
    animation: msgIn 0.22s ease both;
}
@keyframes msgIn {
    from { opacity:0; transform:translateY(8px); }
    to   { opacity:1; transform:translateY(0); }
}
.aiMsg.user  { align-self: flex-end; flex-direction: row-reverse; }
.aiMsg.bot   { align-self: flex-start; }
.aiMsgAvatar {
    width: 28px; height: 28px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.8rem; flex-shrink: 0; margin-top: 2px;
}
.aiMsg.bot  .aiMsgAvatar { background: linear-gradient(135deg,#4f46e5,#7c3aed); color: white; }
.aiMsg.user .aiMsgAvatar { background: rgba(99,102,241,0.2); }
.aiMsgBubble {
    padding: 10px 13px;
    border-radius: 16px;
    font-size: 0.82rem;
    line-height: 1.62;
    max-width: 100%;
}
.aiMsg.bot  .aiMsgBubble {
    background: rgba(30,41,59,0.9);
    border: 1px solid rgba(99,102,241,0.2);
    color: #e2e8f0;
    border-radius: 4px 16px 16px 16px;
}
.aiMsg.user .aiMsgBubble {
    background: linear-gradient(135deg,#4f46e5,#7c3aed);
    color: white;
    border-radius: 16px 4px 16px 16px;
}

/* Typing indicator */
.aiTyping .aiMsgBubble::after {
    content: '';
    display: inline-flex;
    gap: 3px;
    align-items: center;
}
.typingDots {
    display: inline-flex; gap: 4px; padding: 4px 2px;
}
.typingDots span {
    width: 6px; height: 6px; border-radius: 50%;
    background: #818cf8;
    animation: typDot 1.2s ease-in-out infinite;
}
.typingDots span:nth-child(2) { animation-delay: 0.2s; }
.typingDots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typDot {
    0%,80%,100% { transform: scale(0.7); opacity: 0.5; }
    40%          { transform: scale(1);   opacity: 1; }
}

/* ── CHIPS ── */
.aiChips {
    display: flex;
    /* scroll horizontally instead of wrapping — prevents overlap with input */
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 6px;
    padding: 8px 14px 10px;
    border-top: 1px solid rgba(99,102,241,0.12);
    flex-shrink: 0;
    /* hide scrollbar but keep scrolling */
    scrollbar-width: none;
    -ms-overflow-style: none;
}
.aiChips::-webkit-scrollbar { display: none; }
.aiChip {
    font-size: 0.68rem; font-weight: 700;
    padding: 5px 12px; border-radius: 50px;
    background: rgba(99,102,241,0.12);
    border: 1px solid rgba(99,102,241,0.28);
    color: #a5b4fc;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.18s, transform 0.14s;
    white-space: nowrap;
}
.aiChip:hover  { background: rgba(99,102,241,0.22); }
.aiChip:active { transform: scale(0.93); }

/* ── INPUT ── */
.aiInputRow {
    display: flex; align-items: flex-end; gap: 8px;
    padding: 10px 12px 14px;
    border-top: 1px solid rgba(99,102,241,0.15);
    flex-shrink: 0;
    background: rgba(15,23,42,0.8);
}
#aiInput {
    flex: 1; background: rgba(30,41,59,0.8);
    border: 1px solid rgba(99,102,241,0.25);
    border-radius: 12px; color: #e2e8f0;
    padding: 9px 12px; font-size: 0.82rem;
    resize: none; outline: none;
    font-family: inherit; line-height: 1.5;
    transition: border-color 0.2s;
    max-height: 100px; overflow-y: auto;
}
#aiInput:focus { border-color: rgba(99,102,241,0.55); }
#aiInput::placeholder { color: #475569; }
#aiSendBtn {
    width: 38px; height: 38px; flex-shrink: 0;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    border: none; border-radius: 11px; color: white;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.15s, box-shadow 0.15s;
    box-shadow: 0 4px 16px rgba(99,102,241,0.4);
}
#aiSendBtn:hover  { transform: scale(1.06); }
#aiSendBtn:active { transform: scale(0.92); }

/* Light mode adjustments */
[data-theme="light"] #aiPanel {
    background: rgba(240,244,255,0.97);
    border-color: rgba(99,102,241,0.25);
}
[data-theme="light"] .aiMsg.bot .aiMsgBubble {
    background: #eef2ff;
    border-color: rgba(99,102,241,0.2);
    color: #1e293b;
}
[data-theme="light"] #aiInput { background: white; color: #1e293b; }
[data-theme="light"] #aiMessages { background: rgba(240,244,255,0.5); }
[data-theme="light"] .aiInputRow { background: rgba(240,244,255,0.9); }
[data-theme="light"] .aiChip { background: rgba(99,102,241,0.08); color: #4f46e5; }
</style>`;

        document.body.appendChild(root);
    }

    bind() {
        var self = this;
        // Render chips
        var chipsEl = document.getElementById('aiChips');
        if (chipsEl) {
            QUICK_CHIPS.forEach(function(c) {
                var btn = document.createElement('button');
                btn.className = 'aiChip';
                btn.innerHTML = c.label;
                btn.onclick = function() { self.sendMsg(c.q); };
                chipsEl.appendChild(btn);
            });
        }
        // Show welcome message
        this.addBotMsg("&#x1F44B; Hi! I'm <strong>Alpha AI</strong>, your personal study assistant powered by Gemini.<br><br>I can help with freshman courses, stream differences, study tips, career paths, and COC preparation (299 ETB). What would you like to know?");
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        this.isOpen = true;
        var panel = document.getElementById('aiPanel');
        var fab   = document.getElementById('aiFab');
        if (panel) panel.classList.add('open');
        if (fab)   fab.setAttribute('aria-expanded', 'true');
        setTimeout(function() {
            var inp = document.getElementById('aiInput');
            if (inp) inp.focus();
        }, 320);
    }

    close() {
        this.isOpen = false;
        var panel = document.getElementById('aiPanel');
        var fab   = document.getElementById('aiFab');
        if (panel) panel.classList.remove('open');
        if (fab)   fab.removeAttribute('aria-expanded');
    }

    clear() {
        this.history = [];
        localStorage.removeItem('alphaAIHistory');
        var msgs = document.getElementById('aiMessages');
        if (msgs) msgs.innerHTML = '';
        this.addBotMsg("Chat cleared! &#x1F9F9; Ask me anything about your studies.");
    }

    loadHistory() {
        try {
            var saved = JSON.parse(localStorage.getItem('alphaAIHistory') || '[]');
            // Only restore last 4 messages to keep context fresh
            saved.slice(-4).forEach(function(m) {
                if (m.role === 'user') {
                    var msgs = document.getElementById('aiMessages');
                    if (msgs) msgs.innerHTML += '<div class="aiMsg user"><div class="aiMsgAvatar">&#x1F464;</div><div class="aiMsgBubble">' + m.content.replace(/</g,'&lt;') + '</div></div>';
                } else {
                    // Don't re-add welcome msg
                }
            });
            this.history = saved.slice(-8);
        } catch (e) {}
    }

    saveHistory() {
        try {
            localStorage.setItem('alphaAIHistory', JSON.stringify(this.history.slice(-16)));
        } catch (e) {}
    }

    addBotMsg(html) {
        var msgs = document.getElementById('aiMessages');
        if (!msgs) return;
        var div = document.createElement('div');
        div.className = 'aiMsg bot';
        div.innerHTML = '<div class="aiMsgAvatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.5" fill="white" stroke="none"/><circle cx="15" cy="10" r="1.5" fill="white" stroke="none"/></svg></div>'
                      + '<div class="aiMsgBubble"><p style="margin:0">' + html + '</p></div>';
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }

    showTyping() {
        var msgs = document.getElementById('aiMessages');
        if (!msgs) return;
        var div = document.createElement('div');
        div.className = 'aiMsg bot aiTypingMsg';
        div.id = 'aiTypingBubble';
        div.innerHTML = '<div class="aiMsgAvatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.5" fill="white" stroke="none"/><circle cx="15" cy="10" r="1.5" fill="white" stroke="none"/></svg></div>'
                      + '<div class="aiMsgBubble"><div class="typingDots"><span></span><span></span><span></span></div></div>';
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }

    hideTyping() {
        var b = document.getElementById('aiTypingBubble');
        if (b) b.remove();
    }

    async send() {
        var inp = document.getElementById('aiInput');
        if (!inp) return;
        var msg = inp.value.trim();
        if (!msg || this.isTyping) return;
        inp.value = '';
        inp.style.height = 'auto';
        this.sendMsg(msg);
    }

    async sendMsg(msg) {
        if (this.isTyping) return;
        if (!this.isOpen) this.open();

        // Add user bubble
        var msgs = document.getElementById('aiMessages');
        if (msgs) {
            var ud = document.createElement('div');
            ud.className = 'aiMsg user';
            ud.innerHTML = '<div class="aiMsgAvatar">&#x1F464;</div><div class="aiMsgBubble">' + msg.replace(/</g,'&lt;') + '</div>';
            msgs.appendChild(ud);
            msgs.scrollTop = msgs.scrollHeight;
        }

        this.history.push({ role: 'user', content: msg });
        this.isTyping = true;

        // Show typing
        this.showTyping();
        var sendBtn = document.getElementById('aiSendBtn');
        if (sendBtn) sendBtn.disabled = true;

        try {
            var reply = await callGeminiAPI(msg, this.history);
            this.hideTyping();
            this.history.push({ role: 'assistant', content: reply });
            this.saveHistory();
            this.addBotMsg(renderMarkdown(reply));
        } catch (e) {
            this.hideTyping();
            this.addBotMsg("Sorry, I had a brief connection issue. Please try again! &#x1F504;");
        }

        this.isTyping = false;
        if (sendBtn) sendBtn.disabled = false;
        var inp = document.getElementById('aiInput');
        if (inp) inp.focus();
    }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
function initAlphaAI() {
    window._alphaAI = new AIAssistant();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAlphaAI);
} else {
    initAlphaAI();
}
