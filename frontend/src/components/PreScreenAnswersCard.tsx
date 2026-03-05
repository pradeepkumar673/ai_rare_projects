/**
 * PreScreenAnswersCard.tsx
 * ─────────────────────────
 * Displays the patient's pre-screen bot answers in the Doctor Dashboard
 * when a doctor opens a consultation case.
 *
 * Drop into: frontend/src/components/PreScreenAnswersCard.tsx
 *
 * Usage in DoctorDashboard.tsx case detail dialog:
 *
 *   import { PreScreenAnswersCard } from '@/components/PreScreenAnswersCard'
 *   ...
 *   {caseDetail.pre_screen_answers && (
 *     <PreScreenAnswersCard answers={caseDetail.pre_screen_answers} />
 *   )}
 */

import {
  Clock, Droplets, TrendingUp, Thermometer,
  Activity, Pill, Users, Sun, PlusCircle,
  MessageSquare, AlertTriangle, CheckCircle2,
  Bot, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PreScreenAnswers {
  lesion_duration:      string
  is_bleeding:          string
  size_changed:         string
  pain_level:           number
  pain_description:     string
  previous_treatment:   string
  family_history:       string
  recent_sun_exposure:  string
  other_symptoms:       string
  patient_concern:      string
  triage_flags:         string[]
  completed_at:         string
}

interface PreScreenAnswersCardProps {
  answers: PreScreenAnswers
  /** Patient's name for display */
  patientName?: string
  /** Compact mode for the case list card */
  compact?: boolean
}

// ─── Helper: pain colour ──────────────────────────────────────────────────────

function painColour(level: number) {
  if (level === 0) return { bar: 'bg-green-400', text: 'text-green-700 dark:text-green-400', label: 'None' }
  if (level <= 3) return { bar: 'bg-green-400', text: 'text-green-700 dark:text-green-400', label: 'Mild' }
  if (level <= 6) return { bar: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-400', label: 'Moderate' }
  if (level <= 8) return { bar: 'bg-orange-400', text: 'text-orange-700 dark:text-orange-400', label: 'Severe' }
  return { bar: 'bg-red-500', text: 'text-red-700 dark:text-red-400', label: 'Critical' }
}

function AnswerRow({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType
  label: string
  value: string
  highlight?: boolean
}) {
  if (!value || value === '—') return null
  return (
    <div className={`flex gap-3 p-3 rounded-xl border transition-colors ${
      highlight
        ? 'border-red-200 bg-red-50/60 dark:border-red-800/50 dark:bg-red-950/10'
        : 'border-transparent bg-muted/30 hover:bg-muted/50'
    }`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
        highlight ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted'
      }`}>
        <Icon className={`w-3.5 h-3.5 ${highlight ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={`text-sm mt-0.5 font-medium leading-snug ${highlight ? 'text-red-700 dark:text-red-400' : 'text-foreground'}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function PreScreenAnswersCard({ answers, patientName, compact = false }: PreScreenAnswersCardProps) {
  const [expanded, setExpanded] = useState(!compact)
  const pain = painColour(answers.pain_level)
  const hasFlags = answers.triage_flags && answers.triage_flags.length > 0
  const isBleedingHighlight = answers.is_bleeding === 'Yes'
  const isSizeWorsen = answers.size_changed?.includes('getting worse') || answers.size_changed?.includes('worse')
  const isHighPain = answers.pain_level >= 7

  const completedAt = answers.completed_at
    ? new Date(answers.completed_at).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b cursor-pointer select-none hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm flex items-center gap-2">
              Pre-Screen Bot Answers
              {hasFlags && (
                <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                  {answers.triage_flags.length} flag{answers.triage_flags.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {patientName ? `${patientName} · ` : ''}
              {completedAt ? `Completed ${completedAt}` : 'Patient self-reported'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!expanded && (
            <span className="text-xs text-muted-foreground">
              Pain: <span className={`font-semibold ${pain.text}`}>{answers.pain_level}/10</span>
            </span>
          )}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          }
        </div>
      </div>

      {expanded && (
        <div className="p-5 space-y-4">
          {/* Triage flags */}
          {hasFlags && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-950/10 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">Priority Clinical Flags</p>
              </div>
              <div className="space-y-1.5">
                {answers.triage_flags.map((flag, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    {flag}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pain meter */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Pain / Discomfort Level</p>
              </div>
              <span className={`text-lg font-display font-bold ${pain.text}`}>
                {answers.pain_level}/10 <span className="text-sm font-normal">{pain.label}</span>
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pain.bar}`}
                style={{ width: `${(answers.pain_level / 10) * 100}%` }}
              />
            </div>
            {answers.pain_description && answers.pain_description !== '—' && (
              <p className="text-xs text-muted-foreground mt-2">
                Character: <span className="text-foreground">{answers.pain_description}</span>
              </p>
            )}
          </div>

          {/* Answer rows */}
          <div className="space-y-2">
            <AnswerRow
              icon={Clock}
              label="Duration of Symptom / Lesion"
              value={answers.lesion_duration}
            />
            <AnswerRow
              icon={Droplets}
              label="Bleeding / Discharge"
              value={answers.is_bleeding}
              highlight={isBleedingHighlight}
            />
            <AnswerRow
              icon={TrendingUp}
              label="Symptom Progression"
              value={answers.size_changed}
              highlight={isSizeWorsen}
            />
            <AnswerRow
              icon={Pill}
              label="Previous Treatment / Medication"
              value={answers.previous_treatment}
            />
            <AnswerRow
              icon={Users}
              label="Family History"
              value={answers.family_history}
              highlight={answers.family_history === 'Yes'}
            />
            <AnswerRow
              icon={Sun}
              label="Environmental / UV Exposure"
              value={answers.recent_sun_exposure}
            />
            <AnswerRow
              icon={PlusCircle}
              label="Additional Symptoms"
              value={answers.other_symptoms}
              highlight={
                answers.other_symptoms?.includes('weight loss') ||
                answers.other_symptoms?.includes('lymph')
              }
            />
          </div>

          {/* Patient's own words */}
          {answers.patient_concern && answers.patient_concern !== '—' && (
            <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-teal-600" />
                <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wide">Patient's Own Words</p>
              </div>
              <p className="text-sm text-foreground leading-relaxed italic">"{answers.patient_concern}"</p>
            </div>
          )}

          {/* Completion note */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
            Pre-screen completed by patient before consultation request. Answers have not been edited.
          </div>
        </div>
      )}
    </div>
  )
}
