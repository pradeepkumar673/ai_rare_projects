import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally → clear token and redirect
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ─── Auth ──────────────────────────────────────────────
export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  name: string
  role: 'user' | 'doctor'
  specialty?: string
  licenseNumber?: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'doctor'
  specialty?: string
  avatar?: string
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', payload),
  register: (payload: RegisterPayload) =>
    api.post<AuthResponse>('/auth/register', payload),
  me: () => api.get<User>('/auth/me'),
}

// ─── Diagnosis ─────────────────────────────────────────
export interface DiagnosePayload {
  age: number
  gender: string
  ethnicity: string
  region: string
  symptoms: string[]
  duration: string
  severity: string
  family_history: string
  lab_values?: string
  image?: File
}

export interface DiseaseResult {
  name: string
  probability: number
  icd_code?: string
  description?: string
}

export interface DiagnoseResponse {
  case_id: string
  top_diseases: DiseaseResult[]
  confidence: number
  risk_level: 'low' | 'medium' | 'high'
  urgency: 'routine' | 'soon' | 'immediate'
  shap_values: { symptom: string; importance: number }[]
  gradcam_url?: string
  kg_reasoning_snippet: string
  created_at: string
}

export const diagnosisApi = {
  diagnose: (payload: DiagnosePayload) => {
    const form = new FormData()
    Object.entries(payload).forEach(([key, val]) => {
      if (val === undefined || val === null) return
      if (key === 'symptoms' && Array.isArray(val)) {
        val.forEach((s) => form.append('symptoms', s))
      } else if (key === 'image' && val instanceof File) {
        form.append('image', val)
      } else {
        form.append(key, String(val))
      }
    })
    return api.post<DiagnoseResponse>('/diagnose', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ─── Consultations ─────────────────────────────────────
export interface ConsultationRequest {
  patient_id: string
  case_id: string
  type: 'video' | 'voice' | 'chat'
}

export interface Consultation {
  id: string
  patient_id: string
  case_id: string
  type: 'video' | 'voice' | 'chat'
  status: 'pending' | 'accepted' | 'in_progress' | 'completed'
  risk_level?: string
  patient_name?: string
  main_symptoms?: string[]
  top_diagnosis?: string
  image_thumbnail?: string
  created_at: string
}

export const consultationApi = {
  request: (payload: ConsultationRequest) =>
    api.post<{ consultation_id: string }>('/consultations/request', payload),
  queue: () => api.get<Consultation[]>('/consultations/queue'),
  accept: (consultation_id: string) =>
    api.post('/consultations/accept', { consultation_id }),
}
