// src/components/DiagnosisResult.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  Download, Video, Phone, MessageCircle, ExternalLink,
  Info, AlertTriangle, Brain, FlaskConical, Network, CheckCircle2, XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { GlowingEffect } from '@/components/ui/glowing-effect'
import { FeedbackWidget } from '@/components/ui/feedback-widget'
import { type DiagnoseResponse, consultationApi, submitPreScreen } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PreScreenBot, type PreScreenAnswers } from './PreScreenBot'

interface DiagnosisResultProps {
  result: DiagnoseResponse
  onReset: () => void
}

const SHAP_COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1']

function parseReasoning(snippet: string): { label: string; text: string; icon: string }[] {
  if (!snippet) return []
  const sections: { label: string; text: string; icon: string }[] = []
  const lines = snippet.split('\n').filter(Boolean)
  for (const line of lines) {
    if (line.startsWith('Primary AI Prediction:')) {
      const [, ...rest] = line.split(':')
      sections.push({ label: 'Primary Prediction', text: rest.join(':').trim(), icon: 'brain' })
    } else if (line.startsWith('Matched Symptoms:')) {
      sections.push({ label: 'Symptom Match', text: line.replace('Matched Symptoms:', '').trim(), icon: 'flask' })
    } else if (line.startsWith('Key Diagnostic Criteria Met:')) {
      sections.push({ label: 'Criteria Met ✓', text: line.replace('Key Diagnostic Criteria Met:', '').trim(), icon: 'check' })
    } else if (line.startsWith('Note:')) {
      sections.push({ label: 'Clinical Note', text: line.replace('Note:', '').trim(), icon: 'info' })
    } else if (line.startsWith('Knowledge Graph Analysis:')) {
      sections.push({ label: 'Knowledge Graph', text: line.replace('Knowledge Graph Analysis:', '').trim(), icon: 'network' })
    } else if (line.startsWith('Disease Category:')) {
      sections.push({ label: 'Category', text: line.replace('Disease Category:', '').trim(), icon: 'info' })
    } else if (line.trim()) {
      if (sections.length > 0) {
        sections[sections.length - 1].text += ' ' + line.trim()
      } else {
        sections.push({ label: 'Analysis', text: line.trim(), icon: 'brain' })
      }
    }
  }
  return sections
}

function ReasoningIcon({ icon }: { icon: string }) {
  const cls = 'w-4 h-4 shrink-0 mt-0.5'
  switch (icon) {
    case 'brain':   return <Brain        className={`${cls} text-violet-500`} />
    case 'flask':   return <FlaskConical className={`${cls} text-teal-500`} />
    case 'network': return <Network      className={`${cls} text-blue-500`} />
    case 'check':   return <CheckCircle2 className={`${cls} text-emerald-500`} />
    case 'x':       return <XCircle      className={`${cls} text-red-500`} />
    default:        return <Info         className={`${cls} text-slate-400`} />
  }
}

export function DiagnosisResult({ result, onReset }: DiagnosisResultProps) {
  // ── FIX 1: all useState calls must be INSIDE the component ──
  const [consultLoading, setConsultLoading] = useState<string | null>(null)
  const [showPreScreen, setShowPreScreen]   = useState(false)
  const [pendingConsultType, setPendingConsultType] = useState<'video' | 'voice' | 'chat'>('chat')

  const { user } = useAuthStore()
  const navigate  = useNavigate()
  const { t }     = useTranslation()

  const gradcamUrl =
    result.gradcam_url ||
    (result.image_result?.overlay_b64
      ? `data:image/png;base64,${result.image_result.overlay_b64}`
      : undefined)

  const reasoningSections = parseReasoning(result.kg_reasoning_snippet)

  // Opens the pre-screen bot instead of going directly to the doctor
  const startConsultation = (type: 'video' | 'voice' | 'chat') => {
    setPendingConsultType(type)
    setShowPreScreen(true)
  }

  // Called when the bot finishes collecting answers
  const handlePreScreenComplete = async (answers: PreScreenAnswers) => {
    setShowPreScreen(false)
    try {
      await submitPreScreen(result.case_id, pendingConsultType, answers)
    } catch (e) {
      console.error('Pre-screen save failed', e)
    }
    // ── FIX 2: use consultationApi.request instead of undefined requestConsultation ──
    setConsultLoading(pendingConsultType)
    try {
      const { data } = await consultationApi.request(
        result.case_id ?? result.diagnosis_id,
        pendingConsultType
      )
      navigate(`/consultation/${data.consultation_id}`)
    } catch (e) {
      console.error('Consultation request failed', e)
    } finally {
      setConsultLoading(null)
    }
  }

  const downloadReport = () => {
    const urgencyMap: Record<string, string> = {
      immediate: t('results.urgency.immediate'),
      soon:      t('results.urgency.soon'),
      routine:   t('results.urgency.routine'),
    }
    const content = [
      'RAREDIAG AI DIAGNOSTIC REPORT',
      '==============================',
      `Generated: ${new Date().toLocaleString()}`,
      `Case ID: ${result.case_id}`,
      `Risk Level: ${result.risk_level.toUpperCase()}`,
      `Confidence: ${(result.confidence * 100).toFixed(0)}%`,
      '',
      'TOP DIAGNOSES:',
      ...result.top_diseases.map(
        (d, i) =>
          `${i + 1}. ${d.name} — ${(d.probability * 100).toFixed(0)}%` +
          `${d.icd_code ? ` (${d.icd_code})` : ''}` +
          `${d.description ? `\n   ${d.description}` : ''}`
      ),
      '',
      'URGENCY:',
      urgencyMap[result.urgency] ?? t('results.urgency.default'),
      '',
      'AI REASONING:',
      result.kg_reasoning_snippet,
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `rarediag-report-${result.case_id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getUrgencyLabel = (urgency: string) => {
    const map: Record<string, string> = {
      immediate: t('results.urgency.immediate'),
      soon:      t('results.urgency.soon'),
      routine:   t('results.urgency.routine'),
    }
    return map[urgency] ?? t('results.urgency.default')
  }

  const getImportanceLabel = (imp: number) => {
    if (imp >= 0.9)  return t('results.critical')
    if (imp >= 0.5)  return t('results.high')
    if (imp >= 0.15) return t('results.moderate')
    return t('results.low')
  }

  const isHighRisk   = result.risk_level === 'high'
  const riskVariant  = result.risk_level as 'high' | 'medium' | 'low'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-semibold text-foreground">
            {t('results.diagnosisResults')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('results.caseId')}: <span className="font-mono text-xs">{result.case_id}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant={riskVariant} className="text-sm px-3 py-1">
            {result.risk_level.toUpperCase()} {t('results.risk')}
          </Badge>
          <div className="text-sm text-muted-foreground">
            {t('results.aiConfidence')}:{' '}
            <span className="font-semibold text-foreground">
              {(result.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={downloadReport} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> {t('results.downloadReport')}
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset}>
            {t('results.newDiagnosis')}
          </Button>
        </div>
      </div>

      {/* Urgency banner */}
      <div
        className={`rounded-2xl p-4 flex items-start gap-3 border ${
          isHighRisk
            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
            : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
        }`}
      >
        <AlertTriangle
          className={`w-5 h-5 mt-0.5 shrink-0 ${isHighRisk ? 'text-red-500' : 'text-amber-500'}`}
        />
        <p
          className={`text-sm font-medium ${
            isHighRisk ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
          }`}
        >
          {getUrgencyLabel(result.urgency)}
        </p>
      </div>

      <Tabs defaultValue="diseases">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="diseases">{t('results.topDiseases')}</TabsTrigger>
          <TabsTrigger value="shap">{t('results.symptomAnalysis')}</TabsTrigger>
          <TabsTrigger value="reasoning">{t('results.aiReasoning')}</TabsTrigger>
          {gradcamUrl && <TabsTrigger value="imaging">{t('results.imaging')}</TabsTrigger>}
        </TabsList>

        {/* Top diseases */}
        <TabsContent value="diseases" className="mt-4">
          <div className="space-y-4">
            {result.top_diseases.slice(0, 5).map((disease, i) => (
              <GlowingEffect key={disease.name} className="rounded-2xl">
                <div className="rounded-2xl border bg-card p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-3xl font-display font-bold text-muted-foreground/30">
                          #{i + 1}
                        </span>
                        <div>
                          <h3 className="text-lg font-display font-semibold text-foreground">
                            {disease.name}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            {disease.icd_code && (
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                                {disease.icd_code}
                              </span>
                            )}
                            {(disease as any).category && (
                              <span className="text-xs text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 px-1.5 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                                {(disease as any).category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {disease.description && (
                        <p className="text-sm text-muted-foreground mt-2 ml-11 leading-relaxed">
                          {disease.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-2xl font-display font-bold text-teal-600 dark:text-teal-400">
                        {(disease.probability * 100).toFixed(0)}%
                      </span>
                      <p className="text-xs text-muted-foreground">{t('results.probability')}</p>
                    </div>
                  </div>
                  <Progress value={disease.probability * 100} className="h-2" />
                  <a
                    href={`https://rarediseases.org/search/?q=${encodeURIComponent(disease.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:underline mt-2"
                  >
                    {t('results.learnMore')} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </GlowingEffect>
            ))}
          </div>
        </TabsContent>

        {/* SHAP */}
        <TabsContent value="shap" className="mt-4">
          <div className="rounded-2xl border bg-card p-6">
            <div className="flex items-start gap-2 mb-4">
              <Info className="w-4 h-4 text-teal-500 mt-0.5" />
              <p className="text-sm text-muted-foreground">{t('results.shapInfo')}</p>
            </div>
            {result.shap_values && result.shap_values.length > 0 ? (
              <>
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(200, result.shap_values.slice(0, 10).length * 36)}
                >
                  <BarChart
                    data={result.shap_values.slice(0, 10)}
                    layout="vertical"
                    margin={{ left: 0, right: 30, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 'dataMax']} />
                    <YAxis type="category" dataKey="symptom" width={170} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: number) => [v.toFixed(3), t('results.importanceScore')]}
                      contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', fontSize: 12 }}
                    />
                    <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                      {result.shap_values.slice(0, 10).map((_, idx) => (
                        <Cell key={idx} fill={SHAP_COLORS[idx % SHAP_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.shap_values.slice(0, 6).map((sv, idx) => (
                    <div key={sv.symptom} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: SHAP_COLORS[idx % SHAP_COLORS.length] }}
                      />
                      <span className="text-foreground font-medium capitalize">{sv.symptom}</span>
                      <span className="text-muted-foreground ml-auto">
                        {getImportanceLabel(sv.importance)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 text-sm text-muted-foreground">
                <Info className="w-4 h-4 shrink-0" />
                {t('results.noShapData')}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Reasoning */}
        <TabsContent value="reasoning" className="mt-4">
          <div className="rounded-2xl border bg-card p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-violet-500" />
              <h3 className="text-lg font-display font-semibold text-foreground">
                {t('results.aiReasoningTitle')}
              </h3>
            </div>
            {reasoningSections.length > 0 ? (
              <div className="space-y-4">
                {reasoningSections.map((section, i) => (
                  <div key={i} className="rounded-xl border bg-muted/30 p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <ReasoningIcon icon={section.icon} />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {section.label}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed pl-6">{section.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {result.kg_reasoning_snippet || t('results.noReasoningData')}
              </p>
            )}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {t('results.differentialFlow')}
              </p>
              <div className="p-4 rounded-xl bg-muted/50 font-mono text-xs space-y-2">
                {result.top_diseases.slice(0, 3).map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: SHAP_COLORS[i] }}
                    />
                    <span className="text-muted-foreground">{t('results.patientSymptoms')}</span>
                    <span className="text-muted-foreground">──→</span>
                    <span className="text-foreground font-medium">{d.name}</span>
                    <span className="text-muted-foreground ml-auto">
                      {(d.probability * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {result.kg_suggestions && result.kg_suggestions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t('results.kgAlsoSuggests')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.kg_suggestions.map((s) => (
                    <span
                      key={s}
                      className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/50 text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Imaging */}
        {gradcamUrl && (
          <TabsContent value="imaging" className="mt-4">
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                {t('results.gradcamTitle')}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{t('results.gradcamDesc')}</p>
              <img src={gradcamUrl} alt="Grad-CAM visualization" className="w-full rounded-xl" />
              {result.image_result && (
                <p className="text-sm text-muted-foreground mt-3">
                  {t('results.imagePrediction')}:{' '}
                  <span className="font-medium text-foreground">{result.image_result.disease}</span>{' '}
                  ({(result.image_result.confidence * 100).toFixed(0)}% {t('results.confidence')})
                </p>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* ── FIX 3: PreScreenBot renders here, replaces buttons when active ── */}
      {showPreScreen ? (
        <PreScreenBot
          diagnosisResult={result}
          consultType={pendingConsultType}
          onComplete={handlePreScreenComplete}
          onCancel={() => setShowPreScreen(false)}
        />
      ) : (
        <div className={`rounded-2xl border p-6 ${isHighRisk ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10' : ''}`}>
          <h3 className="text-lg font-display font-semibold text-foreground mb-1">
            {isHighRisk ? t('results.speakWithSpecialist') : t('results.contactSpecialist')}
          </h3>
          <p className="text-sm text-muted-foreground mb-5">
            {isHighRisk ? t('results.highRiskMessage') : t('results.consultMessage')}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="teal"
              className="gap-2"
              onClick={() => startConsultation('video')}
              disabled={!!consultLoading}
            >
              <Video className="w-4 h-4" />
              {consultLoading === 'video' ? t('results.connecting') : t('results.videoCall')}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => startConsultation('voice')}
              disabled={!!consultLoading}
            >
              <Phone className="w-4 h-4" />
              {consultLoading === 'voice' ? t('results.connecting') : t('results.voiceCall')}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => startConsultation('chat')}
              disabled={!!consultLoading}
            >
              <MessageCircle className="w-4 h-4" />
              {consultLoading === 'chat' ? t('results.connecting') : t('results.chat')}
            </Button>
          </div>
        </div>
      )}

      <FeedbackWidget context="diagnosis" />
    </div>
  )
}