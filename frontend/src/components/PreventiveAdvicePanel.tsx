/**
 * PreventiveAdvicePanel.tsx
 * ─────────────────────────
 * Drop into DiagnosisResult.tsx or render on its own page.
 * 
 * Props: advice[] comes from response.preventive_advice (injected by backend engine)
 * 
 * Usage in DiagnosisResult.tsx:
 *   import { PreventiveAdvicePanel } from './PreventiveAdvicePanel'
 *   ...
 *   <PreventiveAdvicePanel adviceList={result.preventive_advice} />
 */

import { useState } from 'react'
import { Shield, Utensils, AlertTriangle, ChevronDown, ChevronUp, MapPin, User, Stethoscope, Info } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiseaseAdvice {
  disease: string
  category: string
  probability?: number
  tips: string[]
  dietary: string[]
  emergency_signs: string[]
  personalization_context: {
    age_group?: string
    age?: number
    skin_type?: string
    region_modifier?: string
    copper_water_advisory?: boolean
    note?: string
  }
}

interface PreventiveAdvicePanelProps {
  adviceList: DiseaseAdvice[]
  /** Show all diseases or just the top prediction */
  showAll?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confidenceColor(p: number): string {
  if (p >= 0.6) return 'text-red-600 dark:text-red-400'
  if (p >= 0.35) return 'text-amber-600 dark:text-amber-400'
  return 'text-teal-600 dark:text-teal-400'
}

function categoryBadgeColor(cat: string): string {
  const c = cat.toLowerCase()
  if (c.includes('skin') || c.includes('cancer')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
  if (c.includes('neuro')) return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
  if (c.includes('autoimmune')) return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
  if (c.includes('metabolic') || c.includes('lysosomal')) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
  if (c.includes('blood') || c.includes('coagul') || c.includes('hemo')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  if (c.includes('connective') || c.includes('bone')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
  if (c.includes('endocrine')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

// ─── Single disease advice card ───────────────────────────────────────────────

function AdviceCard({ advice, defaultOpen }: { advice: DiseaseAdvice; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [activeTab, setActiveTab] = useState<'tips' | 'diet' | 'emergency'>('tips')
  const ctx = advice.personalization_context

  const hasPersonalization = ctx.age_group || ctx.region_modifier || ctx.skin_type || ctx.copper_water_advisory

  return (
    <div className={`rounded-2xl border bg-card overflow-hidden transition-shadow hover:shadow-md ${open ? 'shadow-md' : ''}`}>
      {/* Header */}
      <button
        className="w-full flex items-center justify-between p-5 text-left gap-3"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground truncate">{advice.disease}</p>
              {advice.probability !== undefined && (
                <span className={`text-xs font-medium ${confidenceColor(advice.probability)}`}>
                  {(advice.probability * 100).toFixed(0)}% match
                </span>
              )}
            </div>
            <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${categoryBadgeColor(advice.category)}`}>
              {advice.category}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Tip counts */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />{advice.tips.length} tips
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-500" />{advice.emergency_signs.length} alerts
            </span>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          {/* Personalisation context bar */}
          {hasPersonalization && (
            <div className="flex items-start gap-2 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 p-3">
              <Info className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
              <div className="flex flex-wrap gap-2 text-xs text-teal-700 dark:text-teal-300">
                {ctx.age_group && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Personalised for {ctx.age ? `age ${ctx.age}` : ctx.age_group}
                  </span>
                )}
                {ctx.region_modifier && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {ctx.region_modifier}
                  </span>
                )}
                {ctx.skin_type && (
                  <span className="flex items-center gap-1">
                    <Stethoscope className="w-3 h-3" />
                    Skin type: {ctx.skin_type.replace('_', ' ').toUpperCase()}
                  </span>
                )}
                {ctx.copper_water_advisory && (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Copper water advisory active
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {[
              { key: 'tips' as const,      label: 'Preventive Tips',  icon: Shield,        count: advice.tips.length },
              { key: 'diet' as const,      label: 'Dietary Advice',   icon: Utensils,      count: advice.dietary.length },
              { key: 'emergency' as const, label: 'Emergency Signs',  icon: AlertTriangle, count: advice.emergency_signs.length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-all ${
                  activeTab === tab.key
                    ? tab.key === 'emergency'
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={`text-xs rounded-full px-1.5 py-0 min-w-[1.25rem] text-center ${
                  activeTab === tab.key && tab.key === 'emergency' ? 'bg-red-400 text-white' :
                  activeTab === tab.key ? 'bg-muted text-foreground' : 'bg-muted-foreground/20'
                }`}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="space-y-2">
            {activeTab === 'tips' && advice.tips.map((tip, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/10 border border-teal-100 dark:border-teal-900/30">
                <div className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-400">{i + 1}</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{tip}</p>
              </div>
            ))}

            {activeTab === 'diet' && (
              advice.dietary.length > 0 ? advice.dietary.map((item, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl bg-green-50/50 dark:bg-green-950/10 border border-green-100 dark:border-green-900/30">
                  <Utensils className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground leading-relaxed">{item}</p>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No specific dietary advice for this condition.</p>
              )
            )}

            {activeTab === 'emergency' && (
              advice.emergency_signs.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                      Seek emergency medical care immediately if you experience any of the following:
                    </p>
                  </div>
                  {advice.emergency_signs.map((sign, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground leading-relaxed font-medium">{sign}</p>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No specific emergency signs listed.</p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function PreventiveAdvicePanel({ adviceList, showAll = false }: PreventiveAdvicePanelProps) {
  const [expanded, setExpanded] = useState(showAll)

  if (!adviceList || adviceList.length === 0) return null

  const displayed = expanded ? adviceList : adviceList.slice(0, 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-500" />
            Preventive Advice
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Personalised to your age, location, and skin type
          </p>
        </div>
        {adviceList.length > 1 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium"
          >
            {expanded ? `Show top prediction only` : `See all ${adviceList.length} diseases`}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {displayed.map((advice, i) => (
          <AdviceCard key={advice.disease} advice={advice} defaultOpen={i === 0} />
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 border">
        ⚠️ This advice is AI-generated for informational purposes only. Always consult a qualified
        healthcare professional before making any medical decisions.
      </p>
    </div>
  )
}

export default PreventiveAdvicePanel
