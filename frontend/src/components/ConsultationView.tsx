import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Maximize2, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SecureMessageGateway } from '@/components/ui/secure-message-gateway'
import { MessagingConversation, type ChatMessage } from '@/components/ui/messaging-conversation'
import { FeedbackWidget } from '@/components/ui/feedback-widget'
import { LocationTag } from '@/components/ui/location-tag'
import { useAuthStore } from '@/stores/authStore'
import { useSocket } from '@/hooks/useSocket'
import { cn } from '@/lib/utils'

// ─── WebRTC setup ─────────────────────────────────────────────────────────────
function useWebRTC(consultationId: string, type: string) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const { emit, on } = useSocket()

  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [connected, setConnected] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(type === 'video')

  const startMedia = useCallback(async () => {
    if (type === 'chat') return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true,
      })
      setLocalStream(stream)
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      })
      pcRef.current = pc

      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      pc.onicecandidate = (e) => {
        if (e.candidate) emit('ice_candidate', { consultation_id: consultationId, candidate: e.candidate })
      }

      pc.ontrack = (e) => {
        const [remote] = e.streams
        setRemoteStream(remote)
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote
        setConnected(true)
      }

      // Offer (caller side)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      emit('webrtc_offer', { consultation_id: consultationId, offer })
    } catch (err) {
      console.error('Media access error', err)
    }
  }, [type, consultationId, emit])

  // Handle incoming signaling messages
  useEffect(() => {
    if (type === 'chat') return

    const unsubOffer = on<{ offer: RTCSessionDescriptionInit }>('webrtc_offer', async ({ offer }) => {
      if (!pcRef.current) return
      await pcRef.current.setRemoteDescription(offer)
      const answer = await pcRef.current.createAnswer()
      await pcRef.current.setLocalDescription(answer)
      emit('webrtc_answer', { consultation_id: consultationId, answer })
    })

    const unsubAnswer = on<{ answer: RTCSessionDescriptionInit }>('webrtc_answer', async ({ answer }) => {
      await pcRef.current?.setRemoteDescription(answer)
      setConnected(true)
    })

    const unsubIce = on<{ candidate: RTCIceCandidateInit }>('ice_candidate', async ({ candidate }) => {
      await pcRef.current?.addIceCandidate(candidate)
    })

    startMedia()

    return () => {
      unsubOffer()
      unsubAnswer()
      unsubIce()
      localStream?.getTracks().forEach((t) => t.stop())
      pcRef.current?.close()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMic = () => {
    localStream?.getAudioTracks().forEach((t) => { t.enabled = !micOn })
    setMicOn((v) => !v)
  }

  const toggleCam = () => {
    localStream?.getVideoTracks().forEach((t) => { t.enabled = !camOn })
    setCamOn((v) => !v)
  }

  return { localVideoRef, remoteVideoRef, connected, remoteStream, micOn, camOn, toggleMic, toggleCam }
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ConsultationView() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type') ?? 'chat'
  const { user } = useAuthStore()
  const { on, emit } = useSocket()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [ended, setEnded] = useState(false)

  const {
    localVideoRef,
    remoteVideoRef,
    connected,
    micOn,
    camOn,
    toggleMic,
    toggleCam,
  } = useWebRTC(id ?? '', type)

  // Real-time chat messages
  useEffect(() => {
    const unsub = on<ChatMessage>('chat_message', (msg) => {
      setMessages((prev) => [...prev, msg])
    })
    return unsub
  }, [on])

  const sendMessage = (content: string) => {
    if (!user) return
    const msg: ChatMessage = {
      id: Date.now().toString(),
      sender_id: user.id,
      sender_name: user.name ?? 'You',
      sender_role: user.role,
      content,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, msg])
    emit('chat_message', { consultation_id: id, message: msg })
  }

  const endCall = () => {
    emit('end_consultation', { consultation_id: id })
    setEnded(true)
  }

  if (ended) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-lg text-center">
        <div className="w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-6">
          <PhoneOff className="w-8 h-8 text-teal-600 dark:text-teal-400" />
        </div>
        <h2 className="text-3xl font-display font-semibold text-foreground mb-3">Session Ended</h2>
        <p className="text-muted-foreground mb-8">
          Your consultation has been recorded securely. You can download a transcript from your dashboard.
        </p>
        <FeedbackWidget context="consultation" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row overflow-hidden">
      {/* Video / Voice panel */}
      {(type === 'video' || type === 'voice') && (
        <div className="flex-1 bg-slate-950 relative min-h-[240px] lg:min-h-0">
          {/* Remote video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={cn(
              'w-full h-full object-cover',
              type === 'voice' && 'hidden'
            )}
          />

          {/* Voice only – avatar placeholder */}
          {type === 'voice' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {connected ? (
                <>
                  <div className="w-24 h-24 rounded-full bg-teal-600 flex items-center justify-center mb-4 ring-4 ring-teal-500/30 animate-pulse">
                    <Users className="w-12 h-12 text-white" />
                  </div>
                  <p className="text-white font-display font-semibold">Connected</p>
                  <p className="text-slate-400 text-sm mt-1">Voice call in progress</p>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-4 animate-pulse">
                    <Users className="w-12 h-12 text-slate-500" />
                  </div>
                  <p className="text-slate-400">Waiting for doctor to join…</p>
                </>
              )}
            </div>
          )}

          {/* Not connected yet */}
          {type === 'video' && !connected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 animate-pulse">
                <Video className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-400">Waiting for doctor to join…</p>
            </div>
          )}

          {/* Local video PiP */}
          {type === 'video' && (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-4 right-4 w-32 h-24 rounded-xl object-cover border-2 border-slate-700 bg-slate-800"
            />
          )}

          {/* Controls bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <button
              onClick={toggleMic}
              aria-label={micOn ? 'Mute' : 'Unmute'}
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                micOn ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-red-600 text-white hover:bg-red-700'
              )}
            >
              {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {type === 'video' && (
              <button
                onClick={toggleCam}
                aria-label={camOn ? 'Turn off camera' : 'Turn on camera'}
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                  camOn ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-red-600 text-white hover:bg-red-700'
                )}
              >
                {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            )}

            <button
              onClick={endCall}
              aria-label="End call"
              className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
            >
              <PhoneOff className="w-6 h-6" />
            </button>

            <button
              aria-label="Fullscreen"
              className="w-12 h-12 rounded-full bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600 transition-colors"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Chat panel */}
      <div className={cn(
        'flex flex-col bg-background border-l border-border',
        type === 'chat' ? 'flex-1' : 'w-full lg:w-80 xl:w-96'
      )}>
        {/* Chat header */}
        <div className="px-4 py-3 border-b flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs font-semibold">
              DR
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Consultation Chat</p>
            <p className="text-xs text-muted-foreground truncate">ID: {id?.slice(0, 8)}…</p>
          </div>
          {type === 'chat' && (
            <Button variant="destructive" size="sm" onClick={endCall} className="gap-1.5">
              <PhoneOff className="w-3.5 h-3.5" /> End
            </Button>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <MessagingConversation
            messages={messages}
            currentUserId={user?.id ?? ''}
            className="min-h-full"
          />
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t">
          <SecureMessageGateway
            onSend={sendMessage}
            placeholder="Message your doctor…"
          />
        </div>
      </div>
    </div>
  )
}
