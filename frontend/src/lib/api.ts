export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
}

export interface AnalysisEvent {
  type: string
  timestamp: number
  frame: number
  description: string
  severity: "info" | "warning" | "error"
}

export interface AnalysisSummary {
  total_events: number
  event_counts: Record<string, number>
  scores: {
    visibility: number
    focus: number
    activity: number
    stability: number
  }
}

export interface AnalysisMetadata {
  fps: number
  total_frames: number
  analyzed_frames: number
  video_duration: number
  resolution: {
    width: number
    height: number
  }
}

export interface AnalysisMetrics {
  average_brightness: number
  average_contrast: number
  average_sharpness: number
  average_motion: number
}

export interface AnalysisPayload {
  events: AnalysisEvent[]
  summary: AnalysisSummary
  metadata: AnalysisMetadata
  metrics: AnalysisMetrics
}

export interface AnalysisResponse {
  success: boolean
  session_id: string
  events: AnalysisPayload
  output_video_url: string
  video_duration: number
  message: string
}

export interface SessionRecord {
  session_id: string
  created_at: string
  original_filename: string
  video_duration: number
  summary: AnalysisSummary
}

export interface WebcamSnapshot {
  timestamp: string
  status: "ready" | "adjust"
  readiness_score: number
  metrics: {
    brightness: number
    clarity: number
    contrast: number
    framing: number
  }
  insights: string[]
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5002").replace(/\/$/, "")

async function readResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : null) ?? `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload as T
}

function buildHeaders(token?: string, contentType?: string): HeadersInit {
  const headers: Record<string, string> = {}
  if (contentType) {
    headers["Content-Type"] = contentType
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

export async function verifyToken(token: string): Promise<{ valid: boolean; user: User }> {
  const response = await fetch(`${API_BASE}/verify-token`, {
    method: "POST",
    headers: buildHeaders(undefined, "application/json"),
    body: JSON.stringify({ token }),
  })

  return readResponse<{ valid: boolean; user: User }>(response)
}

export async function signupUser(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
): Promise<{ token: string; user: User }> {
  const response = await fetch(`${API_BASE}/signup`, {
    method: "POST",
    headers: buildHeaders(undefined, "application/json"),
    body: JSON.stringify({ firstName, lastName, email, password }),
  })

  return readResponse<{ token: string; user: User }>(response)
}

export async function loginUser(email: string, password: string): Promise<{ token: string; user: User }> {
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: buildHeaders(undefined, "application/json"),
    body: JSON.stringify({ email, password }),
  })

  return readResponse<{ token: string; user: User }>(response)
}

export async function logoutUser(token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/logout`, {
    method: "POST",
    headers: buildHeaders(token, "application/json"),
  })

  await readResponse<{ message: string }>(response)
}

export async function fetchSessions(token: string): Promise<SessionRecord[]> {
  const response = await fetch(`${API_BASE}/api/sessions`, {
    headers: buildHeaders(token),
  })

  const payload = await readResponse<{ sessions: SessionRecord[] }>(response)
  return payload.sessions
}

export async function analyzeVideo(token: string, formData: FormData): Promise<AnalysisResponse> {
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: buildHeaders(token),
    body: formData,
  })

  return readResponse<AnalysisResponse>(response)
}

export async function fetchAnalysis(token: string, sessionId: string): Promise<AnalysisPayload> {
  const response = await fetch(`${API_BASE}/api/events/${sessionId}`, {
    headers: buildHeaders(token),
  })

  return readResponse<AnalysisPayload>(response)
}

export async function analyzeWebcamFrame(token: string, image: string): Promise<WebcamSnapshot> {
  const response = await fetch(`${API_BASE}/api/webcam/analyze`, {
    method: "POST",
    headers: buildHeaders(token, "application/json"),
    body: JSON.stringify({ image }),
  })

  const payload = await readResponse<{ success: boolean; snapshot: WebcamSnapshot }>(response)
  return payload.snapshot
}

export function buildMediaUrl(path: string, token: string): string {
  const normalizedPath = path.startsWith("http") ? path : `${API_BASE}${path}`
  const separator = normalizedPath.includes("?") ? "&" : "?"
  return `${normalizedPath}${separator}token=${encodeURIComponent(token)}`
}
