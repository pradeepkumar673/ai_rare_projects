import axios from 'axios'

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: '/',
  timeout: 60_000,
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'doctor'
  specialty?: string
  avatar?: string
}

export interface Disease {
  name: string
  probability: number
  icd_code?: string
  description?: string
}

export interface ShapValue {
  symptom: string
  importance: number
}

export interface DiagnoseResponse {
  case_id: string
  top_diseases: Disease[]
  confidence: number
  risk_level: 'high' | 'medium' | 'low'
  urgency: 'immediate' | 'soon' | 'routine'
  shap_values: ShapValue[]
  kg_reasoning_snippet: string
  kg_suggestions?: string[]
  agreement?: string
  specialist_review?: boolean
  gradcam_url?: string
  image_result?: {
    disease: string
    confidence: number
    overlay_b64?: string
  } | null
  created_at?: string
  // legacy fields
  diagnosis_id?: string
}

export interface DiagnosePayload {
  symptoms: string[]
  age?: number
  gender?: string
  ethnicity?: string
  region?: string
  duration?: string
  severity?: string
  family_history?: string
  lab_values?: string
  image?: File
}

export interface Consultation {
  id: string
  patient_id?: string
  patient_name?: string
  case_id?: string
  type: 'video' | 'voice' | 'chat'
  status: 'pending' | 'accepted' | 'rejected' | 'completed'
  risk_level: 'high' | 'medium' | 'low'
  main_symptoms?: string[]
  top_diagnosis?: string
  image_thumbnail?: string
  created_at: string
  scheduled_time?: string
}

export interface ConsultationRequestPayload {
  patient_id: string
  case_id: string
  type: 'video' | 'voice' | 'chat'
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: {
    email: string
    password: string
    name: string
    role: 'user' | 'doctor'
    specialty?: string
    licenseNumber?: string
  }) => api.post<{ token: string; user: User }>('/api/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<{ token: string; user: User }>('/api/auth/login', data),

  me: () => api.get<User>('/api/auth/me'),

  refresh: () => api.post<{ token: string }>('/api/auth/refresh'),
}

// ─── Diagnosis API ────────────────────────────────────────────────────────────

export const diagnosisApi = {
  diagnose: async (payload: DiagnosePayload) => {
    const formData = new FormData()

    // Append each symptom under the key 'symptoms[]' (Flask reads this with getlist)
    payload.symptoms.forEach((s) => formData.append('symptoms[]', s))

    // Always send consent = true (user reached submit)
    formData.append('consent', 'true')

    if (payload.age !== undefined && payload.age !== null) {
      formData.append('age', String(payload.age))
    }
    if (payload.gender) formData.append('gender', payload.gender)
    if (payload.ethnicity) formData.append('ethnicity', payload.ethnicity)
    if (payload.region) formData.append('region', payload.region)
    if (payload.duration) formData.append('duration', payload.duration)
    if (payload.severity) formData.append('severity', payload.severity)
    if (payload.family_history) formData.append('family_history', payload.family_history)
    if (payload.lab_values) formData.append('lab_values', payload.lab_values)
    if (payload.image) formData.append('image', payload.image)

    return api.post<DiagnoseResponse>('/api/diagnosis/predict', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getReport: (diagnosisId: string) =>
    api.get(`/api/diagnosis/report/${diagnosisId}`, { responseType: 'blob' }),
}

// ─── Consultation API ─────────────────────────────────────────────────────────

export const consultationApi = {
  request: (data: ConsultationRequestPayload) =>
    api.post<{ consultation_id: string }>('/api/consultations/request', data),

  queue: () => api.get<Consultation[]>('/api/consultations/queue'),

  accept: (id: string, scheduledTime?: string) =>
    api.post(`/api/doctor/case/${id}/accept`, { scheduled_time: scheduledTime }),

  reject: (id: string, reason?: string) =>
    api.post(`/api/doctor/case/${id}/reject`, { reason }),

  get: (id: string) => api.get<Consultation>(`/api/consultations/${id}`),
}


export async function submitPreScreen(
  diagnosisId: string,
  consultType: 'video' | 'voice' | 'chat',
  answers: Record<string, unknown>
) {
  const res = await api.post('/api/prescreen/submit', {
    diagnosis_id: diagnosisId,
    consult_type: consultType,
    answers,
  })
  return res.data
}
export default api