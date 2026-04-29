import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import Dashboard from './pages/Dashboard'
import Subscription from './pages/Subscription'
import Payment from './pages/Payment'
import CoursePayment from './pages/CoursePayment'
import InstructorDashboard from './pages/InstructorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/course/:id" element={<CourseDetail />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/course-payment/:id" element={<CoursePayment />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/instructor" element={
              <ProtectedRoute role="instructor">
                <InstructorDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
