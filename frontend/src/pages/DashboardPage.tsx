import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, BarChart3, Camera, Clock3, LogOut, Radar, Upload } from "lucide-react"

import { useAuth } from "../context/AuthContext"
import { fetchSessions } from "../lib/api"
import type { SessionRecord } from "../lib/api"

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

const DashboardPage: React.FC = () => {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [sessionsError, setSessionsError] = useState<string | null>(null)

  useEffect(() => {
    const loadSessions = async () => {
      if (!token) {
        setIsLoadingSessions(false)
        return
      }

      try {
        const data = await fetchSessions(token)
        setSessions(data)
      } catch (err) {
        setSessionsError(err instanceof Error ? err.message : "Could not load recent sessions")
      } finally {
        setIsLoadingSessions(false)
      }
    }

    void loadSessions()
  }, [token])

  const handleLogout = async () => {
    await logout()
    navigate("/")
  }

  const recentSessions = sessions.slice(0, 3)

  const dashboardStats = useMemo(() => {
    const totalEvents = sessions.reduce((sum, session) => sum + session.summary.total_events, 0)
    const averageVisibility = sessions.length
      ? Math.round(
          sessions.reduce((sum, session) => sum + session.summary.scores.visibility, 0) / sessions.length,
        )
      : 0
    const totalFilmTime = sessions.reduce((sum, session) => sum + session.video_duration, 0)

    return [
      { label: "Saved sessions", value: sessions.length.toString().padStart(2, "0") },
      { label: "Tagged moments", value: totalEvents.toString().padStart(2, "0") },
      { label: "Avg visibility", value: sessions.length ? `${averageVisibility}` : "--" },
      { label: "Film logged", value: totalFilmTime ? formatDuration(totalFilmTime) : "--" },
    ]
  }, [sessions])

  const workflowSignals = ["Arena live", "Clip-ready", "Session archive"]

  return (
    <div className="page page-dashboard">
      <header className="topbar">
        <Link to="/" className="brand">
          <BarChart3 size={24} />
          <span>Netly</span>
        </Link>

        <div className="topbar-actions">
          <div className="user-chip">{user ? `${user.firstName} ${user.lastName}` : "Signed in"}</div>
          <button onClick={handleLogout} className="button button-ghost" type="button">
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </header>

      <main className="workspace-shell">
        <section className="dashboard-overview">
          <div className="dashboard-overview-copy">
            <span className="eyebrow">Workspace</span>
            <h1>Coach the session from one illuminated command surface.</h1>
            <p>
              The dashboard opens like a game-room control wall with faster context, warmer arena lighting, and direct
              paths into live setup, upload review, and saved session playback.
            </p>

            <div className="workspace-chip-row">
              {workflowSignals.map((signal) => (
                <span key={signal} className="workspace-chip">
                  {signal}
                </span>
              ))}
            </div>

            <div className="dashboard-stat-grid">
              {dashboardStats.map((stat) => (
                <article key={stat.label} className="dashboard-stat-card">
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </article>
              ))}
            </div>
          </div>

          <div className="dashboard-spotlight">
            <div className="dashboard-spotlight-surface">
              <div className="dashboard-spotlight-court" />
              <div className="dashboard-spotlight-pulse" />
              <div className="dashboard-spotlight-pill dashboard-spotlight-pill-a">Court synced</div>
              <div className="dashboard-spotlight-pill dashboard-spotlight-pill-b">Review lane live</div>
              <div className="dashboard-spotlight-card">
                <span>Today&apos;s workflow</span>
                <strong>Setup, capture, review.</strong>
                <p>Move from live camera prep to tagged film review without leaving the same basketball atmosphere.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="action-grid">
          <article className="action-card">
            <div className="action-icon action-icon-orange">
              <Camera size={28} />
            </div>
            <h2>Live webcam review</h2>
            <p>Open the browser camera, let the interface score your setup, and start a cleaner rep workflow.</p>
            <div className="action-card-list">
              <span>Light balance</span>
              <span>Framing score</span>
              <span>Instant readiness</span>
            </div>
            <Link to="/analyze/webcam" className="button button-primary">
              Open webcam workspace
              <ArrowRight size={18} />
            </Link>
          </article>

          <article className="action-card">
            <div className="action-icon action-icon-blue">
              <Upload size={28} />
            </div>
            <h2>Upload a clip</h2>
            <p>Bring in practice or game film, generate a processed session, and scrub key moments immediately.</p>
            <div className="action-card-list">
              <span>Tagged moments</span>
              <span>Quality grades</span>
              <span>Session playback</span>
            </div>
            <Link to="/analyze/upload" className="button button-secondary">
              Upload video
              <ArrowRight size={18} />
            </Link>
          </article>
        </section>

        <section className="panel panel-spacious">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Recent sessions</span>
              <h2>Pick up where you left off</h2>
            </div>
            <div className="user-chip">
              <Radar size={16} />
              <span>Archive live</span>
            </div>
          </div>

          {isLoadingSessions ? (
            <div className="state-inline">
              <div className="spinner" />
              <span>Loading recent sessions...</span>
            </div>
          ) : sessionsError ? (
            <div className="inline-alert inline-alert-warning">{sessionsError}</div>
          ) : recentSessions.length === 0 ? (
            <div className="empty-state">
              <Clock3 size={22} />
              <p>No saved sessions yet. Upload a clip to create your first review.</p>
            </div>
          ) : (
            <div className="session-list">
              {recentSessions.map((session) => (
                <Link
                  key={session.session_id}
                  to={`/analyze/results?session_id=${session.session_id}`}
                  className="session-row"
                >
                  <div>
                    <strong>{session.original_filename}</strong>
                    <span>{new Date(session.created_at).toLocaleString()}</span>
                  </div>
                  <div className="session-row-stats">
                    <span>{formatDuration(session.video_duration)}</span>
                    <span>{session.summary.total_events} events</span>
                    <span>{Math.round(session.summary.scores.visibility)} visibility</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default DashboardPage
