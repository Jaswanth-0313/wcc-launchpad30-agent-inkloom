import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { supabase } from './lib/supabase'

type Stage = 'discovery' | 'strategy' | 'personality' | 'naming' | 'visual' | 'critic' | 'consistency' | 'launch'
type Page = 'landing' | 'auth' | 'workspace' | 'dashboard'
type AuthMode = 'signin' | 'signup'
type BrandState = {
  idea: string
  audience: string
  problem: string
  alternatives: string
  goal: string
  constraints: string
  name: string
  tagline: string
  category: string
  differentiator: string
  traits: string[]
  selectedTrait: string
  visualMood: string
  voice: string
  issueResolved: boolean
  approved: Record<Stage, boolean>
}
type GenericFlag = {
  phrase: string
  reason: string
  alternative: string
}

type ToastState = {
  type: 'success' | 'error' | 'info'
  message: string
} | null

const stages: Array<{ id: Stage; label: string; number: string; kicker: string }> = [
  { id: 'discovery', label: 'Discovery', number: '01', kicker: 'Get clear' },
  { id: 'strategy', label: 'Positioning', number: '02', kicker: 'Find your edge' },
  { id: 'personality', label: 'Personality', number: '03', kicker: 'Set the tone' },
  { id: 'naming', label: 'Naming', number: '04', kicker: 'Make it stick' },
  { id: 'visual', label: 'Visual direction', number: '05', kicker: 'Make it seen' },
  { id: 'critic', label: 'AI critic', number: '06', kicker: 'Pressure test' },
  { id: 'consistency', label: 'Consistency', number: '07', kicker: 'Join the dots' },
  { id: 'launch', label: 'Launch kit', number: '08', kicker: 'Go to market' },
]

const approvedDefaults: Record<Stage, boolean> = {
  discovery: false,
  strategy: false,
  personality: false,
  naming: false,
  visual: false,
  critic: false,
  consistency: false,
  launch: false,
}

const blankBrand: BrandState = {
  idea: '',
  audience: '',
  problem: '',
  alternatives: '',
  goal: '',
  constraints: '',
  name: '',
  tagline: '',
  category: '',
  differentiator: '',
  traits: [],
  selectedTrait: '',
  visualMood: '',
  voice: '',
  issueResolved: false,
  approved: { ...approvedDefaults },
}

function detectGeneric(brand: BrandState): GenericFlag[] {
  const text = `${brand.idea} ${brand.problem} ${brand.tagline}`.toLowerCase()
  const checks: Array<[string, string, string]> = [
    ['innovative solutions', 'It promises novelty without naming the useful change.', 'Name the audience and the moment that improves.'],
    ['empowering the future', 'It uses an abstract ambition instead of a user outcome.', 'Describe what the audience can do sooner or better.'],
    ['seamless experience', 'It claims ease without evidence or a specific interaction.', 'Show the friction removed in the first use.'],
    ['next-generation', 'It is a category superlative that competitors can also claim.', 'Replace the superlative with a concrete difference.'],
    ['revolutionizing', 'It describes disruption but not the problem being solved.', 'State the old behavior and the new behavior.'],
    ['one platform for everything', 'It is broad enough to mean almost anything.', 'Choose the one high-value job this brand owns.'],
  ]

  return checks
    .filter(([phrase]) => text.includes(phrase))
    .map(([phrase, reason, alternative]) => ({ phrase, reason, alternative }))
}

function App() {
  const [brand, setBrand] = useState(blankBrand)
  const [stage, setStage] = useState<Stage>('discovery')
  const [started, setStarted] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [notice, setNotice] = useState<ToastState>(null)
  const [page, setPage] = useState<Page>('landing')
  const [authMode, setAuthMode] = useState<AuthMode>('signin')
  const [authForm, setAuthForm] = useState({ name: 'Alex Morgan', email: 'alex@inkloom.io', password: 'password123' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [session, setSession] = useState<{ user?: { email?: string | null } } | null>(null)

  const index = stages.findIndex((item) => item.id === stage)

  useEffect(() => {
    const hashToPage = (): Page => {
      const hash = window.location.hash.replace('#', '').toLowerCase()
      if (hash === 'login' || hash === 'signin') return 'auth'
      if (hash === 'signup') return 'auth'
      if (hash === 'workspace') return 'workspace'
      if (hash === 'dashboard') return 'dashboard'
      return 'landing'
    }

    const syncPageFromHash = () => {
      const nextPage = hashToPage()
      if (nextPage === 'auth') {
        setAuthMode(window.location.hash.toLowerCase().includes('signup') ? 'signup' : 'signin')
      }
      setPage(nextPage)
    }

    syncPageFromHash()

    const handleHashChange = () => {
      syncPageFromHash()
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    let active = true

    const hydrateSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setSession(data.session)
      if (data.session) {
        setPage('workspace')
        setStarted(true)
      }
    }

    void hydrateSession()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event: string, nextSession: { user?: { email?: string | null } } | null) => {
      if (!active) return
      setSession(nextSession)
      if (nextSession) {
        setPage('workspace')
        setStarted(true)
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (page === 'landing') {
      if (window.location.hash !== '') window.location.hash = ''
      return
    }

    const route = page === 'dashboard' ? 'dashboard' : page === 'auth' ? (authMode === 'signup' ? 'signup' : 'login') : 'workspace'
    const currentHash = window.location.hash.replace('#', '').toLowerCase()
    if (currentHash !== route) {
      window.location.hash = route
    }
  }, [page, authMode])

  const updateBrand = (key: keyof BrandState, value: string | boolean | string[]) => {
    setBrand((current) => ({ ...current, [key]: value }))
  }

  const nextStage = () => {
    setBrand((current) => ({ ...current, approved: { ...current.approved, [stage]: true } }))
    if (index < stages.length - 1) {
      setStage(stages[index + 1].id)
    }
  }

  const copyKit = async () => {
    const text = `${brand.name}\n${brand.tagline}\n\nAudience: ${brand.audience}\nProblem: ${brand.problem}\nPositioning: ${brand.differentiator}\n\n${brand.idea}`

    try {
      await navigator.clipboard.writeText(text)
      setNotice({ type: 'success', message: 'Brand snapshot copied to clipboard.' })
    } catch {
      setNotice({ type: 'error', message: 'Copy was blocked by the browser. Use the visible launch kit instead.' })
    }
  }

  const openWorkspace = () => {
    setPage('workspace')
    setStarted(true)
    setStage('discovery')
    setNotice(null)
  }

  const handleAuthSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setNotice(null)

    try {
      const email = authForm.email.trim()
      const password = authForm.password

      if (!email || !password) {
        throw new Error('Email and password are required.')
      }

      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: authForm.name.trim() || 'Inkloom user' } },
        })

        if (error) throw error
        setNotice({ type: 'success', message: 'Account created. Check your email to confirm sign-in if required.' })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setNotice({ type: 'success', message: 'Welcome back. You are signed in.' })
      }

      setPage('workspace')
      setStarted(true)
      setStage('discovery')
    } catch (error) {
      const fallback = error instanceof Error ? error.message : 'Authentication failed. Please try again.'
      setNotice({ type: 'error', message: fallback })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setNotice({ type: 'error', message: error.message || 'Unable to sign out.' })
      return
    }

    setSession(null)
    setPage('landing')
    setStarted(false)
    setShowDashboard(false)
    setStage('discovery')
    setBrand(blankBrand)
    setNotice({ type: 'success', message: 'Signed out successfully.' })
  }

  if (page === 'landing') {
    return (
      <InkloomLanding
        onOpenWorkspace={openWorkspace}
        onOpenAuth={(mode) => {
          setAuthMode(mode)
          setPage('auth')
          setNotice(null)
        }}
      />
    )
  }

  if (page === 'auth') {
    return (
      <AuthPage
        mode={authMode}
        onToggleMode={setAuthMode}
        form={authForm}
        onFieldChange={(key, value) => setAuthForm((current) => ({ ...current, [key]: value }))}
        isSubmitting={isSubmitting}
        notice={notice}
        onSubmit={handleAuthSubmit}
        onBackToHome={() => setPage('landing')}
        onContinueToWorkspace={openWorkspace}
      />
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <span>◒</span> inkloom <em>beta</em>
        </div>

        <div className="side-label">Brand workspace</div>
        <button
          className="project-switcher"
          onClick={() => setNotice({ type: 'info', message: 'This workspace keeps one local project in session state.' })}
          type="button"
        >
          <span className="project-dot">{brand.name.slice(0, 2).toUpperCase() || 'AI'}</span>
          <span>{brand.name || 'Untitled project'}</span>
          <span className="chevron">⌄</span>
        </button>

        <nav className="stage-nav" aria-label="Workflow stages">
          <div className="side-label">Build sequence</div>
          {stages.map((item) => (
            <button
              key={item.id}
              className={`stage-link ${stage === item.id ? 'active' : ''} ${brand.approved[item.id] ? 'complete' : ''}`}
              onClick={() => started && setStage(item.id)}
              type="button"
            >
              <span className="stage-number">{brand.approved[item.id] ? '✓' : item.number}</span>
              <span>{item.label}</span>
              {stage === item.id && <span className="active-dot" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="side-label">System status</div>
          <div className="status">
            <span /> {session?.user?.email ? 'Supabase session active' : 'Local intelligence ready'}
          </div>

          <button
            className="quiet-button"
            type="button"
            onClick={() => {
              setStarted(false)
              setShowDashboard(false)
              setBrand(blankBrand)
              setStage('discovery')
              setPage('landing')
            }}
          >
            ← Back to home
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> {brand.name || 'Untitled project'}
          </div>

          <div className="top-actions">
            <span className="autosave">● Saved just now</span>
            <button
              className="icon-button"
              aria-label="Help"
              onClick={() => setNotice({ type: 'info', message: 'Review each stage, edit the approved context, and continue when the system feels right.' })}
              type="button"
            >
              ?
            </button>
            <button
              className="avatar"
              aria-label="Account"
              onClick={() => setNotice({ type: 'info', message: session?.user?.email ? `Signed in as ${session.user.email}` : 'This local demo is not connected to a live account.' })}
              type="button"
            >
              {session?.user?.email ? session.user.email.slice(0, 2).toUpperCase() : 'JD'}
            </button>
            {session && (
              <button className="ghost-button small" onClick={handleLogout} type="button">
                Log out
              </button>
            )}
          </div>
        </header>

        {page === 'dashboard' || showDashboard ? (
          <Dashboard brand={brand} copyKit={copyKit} notice={notice} setShowDashboard={setShowDashboard} onBackToWorkspace={() => setPage('workspace')} />
        ) : (
          <Workflow
            stage={stage}
            brand={brand}
            update={updateBrand}
            next={nextStage}
            copyKit={copyKit}
            notice={notice}
            setStage={setStage}
            setShowDashboard={(value) => {
              setShowDashboard(value)
              if (value) setPage('dashboard')
              else setPage('workspace')
            }}
          />
        )}
      </main>
    </div>
  )
}

function InkloomLanding({ onOpenWorkspace, onOpenAuth }: { onOpenWorkspace: () => void; onOpenAuth: (mode: AuthMode) => void }) {
  return (
    <div className="inkloom-page">
      <header className="landing-header">
        <div className="container nav-wrap">
          <div className="inkloom-brand">
            <span className="brand-icon">◒</span> Inkloom
          </div>

          <nav className="landing-nav" aria-label="Main navigation">
            <a href="#product">Product</a>
            <a href="#features">Features</a>
            <a href="#workflow">How it works</a>
            <a href="#about">About</a>
          </nav>

          <div className="nav-actions">
            <button className="ghost-button" type="button" onClick={() => onOpenAuth('signin')}>
              Sign In
            </button>
            <button className="primary-button" type="button" onClick={() => onOpenAuth('signup')}>
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="eyebrow-line" /> AI innovation studio
              </div>
              <h1>Turn your ideas into real innovations.</h1>
              <p>
                Inkloom helps students, founders, and research teams turn rough problem statements into validated
                opportunities, clear business models, technical blueprints, and launch-ready strategy.
              </p>

              <div className="cta-row">
                <button className="primary-button" type="button" onClick={onOpenWorkspace}>
                  Start Building
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Explore How It Works
                </button>
              </div>

              <div className="mini-metrics">
                <div>
                  <strong>AI-guided</strong>
                  <span>Workflow</span>
                </div>
                <div>
                  <strong>Structured</strong>
                  <span>Decision making</span>
                </div>
                <div>
                  <strong>Actionable</strong>
                  <span>Roadmaps</span>
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="glass-panel">
                <div className="panel-top">
                  <span className="dot red" />
                  <span className="dot amber" />
                  <span className="dot green" />
                </div>

                <div className="preview-card">
                  <div className="preview-badge">Inkloom Studio</div>
                  <h3>Customer problem</h3>
                  <p>Teams lose critical context across meetings, docs, and research notes.</p>

                  <div className="preview-grid">
                    <div>
                      <span className="metric-label">Users</span>
                      <strong>2–8 teams</strong>
                    </div>
                    <div>
                      <span className="metric-label">Focus</span>
                      <strong>Decision clarity</strong>
                    </div>
                  </div>

                  <div className="progressbar">
                    <span style={{ width: '78%' }} />
                  </div>

                  <div className="preview-footer">
                    <span>Opportunity score</span>
                    <strong>78%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container landing-section" id="product">
          <div className="section-heading">
            <span className="eyebrow-line" /> Problem to product
          </div>
          <h2>From raw ideas to validated innovation systems.</h2>

          <div className="two-col-grid">
            <div className="feature-card large">
              <h3>What Inkloom changes</h3>
              <p>
                Instead of one-off AI prompts, Inkloom keeps the reasoning visible across discovery, customer analysis,
                value proposition, technical architecture, and business planning.
              </p>
            </div>
            <div className="feature-card">
              <h3>Built for real momentum</h3>
              <p>
                Academic teams, startups, and researchers can move from idea to measurable plan without losing context
                or producing generic strategy decks.
              </p>
            </div>
          </div>
        </section>

        <section className="container landing-section" id="features">
          <div className="section-heading">
            <span className="eyebrow-line" /> Platform capabilities
          </div>
          <h2>Everything your next innovation project needs.</h2>

          <div className="feature-grid">
            <FeatureItem
              title="AI innovation studio"
              description="Capture the problem, model user needs, and sharpen the opportunity with guided conversation."
            />
            <FeatureItem
              title="Business model canvas"
              description="Map customer segments, revenue assumptions, partnerships, and cost structures in one place."
            />
            <FeatureItem
              title="Technical architecture"
              description="Translate concepts into system design, data flows, integrations, and implementation choices."
            />
            <FeatureItem
              title="Roadmaps & exports"
              description="Turn decisions into milestones, documents, and shareable planning artifacts."
            />
          </div>
        </section>

        <section className="container landing-section" id="workflow">
          <div className="section-heading">
            <span className="eyebrow-line" /> AI workflow
          </div>
          <h2>Structured stages, not a single generic answer.</h2>

          <div className="workflow-demo">
            <div className="demo-stage">
              <span>01</span>
              <h3>Discovery</h3>
              <p>Clarify the problem, assumptions, stakeholders, and open questions.</p>
            </div>
            <div className="demo-stage">
              <span>02</span>
              <h3>Users</h3>
              <p>Identify target users, pain points, personas, and journeys.</p>
            </div>
            <div className="demo-stage">
              <span>03</span>
              <h3>Value</h3>
              <p>Define value proposition, solution concepts, and MVP direction.</p>
            </div>
            <div className="demo-stage">
              <span>04</span>
              <h3>Metrics</h3>
              <p>Translate goals into realistic outcomes and acceptance criteria.</p>
            </div>
            <div className="demo-stage">
              <span>05</span>
              <h3>Technology</h3>
              <p>Assess AI, data, and architecture needs.</p>
            </div>
            <div className="demo-stage">
              <span>06</span>
              <h3>Canvas</h3>
              <p>Convert the opportunity into a business model canvas.</p>
            </div>
          </div>
        </section>

        <section className="container landing-section" id="about">
          <div className="section-heading">
            <span className="eyebrow-line" /> Use cases
          </div>
          <h2>Designed for student, startup, and research teams.</h2>

          <div className="use-case-grid">
            <div className="case-card">
              <h3>Student teams</h3>
              <p>Move from class projects and hackathons into a structured innovation process with researchable assumptions.</p>
            </div>
            <div className="case-card">
              <h3>Founders</h3>
              <p>Validate customer pain, sharpen product narratives, and organize technical priorities before launch.</p>
            </div>
            <div className="case-card">
              <h3>Researchers</h3>
              <p>Frame problem statements, map constraints, and define the path from concept to testable prototype.</p>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="container cta-panel">
            <div>
              <span className="eyebrow-line" /> Ready to build
              <h2>Bring your next idea from conversation to clarified execution.</h2>
            </div>
            <div className="cta-actions">
              <button className="primary-button" type="button" onClick={onOpenWorkspace}>
                Start Building
              </button>
              <button className="ghost-button light" type="button" onClick={() => onOpenAuth('signup')}>
                Create an account
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="container footer-grid">
          <div>
            <div className="inkloom-brand">
              <span className="brand-icon">◒</span> Inkloom
            </div>
            <p>AI-powered product innovation for teams building real-world outcomes.</p>
          </div>

          <div>
            <h4>Product</h4>
            <a href="#product">Overview</a>
            <a href="#features">Features</a>
            <a href="#workflow">Workflow</a>
          </div>

          <div>
            <h4>Company</h4>
            <a href="#about">About</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>

          <div>
            <h4>Contact</h4>
            <a href="mailto:hello@inkloom.example">hello@inkloom.example</a>
            <a href="#">Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <article className="feature-card">
      <div className="feature-icon">✦</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  )
}

function AuthPage({
  mode,
  onToggleMode,
  form,
  onFieldChange,
  isSubmitting,
  notice,
  onSubmit,
  onBackToHome,
  onContinueToWorkspace,
}: {
  mode: AuthMode
  onToggleMode: (mode: AuthMode) => void
  form: { name: string; email: string; password: string }
  onFieldChange: (key: 'name' | 'email' | 'password', value: string) => void
  isSubmitting: boolean
  notice: ToastState
  onSubmit: (event: FormEvent) => void
  onBackToHome: () => void
  onContinueToWorkspace: () => void
}) {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-panel copy">
          <div className="auth-brand">
            <span className="brand-icon">◒</span> Inkloom
          </div>
          <h1>{mode === 'signin' ? 'Welcome back.' : 'Create your workspace.'}</h1>
          <p>
            {mode === 'signin'
              ? 'Sign in to continue building and managing your innovation projects.'
              : 'Start with your name, role, and innovation goals to personalize your onboarding flow.'}
          </p>
          <ul>
            <li>Workspace-based project planning</li>
            <li>AI-assisted strategy and technical design</li>
            <li>Shareable product artifacts</li>
          </ul>
        </div>

        <div className="auth-panel form-panel">
          <div className="toggle-row">
            <button type="button" className={mode === 'signin' ? 'toggle active' : 'toggle'} onClick={() => onToggleMode('signin')}>
              Sign In
            </button>
            <button type="button" className={mode === 'signup' ? 'toggle active' : 'toggle'} onClick={() => onToggleMode('signup')}>
              Sign Up
            </button>
          </div>

          <form className="auth-form" onSubmit={onSubmit}>
            {mode === 'signup' && (
              <label>
                Full name
                <input value={form.name} onChange={(event) => onFieldChange('name', event.target.value)} type="text" />
              </label>
            )}

            <label>
              {mode === 'signup' ? 'Email' : 'Email'}
              <input
                value={form.email}
                onChange={(event) => onFieldChange('email', event.target.value)}
                type="email"
              />
            </label>

            {mode === 'signup' && (
              <label>
                Role
                <select defaultValue="Founder">
                  <option>Student</option>
                  <option>Researcher</option>
                  <option>Founder</option>
                  <option>Engineer</option>
                  <option>Other</option>
                </select>
              </label>
            )}

            <label>
              Password
              <input value={form.password} onChange={(event) => onFieldChange('password', event.target.value)} type="password" />
            </label>

            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait...' : mode === 'signin' ? 'Continue to workspace' : 'Create account'}
            </button>

            <button className="ghost-button" type="button" onClick={onContinueToWorkspace}>
              Continue as guest
            </button>

            <button className="ghost-button" type="button" onClick={onBackToHome}>
              Back to home
            </button>
          </form>

          {notice && <p className={`toast toast-${notice.type}`}>{notice.message}</p>}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label>{label}{children}</label>
}

function Workflow({
  stage,
  brand,
  update,
  next,
  copyKit,
  notice,
  setStage,
  setShowDashboard,
}: {
  stage: Stage
  brand: BrandState
  update: (key: keyof BrandState, value: string | boolean | string[]) => void
  next: () => void
  copyKit: () => void
  notice: ToastState
  setStage: (stage: Stage) => void
  setShowDashboard: (show: boolean) => void
}) {
  const current = stages.find((item) => item.id === stage)!
  const progress = Math.round(((stages.findIndex((item) => item.id === stage) + 1) / stages.length) * 100)

  return (
    <div className="workflow page-enter">
      <div className="workflow-head">
        <div>
          <div className="eyebrow small">
            <span className="eyebrow-line" /> STAGE {current.number} / 08
          </div>
          <h1>
            {current.label}
            <i>.</i>
          </h1>
          <p className="stage-kicker">
            {current.kicker} <span>·</span> AI-assisted, human-approved
          </p>
        </div>

        <div className="completion">
          <strong>{progress}%</strong>
          <span>through your build</span>
          <div className="progress">
            <i style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <StageContent stage={stage} brand={brand} update={update} setStage={setStage} />
      <ReasoningTrace stage={stage} brand={brand} />

      <div className="workflow-footer">
        <span className="human-note">✦ Your decisions shape every stage that follows.</span>
        {stage === 'launch' ? (
          <div className="footer-actions">
            <button className="outline-button" onClick={() => setShowDashboard(true)} type="button">
              View final dashboard →
            </button>
            <button className="primary-button" onClick={copyKit} type="button">
              Copy brand snapshot <span>↗</span>
            </button>
          </div>
        ) : (
          <button className="primary-button" onClick={next} type="button">
            Approve & continue <span>→</span>
          </button>
        )}
      </div>

      {notice && <p className={`toast toast-${notice.type}`}>{notice.message}</p>}
    </div>
  )
}

function StageContent({ stage, brand, update, setStage }: { stage: Stage; brand: BrandState; update: (key: keyof BrandState, value: string | boolean | string[]) => void; setStage: (stage: Stage) => void }) {
  if (stage === 'discovery') {
    return (
      <div className="stage-grid">
        <Card label="DISCOVERY AGENT" status="● complete">
          <h2>Here is what we heard.</h2>
          <p className="card-lede">The raw idea points to a sharper opportunity than a generic category label.</p>
          <div className="insight-list">
            <Insight label="Core problem" value={brand.problem} />
            <Insight label="Primary audience" value={brand.audience} />
            <Insight label="User context" value={`They are trying to make progress with ${brand.idea.toLowerCase() || 'their idea'}.`} />
          </div>
        </Card>

        <Card label="REVIEW & EDIT" status="Human control">
          <Field label="Core problem">
            <textarea value={brand.problem} onChange={(event) => update('problem', event.target.value)} rows={3} />
          </Field>
          <Field label="Primary audience">
            <textarea value={brand.audience} onChange={(event) => update('audience', event.target.value)} rows={3} />
          </Field>
          <div className="question">
            <span>?</span>
            <div>
              <strong>One question worth answering</strong>
              <p>What changes for the audience if this problem stays unresolved?</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (stage === 'strategy') {
    return (
      <div className="stage-grid">
        <Card label="POSITIONING AGENT" status="Strategy lens" dark>
          <p className="big-statement">
            For <mark>{brand.audience}</mark>, {brand.name || 'this company'} is a <mark>{brand.category || 'category'}</mark>
            {' '}that helps them solve <mark>{brand.problem.toLowerCase() || 'their challenge'}</mark>.
          </p>
          <div className="strategy-row">
            <Insight label="Category" value={brand.category} />
            <Insight label="Differentiator" value={brand.differentiator} />
          </div>
        </Card>

        <Card label="REASON TO BELIEVE">
          <ul className="reason-list">
            <li>Built around the audience's stated context.</li>
            <li>Responds directly to the problem, not a vague trend.</li>
            <li>Uses {brand.selectedTrait.toLowerCase()} language instead of hype.</li>
          </ul>
          <button className="outline-button" onClick={() => setStage('discovery')} type="button">
            ← Refine discovery
          </button>
        </Card>
      </div>
    )
  }

  if (stage === 'personality') {
    return (
      <Card label="PERSONALITY AGENT" status="Choose what to amplify">
        <h2>A brand with a point of view.</h2>
        <div className="trait-grid">
          {[
            ['Clear-eyed', 'Makes complexity feel legible.'],
            ['Warmly direct', 'Gets to the useful truth quickly.'],
            ['Quietly optimistic', 'Believes progress can feel good.'],
          ].map(([name, reason]) => {
            const selected = brand.traits.includes(name)

            return (
              <button
                className={`trait ${selected ? 'trait-selected' : ''}`}
                key={name}
                type="button"
                onClick={() => {
                  const traits = selected ? brand.traits.filter((trait) => trait !== name) : [...brand.traits, name]
                  update('selectedTrait', name)
                  update('traits', traits.length ? traits : [name])
                }}
              >
                <div className="trait-top">
                  <span className="trait-symbol">✦</span>
                  <h3>{name}</h3>
                  {selected && <span className="selected">Selected</span>}
                </div>
                <p>{reason}</p>
                <small>Never cold, vague, or over-familiar.</small>
              </button>
            )
          })}
        </div>

        <div className="avoid-row">
          <strong>Traits to avoid</strong>
          <span>Corporate polish</span>
          <span>Productivity guilt</span>
          <span>Performative cleverness</span>
        </div>
      </Card>
    )
  }

  if (stage === 'naming') {
    const seed = brand.idea.split(/\W+/).filter((word) => word.length > 4)[0] || 'clear'
    const names = [`${seed.charAt(0).toUpperCase()}${seed.slice(1)}well`, 'Relaynote', 'Loomwork']

    return (
      <Card label="NAMING ENGINE" status="3 strategic territories">
        <div className="name-grid">
          {names.map((name, index) => (
            <button className={`name-option ${brand.name === name ? 'chosen' : ''}`} key={name} onClick={() => update('name', name)} type="button">
              <span className="name-index">0{index + 1}</span>
              <h2>{name}</h2>
              <span className="territory">{['Descriptive', 'Functional', 'Craft / community'][index]}</span>
              <p>
                {index === 0
                  ? `Connects to the idea's ${seed} territory.`
                  : index === 1
                    ? 'Suggests passing insight forward.'
                    : 'Signals patient, connected making.'}
              </p>
              <small>Watch for: {index === 0 ? 'Needs category context.' : 'Check distinctiveness externally.'}</small>
              {brand.name === name && <b>✓ selected</b>}
            </button>
          ))}
        </div>

        <Field label="Selected name">
          <input value={brand.name} onChange={(event) => update('name', event.target.value)} />
        </Field>
      </Card>
    )
  }

  if (stage === 'visual') {
    return (
      <div className="stage-grid">
        <Card label="VISUAL DIRECTION" status="Built from personality">
          <div className="color-row">
            <span className="swatch ink" />
            <span className="swatch coral" />
            <span className="swatch moss" />
            <span className="swatch paper" />
          </div>
          <h2>{brand.visualMood || 'Signal, not spectacle.'}</h2>
          <p className="card-lede">
            The visual system should make {brand.audience.toLowerCase() || 'the audience'} feel {brand.selectedTrait.toLowerCase() || 'clear'}, capable, and ready to act.
          </p>
          <div className="visual-tags">
            <span>Humanist sans</span>
            <span>Soft geometry</span>
            <span>Intentional whitespace</span>
          </div>
        </Card>

        <Card label="DIRECTION NOTES">
          <div className="detail">
            <strong>Typography</strong>
            <p>Confident grotesk for headlines, generous reading rhythm for the reasoning.</p>
          </div>
          <div className="detail">
            <strong>Imagery</strong>
            <p>Show the real context of {brand.problem.toLowerCase() || 'the problem'}, not abstract innovation.</p>
          </div>
          <div className="detail">
            <strong>Avoid</strong>
            <p>Neon gradients, dashboard clichés, and language that outshouts the idea.</p>
          </div>
        </Card>
      </div>
    )
  }

  if (stage === 'critic') {
    const flags = detectGeneric(brand)
    const issues = brand.issueResolved
      ? [['Low', 'Proof gap', `Make sure the product experience proves the ${brand.selectedTrait.toLowerCase()} promise.`]]
      : [
          ['High', 'Differentiation', `${brand.category || 'This category'} is useful but familiar. Show the first-use moment where ${brand.audience.toLowerCase()} gets a better outcome.`],
          ['Medium', 'Name stretch', `${brand.name || 'The name'} needs the tagline and first-run experience to teach its connection to ${brand.problem.toLowerCase()}.`],
          ...flags.map((flag) => ['Medium', `Generic phrase: “${flag.phrase}”`, `${flag.reason} Try this instead: ${flag.alternative}`]),
        ]

    return (
      <Card label="AI CRITIC" status={brand.issueResolved ? '1 tension remaining' : `${issues.length} tensions found`}>
        <div className="critic-intro">
          <h2>{brand.issueResolved ? 'The main tension is resolved.' : 'Strong bones. A few things to challenge.'}</h2>
          <p>The critic checks the submitted strategy and wording, then explains what should change instead of praising the output.</p>
        </div>

        {issues.map(([severity, category, text]) => (
          <div className="issue" key={category}>
            <span className={`severity ${String(severity).toLowerCase()}`}>{severity}</span>
            <div>
              <strong>{category}</strong>
              <p>{text}</p>
            </div>
            <button onClick={() => update('issueResolved', true)} type="button">
              Resolve →
            </button>
          </div>
        ))}
      </Card>
    )
  }

  if (stage === 'consistency') {
    const score = brand.issueResolved ? 94 : 82

    return (
      <Card label="CONSISTENCY GUARDIAN" status="Cross-system check">
        <div className="score-row">
          <div className="score">{score}</div>
          <div>
            <h2>{score > 90 ? 'One brand, all the way through.' : 'One brand, with one tension.'}</h2>
            <p>Strategy, personality, name, visual direction, and launch language are compared as a system.</p>
          </div>
        </div>

        <div className="check-grid">
          {[
            ['Positioning', 'pass', 'Audience and problem are explicit.'],
            ['Personality', 'pass', `${brand.selectedTrait || 'The chosen voice'} is reflected in the language.`],
            ['Naming', brand.name ? 'pass' : 'warning', brand.name ? `${brand.name} is carried into the launch kit.` : 'Choose a name before launch.'],
            ['Launch voice', brand.issueResolved ? 'pass' : 'warning', brand.issueResolved ? 'Generic claims removed.' : 'Review generic claims in the critic.'],
          ].map(([label, status, reason]) => (
            <div className="check" key={String(label)}>
              <span className={`check-status ${String(status)}`}>{String(status) === 'pass' ? '✓' : '!'}</span>
              <div>
                <strong>{String(label)}</strong>
                <p>{String(reason)}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          className="outline-button"
          onClick={() => {
            update('issueResolved', true)
            setStage('launch')
          }}
          type="button"
        >
          Fix automatically →
        </button>
      </Card>
    )
  }

  return (
    <div className="launch-grid">
      <section className="content-card launch-hero">
        <div className="card-label">
          LAUNCH KIT <span>Ready to use</span>
        </div>
        <h2>{brand.name}</h2>
        <input className="tagline-input" value={brand.tagline} onChange={(event) => update('tagline', event.target.value)} placeholder="Your tagline" />
        <div className="launch-quote">“{brand.tagline}”</div>
      </section>

      <section className="content-card launch-copy">
        <div className="copy-block">
          <span>LANDING HEADLINE</span>
          <strong>{brand.tagline}</strong>
        </div>
        <div className="copy-block">
          <span>ONE-LINE PITCH</span>
          <strong>
            {brand.name} is {brand.category.toLowerCase() || 'a focused solution'} for {brand.audience.toLowerCase() || 'the right audience'}.
          </strong>
        </div>
        <div className="copy-block">
          <span>FOUNDER PITCH</span>
          <strong>
            We help {brand.audience.toLowerCase() || 'customers'} solve {brand.problem.toLowerCase() || 'their challenge'} with a more {brand.selectedTrait.toLowerCase() || 'thoughtful'} approach.
          </strong>
        </div>
        <div className="copy-block">
          <span>QUALITY NOTE</span>
          <strong>{brand.issueResolved ? 'Critic tensions resolved and consistency checked.' : 'Run the AI critic before publishing this kit.'}</strong>
        </div>
      </section>
    </div>
  )
}

function ReasoningTrace({ stage, brand }: { stage: Stage; brand: BrandState }) {
  const current = stages.find((item) => item.id === stage)!
  const handoffs: Record<Stage, string> = {
    discovery: `Parsed audience and problem from “${brand.idea}”.`,
    strategy: `Used approved audience and problem to define ${brand.category}.`,
    personality: `Kept the tone ${brand.selectedTrait.toLowerCase()} to fit the audience context.`,
    naming: `Compared names against the ${brand.category.toLowerCase()} direction.`,
    visual: `Translated ${brand.selectedTrait.toLowerCase()} into a restrained visual system.`,
    critic: `Tested ${brand.name}, ${brand.tagline}, and the strategy for generic claims and weak proof.`,
    consistency: 'Compared the approved strategy, voice, name, visual direction, and launch language.',
    launch: 'Carried approved decisions into practical launch messages.',
  }

  return (
    <details className="reasoning-trace">
      <summary>
        <span>✦</span> Agent handoff <b>{current.label}</b>
        <em>structured context preserved</em>
      </summary>
      <p>{handoffs[stage]}</p>
      <div className="trace-fields">
        <span>idea</span>
        <span>audience</span>
        <span>problem</span>
        <span>approved decisions</span>
      </div>
    </details>
  )
}

function Dashboard({
  brand,
  copyKit,
  notice,
  setShowDashboard,
  onBackToWorkspace,
}: {
  brand: BrandState
  copyKit: () => void
  notice: ToastState
  setShowDashboard: (show: boolean) => void
  onBackToWorkspace: () => void
}) {
  const score = brand.issueResolved ? 94 : 82

  return (
    <div className="workflow page-enter">
      <div className="workflow-head">
        <div>
          <div className="eyebrow small">
            <span className="eyebrow-line" /> FINAL BRAND SYSTEM
          </div>
          <h1>
            {brand.name}
            <i>.</i>
          </h1>
          <p className="stage-kicker">
            Launch-ready overview <span>·</span> approved context, in one place
          </p>
        </div>
        <button className="primary-button" onClick={copyKit} type="button">
          Copy brand snapshot <span>↗</span>
        </button>
      </div>

      <div className="dashboard-grid">
        <Card label="BRAND OVERVIEW" status="Approved">
          <h2>{brand.tagline}</h2>
          <Insight label="Audience" value={brand.audience} />
          <Insight label="Category" value={brand.category} />
        </Card>

        <Card label="STRATEGY">
          <Insight label="Problem" value={brand.problem} />
          <Insight label="Differentiator" value={brand.differentiator} />
        </Card>

        <Card label="PERSONALITY">
          <div className="dashboard-traits">
            {brand.traits.map((trait) => (
              <span key={trait}>{trait}</span>
            ))}
          </div>
          <Insight label="Traits to avoid" value="Corporate polish, productivity guilt, performative cleverness" />
        </Card>

        <Card label="VISUAL IDENTITY">
          <div className="color-row">
            <span className="swatch ink" />
            <span className="swatch coral" />
            <span className="swatch moss" />
            <span className="swatch paper" />
          </div>
          <Insight label="Direction" value={brand.visualMood} />
        </Card>

        <Card label="QUALITY">
          <div className="quality-score">
            {score}
            <span>/100</span>
          </div>
          <p className="card-lede">
            {brand.issueResolved
              ? 'Critic tensions resolved. Strategy, personality, naming, visual direction, and launch voice are aligned.'
              : 'Open critic tensions remain. Resolve them before presenting this as launch-ready.'}
          </p>
        </Card>

        <Card label="LAUNCH">
          <div className="copy-block">
            <span>HEADLINE</span>
            <strong>{brand.tagline}</strong>
          </div>
          <div className="copy-block">
            <span>PITCH</span>
            <strong>
              {brand.name} is {brand.category.toLowerCase() || 'a focused solution'} for {brand.audience.toLowerCase() || 'the right audience'}.
            </strong>
          </div>
          <div className="copy-block">
            <span>NOTE</span>
            <strong>{brand.issueResolved ? 'Ready to share with stakeholders and early customers.' : 'Review the critic before publishing.'}</strong>
          </div>
        </Card>
      </div>

      {notice && <p className={`toast toast-${notice.type}`}>{notice.message}</p>}

      <div className="workflow-footer">
        <button className="outline-button" onClick={() => { setShowDashboard(false); onBackToWorkspace() }} type="button">
          ← Back to workflow
        </button>
      </div>
    </div>
  )
}

function Card({ label, status, dark, children }: { label: string; status?: string; dark?: boolean; children: ReactNode }) {
  return (
    <section className={`content-card ${dark ? 'dark-card' : ''} ${status ? 'feature-card' : 'full-card'}`}>
      <div className="card-label">
        {label} {status && <span>{status}</span>}
      </div>
      {children}
    </section>
  )
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="insight">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default App
