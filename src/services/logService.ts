import { apiClient } from './api'
import type { LogFile } from '@/types'

export const logService = {
  /**
   * Get logs for a specific job
   */
  async getJobLogs(jobId: string): Promise<LogFile[]> {
    return apiClient.get<LogFile[]>(`/api/jobs/${jobId}/logs`)
  },

  /**
   * Download a specific log file
   */
  async downloadLog(jobId: string, filename: string): Promise<Blob> {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/jobs/${jobId}/logs/${filename}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to download log file')
    }

    return response.blob()
  },

  /**
   * Download all logs as zip
   */
  async downloadAllLogs(jobId: string): Promise<Blob> {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/jobs/${jobId}/logs/download-all`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to download logs')
    }

    return response.blob()
  },
}
