import { apiClient } from './api'
import type { Job, JobDetails, CreateJobRequest, PaginatedResponse } from '@/types'

export const jobService = {
  /**
   * Get all jobs with pagination
   */
  async getJobs(page = 1, pageSize = 20): Promise<PaginatedResponse<Job>> {
    return apiClient.get<PaginatedResponse<Job>>(`/api/jobs?page=${page}&pageSize=${pageSize}`)
  },

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<JobDetails> {
    return apiClient.get<JobDetails>(`/api/jobs/${jobId}`)
  },

  /**
   * Create new job
   */
  async createJob(request: CreateJobRequest): Promise<Job> {
    return apiClient.post<Job>('/api/jobs', request)
  },

  /**
   * Cancel running job
   */
  async cancelJob(jobId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`/api/jobs/${jobId}`)
  },

  /**
   * Get job status (for polling)
   */
  async getJobStatus(jobId: string): Promise<{ status: Job['status']; progress?: number }> {
    return apiClient.get(`/api/jobs/${jobId}/status`)
  },
}
