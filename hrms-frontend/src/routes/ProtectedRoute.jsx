import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children, allowedRoles }) {

  const { isLoggedIn, user } = useAuth()

  // Check 1 — is the user logged in at all?
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  // Check 2 — does the user have the correct role?
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/login" replace />
  }

  // All checks passed — show the actual page
  return children
}

export default ProtectedRoute