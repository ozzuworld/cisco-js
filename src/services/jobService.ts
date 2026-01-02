import { apiClient } from './api'
import type { Job, JobDetails, CreateJobRequest, PaginatedResponse } from '@/types'

// Backend response types (snake_case)
interface BackendJobSummary {
  job_id: string
  status: string
  profile: string
  created_at: string
  node_count: number
}

interface BackendJobsListResponse {
  jobs: BackendJobSummary[]
  total: number
  page: number
  page_size: number
}

interface BackendCreateJobResponse {
  job_id: string
  status: string
  created_at: string
}

// Transform backend job to frontend format
function transformJob(backendJob: BackendJobSummary): Job {
  return {
    id: backendJob.job_id,
    clusterId: '',
    clusterName: '',
    profileId: backendJob.profile,
    profileName: backendJob.profile,
    status: backendJob.status as Job['status'],
    createdAt: backendJob.created_at,
    nodes: [],
    progress: backendJob.status === 'running' ? 50 : backendJob.status === 'completed' ? 100 : 0,
  }
}

export const jobService = {
  /**
   * Get all jobs with pagination
   */
  async getJobs(page = 1, pageSize = 20): Promise<PaginatedResponse<Job>> {
    const response = await apiClient.get<BackendJobsListResponse>(`/jobs?page=${page}&page_size=${pageSize}`)

    console.log('Backend jobs response:', response)

    // Transform backend response to frontend format
    return {
      items: (response.jobs || []).map(transformJob),
      total: response.total || 0,
      page: response.page || page,
      pageSize: response.page_size || pageSize,
      totalPages: Math.ceil((response.total || 0) / (response.page_size || pageSize)),
    }
  },

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<JobDetails> {
    return apiClient.get<JobDetails>(`/jobs/${jobId}`)
  },

  /**
   * Create new job
   */
  async createJob(request: CreateJobRequest): Promise<Job> {
    console.log('Creating job with request:', JSON.stringify(request, null, 2))
    const response = await apiClient.post<BackendCreateJobResponse>('/jobs', request)

    console.log('Backend create job response:', response)

    // Transform to frontend Job format
    return {
      id: response.job_id,
      clusterId: '',
      clusterName: '',
      profileId: request.profile,
      profileName: request.profile,
      status: response.status as Job['status'],
      createdAt: response.created_at,
      nodes: request.nodes,
      progress: 0,
    }
  },

  /**
   * Cancel running job
   */
  async cancelJob(jobId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`/jobs/${jobId}`)
  },

  /**
   * Get job status (for polling)
   */
  async getJobStatus(jobId: string): Promise<{ status: Job['status']; progress?: number }> {
    return apiClient.get(`/jobs/${jobId}/status`)
  },
}
