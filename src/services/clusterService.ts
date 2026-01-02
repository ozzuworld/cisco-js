import { apiClient } from './api'
import type { ConnectionRequest, DiscoverResponse } from '@/types'

export const clusterService = {
  /**
   * Discover CUCM cluster nodes
   */
  async discover(connection: ConnectionRequest): Promise<DiscoverResponse> {
    return apiClient.post<DiscoverResponse>('/api/discover', connection)
  },

  /**
   * Test connection to CUCM
   */
  async testConnection(connection: ConnectionRequest): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/api/connection/test', connection)
  },
}
