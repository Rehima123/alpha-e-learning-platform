import AuthForm from '../components/AuthForm'

// Register route now renders the unified AuthForm (we start on Register tab)
export default function Register() {
  return <AuthForm initialTab="register" />
}
