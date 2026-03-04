import { useState } from 'react'
import { Activity, Plus, Clock, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { GlowingEffect } from '@/components/ui/glowing-effect'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/authStore'

// In a real app, fetch past diagnoses from backend
const MOCK_HISTORY = [
  { id: '1', date: '2024-11-20', topDisease: 'Fabry Disease', riskLevel: 'high', confidence: 0.78 },
  { id: '2', date: '2024-10-05', topDisease: 'Gaucher Disease', riskLevel: 'medium', confidence: 0.62 },
]

export function UserDashboard() {
  const { user } = useAuthStore()
  const firstName = user?.name?.split(' ')[0] ?? 'Patient'

  const [showHistory] = useState(true)

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      {/* Welcome */}
      <div className="mb-10">
        <p className="text-sm text-muted-foreground mb-1">Good day,</p>
        <h1 className="text-4xl font-display font-semibold text-foreground">
          {firstName}
        </h1>
        <p className="text-muted-foreground mt-2">
          Your rare disease diagnostic portal. Start a new analysis or review past results.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Diagnoses', value: MOCK_HISTORY.length, icon: Activity, color: 'text-teal-500' },
          { label: 'High Risk', value: MOCK_HISTORY.filter((h) => h.riskLevel === 'high').length, icon: TrendingUp, color: 'text-red-500' },
          { label: 'Consultations', value: 1, icon: Clock, color: 'text-violet-500' },
          { label: 'Reports', value: MOCK_HISTORY.length, icon: Plus, color: 'text-blue-500' },
        ].map((stat) => (
          <GlowingEffect key={stat.label} className="rounded-2xl">
            <div className="rounded-2xl border bg-card p-5">
              <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
              <div className="text-3xl font-display font-bold text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          </GlowingEffect>
        ))}
      </div>

      {/* CTA */}
      <div className="rounded-3xl bg-gradient-to-br from-teal-600 to-teal-800 p-8 mb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10">
          <h2 className="text-2xl font-display font-semibold text-white mb-2">
            Start a new AI diagnosis
          </h2>
          <p className="text-teal-100 text-sm mb-5 max-w-md">
            Describe your symptoms and get AI-powered rare disease predictions with specialist consultation options.
          </p>
          <Button asChild variant="secondary" size="lg" className="gap-2 bg-white text-teal-700 hover:bg-teal-50">
            <Link to="/diagnose">
              <Plus className="w-4 h-4" /> New Diagnosis
            </Link>
          </Button>
        </div>
      </div>

      {/* Past diagnoses */}
      {showHistory && MOCK_HISTORY.length > 0 && (
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground mb-4">Past Diagnoses</h2>
          <div className="space-y-3">
            {MOCK_HISTORY.map((h) => (
              <GlowingEffect key={h.id} className="rounded-2xl">
                <div className="rounded-2xl border bg-card p-5 flex items-center justify-between gap-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{h.topDisease}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}
                        {(h.confidence * 100).toFixed(0)}% confidence
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={h.riskLevel as 'high' | 'medium' | 'low'}>
                      {h.riskLevel}
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/diagnose?case=${h.id}`}>View →</Link>
                    </Button>
                  </div>
                </div>
              </GlowingEffect>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
