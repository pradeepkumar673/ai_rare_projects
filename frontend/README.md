# RareDiag – Frontend

> AI-Powered Rare Disease Diagnosis & Telemedicine Platform

## Tech Stack

- **Vite + React 18 + TypeScript**
- **Tailwind CSS** with shadcn/ui design system
- **Zustand** for auth state (persisted to localStorage)
- **Axios** with JWT interceptors
- **React Router v6** with role-based protected routes
- **Socket.IO client** for real-time chat & notifications
- **WebRTC** (RTCPeerConnection + signaling via Socket.IO) for video/voice
- **Recharts** for SHAP bar charts and probability visualizations
- **Fraunces** (display) + **DM Sans** (body) fonts

## Project Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx, label.tsx, textarea.tsx
│   │   ├── badge.tsx, progress.tsx, avatar.tsx
│   │   ├── scroll-area.tsx, tabs.tsx, dialog.tsx, select.tsx
│   │   ├── glowing-effect.tsx          ← mouse-tracking glow on cards
│   │   ├── responsive-hero-banner.tsx  ← landing page hero
│   │   ├── circle-unique-load.tsx      ← animated medical loader
│   │   ├── secure-message-gateway.tsx  ← encrypted chat input
│   │   ├── feedback-widget.tsx         ← star rating after diagnosis
│   │   ├── location-tag.tsx            ← doctor city + local time
│   │   ├── morphing-card-stack.tsx     ← triage queue (stack ↔ grid)
│   │   └── messaging-conversation.tsx ← real-time chat thread
│   ├── Layout.tsx                      ← Outlet + Navbar + footer
│   ├── Navbar.tsx                      ← sticky nav with dark mode
│   ├── ProtectedRoute.tsx              ← role-based route guard
│   ├── DiagnosisForm.tsx               ← 4-step clinical intake
│   ├── DiagnosisResult.tsx             ← results + SHAP + KG
│   └── ConsultationView.tsx            ← WebRTC + chat session
├── hooks/
│   ├── useAuth.ts                      ← token validation on mount
│   └── useSocket.ts                    ← Socket.IO singleton
├── lib/
│   ├── utils.ts                        ← cn(), formatDate, getRiskColor
│   └── api.ts                          ← Axios instance + all API calls
├── pages/
│   ├── Home.tsx                        ← landing page
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── UserDashboard.tsx
│   ├── DoctorDashboard.tsx
│   └── Diagnosis.tsx
├── stores/
│   └── authStore.ts                    ← Zustand auth store
├── App.tsx                             ← route tree
└── main.tsx
```

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (proxies /api → http://localhost:5000)
npm run dev

# Build for production
npm run build
```

## Environment

The Vite dev server proxies `/api` and `/ws` to `http://localhost:5000` by default (see `vite.config.ts`). Change the `proxy.target` if your Flask backend runs elsewhere.

## Pages & Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page with hero, features, how-it-works |
| `/login` | Public | Login form with role toggle |
| `/register` | Public | Registration form |
| `/dashboard/user` | `role=user` | User dashboard + past diagnoses |
| `/diagnose` | `role=user` | 4-step intake → AI results |
| `/dashboard/doctor` | `role=doctor` | Triage queue (stack/grid toggle) |
| `/consultation/:id` | Any auth | WebRTC video/voice + chat |

## Key Flows

### Diagnosis
1. User fills 4-step form → `POST /api/diagnose` (multipart/form-data)
2. FullScreenLoader shown during AI processing
3. Results render: probability bars, SHAP chart, KG reasoning, optional Grad-CAM
4. High-risk → "Contact Specialist" CTAs trigger `POST /api/consultations/request`
5. Redirects to `/consultation/:id`

### Doctor Triage
1. `GET /api/consultations/queue` polled every 30s
2. Socket.IO `new_case` event pushes cases in real-time
3. Doctor views case detail in Dialog → accepts → `POST /api/consultations/accept`
4. Navigate to `/consultation/:id`

### WebRTC Signaling
- Caller sends `webrtc_offer` via Socket.IO
- Callee receives offer, sends back `webrtc_answer`
- Both exchange `ice_candidate` events
- RTCPeerConnection established for P2P audio/video

## Dark Mode
Persisted to `localStorage` as `'light'` or `'dark'`. Class applied to `<html>` via Tailwind's `dark:` strategy.

## TypeScript Interfaces
All API request/response shapes are typed in `src/lib/api.ts`. Component props use `interface` declarations in each file.
