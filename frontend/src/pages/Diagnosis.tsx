// src/pages/Diagnosis.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DiagnosisForm } from '@/components/DiagnosisForm'
import { DiagnosisResult } from '@/components/DiagnosisResult'
import { FullScreenLoader } from '@/components/ui/circle-unique-load'
import { diagnosisApi, type DiagnosePayload, type DiagnoseResponse } from '@/lib/api'

export function Diagnosis() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagnoseResponse | null>(null)
  const [error, setError] = useState('')
  const { t } = useTranslation()

  const handleSubmit = async (payload: DiagnosePayload) => {
    setError('')
    setLoading(true)
    try {
      const { data } = await diagnosisApi.diagnose(payload)
      setResult(data)
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string; error?: string }; status?: number }
        message?: string
      }
      const msg =
        axiosErr?.response?.data?.message ||
        axiosErr?.response?.data?.error ||
        axiosErr?.message ||
        t('common.error')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      {loading && <FullScreenLoader label={t('common.loading')} />}

      {!result ? (
        <>
          <div className="text-center mb-10">
            <h1 className="text-4xl font-display font-semibold text-foreground mb-3">
              {t('diagnosis.clinicalIntake')}
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {t('diagnosis.clinicalIntakeSubtitle')}
            </p>
          </div>
          {error && (
            <div className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
          <DiagnosisForm onSubmit={handleSubmit} loading={loading} />
        </>
      ) : (
        <DiagnosisResult result={result} onReset={() => setResult(null)} />
      )}
    </div>
  )
}