import type React from "react"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, BarChart3 } from "lucide-react"

import { useAuth } from "../context/AuthContext"

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const { login, isLoading, error, clearError } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const success = await login(email, password)
    if (success) {
      navigate("/dashboard")
    }
  }

  return (
    <div className="page page-auth">
      <div className="auth-shell">
        <div className="auth-panel">
          <Link to="/" className="brand">
            <BarChart3 size={24} />
            <span>Netly</span>
          </Link>

          <div className="auth-copy">
            <span className="eyebrow">Welcome back</span>
            <h1>Step back into your basketball control room.</h1>
            <p>
              Sign in to reopen saved sessions, jump back into film review, and keep your setup workflow inside the
              same arena-styled workspace.
            </p>
          </div>

          <div className="auth-panel-stats">
            <div>
              <span>Session archive</span>
              <strong>Always nearby</strong>
            </div>
            <div>
              <span>Live review</span>
              <strong>Camera ready</strong>
            </div>
          </div>

          <ul className="auth-highlights">
            <li>Reopen previous clips without losing the review context.</li>
            <li>Keep webcam setup, upload review, and playback inside one shared visual system.</li>
            <li>Move faster between reps with a cleaner, calmer interface.</li>
          </ul>
        </div>

        <div className="auth-card">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Sign in</span>
              <h2>Access your dashboard</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="form-stack">
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  clearError()
                  setEmail(event.target.value)
                }}
                placeholder="coach@netly.app"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => {
                  clearError()
                  setPassword(event.target.value)
                }}
                placeholder="Enter your password"
                required
              />
            </label>

            {error ? <div className="inline-alert inline-alert-danger">{error}</div> : null}

            <button type="submit" className="button button-primary button-block" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
              <ArrowRight size={18} />
            </button>

            <p className="auth-switch">
              New here? <Link to="/signup">Create an account</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
