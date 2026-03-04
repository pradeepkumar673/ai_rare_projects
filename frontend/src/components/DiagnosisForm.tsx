import { useState, useRef } from 'react'
import { Upload, X, Plus, ChevronRight, ChevronLeft, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DiagnosePayload } from '@/lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────
const SYMPTOM_SUGGESTIONS = [
  'Fatigue', 'Joint pain', 'Abdominal pain', 'Skin rash', 'Swollen lymph nodes',
  'Muscle weakness', 'Cognitive decline', 'Vision problems', 'Hearing loss', 'Seizures',
  'Neuropathy', 'Anemia', 'Hepatomegaly', 'Splenomegaly', 'Cardiomyopathy',
  'Dyspnea', 'Weight loss', 'Fever', 'Night sweats', 'Bone pain',
  'Tremor', 'Ataxia', 'Ophthalmoplegia', 'Angiokeratoma', 'Corneal opacity',
]

const FAMILY_HISTORY_OPTIONS = [
  'Gaucher disease',
  'Fabry disease',
  'Niemann-Pick disease',
  'Cystic fibrosis',
  'Huntington disease',
  'Marfan syndrome',
  'Wilson disease',
  'Phenylketonuria (PKU)',
  'Sickle cell disease',
  'Hemophilia',
  'Tay-Sachs disease',
  'Unexplained neurological symptoms',
  'Unexplained metabolic disorder',
  'Early-onset cancer',
  'Rare autoimmune condition',
]

const LAB_PRESETS = [
  { label: 'WBC', unit: '×10⁹/L', placeholder: 'e.g. 3.2' },
  { label: 'RBC', unit: '×10¹²/L', placeholder: 'e.g. 3.8' },
  { label: 'Hemoglobin', unit: 'g/dL', placeholder: 'e.g. 10.2' },
  { label: 'Platelets', unit: '×10⁹/L', placeholder: 'e.g. 150' },
  { label: 'ALT', unit: 'U/L', placeholder: 'e.g. 80' },
  { label: 'AST', unit: 'U/L', placeholder: 'e.g. 72' },
  { label: 'Ferritin', unit: 'ng/mL', placeholder: 'e.g. 1200' },
  { label: 'CRP', unit: 'mg/L', placeholder: 'e.g. 15' },
]

const STEPS = ['Personal Info', 'Symptoms', 'History & Labs', 'Image Upload']

interface DiagnosisFormProps {
  onSubmit: (payload: DiagnosePayload) => void
  loading: boolean
}

export function DiagnosisForm({ onSubmit, loading }: DiagnosisFormProps) {
  const [step, setStep] = useState(0)
  const [symptomInput, setSymptomInput] = useState('')
  const [otherFamilyHistory, setOtherFamilyHistory] = useState('')
  const [labValues, setLabValues] = useState<Record<string, string>>({})
  const [extraLabText, setExtraLabText] = useState('')
  const imageRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<{
    age: string
    gender: string
    ethnicity: string
    region: string
    symptoms: string[]
    duration: string
    severity: string
    family_history_checked: string[]
    image: File | null
    imagePreview: string | null
  }>({
    age: '',
    gender: '',
    ethnicity: '',
    region: '',
    symptoms: [],
    duration: '',
    severity: '',
    family_history_checked: [],
    image: null,
    imagePreview: null,
  })

  const set = (key: string, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }))

  const addSymptom = (s: string) => {
    const trimmed = s.trim()
    if (trimmed && !form.symptoms.includes(trimmed)) {
      set('symptoms', [...form.symptoms, trimmed])
    }
    setSymptomInput('')
  }

  const removeSymptom = (s: string) =>
    set('symptoms', form.symptoms.filter((x) => x !== s))

  const toggleFamilyHistory = (item: string) => {
    const current = form.family_history_checked
    if (current.includes(item)) {
      set('family_history_checked', current.filter((x) => x !== item))
    } else {
      set('family_history_checked', [...current, item])
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    set('image', file)
    set('imagePreview', URL.createObjectURL(file))
  }

  const handleNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const handleBack = () => setStep((s) => Math.max(s - 1, 0))

  // Build family_history string from checkboxes + freetext
  const buildFamilyHistory = () => {
    const parts = [...form.family_history_checked]
    if (otherFamilyHistory.trim()) parts.push(otherFamilyHistory.trim())
    return parts.join(', ')
  }

  // Build lab_values string from structured inputs + extra freetext
  const buildLabValues = () => {
    const structured = Object.entries(labValues)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    const parts = [structured, extraLabText.trim()].filter(Boolean)
    return parts.join('; ')
  }

  const handleSubmit = () => {
    onSubmit({
      age: Number(form.age),
      gender: form.gender,
      ethnicity: form.ethnicity,
      region: form.region,
      symptoms: form.symptoms,
      duration: form.duration,
      severity: form.severity,
      family_history: buildFamilyHistory(),
      lab_values: buildLabValues() || undefined,
      image: form.image || undefined,
    })
  }

  const stepValid = [
    form.age && form.gender && form.ethnicity && form.region,
    form.symptoms.length > 0 && form.duration && form.severity,
    true,
    true,
  ]

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                  i < step
                    ? 'bg-teal-600 text-white'
                    : i === step
                    ? 'bg-teal-500 text-white ring-4 ring-teal-500/20'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs mt-1.5 font-medium hidden sm:block',
                  i === step ? 'text-teal-600 dark:text-teal-400' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-px mx-3 mt-[-14px]',
                  i < step ? 'bg-teal-500' : 'bg-border'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-2xl border bg-card p-6 sm:p-8">
        {/* Step 0: Personal Info */}
        {step === 0 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-1">
                Personal Information
              </h2>
              <p className="text-sm text-muted-foreground">Basic demographics help improve diagnostic accuracy.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min="0"
                  max="120"
                  value={form.age}
                  onChange={(e) => set('age', e.target.value)}
                  placeholder="e.g. 34"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Biological Sex</Label>
                <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
                  <SelectTrigger id="gender"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ethnicity">Ethnicity</Label>
              <Select value={form.ethnicity} onValueChange={(v) => set('ethnicity', v)}>
                <SelectTrigger id="ethnicity"><SelectValue placeholder="Select ethnicity…" /></SelectTrigger>
                <SelectContent>
                  {['African', 'Asian', 'Caucasian', 'Hispanic', 'Middle Eastern', 'Mixed', 'South Asian', 'Other'].map(
                    (e) => <SelectItem key={e} value={e.toLowerCase()}>{e}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Geographic Region</Label>
              <Input
                id="region"
                value={form.region}
                onChange={(e) => set('region', e.target.value)}
                placeholder="e.g. North America, Europe, South Asia…"
              />
            </div>
          </div>
        )}

        {/* Step 1: Symptoms */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-1">
                Symptoms
              </h2>
              <p className="text-sm text-muted-foreground">Add all symptoms you're experiencing. The more detail, the better.</p>
            </div>

            <div>
              <Label className="mb-2 block">Selected symptoms ({form.symptoms.length})</Label>
              <div className="min-h-[60px] flex flex-wrap gap-2 p-3 rounded-xl border bg-background">
                {form.symptoms.length === 0 && (
                  <span className="text-xs text-muted-foreground self-center">No symptoms added yet</span>
                )}
                {form.symptoms.map((s) => (
                  <Badge key={s} variant="teal" className="flex items-center gap-1">
                    {s}
                    <button onClick={() => removeSymptom(s)} aria-label={`Remove ${s}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addSymptom(symptomInput) }
                }}
                placeholder="Type a symptom and press Enter…"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => addSymptom(symptomInput)}
                aria-label="Add symptom"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Common symptoms (tap to add)</Label>
              <div className="flex flex-wrap gap-1.5">
                {SYMPTOM_SUGGESTIONS.filter((s) => !form.symptoms.includes(s)).slice(0, 15).map((s) => (
                  <button
                    key={s}
                    onClick={() => addSymptom(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-dashed border-slate-300 dark:border-slate-700 text-muted-foreground hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration of symptoms</Label>
                <Select value={form.duration} onValueChange={(v) => set('duration', v)}>
                  <SelectTrigger id="duration"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {['< 1 week', '1–4 weeks', '1–3 months', '3–6 months', '6–12 months', '> 1 year'].map(
                      (d) => <SelectItem key={d} value={d}>{d}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <Select value={form.severity} onValueChange={(v) => set('severity', v)}>
                  <SelectTrigger id="severity"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild – minor impact</SelectItem>
                    <SelectItem value="moderate">Moderate – daily impact</SelectItem>
                    <SelectItem value="severe">Severe – significant impairment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: History & Labs — CHECKBOXES */}
        {step === 2 && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-1">
                Medical History & Labs
              </h2>
              <p className="text-sm text-muted-foreground">Optional but significantly improves accuracy.</p>
            </div>

            {/* ── Family History Checkboxes ── */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-foreground">
                Family history of rare diseases
              </Label>
              <p className="text-xs text-muted-foreground -mt-1">Check all that apply in your family.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FAMILY_HISTORY_OPTIONS.map((item) => {
                  const checked = form.family_history_checked.includes(item)
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleFamilyHistory(item)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm text-left transition-all',
                        checked
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300'
                          : 'border-border bg-background text-foreground hover:border-teal-400 hover:bg-muted/50'
                      )}
                    >
                      {/* Custom checkbox */}
                      <span
                        className={cn(
                          'flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
                          checked
                            ? 'bg-teal-500 border-teal-500'
                            : 'border-slate-400 dark:border-slate-600'
                        )}
                      >
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      {item}
                    </button>
                  )
                })}
              </div>

              {/* Other / freetext */}
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="other-family" className="text-xs text-muted-foreground">
                  Other — describe any other family history
                </Label>
                <Input
                  id="other-family"
                  value={otherFamilyHistory}
                  onChange={(e) => setOtherFamilyHistory(e.target.value)}
                  placeholder="e.g. maternal grandfather had unexplained liver failure…"
                />
              </div>

              {/* Selected summary */}
              {(form.family_history_checked.length > 0 || otherFamilyHistory) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {form.family_history_checked.map((item) => (
                    <Badge key={item} variant="teal" className="flex items-center gap-1 text-xs">
                      {item}
                      <button onClick={() => toggleFamilyHistory(item)} aria-label={`Remove ${item}`}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                  {otherFamilyHistory && (
                    <Badge variant="outline" className="text-xs">{otherFamilyHistory}</Badge>
                  )}
                </div>
              )}
            </div>

            {/* ── Lab Values — structured inputs ── */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-foreground">
                Recent laboratory values
                <span className="ml-2 text-xs font-normal text-muted-foreground">(optional)</span>
              </Label>
              <p className="text-xs text-muted-foreground -mt-1">Fill in any values you have. Leave blank to skip.</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {LAB_PRESETS.map(({ label, unit, placeholder }) => (
                  <div key={label} className="space-y-1">
                    <label className="text-xs font-medium text-foreground">
                      {label}
                      <span className="ml-1 text-muted-foreground font-normal">{unit}</span>
                    </label>
                    <Input
                      type="number"
                      step="any"
                      value={labValues[label] ?? ''}
                      onChange={(e) =>
                        setLabValues((prev) => ({ ...prev, [label]: e.target.value }))
                      }
                      placeholder={placeholder}
                      className="h-9 text-sm"
                    />
                  </div>
                ))}
              </div>

              {/* Other lab values freetext */}
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="extra-labs" className="text-xs text-muted-foreground">
                  Other lab results or notes
                </Label>
                <Textarea
                  id="extra-labs"
                  value={extraLabText}
                  onChange={(e) => setExtraLabText(e.target.value)}
                  placeholder="e.g. Glucocerebrosidase enzyme activity: 2.1 nmol/hr/mg (low), Chitotriosidase: elevated…"
                  className="min-h-[72px] font-mono text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Image Upload */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-1">
                Medical Image (optional)
              </h2>
              <p className="text-sm text-muted-foreground">
                Upload an MRI, CT scan, X-ray, or skin photograph. Our AI will generate a Grad-CAM heatmap.
              </p>
            </div>

            {form.imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border">
                <img
                  src={form.imagePreview}
                  alt="Uploaded medical image"
                  className="w-full h-60 object-cover"
                />
                <button
                  onClick={() => { set('image', null); set('imagePreview', null) }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-destructive hover:text-white transition-colors"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-background/80 backdrop-blur-sm text-xs text-foreground">
                  {form.image?.name}
                </div>
              </div>
            ) : (
              <button
                onClick={() => imageRef.current?.click()}
                className="w-full h-48 rounded-2xl border-2 border-dashed border-border hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 transition-all flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400"
                aria-label="Upload medical image"
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Click to upload or drag & drop</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, DICOM up to 20MB</p>
                </div>
                <Upload className="w-4 h-4" />
              </button>
            )}

            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              aria-hidden="true"
            />
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 0}
            className="gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!stepValid[step]}
              variant="teal"
              className="gap-1.5"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || !stepValid[0] || !stepValid[1]}
              variant="teal"
              size="lg"
              className="gap-1.5"
            >
              {loading ? 'Analyzing…' : 'Run AI Diagnosis'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}