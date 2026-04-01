import type React from "react"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, BarChart3 } from "lucide-react"

import { useAuth } from "../context/AuthContext"

const SignupPage: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const { signup, isLoading, error, clearError } = useAuth()
  const [localError, setLocalError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLocalError(null)

    if (formData.password.length < 8) {
      setLocalError("Use at least 8 characters for a stronger password.")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError("Passwords do not match.")
      return
    }

    const success = await signup(formData.firstName, formData.lastName, formData.email, formData.password)
    if (success) {
      navigate("/dashboard")
    }
  }

  const updateField = (field: keyof typeof formData, value: string) => {
    clearError()
    setLocalError(null)
    setFormData((current) => ({ ...current, [field]: value }))
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
            <span className="eyebrow">Get started</span>
            <h1>Create your basketball review workspace.</h1>
            <p>
              Make an account to store upload sessions, run the webcam workspace, and keep every film session inside
              one polished system.
            </p>
          </div>

          <div className="auth-panel-stats">
            <div>
              <span>Upload review</span>
              <strong>One click in</strong>
            </div>
            <div>
              <span>Live setup</span>
              <strong>Always visible</strong>
            </div>
          </div>

          <ul className="auth-highlights">
            <li>Store sessions under one login instead of juggling temporary screens.</li>
            <li>Jump from setup scoring to clip review without breaking the flow.</li>
            <li>Keep every rep in a cleaner, more cinematic basketball environment.</li>
          </ul>
        </div>

        <div className="auth-card">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Create account</span>
              <h2>Start your workspace</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="form-stack">
            <div className="field-row">
              <label className="field">
                <span>First name</span>
                <input
                  value={formData.firstName}
                  onChange={(event) => updateField("firstName", event.target.value)}
                  placeholder="Maya"
                  required
                />
              </label>

              <label className="field">
                <span>Last name</span>
                <input
                  value={formData.lastName}
                  onChange={(event) => updateField("lastName", event.target.value)}
                  placeholder="Jordan"
                  required
                />
              </label>
            </div>

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={formData.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="maya@netly.app"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={formData.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </label>

            <label className="field">
              <span>Confirm password</span>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(event) => updateField("confirmPassword", event.target.value)}
                placeholder="Re-enter your password"
                required
              />
            </label>

            {localError ? <div className="inline-alert inline-alert-danger">{localError}</div> : null}
            {error ? <div className="inline-alert inline-alert-danger">{error}</div> : null}

            <button type="submit" className="button button-primary button-block" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create account"}
              <ArrowRight size={18} />
            </button>

            <p className="auth-switch">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SignupPage
