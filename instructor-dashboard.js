let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
// Real auth check happens via requireInstructor() at bottom

function showAddCourseModal() {
    document.getElementById('addCourseModal').style.display = 'block';
}

function closeAddCourseModal() {
    document.getElementById('addCourseModal').style.display = 'none';
}

document.getElementById('addCourseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    try {
        const courseData = {
            title: document.getElementById('courseTitle').value,
            description: document.getElementById('courseDescription').value,
            category: document.getElementById('courseCategory').value,
            level: document.getElementById('courseLevel').value,
            duration: document.getElementById('courseDuration').value,
            price: parseFloat(document.getElementById('coursePrice').value),
            icon: document.getElementById('courseIcon').value,
            instructorName: currentUser.fullName
        };
        
        const response = await api.createCourse(courseData);
        
        if (response.success) {
            toast?.success('Course submitted for admin approval!');
            closeAddCourseModal();
            document.getElementById('addCourseForm').reset();
            await loadInstructorCourses();
        } else {
            toast?.error(response.message || 'Failed to create course');
        }
    } catch (error) {
        console.error('Error creating course:', error);
        alert('Failed to create course. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Course';
    }
});

async function loadInstructorCourses() {
    try {
        const response = await api.getInstructorCourses();
        
        if (!response.success) {
            throw new Error('Failed to load courses');
        }
        
        const myCourses = response.courses || [];
        
        const approved = myCourses.filter(c => c.status === 'approved').length;
        const pending = myCourses.filter(c => c.status === 'pending').length;
        const totalStudents = myCourses.reduce((sum, c) => sum + (c.enrolledStudents || 0), 0);
        
        document.getElementById('totalCourses').textContent = myCourses.length;
        document.getElementById('approvedCourses').textContent = approved;
        document.getElementById('pendingCourses').textContent = pending;
        document.getElementById('totalStudents').textContent = totalStudents;
        
        const container = document.getElementById('instructorCourses');
        
        if (myCourses.length === 0) {
            container.innerHTML = '<p>No courses yet. Click "Add New Course" to get started!</p>';
            return;
        }
        
        container.innerHTML = `
            <h3>My Courses</h3>
            <div class="courses-grid">
                ${myCourses.map(course => `
                    <div class="course-card">
                        <div class="course-image">${course.icon || '📚'}</div>
                        <div class="course-content">
                            <div class="course-badge ${course.status === 'approved' ? 'badge-success' : 'badge-warning'}">
                                ${course.status === 'approved' ? '✓ Approved' : course.status === 'pending' ? '⏳ Pending' : '✗ Rejected'}
                            </div>
                            <h3>${course.title}</h3>
                            <p>${course.description}</p>
                            <div class="course-meta">
                                <span>📚 ${course.totalLessons || course.lessons?.length || 0} lessons</span> | 
                                <span>👥 ${course.enrolledStudents || 0} students</span>
                            </div>
                            <div class="course-footer">
                                <span class="course-price">$${course.price}</span>
                                ${course.status === 'approved' ? 
                                    `<a href="course-detail.html?id=${course._id}" class="btn">View</a>` :
                                    course.status === 'pending' ?
                                    '<span style="color: #f39c12;">Awaiting approval</span>' :
                                    '<span style="color: #e74c3c;">Rejected</span>'
                                }
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading instructor courses:', error);
        document.getElementById('instructorCourses').innerHTML = '<p>Failed to load courses. Please refresh the page.</p>';
    }
}

document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await api.logout();
    } catch (error) {
        console.error('Logout error:', error);
    }
    api.removeAuthToken();
    localStorage.removeItem('currentUser');
    window.location.href = 'home.html';
});

// ── Auth guard ────────────────────────────────────────────────────────────────
(async () => {
    const user = await requireInstructor();
    if (!user) return;
    currentUser = user;
    loadInstructorCourses();
})();
