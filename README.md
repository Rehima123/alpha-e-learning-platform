# Alpha Freshman Tutorial - E-Learning Platform

Modern e-learning platform built with React, Tailwind CSS, and Vite.

## Features

- 🎓 Course browsing and enrollment
- 👤 User authentication (Student, Instructor, Admin)
- 💳 Payment system with 6-month access
- 📊 Student dashboard with progress tracking
- 👨‍🏫 Instructor course submission
- 🔐 Admin approval system
- 🌓 Dark/Light mode
- 📱 Fully responsive design

## Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Default Admin Account

- Email: admin@alpha.com
- Password: admin123

## Tech Stack

- React 18
- Tailwind CSS
- React Router
- Vite
- LocalStorage for data persistence

## Project Structure

```
src/
├── components/     # Reusable components
├── context/        # React context (Auth, Theme)
├── pages/          # Page components
├── App.jsx         # Main app component
├── main.jsx        # Entry point
└── index.css       # Global styles
```

## Usage

1. Register as Student or Instructor
2. Students can browse and purchase courses
3. Instructors can submit courses for approval
4. Admin can approve/reject courses
5. All subscriptions valid for 6 months
