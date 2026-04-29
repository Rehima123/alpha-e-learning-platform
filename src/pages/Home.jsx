import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">Learn Without Limits</h1>
          <p className="text-xl mb-8">Start, switch, or advance your career with thousands of courses</p>
          
          <div className="max-w-2xl mx-auto flex gap-2 mb-12">
            <input
              type="text"
              placeholder="What do you want to learn?"
              className="flex-1 px-6 py-3 rounded-lg text-gray-900"
            />
            <Link to="/courses" className="btn btn-success px-8">
              Search
            </Link>
          </div>
          
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div>
              <h3 className="text-4xl font-bold">10,000+</h3>
              <p>Students</p>
            </div>
            <div>
              <h3 className="text-4xl font-bold">500+</h3>
              <p>Courses</p>
            </div>
            <div>
              <h3 className="text-4xl font-bold">50+</h3>
              <p>Instructors</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🎓</div>
              <h3 className="text-xl font-bold mb-2">Expert Instructors</h3>
              <p className="text-gray-600 dark:text-gray-400">Learn from industry professionals</p>
            </div>
            <div className="text-center">
              <div className="text-6xl mb-4">📱</div>
              <h3 className="text-xl font-bold mb-2">Learn Anywhere</h3>
              <p className="text-gray-600 dark:text-gray-400">Access courses on any device</p>
            </div>
            <div className="text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-xl font-bold mb-2">Get Certified</h3>
              <p className="text-gray-600 dark:text-gray-400">Earn certificates upon completion</p>
            </div>
            <div className="text-center">
              <div className="text-6xl mb-4">⚡</div>
              <h3 className="text-xl font-bold mb-2">6 Months Access</h3>
              <p className="text-gray-600 dark:text-gray-400">Learn at your own pace</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-100 dark:bg-gray-800 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Start Learning?</h2>
          <Link to="/courses" className="btn btn-primary text-lg px-8 py-3">
            Browse Courses
          </Link>
        </div>
      </section>

      <footer className="bg-secondary text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 Alpha Freshman Tutorial. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
