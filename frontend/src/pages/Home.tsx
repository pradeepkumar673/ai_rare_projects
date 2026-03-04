import { useNavigate } from 'react-router-dom'
import { Activity, Brain, Shield, Users, Zap, ArrowRight, ChevronRight, Star } from 'lucide-react'
import { ResponsiveHeroBanner } from '@/components/ui/responsive-hero-banner'
import { GlowingEffect } from '@/components/ui/glowing-effect'

const PARTNERS = [
  'Mayo Clinic', 'NIH', 'WHO', 'Johns Hopkins', 'Stanford Medicine', 'Cleveland Clinic',
]

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Diagnosis',
    desc: 'Multi-modal ML models trained on rare disease datasets with SHAP-explained predictions.',
    color: 'text-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-950/20',
  },
  {
    icon: Activity,
    title: 'Real-time Monitoring',
    desc: 'Track symptom progression and receive urgency alerts when risk levels change.',
    color: 'text-teal-500',
    bg: 'bg-teal-50 dark:bg-teal-950/20',
  },
  {
    icon: Users,
    title: 'Specialist Network',
    desc: 'Connect with rare disease experts via video, voice, or chat consultations.',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
  },
  {
    icon: Shield,
    title: 'HIPAA Compliant',
    desc: 'End-to-end encrypted communications and secure, privacy-first data handling.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
  },
  {
    icon: Zap,
    title: 'Instant Results',
    desc: 'Receive a detailed diagnostic report in under 30 seconds with confidence scores.',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
  },
  {
    icon: Star,
    title: 'Rare Disease Focus',
    desc: 'Specialized knowledge graph covering 3,000+ rare diseases and phenotypes.',
    color: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/20',
  },
]

const STEPS = [
  { num: '01', title: 'Describe Symptoms', desc: 'Fill out our clinical intake form with your symptoms, history, and optional lab values.' },
  { num: '02', title: 'AI Analysis', desc: 'Our models run multi-modal analysis, knowledge graph reasoning, and SHAP attribution.' },
  { num: '03', title: 'Review Results', desc: 'Get ranked disease predictions with probability scores and urgency recommendations.' },
  { num: '04', title: 'Consult a Specialist', desc: 'If high-risk, connect with a board-certified specialist in real-time.' },
]

/** Hero visual – animated dashboard mock */
function HeroVisual() {
  return (
    <div className="w-full max-w-md">
      <div className="glass rounded-3xl p-6 border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white/60 text-xs font-mono">DIAGNOSIS REPORT</p>
            <p className="text-white font-display font-semibold">AI Analysis Complete</p>
          </div>
          <div className="ml-auto">
            <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-medium border border-red-500/30">
              HIGH RISK
            </span>
          </div>
        </div>

        {/* Top diseases */}
        <div className="space-y-3 mb-5">
          {[
            { name: 'Fabry Disease', prob: 78, color: 'bg-teal-500' },
            { name: 'Gaucher Disease', prob: 62, color: 'bg-teal-400' },
            { name: 'Niemann-Pick', prob: 41, color: 'bg-teal-300' },
          ].map((d) => (
            <div key={d.name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/80 font-medium">{d.name}</span>
                <span className="text-teal-300 font-mono">{d.prob}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full ${d.color} rounded-full transition-all duration-1000`}
                  style={{ width: `${d.prob}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="text-xs text-white/50">Confidence: <span className="text-white/80 font-medium">87%</span></div>
          <button className="text-xs flex items-center gap-1 text-teal-400 hover:text-teal-300 font-medium">
            Full report <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Floating notification card */}
      <div className="mt-3 glass rounded-2xl p-3 border border-white/10 flex items-center gap-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className="text-white/80 text-xs font-medium">Specialist available now</p>
          <p className="text-white/40 text-xs">Dr. Sarah Chen · Rare Disease</p>
        </div>
        <button className="ml-auto text-xs text-teal-400 font-medium hover:text-teal-300 shrink-0">
          Connect →
        </button>
      </div>
    </div>
  )
}

export function Home() {
  const navigate = useNavigate()

  return (
    <div>
      {/* Hero */}
      <ResponsiveHeroBanner
        badge="Powered by Advanced AI & Knowledge Graphs"
        headline={
          <>
            AI-Powered{' '}
            <span className="text-teal-400">Rare Disease</span>
            <br />
            Diagnosis &{' '}
            <span className="italic font-light">Telemedicine</span>
          </>
        }
        subheadline="Get AI-assisted diagnosis for rare conditions in under a minute. Connect with specialists worldwide for expert second opinions."
        actions={[
          {
            label: 'Get Diagnosed',
            onClick: () => navigate('/login?role=user'),
            icon: <Activity className="w-4 h-4" />,
          },
          {
            label: 'For Doctors',
            onClick: () => navigate('/login?role=doctor'),
            variant: 'outline',
            icon: <Users className="w-4 h-4" />,
          },
        ]}
        visual={<HeroVisual />}
      />

      {/* Partners / Trust signals */}
      <section id="partners" className="py-12 border-b bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-8">
            Trusted by researchers & institutions
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-50">
            {PARTNERS.map((p) => (
              <span key={p} className="text-sm font-display font-semibold text-foreground">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-display font-semibold text-foreground mb-4">
            Everything you need to{' '}
            <span className="text-teal-600 dark:text-teal-400">diagnose the rare</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            From symptom input to specialist consultation — a complete platform for rare disease care.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <GlowingEffect key={f.title} className="rounded-2xl">
              <div className="rounded-2xl border bg-card p-6 h-full hover:shadow-lg transition-shadow">
                <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="text-lg font-display font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </GlowingEffect>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-display font-semibold text-foreground mb-4">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground">Four steps from symptoms to answers.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-border z-0" style={{ width: 'calc(100% - 3rem)' }} />
                )}
                <div className="relative z-10">
                  <div className="text-4xl font-display font-bold text-teal-500/20 mb-3">{step.num}</div>
                  <h3 className="text-lg font-display font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-teal-600 to-teal-800">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl lg:text-5xl font-display font-semibold text-white mb-6">
            Ready to get answers?
          </h2>
          <p className="text-lg text-teal-100 max-w-xl mx-auto mb-10">
            Join thousands of patients and physicians using AI to tackle rare diseases.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-teal-700 font-semibold hover:bg-teal-50 transition-colors shadow-lg"
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/login?role=doctor')}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              I'm a doctor
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
