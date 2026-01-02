import { apiClient } from './api'
import type { ConnectionRequest, DiscoverResponse, ClusterNode } from '@/types'

// Backend ClusterNode format
interface BackendClusterNode {
  ip: string
  fqdn: string
  host: string
  role: string
  product: string
  dbrole: string
  raw: string
}

interface BackendDiscoverResponse {
  nodes: BackendClusterNode[]
  raw_output?: string
  raw_output_truncated?: boolean
}

export const clusterService = {
  /**
   * Discover CUCM cluster nodes
   */
  async discover(connection: ConnectionRequest): Promise<DiscoverResponse> {
    // Transform frontend field names to match backend API
    const payload = {
      publisher_host: connection.hostname,
      username: connection.username,
      password: connection.password,
      port: connection.port || 22,
    }

    const response = await apiClient.post<BackendDiscoverResponse>('/discover-nodes', payload)

    console.log('Backend discover response:', response)

    // Transform backend ClusterNode to frontend ClusterNode format
    const transformedNodes: ClusterNode[] = response.nodes.map(node => {
      // Map backend role to frontend role
      const roleMap: Record<string, ClusterNode['role']> = {
        'callmanager': 'publisher',
        'publisher': 'publisher',
        'subscriber': 'subscriber',
        'tftp': 'tftp',
        'cups': 'cups',
      }
      const normalizedRole = node.role?.toLowerCase() || 'subscriber'
      const mappedRole = roleMap[normalizedRole] || normalizedRole

      return {
        hostname: node.host || node.fqdn || node.ip,
        ipAddress: node.ip,
        role: mappedRole,
        version: node.product || undefined,
        status: 'online' as const,
      }
    })

    console.log('Transformed nodes:', transformedNodes)

    return {
      publisher: connection.hostname,
      nodes: transformedNodes,
      totalNodes: transformedNodes.length,
      discoveredAt: new Date().toISOString(),
    }
  },

  /**
   * Test connection to CUCM
   */
  async testConnection(
    connection: ConnectionRequest
  ): Promise<{ success: boolean; message: string }> {
    const payload = {
      publisher_host: connection.hostname,
      username: connection.username,
      password: connection.password,
      port: connection.port || 22,
    }
    return apiClient.post('/connection/test', payload)
  },
}
