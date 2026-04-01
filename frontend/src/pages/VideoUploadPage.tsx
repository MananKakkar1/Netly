import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AlertCircle, ArrowLeft, BarChart3, CheckCircle2, FileVideo, Upload } from "lucide-react"

import { useAuth } from "../context/AuthContext"
import { analyzeVideo } from "../lib/api"

const STORAGE_KEY = "netly.latestAnalysis"

type ReviewMode = "quick" | "balanced" | "full"

const reviewModes: Array<{
  value: ReviewMode
  title: string
  description: string
  detail: string
}> = [
  {
    value: "quick",
    title: "Quick scan",
    description: "Fast prep pass for shorter clips and lighter feedback loops.",
    detail: "~900 frames",
  },
  {
    value: "balanced",
    title: "Balanced review",
    description: "Best everyday mode for training film and game snippets.",
    detail: "~1800 frames",
  },
  {
    value: "full",
    title: "Full clip",
    description: "Longest pass for deeper session context and a fuller marker set.",
    detail: "Whole clip",
  },
]

const VideoUploadPage: React.FC = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressTimerRef = useRef<number | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [reviewMode, setReviewMode] = useState<ReviewMode>("balanced")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (progressTimerRef.current !== null) {
        window.clearInterval(progressTimerRef.current)
      }
    }
  }, [])

  const beginProgress = () => {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current)
    }

    progressTimerRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 94) {
          return current
        }
        return current < 72 ? current + 6 : current + 2
      })
    }, 220)
  }

  const stopProgress = () => {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }
  }

  const updateSelectedFile = (file: File | null) => {
    setError(null)
    if (file && file.type.startsWith("video/")) {
      setSelectedFile(file)
      return
    }

    if (file) {
      setError("Choose a supported video file.")
    }
  }

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError("Pick a video before starting the review.")
      return
    }

    if (!token) {
      setError("Sign in again before uploading a clip.")
      return
    }

    const formData = new FormData()
    formData.append("video", selectedFile)

    if (reviewMode === "quick") {
      formData.append("max_frames", "900")
    }
    if (reviewMode === "balanced") {
      formData.append("max_frames", "1800")
    }

    setIsSubmitting(true)
    setProgress(8)
    setError(null)
    beginProgress()

    try {
      const result = await analyzeVideo(token, formData)
      stopProgress()
      setProgress(100)
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result))
      navigate(`/analyze/results?session_id=${result.session_id}`)
    } catch (err) {
      stopProgress()
      setProgress(0)
      setError(err instanceof Error ? err.message : "The upload could not be completed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const progressLabel =
    progress < 40 ? "Uploading clip" : progress < 85 ? "Reviewing frames" : "Packaging your results"

  return (
    <div className="page page-upload">
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
            <span className="eyebrow">Upload review</span>
            <h1>Bring in a clip and let Netly stage a richer review session.</h1>
            <p>Choose the scan depth, watch the upload pulse forward, and jump straight into the processed timeline.</p>
          </div>
        </section>

        <div className="upload-layout">
          <section className="panel panel-spacious">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Clip</span>
                <h2>Select your file</h2>
              </div>
            </div>

            {!selectedFile ? (
              <button
                type="button"
                className="dropzone"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
              >
                <Upload size={32} />
                <strong>Drop a practice clip here or browse</strong>
                <span>MP4, MOV, AVI, and MKV are supported.</span>
              </button>
            ) : (
              <div className="selected-file-card">
                <div className="selected-file-meta">
                  <FileVideo size={28} />
                  <div>
                    <strong>{selectedFile.name}</strong>
                    <span>{formatFileSize(selectedFile.size)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setSelectedFile(null)}
                  disabled={isSubmitting}
                >
                  Remove
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(event) => updateSelectedFile(event.target.files?.[0] ?? null)}
            />

            <div className="field">
              <span>Review depth</span>
              <div className="mode-card-grid">
                {reviewModes.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    className={`mode-card ${reviewMode === mode.value ? "is-active" : ""}`}
                    onClick={() => setReviewMode(mode.value)}
                    disabled={isSubmitting}
                  >
                    <div className="mode-card-copy">
                      <strong>{mode.title}</strong>
                      <span>{mode.description}</span>
                    </div>
                    <small>{mode.detail}</small>
                  </button>
                ))}
              </div>
            </div>

            {error ? (
              <div className="inline-alert inline-alert-danger">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            ) : null}

            {isSubmitting ? (
              <div className="progress-card">
                <div className="progress-row">
                  <strong>{progressLabel}</strong>
                  <span>{progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : null}

            <button
              type="button"
              className="button button-primary button-block"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedFile}
            >
              Start review
            </button>
          </section>

          <aside className="panel panel-spacious">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Expected output</span>
                <h2>What you'll get back</h2>
              </div>
            </div>

            <div className="check-list">
              <div className="check-row">
                <CheckCircle2 size={18} />
                <span>A processed MP4 copy tied to one session ID</span>
              </div>
              <div className="check-row">
                <CheckCircle2 size={18} />
                <span>Review scores for visibility, focus, activity, and stability</span>
              </div>
              <div className="check-row">
                <CheckCircle2 size={18} />
                <span>Timestamped events for high activity, stable windows, and setup issues</span>
              </div>
            </div>

            <div className="upload-process">
              <div className="upload-process-step">
                <span>01</span>
                <strong>Ingest the clip</strong>
              </div>
              <div className="upload-process-step">
                <span>02</span>
                <strong>Score the frames</strong>
              </div>
              <div className="upload-process-step">
                <span>03</span>
                <strong>Open the timeline</strong>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default VideoUploadPage
