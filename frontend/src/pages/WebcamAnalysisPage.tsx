import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { AlertCircle, ArrowLeft, BarChart3, Camera, PauseCircle, PlayCircle, Square } from "lucide-react"

import { useAuth } from "../context/AuthContext"
import { analyzeWebcamFrame } from "../lib/api"
import type { WebcamSnapshot } from "../lib/api"

const WebcamAnalysisPage: React.FC = () => {
  const { token } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const pollRef = useRef<number | null>(null)
  const requestInFlightRef = useRef(false)

  const [isCameraReady, setIsCameraReady] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [snapshot, setSnapshot] = useState<WebcamSnapshot | null>(null)
  const [history, setHistory] = useState<WebcamSnapshot[]>([])
  const [error, setError] = useState<string | null>(null)

  const stopPolling = () => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const stopCamera = () => {
    stopPolling()
    setIsAnalyzing(false)
    setIsCameraReady(false)

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop()
      }
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not support camera access.")
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setError(null)
      setIsCameraReady(true)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Camera access was denied.")
      return false
    }
  }

  const captureSnapshot = async () => {
    if (!token || !videoRef.current || !canvasRef.current || requestInFlightRef.current) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video.videoWidth || !video.videoHeight) {
      return
    }

    requestInFlightRef.current = true
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext("2d")
    if (!context) {
      requestInFlightRef.current = false
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      const image = canvas.toDataURL("image/jpeg", 0.82)
      const nextSnapshot = await analyzeWebcamFrame(token, image)
      setSnapshot(nextSnapshot)
      setHistory((current) => [nextSnapshot, ...current].slice(0, 6))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not analyze the current frame.")
    } finally {
      requestInFlightRef.current = false
    }
  }

  const startReview = async () => {
    if (!token) {
      setError("Sign in again before using live review.")
      return
    }

    const ready = streamRef.current ? true : await startCamera()
    if (!ready) {
      return
    }

    stopPolling()
    setIsAnalyzing(true)
    await captureSnapshot()
    pollRef.current = window.setInterval(() => {
      void captureSnapshot()
    }, 3000)
  }

  const pauseReview = () => {
    stopPolling()
    setIsAnalyzing(false)
  }

  useEffect(() => {
    return () => {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current)
      }

      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop()
        }
      }
    }
  }, [])

  const liveSignals = ["Frame grading", "Light balance", "Camera framing"]

  return (
    <div className="page page-webcam">
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
            <span className="eyebrow">Live webcam review</span>
            <h1>Tune the setup before the rep starts.</h1>
            <p>
              The app captures still frames every few seconds and scores the current lighting, clarity, contrast, and
              framing conditions inside the same arena-style workflow as the rest of the product.
            </p>

            <div className="workspace-chip-row">
              {liveSignals.map((signal) => (
                <span key={signal} className="workspace-chip">
                  {signal}
                </span>
              ))}
            </div>
          </div>
        </section>

        <div className="camera-layout">
          <section className="panel panel-spacious">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Preview</span>
                <h2>Browser camera</h2>
              </div>
              <div className={`status-chip ${isAnalyzing ? "status-chip-live" : ""}`}>
                {isAnalyzing ? "Live review running" : isCameraReady ? "Camera ready" : "Camera idle"}
              </div>
            </div>

            <div className="camera-frame">
              {!isCameraReady ? (
                <div className="camera-overlay">
                  <Camera size={36} />
                  <strong>Start your camera to open the live workspace</strong>
                  <span>No desktop process required.</span>
                </div>
              ) : null}
              <div className="camera-scan-line" />
              <video ref={videoRef} muted playsInline className="video-element" />
            </div>

            <div className="control-row">
              <button type="button" className="button button-primary" onClick={() => void startReview()}>
                <PlayCircle size={18} />
                {isAnalyzing ? "Refresh snapshot loop" : "Start live review"}
              </button>

              <button
                type="button"
                className="button button-secondary"
                onClick={pauseReview}
                disabled={!isAnalyzing}
              >
                <PauseCircle size={18} />
                Pause
              </button>

              <button
                type="button"
                className="button button-ghost"
                onClick={stopCamera}
                disabled={!isCameraReady && !isAnalyzing}
              >
                <Square size={18} />
                Stop camera
              </button>
            </div>

            {error ? (
              <div className="inline-alert inline-alert-danger">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            ) : null}

            <canvas ref={canvasRef} hidden />
          </section>

          <aside className="results-sidebar">
            <section className="panel panel-spacious">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Latest score</span>
                  <h2>Setup readiness</h2>
                </div>
              </div>

              {snapshot ? (
                <>
                  <div className="readiness-meter">
                    <strong>{Math.round(snapshot.readiness_score)}</strong>
                    <span>{snapshot.status === "ready" ? "Ready for review" : "Needs adjustment"}</span>
                  </div>

                  <div className="metric-grid">
                    <article className="metric-card">
                      <span>Brightness</span>
                      <strong>{Math.round(snapshot.metrics.brightness)}</strong>
                    </article>
                    <article className="metric-card">
                      <span>Clarity</span>
                      <strong>{Math.round(snapshot.metrics.clarity)}</strong>
                    </article>
                    <article className="metric-card">
                      <span>Contrast</span>
                      <strong>{Math.round(snapshot.metrics.contrast)}</strong>
                    </article>
                    <article className="metric-card">
                      <span>Framing</span>
                      <strong>{Math.round(snapshot.metrics.framing)}</strong>
                    </article>
                  </div>

                  <div className="insight-list">
                    {snapshot.insights.map((insight) => (
                      <div key={insight} className="insight-row">
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <Camera size={20} />
                  <p>Start live review to generate your first setup score.</p>
                </div>
              )}
            </section>

            <section className="panel panel-spacious">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Recent checks</span>
                  <h2>Snapshot history</h2>
                </div>
              </div>

              <div className="event-list">
                {history.length === 0 ? (
                  <div className="empty-state">
                    <Camera size={20} />
                    <p>Recent snapshot checks will appear here once live review begins.</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.timestamp}
                      className={`event-row ${item.status === "ready" ? "info" : "warning"}`}
                    >
                      <div className="event-row-meta">
                        <strong>{item.status === "ready" ? "Ready" : "Adjust"}</strong>
                        <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p>{item.insights[0]}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default WebcamAnalysisPage
