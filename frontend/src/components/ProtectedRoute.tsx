import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"

import { useAuth } from "../context/AuthContext"

interface ProtectedRouteProps {
  children: ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isLoading, token } = useAuth()

  if (isLoading) {
    return (
      <div className="state-shell">
        <div className="state-card">
          <div className="spinner" />
          <p>Checking your session...</p>
        </div>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
