import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, BarChart3, PlayCircle } from "lucide-react"

import { useAuth } from "../context/AuthContext"
import { buildMediaUrl, fetchAnalysis } from "../lib/api"
import type { AnalysisEvent, AnalysisPayload, AnalysisResponse } from "../lib/api"

const STORAGE_KEY = "netly.latestAnalysis"

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function titleCase(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getActiveEventTimestamp(events: AnalysisEvent[], currentTime: number): number | null {
  let activeTimestamp: number | null = null
  for (const event of events) {
    if (currentTime >= event.timestamp) {
      activeTimestamp = event.timestamp
    }
  }
  return activeTimestamp
}

const AnalysisResultsPage: React.FC = () => {
  const { token } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    const loadAnalysis = async () => {
      const params = new URLSearchParams(window.location.search)
      const sessionId = params.get("session_id")
      const stored = sessionStorage.getItem(STORAGE_KEY)

      if (stored) {
        const parsed = JSON.parse(stored) as AnalysisResponse
        if (!sessionId || parsed.session_id === sessionId) {
          setAnalysisData(parsed)
          setLoading(false)
          return
        }
      }

      if (!token || !sessionId) {
        setError("No saved analysis was found for this page.")
        setLoading(false)
        return
      }

      try {
        const payload: AnalysisPayload = await fetchAnalysis(token, sessionId)
        setAnalysisData({
          success: true,
          session_id: sessionId,
          events: payload,
          output_video_url: `/api/video/${sessionId}`,
          video_duration: payload.metadata.video_duration,
          message: "Analysis loaded successfully",
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load the requested session.")
      } finally {
        setLoading(false)
      }
    }

    void loadAnalysis()
  }, [token])

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    video.addEventListener("timeupdate", handleTimeUpdate)
    return () => video.removeEventListener("timeupdate", handleTimeUpdate)
  }, [analysisData])

  if (loading) {
    return (
      <div className="state-shell">
        <div className="state-card">
          <div className="spinner" />
          <p>Loading your session...</p>
        </div>
      </div>
    )
  }

  if (error || !analysisData || !token) {
    return (
      <div className="state-shell">
        <div className="state-card">
          <p>{error ?? "This session is unavailable."}</p>
          <Link to="/analyze/upload" className="button button-primary">
            Upload another clip
          </Link>
        </div>
      </div>
    )
  }

  const events = analysisData.events.events
  const videoUrl = buildMediaUrl(analysisData.output_video_url, token)
  const activeEventTimestamp = getActiveEventTimestamp(events, currentTime)
  const heroStats = [
    { label: "Session length", value: formatTime(analysisData.events.metadata.video_duration) },
    { label: "Tagged moments", value: analysisData.events.summary.total_events.toString() },
    { label: "Analyzed frames", value: analysisData.events.metadata.analyzed_frames.toString() },
  ]

  const jumpToEvent = (event: AnalysisEvent) => {
    if (!videoRef.current) {
      return
    }
    videoRef.current.currentTime = event.timestamp
    void videoRef.current.play()
  }

  return (
    <div className="page page-results">
      <header className="topbar">
        <div className="topbar-actions">
          <Link to="/dashboard" className="button button-ghost">
            <ArrowLeft size={18} />
            Back
          </Link>
        </div>

        <Link to="/" className="brand">
          <BarChart3 size={24} />
          <span>Netly</span>
        </Link>
      </header>

      <main className="workspace-shell">
        <section className="workspace-header">
          <div>
            <span className="eyebrow">Session review</span>
            <h1>Your clip is ready to scrub, score, and revisit.</h1>
            <p>
              Review the processed video, jump to key moments, and use the quality scores to judge how dependable the
              footage is for coaching feedback.
            </p>

            <div className="results-hero-stats">
              {heroStats.map((stat) => (
                <article key={stat.label} className="results-hero-stat">
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="results-layout">
          <section className="panel panel-spacious">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Processed video</span>
                <h2>Session playback</h2>
              </div>
            </div>

            <div className="video-frame">
              <video ref={videoRef} controls src={videoUrl} className="video-element">
                Your browser does not support video playback.
              </video>
            </div>

            <div className="marker-row">
              {events.length === 0 ? (
                <div className="empty-state">
                  <PlayCircle size={20} />
                  <p>This session did not generate event markers, but the processed video is still available.</p>
                </div>
              ) : (
                events.map((event) => (
                  <button
                    type="button"
                    key={`${event.timestamp}-${event.type}`}
                    className={`marker-chip ${event.severity} ${
                      activeEventTimestamp === event.timestamp ? "marker-chip-active" : ""
                    }`}
                    onClick={() => jumpToEvent(event)}
                  >
                    {titleCase(event.type)} - {formatTime(event.timestamp)}
                  </button>
                ))
              )}
            </div>

            <div className="metric-grid">
              <article className="metric-card">
                <span>Visibility</span>
                <strong>{Math.round(analysisData.events.summary.scores.visibility)}</strong>
              </article>
              <article className="metric-card">
                <span>Focus</span>
                <strong>{Math.round(analysisData.events.summary.scores.focus)}</strong>
              </article>
              <article className="metric-card">
                <span>Activity</span>
                <strong>{Math.round(analysisData.events.summary.scores.activity)}</strong>
              </article>
              <article className="metric-card">
                <span>Stability</span>
                <strong>{Math.round(analysisData.events.summary.scores.stability)}</strong>
              </article>
            </div>
          </section>

          <aside className="results-sidebar">
            <section className="panel panel-spacious">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Summary</span>
                  <h2>Session facts</h2>
                </div>
              </div>

              <div className="summary-list">
                <div className="summary-row">
                  <span>Total events</span>
                  <strong>{analysisData.events.summary.total_events}</strong>
                </div>
                <div className="summary-row">
                  <span>Duration</span>
                  <strong>{formatTime(analysisData.events.metadata.video_duration)}</strong>
                </div>
                <div className="summary-row">
                  <span>Analyzed frames</span>
                  <strong>{analysisData.events.metadata.analyzed_frames}</strong>
                </div>
                <div className="summary-row">
                  <span>Average brightness</span>
                  <strong>{analysisData.events.metrics.average_brightness.toFixed(1)}</strong>
                </div>
              </div>
            </section>

            <section className="panel panel-spacious">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Timeline</span>
                  <h2>Key moments</h2>
                </div>
              </div>

              <div className="event-list">
                {events.map((event) => (
                  <button
                    type="button"
                    key={`${event.timestamp}-${event.type}-row`}
                    className={`event-row ${event.severity} ${
                      activeEventTimestamp === event.timestamp ? "event-row-active" : ""
                    }`}
                    onClick={() => jumpToEvent(event)}
                  >
                    <div className="event-row-meta">
                      <strong>{titleCase(event.type)}</strong>
                      <span>{formatTime(event.timestamp)}</span>
                    </div>
                    <p>{event.description}</p>
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default AnalysisResultsPage
