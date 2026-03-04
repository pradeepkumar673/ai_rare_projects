import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Download, Video, Phone, MessageCircle, ExternalLink, Info, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { GlowingEffect } from '@/components/ui/glowing-effect'
import { FeedbackWidget } from '@/components/ui/feedback-widget'
import { getRiskColor, getUrgencyLabel } from '@/lib/utils'
import type { DiagnoseResponse } from '@/lib/api'
import { consultationApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

interface DiagnosisResultProps {
  result: DiagnoseResponse
  onReset: () => void
}

const SHAP_COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1']

export function DiagnosisResult({ result, onReset }: DiagnosisResultProps) {
  const [consultLoading, setConsultLoading] = useState<string | null>(null)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const startConsultation = async (type: 'video' | 'voice' | 'chat') => {
    if (!user) return
    setConsultLoading(type)
    try {
      const { data } = await consultationApi.request({
        patient_id: user.id,
        case_id: result.case_id,
        type,
      })
      navigate(`/consultation/${data.consultation_id}?type=${type}`)
    } catch {
      alert('Failed to start consultation. Please try again.')
    } finally {
      setConsultLoading(null)
    }
  }

  const downloadReport = () => {
    // Simple text export – in production swap for jsPDF layout
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
        (d, i) => `${i + 1}. ${d.name} — ${(d.probability * 100).toFixed(0)}%${d.icd_code ? ` (${d.icd_code})` : ''}`
      ),
      '',
      'URGENCY:',
      getUrgencyLabel(result.urgency),
      '',
      'KNOWLEDGE GRAPH REASONING:',
      result.kg_reasoning_snippet,
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rarediag-report-${result.case_id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const isHighRisk = result.risk_level === 'high'
  const riskVariant = result.risk_level as 'high' | 'medium' | 'low'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-semibold text-foreground">Diagnosis Results</h2>
          <p className="text-sm text-muted-foreground mt-1">Case ID: <span className="font-mono text-xs">{result.case_id}</span></p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant={riskVariant} className="text-sm px-3 py-1">
            {result.risk_level.toUpperCase()} RISK
          </Badge>
          <div className="text-sm text-muted-foreground">
            AI Confidence:{' '}
            <span className="font-semibold text-foreground">
              {(result.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={downloadReport} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Report
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset}>
            New diagnosis
          </Button>
        </div>
      </div>

      {/* Urgency banner */}
      <div className={`rounded-2xl p-4 flex items-start gap-3 border ${isHighRisk ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'}`}>
        <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${isHighRisk ? 'text-red-500' : 'text-amber-500'}`} />
        <p className={`text-sm font-medium ${isHighRisk ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
          {getUrgencyLabel(result.urgency)}
        </p>
      </div>

      <Tabs defaultValue="diseases">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="diseases">Top Diseases</TabsTrigger>
          <TabsTrigger value="shap">Symptom Analysis</TabsTrigger>
          <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
          {result.gradcam_url && <TabsTrigger value="imaging">Imaging</TabsTrigger>}
        </TabsList>

        {/* Tab: Top diseases */}
        <TabsContent value="diseases" className="mt-4">
          <div className="space-y-4">
            {result.top_diseases.slice(0, 5).map((disease, i) => (
              <GlowingEffect key={disease.name} className="rounded-2xl">
                <div className="rounded-2xl border bg-card p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-display font-bold text-muted-foreground/30">
                          #{i + 1}
                        </span>
                        <div>
                          <h3 className="text-lg font-display font-semibold text-foreground">
                            {disease.name}
                          </h3>
                          {disease.icd_code && (
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                              ICD-10: {disease.icd_code}
                            </span>
                          )}
                        </div>
                      </div>
                      {disease.description && (
                        <p className="text-sm text-muted-foreground mt-2 ml-11">{disease.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-2xl font-display font-bold text-teal-600 dark:text-teal-400">
                        {(disease.probability * 100).toFixed(0)}%
                      </span>
                      <p className="text-xs text-muted-foreground">probability</p>
                    </div>
                  </div>
                  <Progress
                    value={disease.probability * 100}
                    className="h-2"
                  />
                  <a
                    href={`https://rarediseases.org/search/?q=${encodeURIComponent(disease.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:underline mt-2"
                  >
                    Learn more <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </GlowingEffect>
            ))}
          </div>
        </TabsContent>

        {/* Tab: SHAP / symptom importance */}
        <TabsContent value="shap" className="mt-4">
          <div className="rounded-2xl border bg-card p-6">
            <div className="flex items-start gap-2 mb-4">
              <Info className="w-4 h-4 text-teal-500 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                SHAP values explain which symptoms most influenced the AI's prediction. Higher values = greater impact.
              </p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={result.shap_values.slice(0, 10)}
                layout="vertical"
                margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="symptom"
                  width={160}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number) => [v.toFixed(3), 'SHAP value']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', fontSize: 12 }}
                />
                <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                  {result.shap_values.slice(0, 10).map((_, idx) => (
                    <Cell key={idx} fill={SHAP_COLORS[idx % SHAP_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Tab: Knowledge graph reasoning */}
        <TabsContent value="reasoning" className="mt-4">
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="text-lg font-display font-semibold text-foreground mb-4">
              Knowledge Graph Reasoning
            </h3>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {result.kg_reasoning_snippet}
              </p>
            </div>
            {/* Simple text-based node visualization */}
            <div className="mt-6 p-4 rounded-xl bg-muted/50 font-mono text-xs space-y-2">
              {result.top_diseases.slice(0, 3).map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                  <span className="text-muted-foreground">Patient Phenotype</span>
                  <span className="text-muted-foreground">──→</span>
                  <span className="text-foreground font-medium">{d.name}</span>
                  <span className="text-muted-foreground ml-auto">
                    ({(d.probability * 100).toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Tab: Grad-CAM */}
        {result.gradcam_url && (
          <TabsContent value="imaging" className="mt-4">
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                Grad-CAM Heatmap
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Areas highlighted in red indicate regions the AI focused on most during analysis.
              </p>
              <img
                src={result.gradcam_url}
                alt="Grad-CAM visualization"
                className="w-full rounded-xl"
              />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Contact specialist – show for all, emphasize for high risk */}
      <div className={`rounded-2xl border p-6 ${isHighRisk ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10' : ''}`}>
        <h3 className="text-lg font-display font-semibold text-foreground mb-1">
          {isHighRisk ? '🚨 Speak with a Specialist Now' : 'Contact a Specialist'}
        </h3>
        <p className="text-sm text-muted-foreground mb-5">
          {isHighRisk
            ? 'Your risk level is high. We strongly recommend consulting a specialist as soon as possible.'
            : 'Want a second opinion? Connect with a board-certified rare disease specialist.'}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="teal"
            className="gap-2"
            onClick={() => startConsultation('video')}
            disabled={!!consultLoading}
          >
            <Video className="w-4 h-4" />
            {consultLoading === 'video' ? 'Connecting…' : 'Video Call'}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => startConsultation('voice')}
            disabled={!!consultLoading}
          >
            <Phone className="w-4 h-4" />
            {consultLoading === 'voice' ? 'Connecting…' : 'Voice Call'}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => startConsultation('chat')}
            disabled={!!consultLoading}
          >
            <MessageCircle className="w-4 h-4" />
            {consultLoading === 'chat' ? 'Connecting…' : 'Chat'}
          </Button>
        </div>
      </div>

      {/* Feedback */}
      <FeedbackWidget context="diagnosis" />
    </div>
  )
}
