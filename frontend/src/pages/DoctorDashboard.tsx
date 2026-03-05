import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, CheckCircle, XCircle, AlertTriangle, User, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PreScreenAnswersCard } from '@/components/PreScreenAnswersCard'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MorphingCardStack } from '@/components/ui/morphing-card-stack'
import { GlowingEffect } from '@/components/ui/glowing-effect'
import { CircleUniqueLoad } from '@/components/ui/circle-unique-load'
import { LocationTag } from '@/components/ui/location-tag'
import { consultationApi, type Consultation } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { cn, formatDate } from '@/lib/utils'
import { useSocket } from '@/hooks/useSocket'

export function DoctorDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { on } = useSocket()

  const [queue, setQueue] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Consultation | null>(null)
  const [accepting, setAccepting] = useState<string | null>(null)

  const fetchQueue = async () => {
    try {
      const { data } = await consultationApi.queue()
      // Sort high-risk first
      const sorted = [...data].sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 }
        return (order[a.risk_level as keyof typeof order] ?? 3) - (order[b.risk_level as keyof typeof order] ?? 3)
      })
      setQueue(sorted)
    } catch {
      // no-op for demo; in prod show error toast
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()
    // Refresh every 30s
    const interval = setInterval(fetchQueue, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Real-time new case notifications via Socket.IO
  useEffect(() => {
    const unsub = on<{ consultation: Consultation }>('new_case', ({ consultation }) => {
      setQueue((prev) => [consultation, ...prev])
    })
    return unsub
  }, [on])

  const acceptConsultation = async (id: string) => {
    setAccepting(id)
    try {
      await consultationApi.accept(id)
      navigate(`/consultation/${id}?type=${queue.find((c) => c.id === id)?.type ?? 'video'}`)
    } catch {
      alert('Failed to accept consultation.')
    } finally {
      setAccepting(null)
    }
  }

  const firstName = user?.name?.split(' ')[0]

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="text-3xl font-display font-semibold text-foreground">
            Dr. {firstName}
          </h1>
          {user?.specialty && (
            <p className="text-sm text-teal-600 dark:text-teal-400 mt-0.5">{user.specialty}</p>
          )}
        </div>
        <LocationTag city="Your Location" timezone={Intl.DateTimeFormat().resolvedOptions().timeZone} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Pending', value: queue.filter((c) => c.status === 'pending').length, color: 'text-amber-500' },
          { label: 'High Risk', value: queue.filter((c) => c.risk_level === 'high').length, color: 'text-red-500' },
          { label: 'Today', value: queue.filter((c) => new Date(c.created_at).toDateString() === new Date().toDateString()).length, color: 'text-teal-500' },
        ].map((s) => (
          <GlowingEffect key={s.label} className="rounded-2xl">
            <div className="rounded-2xl border bg-card p-5 text-center">
              <div className={`text-4xl font-display font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          </GlowingEffect>
        ))}
      </div>

      {/* Queue */}
      <h2 className="text-xl font-display font-semibold text-foreground mb-4">Triage Queue</h2>

      {loading ? (
        <div className="flex justify-center py-20">
          <CircleUniqueLoad size="lg" label="Loading queue…" />
        </div>
      ) : (
        <MorphingCardStack
          items={queue}
          renderCard={(consult, _, isStack) => (
            <CaseCard
              key={consult.id}
              consult={consult}
              isStack={isStack}
              onView={() => setSelected(consult)}
              onAccept={() => acceptConsultation(consult.id)}
              accepting={accepting === consult.id}
            />
          )}
        />
      )}

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-display">
                  Case Detail – {selected.patient_name ?? 'Patient'}
                </DialogTitle>
                <DialogDescription>
                  Full intake data and AI analysis for this case.
                </DialogDescription>
              </DialogHeader>
              <CaseDetail
                consult={selected}
                onAccept={() => { setSelected(null); acceptConsultation(selected.id) }}
                accepting={accepting === selected.id}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CaseCard({
  consult,
  isStack,
  onView,
  onAccept,
  accepting,
}: {
  consult: Consultation
  isStack: boolean
  onView: () => void
  onAccept: () => void
  accepting: boolean
}) {
  const riskVariant = consult.risk_level as 'high' | 'medium' | 'low'
  const initials = consult.patient_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'P'

  return (
    <GlowingEffect
      glowColor={consult.risk_level === 'high' ? 'rgba(239,68,68,0.1)' : undefined}
      className="rounded-2xl"
    >
      <div
        className={cn(
          'rounded-2xl border bg-card p-5 hover:shadow-lg transition-shadow',
          consult.risk_level === 'high' && 'border-red-200 dark:border-red-800',
          isStack && 'shadow-xl'
        )}
      >
        <div className="flex items-start gap-3 mb-4">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-teal-700 dark:text-teal-300">{initials}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-foreground truncate">
                {consult.patient_name ?? 'Anonymous Patient'}
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* ── Pre-screen flag count badge ── */}
                {consult.pre_screen_flags && consult.pre_screen_flags.length > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                    {consult.pre_screen_flags.length} flag{consult.pre_screen_flags.length !== 1 ? 's' : ''}
                  </span>
                )}
                <Badge variant={riskVariant}>{consult.risk_level}</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {consult.type?.toUpperCase()} · {formatDate(consult.created_at)}
            </p>
          </div>
        </div>

        {/* Main symptoms */}
        {consult.main_symptoms && consult.main_symptoms.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {consult.main_symptoms.slice(0, 3).map((s) => (
              <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {s}
              </span>
            ))}
            {consult.main_symptoms.length > 3 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                +{consult.main_symptoms.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Top AI diagnosis */}
        {consult.top_diagnosis && (
          <div className="flex items-center gap-1.5 mb-4 text-sm">
            <Activity className="w-3.5 h-3.5 text-teal-500" />
            <span className="text-muted-foreground">AI suggests:</span>
            <span className="font-medium text-foreground">{consult.top_diagnosis}</span>
          </div>
        )}

        {/* Image thumbnail */}
        {consult.image_thumbnail && (
          <img
            src={consult.image_thumbnail}
            alt="Case thumbnail"
            className="w-full h-24 object-cover rounded-xl mb-4"
          />
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onView} className="flex-1 gap-1.5">
            <Eye className="w-3.5 h-3.5" /> View
          </Button>
          <Button
            variant="teal"
            size="sm"
            onClick={onAccept}
            disabled={accepting}
            className="flex-1 gap-1.5"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {accepting ? 'Connecting…' : 'Accept'}
          </Button>
        </div>
      </div>
    </GlowingEffect>
  )
}

function CaseDetail({
  consult,
  onAccept,
  accepting,
}: {
  consult: Consultation
  onAccept: () => void
  accepting: boolean
}) {
  return (
    <div className="space-y-5 mt-2">
      {/* Patient info */}
      <div className="rounded-xl bg-muted/40 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{consult.patient_name ?? 'Anonymous'}</span>
          <Badge variant={(consult.risk_level as 'high' | 'medium' | 'low') ?? 'medium'}>
            {consult.risk_level ?? 'unknown'} risk
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Consultation type: <strong>{consult.type}</strong> · 
          Submitted: {formatDate(consult.created_at)}
        </p>
      </div>

      {/* Symptoms */}
      {consult.main_symptoms && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">Reported Symptoms</h4>
          <div className="flex flex-wrap gap-1.5">
            {consult.main_symptoms.map((s) => (
              <Badge key={s} variant="outline">{s}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* AI Top diagnosis */}
      {consult.top_diagnosis && (
        <div className="rounded-xl border p-4">
          <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-500" /> AI Top Prediction
          </h4>
          <p className="text-lg font-display font-semibold text-teal-600 dark:text-teal-400">
            {consult.top_diagnosis}
          </p>
        </div>
      )}

      {/* Image */}
      {consult.image_thumbnail && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">Medical Image</h4>
          <img src={consult.image_thumbnail} alt="Patient medical image" className="rounded-xl w-full" />
        </div>
      )}

      {/* ── Pre-screen bot answers ── */}
      {consult.pre_screen_answers && (
        <PreScreenAnswersCard
          answers={consult.pre_screen_answers}
          patientName={consult.patient_name ?? undefined}
        />
      )}

      {/* Urgency indicator */}
      {consult.risk_level === 'high' && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          This case is flagged as HIGH RISK by the AI. Urgent consultation recommended.
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="teal" onClick={onAccept} disabled={accepting} className="flex-1 gap-1.5">
          <CheckCircle className="w-4 h-4" />
          {accepting ? 'Connecting…' : 'Accept & Start Session'}
        </Button>
        <Button variant="outline" className="gap-1.5">
          <XCircle className="w-4 h-4" /> Decline
        </Button>
      </div>
    </div>
  )
}