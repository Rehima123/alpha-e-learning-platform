const coursesData = {
    1: { id: 1, title: 'Web Development Fundamentals', icon: '🌐', instructor: 'John Smith', price: 0 },
    2: { id: 2, title: 'Python Programming', icon: '🐍', instructor: 'Sarah Johnson', price: 49.99 },
    3: { id: 3, title: 'Data Science Essentials', icon: '📊', instructor: 'Dr. Michael Chen', price: 79.99 },
    4: { id: 4, title: 'Mobile App Development', icon: '📱', instructor: 'Emily Davis', price: 59.99 },
    5: { id: 5, title: 'UI/UX Design Masterclass', icon: '🎨', instructor: 'Alex Turner', price: 39.99 },
    6: { id: 6, title: 'Digital Marketing Strategy', icon: '📈', instructor: 'Lisa Anderson', price: 44.99 }
};

const urlParams = new URLSearchParams(window.location.search);
const courseId = parseInt(urlParams.get('id'));
const course = coursesData[courseId];

if (!course) {
    window.location.href = 'courses.html';
}

document.getElementById('courseIcon').textContent = course.icon;
document.getElementById('courseTitle').textContent = course.title;
document.getElementById('courseInstructor').textContent = `by ${course.instructor}`;
document.getElementById('coursePrice').textContent = `$${course.price.toFixed(2)}`;

const tax = course.price * 0.1;
const total = course.price + tax;

document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
document.getElementById('total').textContent = `$${total.toFixed(2)}`;

document.getElementById('cardNumber').addEventListener('input', (e) => {
    let value = e.target.value.replace(/\s/g, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    e.target.value = formattedValue;
});

document.getElementById('expiry').addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    e.target.value = value;
});

document.getElementById('cvv').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
});

document.getElementById('coursePaymentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
        alert('Please login first');
        window.location.href = 'auth-login.html';
        return;
    }
    
    const purchasedCourses = JSON.parse(localStorage.getItem('purchasedCourses') || '{}');
    
    const accessEnd = new Date();
    accessEnd.setMonth(accessEnd.getMonth() + 6);
    
    purchasedCourses[courseId] = {
        purchaseDate: new Date().toISOString(),
        accessEndDate: accessEnd.toISOString(),
        price: total,
        courseTitle: course.title
    };
    
    localStorage.setItem('purchasedCourses', JSON.stringify(purchasedCourses));
    
    const enrolled = JSON.parse(localStorage.getItem('enrolledCourses') || '[]');
    if (!enrolled.includes(courseId)) {
        enrolled.push(courseId);
        localStorage.setItem('enrolledCourses', JSON.stringify(enrolled));
    }
    
    alert(`🎉 Payment successful! You now have 6 months access to "${course.title}"`);
    window.location.href = `course-detail.html?id=${courseId}`;
});
