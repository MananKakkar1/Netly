import type { CSSProperties } from "react"
import type React from "react"
import type { LucideIcon } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Camera,
  ChevronDown,
  Film,
  Radar,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react"

import { useAuth } from "../context/AuthContext"

const heroMetrics = [
  { label: "active sessions", value: "128" },
  { label: "highlight tags", value: "12.4K" },
  { label: "setup latency", value: "0.18s" },
]

const capabilityPanels: Array<{
  id: string
  title: string
  description: string
  stat: string
  statLabel: string
  visual: "court" | "film" | "signal"
}> = [
  {
    id: "01",
    title: "Film intelligence that reads spacing, pace, and pressure.",
    description:
      "Netly turns game tape and workout clips into a cleaner review surface with tagged moments, confidence scores, and basketball-native context.",
    stat: "99.1%",
    statLabel: "tracking continuity",
    visual: "court",
  },
  {
    id: "02",
    title: "A live setup flow that feels like a control room instead of a utility page.",
    description:
      "Open the camera, evaluate the rep environment, and see readiness, framing, and clarity without stepping outside the same visual system.",
    stat: "4 signals",
    statLabel: "live camera grades",
    visual: "signal",
  },
  {
    id: "03",
    title: "A session archive built for actual film work, not demo screenshots.",
    description:
      "Uploads, processed replays, and coaching notes sit inside one archive that stays fast to scan and calm to work in.",
    stat: "1 workspace",
    statLabel: "from upload to replay",
    visual: "film",
  },
]

const processSteps: Array<{
  index: string
  title: string
  subtitle: string
  description: string
}> = [
  {
    index: "01",
    title: "Capture",
    subtitle: "the rep",
    description:
      "Start from live setup or upload. Either way, the product opens on the same court-aware environment and keeps the coaching workflow intact.",
  },
  {
    index: "02",
    title: "Analyze",
    subtitle: "the session",
    description:
      "Scores, moments, and motion signals arrive in one place with stronger hierarchy and less generic dashboard noise competing for attention.",
  },
  {
    index: "03",
    title: "Coach",
    subtitle: "the next action",
    description:
      "Move from playback to notes quickly, with the important reads surfaced first and the rest of the session still available when you need it.",
  },
]

const workspaceSurfaces: Array<{
  icon: LucideIcon
  eyebrow: string
  title: string
  description: string
  bullets: string[]
}> = [
  {
    icon: Camera,
    eyebrow: "Live setup",
    title: "Get the rep environment right before the first frame matters.",
    description:
      "The webcam workspace keeps lighting, framing, and clarity visible with just enough motion to feel alive without getting in the way.",
    bullets: ["Readiness scoring", "Framing guidance", "Live status history"],
  },
  {
    icon: Upload,
    eyebrow: "Film intake",
    title: "Upload a session and move straight into a darker, cleaner review lane.",
    description:
      "Pick the depth of analysis, let Netly process the clip, and open the session inside a surface that feels purpose-built for basketball tape.",
    bullets: ["Review modes", "Upload progress", "Processed playback"],
  },
  {
    icon: Bot,
    eyebrow: "Session archive",
    title: "Keep each session organized like a basketball operations desk.",
    description:
      "Recent clips, quality scores, and replay moments stay within reach so you can work through a day of film without losing context.",
    bullets: ["Tagged moments", "Session recall", "Quick handoff"],
  },
]

const proofItems = [
  { icon: Radar, label: "motion grading" },
  { icon: Search, label: "clip recall" },
  { icon: Film, label: "replay surfaces" },
  { icon: Activity, label: "live telemetry" },
  { icon: ShieldCheck, label: "dependable sessions" },
]

const faqs = [
  {
    question: "What exactly are we borrowing from the reference?",
    answer:
      "The layout logic more than the literal graphics: a fixed transparent header, a full-bleed hero, oversized type, calmer black surfaces, and stronger section choreography.",
  },
  {
    question: "How is the basketball theme handled now?",
    answer:
      "The visuals lean on court markings, arena lighting, shot arcs, telemetry lines, and film-room pacing rather than generic sports gradients or stock imagery.",
  },
  {
    question: "Does the new direction carry into the product pages too?",
    answer:
      "Yes. The dashboard, auth flow, upload, webcam, and results pages all inherit the same stripped-back editorial shell and dark product language.",
  },
]

const animatedWord = ["r", "e", "a", "d", "s"]

const HomePage: React.FC = () => {
  const { token } = useAuth()
  const [openFaq, setOpenFaq] = useState(0)

  const primaryLink = token ? "/dashboard" : "/signup"
  const primaryLabel = token ? "Open workspace" : "Create account"

  return (
    <div className="page page-home">
      <header className="topbar topbar-home">
        <Link to="/" className="brand">
          <BarChart3 size={22} />
          <span>Netly</span>
        </Link>

        <div className="topbar-home-shell">
          <nav className="topbar-links" aria-label="Sections">
            <a href="#capabilities" className="topbar-link">
              Capabilities
            </a>
            <a href="#process" className="topbar-link">
              Process
            </a>
            <a href="#workspaces" className="topbar-link">
              Workspaces
            </a>
            <a href="#faq" className="topbar-link">
              FAQ
            </a>
          </nav>

          <nav className="topbar-actions">
            {token ? (
              <Link to="/dashboard" className="button button-ghost">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="button button-ghost">
                  Sign in
                </Link>
                <Link to="/signup" className="button button-primary">
                  Create account
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="home-main home-main-v2">
        <section className="hero-v2">
          <div className="hero-v2-media" aria-hidden="true">
            <div className="hero-v2-video" />
            <div className="hero-v2-shade hero-v2-shade-left" />
            <div className="hero-v2-shade hero-v2-shade-bottom" />
            <div className="hero-v2-grid">
              {Array.from({ length: 8 }).map((_, index) => (
                <span
                  key={`row-${index}`}
                  className="hero-grid-line hero-grid-line-row"
                  style={{ "--position": `${(index + 1) * 12.5}%` } as CSSProperties}
                />
              ))}
              {Array.from({ length: 12 }).map((_, index) => (
                <span
                  key={`column-${index}`}
                  className="hero-grid-line hero-grid-line-column"
                  style={{ "--position": `${(index + 1) * 8.33}%` } as CSSProperties}
                />
              ))}
            </div>
            <div className="hero-v2-court hero-v2-court-floor" />
            <div className="hero-v2-court hero-v2-court-lane" />
            <div className="hero-v2-court hero-v2-court-arc" />
            <div className="hero-v2-orbit hero-v2-orbit-a" />
            <div className="hero-v2-orbit hero-v2-orbit-b" />
            <div className="hero-v2-ball" />
            <div className="hero-v2-tag hero-v2-tag-a">lane read</div>
            <div className="hero-v2-tag hero-v2-tag-b">shot rhythm</div>
          </div>

          <div className="hero-v2-inner">
            <div className="hero-v2-copy">
              <span className="eyebrow eyebrow-hero">Basketball intelligence for coaches, trainers, and film rooms</span>
              <h1>
                <span className="hero-line">Basketball review,</span>
                <span className="hero-line">
                  that{" "}
                  <span className="hero-word" aria-label="reads">
                    {animatedWord.map((letter, index) => (
                      <span key={`${letter}-${index}`}>{letter}</span>
                    ))}
                  </span>{" "}
                  the floor.
                </span>
              </h1>
              <p className="hero-v2-text">
                Netly brings live setup, upload review, and processed replay into one cinematic basketball workspace
                with stronger hierarchy, quieter surfaces, and motion that actually feels tied to the sport.
              </p>

              <div className="hero-v2-actions">
                <Link to={primaryLink} className="button button-primary">
                  {primaryLabel}
                  <ArrowRight size={18} />
                </Link>
                <Link to="/analyze/upload" className="button button-secondary">
                  Review a clip
                </Link>
              </div>
            </div>

            <div className="hero-v2-metrics" aria-label="Highlights">
              {heroMetrics.map((metric) => (
                <article key={metric.label} className="hero-v2-metric">
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="capabilities" className="editorial-section">
          <div className="editorial-heading">
            <div>
              <span className="eyebrow">Capabilities</span>
              <h2>
                Film.
                <br />
                Setup.
                <br />
                Replay.
              </h2>
            </div>
            <p>
              The reference site wins on composition, pacing, and confidence. Netly now takes that same full-bleed,
              editorial feel and retools it around basketball workflows.
            </p>
          </div>

          <div className="feature-panel-list">
            {capabilityPanels.map((panel) => (
              <article key={panel.id} className="feature-panel">
                <div className="feature-panel-copy">
                  <span className="feature-panel-index">{panel.id}</span>
                  <h3>{panel.title}</h3>
                  <p>{panel.description}</p>
                  <div className="feature-panel-stat">
                    <strong>{panel.stat}</strong>
                    <span>{panel.statLabel}</span>
                  </div>
                </div>

                <div className={`feature-panel-visual feature-panel-visual-${panel.visual}`} aria-hidden="true">
                  <div className="feature-panel-screen" />
                  <div className="feature-panel-overlay" />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="process" className="process-section">
          <div className="process-hero">
            <div className="process-hero-copy">
              <span className="eyebrow">Process</span>
              <h2>
                Capture.
                <br />
                Analyze.
                <br />
                Coach.
              </h2>
            </div>

            <div className="process-hero-visual" aria-hidden="true">
              <div className="process-hero-tree" />
            </div>
          </div>

          <div className="process-card-grid">
            {processSteps.map((step, index) => (
              <article key={step.index} className={`process-card ${index === 0 ? "is-active" : ""}`}>
                <div className="process-card-top">
                  <span className="process-card-index">{step.index}</span>
                  <span className="process-card-rule" />
                </div>
                <h3>{step.title}</h3>
                <span className="process-card-subtitle">{step.subtitle}</span>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="workspaces" className="workspace-showcase">
          <div className="workspace-showcase-heading">
            <span className="eyebrow">Workspaces</span>
            <h2>Three surfaces. One basketball system.</h2>
          </div>

          <div className="workspace-showcase-grid">
            {workspaceSurfaces.map((surface) => (
              <article key={surface.title} className="workspace-showcase-card">
                <surface.icon size={20} />
                <span className="eyebrow">{surface.eyebrow}</span>
                <h3>{surface.title}</h3>
                <p>{surface.description}</p>
                <ul>
                  {surface.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="proof-band" aria-label="Proof points">
          {proofItems.map((item) => (
            <div key={item.label} className="proof-band-item">
              <item.icon size={16} />
              <span>{item.label}</span>
            </div>
          ))}
        </section>

        <section className="cta-panel">
          <div className="cta-panel-copy">
            <span className="eyebrow">Ready to launch</span>
            <h2>Give your basketball workflow the kind of UI it can actually carry.</h2>
            <p>
              This direction is intentionally closer to the reference site’s cinematic structure, but translated into a
              darker basketball product language built around court vision and film review.
            </p>
          </div>

          <div className="cta-panel-actions">
            <Link to={primaryLink} className="button button-primary">
              {primaryLabel}
              <ArrowRight size={18} />
            </Link>
            <Link to="/analyze/webcam" className="button button-ghost">
              Open live setup
            </Link>
          </div>
        </section>

        <section id="faq" className="faq-v2">
          <div className="workspace-showcase-heading">
            <span className="eyebrow">FAQ</span>
            <h2>What changed in the new direction.</h2>
          </div>

          <div className="faq-v2-list">
            {faqs.map((item, index) => {
              const isOpen = openFaq === index

              return (
                <article key={item.question} className={`faq-v2-item ${isOpen ? "is-open" : ""}`}>
                  <button
                    type="button"
                    className="faq-v2-question"
                    onClick={() => setOpenFaq((current) => (current === index ? -1 : index))}
                  >
                    <span>{item.question}</span>
                    <ChevronDown size={18} />
                  </button>

                  <div className="faq-v2-answer">
                    <p>{item.answer}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

export default HomePage
