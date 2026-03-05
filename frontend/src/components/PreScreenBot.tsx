/**
 * PreScreenBot.tsx
 * ─────────────────
 * Conversational pre-screen bot that collects clinical details
 * before a patient contacts a doctor.
 *
 * Drop into: frontend/src/components/PreScreenBot.tsx
 *
 * Usage in DiagnosisResult.tsx — replace the direct "Contact Specialist"
 * buttons with:
 *
 *   import { PreScreenBot } from './PreScreenBot'
 *   ...
 *   {showPreScreen && (
 *     <PreScreenBot
 *       diagnosisResult={result}
 *       consultType={pendingConsultType}
 *       onComplete={(answers) => {
 *         setShowPreScreen(false)
 *         startConsultationWithAnswers(pendingConsultType, answers)
 *       }}
 *       onCancel={() => setShowPreScreen(false)}
 *     />
 *   )}
 */

import { useState, useRef, useEffect } from 'react'
import {
  Bot, User, Send, Loader2, CheckCircle,
  AlertTriangle, Clock, Thermometer, Ruler, Droplets,
  ChevronRight, X, Activity, MessageSquare,
} from 'lucide-react'

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
  // computed
  triage_flags:         string[]
  completed_at:         string
}

interface DiagnosisResultSnapshot {
  top_diseases: Array<{ name: string; probability: number }>
  risk_level:   string
  urgency:      string
  confidence:   number
  case_id?:     string
}

interface PreScreenBotProps {
  diagnosisResult:  DiagnosisResultSnapshot
  consultType:      'video' | 'voice' | 'chat'
  onComplete:       (answers: PreScreenAnswers) => void
  onCancel:         () => void
}

// ─── Question definition ──────────────────────────────────────────────────────

type InputType = 'text' | 'yesno' | 'scale' | 'multiselect' | 'textarea'

interface Question {
  id:          keyof PreScreenAnswers
  message:     string
  inputType:   InputType
  options?:    string[]
  scaleMax?:   number
  scaleLabel?: [string, string]
  hint?:       string
  required:    boolean
}

// Questions are personalised based on top disease
function buildQuestions(topDisease: string): Question[] {
  const isSkinDisease = /melanoma|carcinoma|scc|bcc|xeroderma|skin/i.test(topDisease)
  const isBleedingDisease = /hemophilia|sickle|amyloid|porphyria|hemorrhagic/i.test(topDisease)
  const isNeuro = /huntington|als|ataxia|stiff person|myasthenia|guillain|parkinson/i.test(topDisease)

  const base: Question[] = [
    {
      id: 'lesion_duration',
      message: isSkinDisease
        ? 'How long have you noticed this lesion or skin change?'
        : isNeuro
        ? 'How long have you been experiencing these symptoms?'
        : 'How long have you been experiencing your primary symptom?',
      inputType: 'multiselect',
      options: ['Less than 1 week', '1–4 weeks', '1–3 months', '3–6 months', 'More than 6 months', 'Over a year'],
      required: true,
    },
    {
      id: 'is_bleeding',
      message: isSkinDisease
        ? 'Is the lesion bleeding, oozing, or producing discharge?'
        : isBleedingDisease
        ? 'Have you experienced any unusual bleeding or bruising recently?'
        : 'Are you experiencing any bleeding or discharge related to your symptoms?',
      inputType: 'yesno',
      required: true,
    },
    {
      id: 'size_changed',
      message: isSkinDisease
        ? 'Has the lesion changed in size, shape, or colour recently?'
        : 'Have your symptoms changed or progressed recently?',
      inputType: 'multiselect',
      options: [
        'Yes — it is getting worse / larger',
        'Yes — it is improving',
        'No change',
        'Fluctuates / comes and goes',
      ],
      required: true,
    },
    {
      id: 'pain_level',
      message: 'On a scale of 0–10, how would you rate your current discomfort or pain?',
      inputType: 'scale',
      scaleMax: 10,
      scaleLabel: ['No pain', 'Worst pain'],
      required: true,
    },
    {
      id: 'pain_description',
      message: 'How would you describe the discomfort? Select all that apply.',
      inputType: 'multiselect',
      options: ['Burning', 'Itching / Pruritus', 'Sharp / Stabbing', 'Dull / Aching', 'Tingling / Numbness', 'None / No discomfort'],
      required: false,
    },
    {
      id: 'previous_treatment',
      message: 'Have you tried any treatment, medication, or home remedy for this? If yes, please describe briefly.',
      inputType: 'textarea',
      hint: 'E.g. "Applied steroid cream for 2 weeks with no improvement"',
      required: false,
    },
    {
      id: 'family_history',
      message: 'Do any first-degree family members (parents, siblings) have a similar condition or the AI-predicted disease?',
      inputType: 'yesno',
      required: true,
    },
    {
      id: 'recent_sun_exposure',
      message: isSkinDisease
        ? 'How would you describe your sun/UV exposure over the past year?'
        : 'Are there any environmental or lifestyle factors that seem to worsen your condition?',
      inputType: isSkinDisease ? 'multiselect' : 'textarea',
      options: isSkinDisease
        ? ['Minimal (mostly indoors)', 'Moderate (occasional outdoor work)', 'High (outdoor worker / tanning)', 'Very high (tropical / beach lifestyle)']
        : undefined,
      hint: isSkinDisease ? undefined : 'E.g. "heat, stress, certain foods, lack of sleep"',
      required: false,
    },
    {
      id: 'other_symptoms',
      message: 'Are you experiencing any other symptoms not listed in your original AI diagnosis form?',
      inputType: 'multiselect',
      options: ['Fever', 'Unexplained weight loss', 'Extreme fatigue', 'Night sweats', 'Swollen lymph nodes', 'None'],
      required: false,
    },
    {
      id: 'patient_concern',
      message: 'Finally — is there anything specific you are most worried about, or anything you want the doctor to know before the consultation?',
      inputType: 'textarea',
      hint: 'Your message goes directly to the specialist alongside your AI report.',
      required: false,
    },
  ]

  return base
}

// ─── Triage flag computation ──────────────────────────────────────────────────

function computeTriageFlags(answers: Partial<PreScreenAnswers>, riskLevel: string): string[] {
  const flags: string[] = []
  if (answers.is_bleeding === 'Yes') flags.push('🩸 Active bleeding reported')
  if ((answers.pain_level ?? 0) >= 8) flags.push('⚠️ Severe pain (≥8/10)')
  if (answers.size_changed?.includes('getting worse')) flags.push('📈 Rapidly worsening symptoms')
  if (answers.lesion_duration?.includes('Over a year') || answers.lesion_duration?.includes('3–6 months')) flags.push('⏱️ Long-standing condition')
  if (answers.other_symptoms?.includes('Unexplained weight loss')) flags.push('⚖️ Unexplained weight loss')
  if (answers.other_symptoms?.includes('Swollen lymph nodes')) flags.push('🔵 Lymphadenopathy noted')
  if (answers.family_history === 'Yes') flags.push('🧬 Positive family history')
  if (riskLevel === 'high') flags.push('🔴 AI: High risk classification')
  return flags
}

// ─── Bot message bubble ───────────────────────────────────────────────────────

function BotBubble({ message, isTyping }: { message: string; isTyping?: boolean }) {
  return (
    <div className="flex items-end gap-2 max-w-[88%]">
      <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center shrink-0 mb-1">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-muted-foreground px-1 flex items-center gap-1">
          <span className="text-teal-600 font-medium">RareDiag Assistant</span>
          <span className="text-muted-foreground/60">· AI Pre-Screen</span>
        </span>
        <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm">
          {isTyping ? (
            <div className="flex gap-1 items-center h-4">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          ) : message}
        </div>
      </div>
    </div>
  )
}

function PatientBubble({ message }: { message: string }) {
  return (
    <div className="flex items-end gap-2 max-w-[88%] ml-auto flex-row-reverse">
      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 mb-1">
        <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
      </div>
      <div className="flex flex-col gap-1 items-end">
        <span className="text-[10px] text-muted-foreground px-1">You</span>
        <div className="bg-teal-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-sm">
          {message}
        </div>
      </div>
    </div>
  )
}

// ─── Input widgets ─────────────────────────────────────────────────────────────

function YesNoInput({ onAnswer }: { onAnswer: (v: string) => void }) {
  return (
    <div className="flex gap-2 mt-2">
      {['Yes', 'No', 'Not sure'].map(opt => (
        <button
          key={opt}
          onClick={() => onAnswer(opt)}
          className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
            opt === 'Yes' ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400'
            : opt === 'No' ? 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/20 dark:text-teal-400'
            : 'border-border bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function ScaleInput({ max, labels, onAnswer }: { max: number; labels: [string, string]; onAnswer: (v: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const nums = Array.from({ length: max + 1 }, (_, i) => i)

  const getColor = (n: number) => {
    if (n === 0) return 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400'
    if (n <= 3) return 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/10 dark:border-green-800'
    if (n <= 6) return 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/10 dark:border-amber-800 dark:text-amber-400'
    if (n <= 8) return 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/10 dark:border-orange-800 dark:text-orange-400'
    return 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1 flex-wrap">
        {nums.map(n => (
          <button
            key={n}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onAnswer(n)}
            className={`w-9 h-9 rounded-xl border text-sm font-bold transition-all ${getColor(n)} ${hovered === n ? 'scale-110 shadow-md' : ''}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>0 — {labels[0]}</span>
        <span>{max} — {labels[1]}</span>
      </div>
    </div>
  )
}

function MultiSelectInput({ options, onAnswer }: { options: string[]; onAnswer: (v: string) => void }) {
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (opt: string) => {
    setSelected(prev =>
      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    )
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${
              selected.includes(opt)
                ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-600'
                : 'border-border bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <button
          onClick={() => onAnswer(selected.join(', '))}
          className="w-full py-2 rounded-xl bg-teal-600 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors mt-1"
        >
          Confirm selection <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function TextAreaInput({ hint, onAnswer }: { hint?: string; onAnswer: (v: string) => void }) {
  const [value, setValue] = useState('')

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={hint || 'Type your response here…'}
        rows={3}
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40 resize-none"
      />
      <button
        onClick={() => onAnswer(value || '—')}
        className="w-full py-2 rounded-xl bg-teal-600 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors"
      >
        <Send className="w-3.5 h-3.5" /> Send
      </button>
    </div>
  )
}

// ─── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Question {current} of {total}</span>
        <span>{pct}% complete</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-teal-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ChatLine {
  type: 'bot' | 'patient'
  text: string
}

export function PreScreenBot({ diagnosisResult, consultType, onComplete, onCancel }: PreScreenBotProps) {
  const topDisease = diagnosisResult.top_diseases?.[0]?.name ?? ''
  const questions = buildQuestions(topDisease)

  const [chatLog, setChatLog] = useState<ChatLine[]>([])
  const [currentQ, setCurrentQ] = useState(-1)   // -1 = intro
  const [isTyping, setIsTyping] = useState(false)
  const [answers, setAnswers] = useState<Partial<PreScreenAnswers>>({})
  const [done, setDone] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const consultLabel = { video: 'Video Call', voice: 'Voice Call', chat: 'Chat' }[consultType]

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatLog, isTyping])

  // Intro message on mount
  useEffect(() => {
    setIsTyping(true)
    const introLines = [
      `Hi! Before connecting you with a specialist for your **${consultLabel}**, I have a few quick clinical questions.`,
      `Your answers will be shared with the doctor alongside your AI diagnosis report for **${topDisease}**. This usually takes 2–3 minutes.`,
      `This helps your doctor understand your case before the consultation — no need to repeat everything from scratch. Ready?`,
    ]
    let delay = 600
    introLines.forEach((line, i) => {
      setTimeout(() => {
        setChatLog(prev => [...prev, { type: 'bot', text: line }])
        if (i === introLines.length - 1) {
          setIsTyping(false)
          setTimeout(() => advanceToQuestion(0), 400)
        }
      }, delay)
      delay += 900
    })
  }, [])

  function advanceToQuestion(index: number) {
    if (index >= questions.length) {
      finalise()
      return
    }
    setCurrentQ(index)
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setChatLog(prev => [...prev, { type: 'bot', text: questions[index].message }])
    }, 700)
  }

  function handleAnswer(qIndex: number, rawValue: string | number) {
    const q = questions[qIndex]
    const value = typeof rawValue === 'number' ? rawValue : rawValue
    const displayValue = typeof rawValue === 'number' ? `${rawValue}/10` : rawValue

    setChatLog(prev => [...prev, { type: 'patient', text: String(displayValue) }])
    setAnswers(prev => ({ ...prev, [q.id]: value }))

    // Typing + skip to next
    setCurrentQ(-2) // -2 = waiting
    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)
      // Contextual bot acknowledgement
      const ack = getAcknowledgement(q.id, String(rawValue))
      if (ack) {
        setChatLog(prev => [...prev, { type: 'bot', text: ack }])
        setTimeout(() => advanceToQuestion(qIndex + 1), 600)
      } else {
        advanceToQuestion(qIndex + 1)
      }
    }, 600)
  }

  function getAcknowledgement(qId: keyof PreScreenAnswers, value: string): string | null {
    if (qId === 'is_bleeding' && value === 'Yes') return '⚠️ Noted — this is important information for the doctor.'
    if (qId === 'pain_level' && parseInt(value) >= 8) return '😟 I\'m sorry to hear that. This will be flagged as a priority for the specialist.'
    if (qId === 'size_changed' && value.includes('getting worse')) return 'Understood — the doctor will be made aware of this progression.'
    if (qId === 'family_history' && value === 'Yes') return 'That\'s clinically significant — the doctor will see this in your profile.'
    return null
  }

  function finalise() {
    const flags = computeTriageFlags(answers, diagnosisResult.risk_level)
    const completeAnswers: PreScreenAnswers = {
      lesion_duration:     answers.lesion_duration    ?? '—',
      is_bleeding:         answers.is_bleeding         ?? '—',
      size_changed:        answers.size_changed        ?? '—',
      pain_level:          answers.pain_level as number ?? 0,
      pain_description:    answers.pain_description   ?? '—',
      previous_treatment:  answers.previous_treatment ?? '—',
      family_history:      answers.family_history     ?? '—',
      recent_sun_exposure: answers.recent_sun_exposure ?? '—',
      other_symptoms:      answers.other_symptoms     ?? '—',
      patient_concern:     answers.patient_concern    ?? '—',
      triage_flags:        flags,
      completed_at:        new Date().toISOString(),
    }

    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setChatLog(prev => [
        ...prev,
        {
          type: 'bot',
          text: `All done! ✅ I've sent your answers to the specialist along with your AI report. ${flags.length > 0 ? `I also flagged ${flags.length} clinical note(s) for priority review.` : ''} Connecting you now…`,
        },
      ])
      setDone(true)
      setTimeout(() => onComplete(completeAnswers), 1800)
    }, 700)
  }

  const activeQuestion = currentQ >= 0 ? questions[currentQ] : null

  return (
    <div className="rounded-2xl border bg-card overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-teal-50/50 dark:bg-teal-950/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">RareDiag Pre-Screen</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              AI Clinical Assistant · {consultLabel}
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-xl border flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* AI result summary strip */}
      <div className="flex items-center gap-4 px-5 py-3 bg-muted/40 border-b text-xs text-muted-foreground flex-wrap gap-y-1">
        <span className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-teal-500" />
          <span className="font-medium text-foreground">{topDisease}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${
            diagnosisResult.risk_level === 'high' ? 'bg-red-500' :
            diagnosisResult.risk_level === 'medium' ? 'bg-amber-500' : 'bg-green-500'
          }`} />
          {diagnosisResult.risk_level} risk
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3 text-violet-500" />
          {consultLabel} consultation
        </span>
      </div>

      {/* Progress */}
      {currentQ >= 0 && (
        <div className="px-5 pt-4">
          <ProgressBar current={currentQ + 1} total={questions.length} />
        </div>
      )}

      {/* Chat log */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
        {chatLog.map((line, i) =>
          line.type === 'bot'
            ? <BotBubble key={i} message={line.text} />
            : <PatientBubble key={i} message={line.text} />
        )}
        {isTyping && <BotBubble message="" isTyping />}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!done && activeQuestion && (
        <div className="px-5 pb-5 pt-2 border-t bg-background/80">
          {activeQuestion.inputType === 'yesno' && (
            <YesNoInput onAnswer={v => handleAnswer(currentQ, v)} />
          )}
          {activeQuestion.inputType === 'scale' && (
            <ScaleInput
              max={activeQuestion.scaleMax ?? 10}
              labels={activeQuestion.scaleLabel ?? ['Low', 'High']}
              onAnswer={v => handleAnswer(currentQ, v)}
            />
          )}
          {activeQuestion.inputType === 'multiselect' && (
            <MultiSelectInput
              options={activeQuestion.options ?? []}
              onAnswer={v => handleAnswer(currentQ, v)}
            />
          )}
          {activeQuestion.inputType === 'textarea' && (
            <TextAreaInput
              hint={activeQuestion.hint}
              onAnswer={v => handleAnswer(currentQ, v)}
            />
          )}
        </div>
      )}

      {done && (
        <div className="px-5 pb-5 pt-2 border-t flex items-center justify-center gap-2 text-sm text-teal-600 dark:text-teal-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Connecting you to a specialist…
        </div>
      )}
    </div>
  )
}
