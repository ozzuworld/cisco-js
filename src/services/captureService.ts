import { apiClient } from './api'
import type {
  StartCaptureRequest,
  StartCaptureResponse,
  CaptureStatusResponse,
  CaptureListResponse,
  StopCaptureResponse,
  CaptureInfo,
} from '@/types'

export const captureService = {
  /**
   * Start a new packet capture
   */
  async startCapture(request: StartCaptureRequest): Promise<StartCaptureResponse> {
    console.log('Starting packet capture:', request.host)
    return apiClient.post<StartCaptureResponse>('/captures', request)
  },

  /**
   * Get all captures
   */
  async getCaptures(): Promise<CaptureListResponse> {
    return apiClient.get<CaptureListResponse>('/captures')
  },

  /**
   * Get capture status by ID
   */
  async getCaptureStatus(captureId: string): Promise<CaptureInfo> {
    const response = await apiClient.get<CaptureStatusResponse>(`/captures/${captureId}`)
    return response.capture
  },

  /**
   * Stop a running capture
   */
  async stopCapture(captureId: string): Promise<StopCaptureResponse> {
    return apiClient.post<StopCaptureResponse>(`/captures/${captureId}/stop`, {})
  },

  /**
   * Download capture file
   */
  downloadCapture(captureId: string, filename: string): void {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    const link = document.createElement('a')
    link.href = `${baseUrl}/captures/${captureId}/download`
    link.download = `${filename}.cap`
    link.click()
  },

  /**
   * Delete a capture
   */
  async deleteCapture(captureId: string): Promise<void> {
    await apiClient.delete(`/captures/${captureId}`)
  },
}
