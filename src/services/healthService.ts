import { apiClient } from './api'
import type { ClusterHealthRequest, ClusterHealthResponse, DeviceHealthRequest, DeviceHealthResponse } from '@/types'

export const healthService = {
  /**
   * Check cluster health status (legacy CUCM-only endpoint)
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

  /**
   * Check multi-device health status
   * Supports CUCM, CUBE/IOS-XE, and Expressway devices
   */
  async checkDeviceHealth(request: DeviceHealthRequest): Promise<DeviceHealthResponse> {
    console.log('Checking device health for', request.devices.length, 'devices')
    console.log('Request:', JSON.stringify(request, null, 2))
    // Health check can take up to 3 minutes per device, use 5 minute timeout
    const response = await apiClient.post<DeviceHealthResponse>('/health/device', request, {
      timeout: 300000, // 5 minutes
    })
    console.log('Device health response:', response)
    return response
  },
}
