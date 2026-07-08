import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requireSuperAdmin = false }) {
  const { user, profile, isSuperAdmin, accountStatus, loading } = useAuth()

  if (loading) return <div className="page-loading">Loading...</div>

  if (!user) return <Navigate to="/login" replace />

  if (!profile) return <div className="page-loading">Loading profile...</div>

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  if (!isSuperAdmin && accountStatus !== 'active') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h2>Account {accountStatus?.replace('_', ' ')}</h2>
          <p>
            {accountStatus === 'pending_verification' &&
              'Please verify your email to activate your account.'}
            {accountStatus === 'hold' &&
              'Your account has been put on hold by the administrator. Contact support for details.'}
            {accountStatus === 'terminated' &&
              'Your account has been terminated. Contact the administrator if you believe this is a mistake.'}
          </p>
        </div>
      </div>
    )
  }

  return children
}
