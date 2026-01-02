import { apiClient } from './api'
import type { ClusterHealthRequest, ClusterHealthResponse } from '@/types'

export const healthService = {
  /**
   * Check cluster health status
   * Performs health checks on CUCM cluster nodes
   */
  async checkClusterHealth(request: ClusterHealthRequest): Promise<ClusterHealthResponse> {
    console.log('Checking cluster health:', request.publisher_host)
    // Health check can take up to 3 minutes, use 4 minute timeout
    const response = await apiClient.post<ClusterHealthResponse>('/cluster/health', request, {
      timeout: 240000, // 4 minutes
    })
    console.log('Health check response:', response)
    return response
  },
}
