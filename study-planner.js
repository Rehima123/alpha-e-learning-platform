// ─── Study Planner — daily goals, reminders, completion tracking ──────────────
class StudyPlanner {
    constructor() {
        this.key = 'studyPlan';
    }

    getPlan() {
        return JSON.parse(localStorage.getItem(this.key) || JSON.stringify({
            dailyGoalMinutes: 30,
            reminderTime: '08:00',
            reminderEnabled: false,
            goals: [],
            sessions: []
        }));
    }

    savePlan(plan) {
        localStorage.setItem(this.key, JSON.stringify(plan));
    }

    // Add a daily goal
    addGoal(text, courseId = null, dueDate = null) {
        const plan = this.getPlan();
        plan.goals.push({
            id: Date.now().toString(),
            text, courseId, dueDate,
            done: false,
            createdAt: new Date().toISOString()
        });
        this.savePlan(plan);
    }

    toggleGoal(id) {
        const plan = this.getPlan();
        const goal = plan.goals.find(g => g.id === id);
        if (goal) { goal.done = !goal.done; goal.completedAt = goal.done ? new Date().toISOString() : null; }
        this.savePlan(plan);
        return goal?.done;
    }

    deleteGoal(id) {
        const plan = this.getPlan();
        plan.goals = plan.goals.filter(g => g.id !== id);
        this.savePlan(plan);
    }

    // Log a study session
    logSession(minutes, courseId = null, lessonTitle = '') {
        const plan = this.getPlan();
        plan.sessions.push({
            id: Date.now().toString(),
            minutes, courseId, lessonTitle,
            date: new Date().toISOString()
        });
        // Keep last 90 sessions
        if (plan.sessions.length > 90) plan.sessions = plan.sessions.slice(-90);
        this.savePlan(plan);
    }

    // Today's study minutes
    getTodayMinutes() {
        const today = new Date().toDateString();
        return this.getPlan().sessions
            .filter(s => new Date(s.date).toDateString() === today)
            .reduce((sum, s) => sum + s.minutes, 0);
    }

    // Weekly summary
    getWeekSummary() {
        const sessions = this.getPlan().sessions;
        const days = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.now() - i * 86400000);
            const key = d.toDateString();
            days[key] = { label: d.toLocaleDateString('en', { weekday: 'short' }), minutes: 0 };
        }
        sessions.forEach(s => {
            const key = new Date(s.date).toDateString();
            if (days[key]) days[key].minutes += s.minutes;
        });
        return Object.values(days);
    }

    // Schedule browser notification reminder
    scheduleReminder(time) {
        if (!('Notification' in window)) return;
        Notification.requestPermission().then(perm => {
            if (perm !== 'granted') return;
            const [h, m] = time.split(':').map(Number);
            const now = new Date();
            const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
            if (next <= now) next.setDate(next.getDate() + 1);
            const ms = next - now;
            setTimeout(() => {
                new Notification('📚 Study Time!', {
                    body: "It's time for your daily study session. Keep up the streak!",
                    icon: '/logo.png'
                });
            }, ms);
            toast?.success(`Reminder set for ${time}`);
        });
    }

    // Render the planner UI
    render(containerId) {
        const el = document.getElementById(containerId);
        if (!el) return;
        const plan = this.getPlan();
        const todayMins = this.getTodayMinutes();
        const goalPct = Math.min(Math.round((todayMins / plan.dailyGoalMinutes) * 100), 100);
        const week = this.getWeekSummary();
        const maxMins = Math.max(...week.map(d => d.minutes), 1);
        const todayGoals = plan.goals.filter(g => !g.done || new Date(g.completedAt) > new Date(Date.now() - 86400000));

        el.innerHTML = `
        <div style="display:grid;gap:1.2rem">

            <!-- Daily progress -->
            <div style="background:var(--bg-secondary);border-radius:16px;padding:1.5rem;border:1px solid var(--border-color)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                    <h3 style="margin:0;color:var(--text-primary);font-size:1rem">📅 Today's Goal</h3>
                    <span style="font-size:0.85rem;color:var(--text-secondary)">${todayMins}/${plan.dailyGoalMinutes} min</span>
                </div>
                <div class="progress-bar" style="height:12px;margin-bottom:8px">
                    <div class="progress-fill" style="width:${goalPct}%;height:100%"></div>
                </div>
                <p style="font-size:0.82rem;color:${goalPct >= 100 ? '#27ae60' : 'var(--text-secondary)'}">
                    ${goalPct >= 100 ? '🎉 Daily goal achieved!' : `${plan.dailyGoalMinutes - todayMins} min remaining`}
                </p>
                <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
                    <button onclick="studyPlanner.logSession(15);studyPlanner.render('${containerId}')"
                        class="btn btn-sm">+15 min</button>
                    <button onclick="studyPlanner.logSession(30);studyPlanner.render('${containerId}')"
                        class="btn btn-sm">+30 min</button>
                    <button onclick="studyPlanner.logSession(60);studyPlanner.render('${containerId}')"
                        class="btn btn-sm">+1 hour</button>
                </div>
            </div>

            <!-- Weekly chart -->
            <div style="background:var(--bg-secondary);border-radius:16px;padding:1.5rem;border:1px solid var(--border-color)">
                <h3 style="margin:0 0 14px;color:var(--text-primary);font-size:1rem">📊 This Week</h3>
                <div style="display:flex;align-items:flex-end;gap:8px;height:80px">
                    ${week.map(d => `
                        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
                            <div style="width:100%;background:${d.minutes > 0 ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'var(--border-color)'};
                                border-radius:4px 4px 0 0;height:${Math.max(Math.round((d.minutes/maxMins)*60), d.minutes > 0 ? 4 : 0)}px;
                                transition:height 0.5s ease"></div>
                            <span style="font-size:0.65rem;color:var(--text-secondary)">${d.label}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Goals -->
            <div style="background:var(--bg-secondary);border-radius:16px;padding:1.5rem;border:1px solid var(--border-color)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                    <h3 style="margin:0;color:var(--text-primary);font-size:1rem">✅ Today's Tasks</h3>
                    <span style="font-size:0.78rem;color:var(--text-secondary)">
                        ${todayGoals.filter(g => g.done).length}/${todayGoals.length} done
                    </span>
                </div>
                <div id="goalsList" style="margin-bottom:12px">
                    ${todayGoals.length === 0 ? '<p style="color:var(--text-secondary);font-size:0.85rem">No tasks yet. Add one below!</p>' :
                        todayGoals.map(g => `
                        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;
                            border-bottom:1px solid var(--border-color)">
                            <input type="checkbox" ${g.done ? 'checked' : ''}
                                onchange="studyPlanner.toggleGoal('${g.id}');studyPlanner.render('${containerId}')"
                                style="width:16px;height:16px;cursor:pointer;accent-color:#667eea">
                            <span style="flex:1;font-size:0.88rem;color:var(--text-primary);
                                text-decoration:${g.done ? 'line-through' : 'none'};
                                opacity:${g.done ? '0.5' : '1'}">${g.text}</span>
                            <button onclick="studyPlanner.deleteGoal('${g.id}');studyPlanner.render('${containerId}')"
                                style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:0.9rem">✕</button>
                        </div>
                    `).join('')}
                </div>
                <div style="display:flex;gap:8px">
                    <input type="text" id="newGoalInput" placeholder="Add a study task..."
                        style="flex:1;padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;
                            background:var(--bg-primary);color:var(--text-primary);font-size:0.85rem"
                        onkeydown="if(event.key==='Enter')addGoalFromInput('${containerId}')">
                    <button onclick="addGoalFromInput('${containerId}')" class="btn btn-sm btn-success">Add</button>
                </div>
            </div>

            <!-- Settings -->
            <div style="background:var(--bg-secondary);border-radius:16px;padding:1.5rem;border:1px solid var(--border-color)">
                <h3 style="margin:0 0 12px;color:var(--text-primary);font-size:1rem">⚙️ Settings</h3>
                <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
                    <div>
                        <label style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:3px">Daily Goal (min)</label>
                        <input type="number" value="${plan.dailyGoalMinutes}" min="5" max="480"
                            onchange="updatePlannerSetting('dailyGoalMinutes', parseInt(this.value))"
                            style="width:80px;padding:6px 10px;border:1px solid var(--border-color);border-radius:8px;
                                background:var(--bg-primary);color:var(--text-primary)">
                    </div>
                    <div>
                        <label style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:3px">Reminder Time</label>
                        <input type="time" value="${plan.reminderTime}"
                            onchange="updatePlannerSetting('reminderTime', this.value)"
                            style="padding:6px 10px;border:1px solid var(--border-color);border-radius:8px;
                                background:var(--bg-primary);color:var(--text-primary)">
                    </div>
                    <div style="margin-top:auto">
                        <button onclick="studyPlanner.scheduleReminder(document.querySelector('[type=time]').value)"
                            class="btn btn-sm">🔔 Set Reminder</button>
                    </div>
                </div>
            </div>
        </div>`;
    }
}

const studyPlanner = new StudyPlanner();

function addGoalFromInput(containerId) {
    const input = document.getElementById('newGoalInput');
    const text = input?.value.trim();
    if (!text) return;
    studyPlanner.addGoal(text);
    input.value = '';
    studyPlanner.render(containerId);
}

function updatePlannerSetting(key, value) {
    const plan = studyPlanner.getPlan();
    plan[key] = value;
    studyPlanner.savePlan(plan);
}
