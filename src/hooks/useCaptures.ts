import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { captureService } from '@/services'
import type {
  StartCaptureRequest,
  CaptureInfo,
  CaptureListResponse,
  StartCaptureSessionRequest,
  CaptureSessionStatusResponse,
  CaptureSessionListResponse,
} from '@/types'
import { shouldPollCaptureSession, getSessionPollingInterval } from '@/types'

/**
 * Hook to get all captures
 */
export function useCaptures() {
  return useQuery<CaptureListResponse>({
    queryKey: ['captures'],
    queryFn: () => captureService.getCaptures(),
    refetchInterval: 5000, // Poll every 5 seconds for status updates
  })
}

/**
 * Hook to get a specific capture's status
 */
export function useCaptureStatus(captureId: string, enabled = true) {
  return useQuery<CaptureInfo>({
    queryKey: ['capture', captureId],
    queryFn: () => captureService.getCaptureStatus(captureId),
    enabled,
    refetchInterval: (query) => {
      const capture = query.state.data
      // Poll every 2 seconds if running, stop if completed/failed
      if (capture?.status === 'running' || capture?.status === 'pending') {
        return 2000
      }
      return false
    },
  })
}

/**
 * Hook to start a new capture
 */
export function useStartCapture() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: StartCaptureRequest) => captureService.startCapture(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['captures'] })
    },
  })
}

/**
 * Hook to stop a running capture
 */
export function useStopCapture() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (captureId: string) => captureService.stopCapture(captureId),
    onSuccess: (_, captureId) => {
      queryClient.invalidateQueries({ queryKey: ['capture', captureId] })
      queryClient.invalidateQueries({ queryKey: ['captures'] })
    },
  })
}

/**
 * Hook to delete a capture
 */
export function useDeleteCapture() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (captureId: string) => captureService.deleteCapture(captureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['captures'] })
    },
  })
}

// ==========================================
// Capture Session Hooks
// ==========================================

/**
 * Hook to get all capture sessions
 */
export function useCaptureSessions(limit = 50) {
  return useQuery<CaptureSessionListResponse>({
    queryKey: ['capture-sessions', limit],
    queryFn: () => captureService.getSessions(limit),
    refetchInterval: 10000, // Poll every 10 seconds for session list updates
  })
}

/**
 * Hook to get a specific capture session's status
 */
export function useCaptureSessionStatus(sessionId: string | undefined, enabled = true) {
  return useQuery<CaptureSessionStatusResponse>({
    queryKey: ['capture-session', sessionId],
    queryFn: () => captureService.getSessionStatus(sessionId!),
    enabled: enabled && !!sessionId,
    refetchInterval: (query) => {
      const session = query.state.data?.session
      if (!session) return false

      // Use the session's polling logic
      if (!shouldPollCaptureSession(session.status)) {
        return false
      }

      return getSessionPollingInterval(session.status)
    },
  })
}

/**
 * Hook to start a new capture session
 */
export function useStartCaptureSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: StartCaptureSessionRequest) => captureService.startSession(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capture-sessions'] })
    },
  })
}

/**
 * Hook to stop a running capture session
 */
export function useStopCaptureSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => captureService.stopSession(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['capture-session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['capture-sessions'] })
    },
  })
}

/**
 * Hook to delete a capture session
 */
export function useDeleteCaptureSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => captureService.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capture-sessions'] })
    },
  })
}
