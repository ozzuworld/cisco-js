import { apiClient } from './api'
import type { ClusterHealthRequest, ClusterHealthResponse } from '@/types'

export const healthService = {
  /**
   * Check cluster health status
   * Performs health checks on CUCM cluster nodes
   */
  async checkClusterHealth(request: ClusterHealthRequest): Promise<ClusterHealthResponse> {
    console.log('Checking cluster health:', request.publisher_host)
    const response = await apiClient.post<ClusterHealthResponse>('/cluster/health', request)
    console.log('Health check response:', response)
    return response
  },
}
