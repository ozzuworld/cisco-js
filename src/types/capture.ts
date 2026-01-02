// Packet Capture Types

export type CaptureStatus = 'pending' | 'running' | 'stopping' | 'completed' | 'failed' | 'cancelled'

export type CaptureProtocol = 'ip' | 'arp' | 'rarp' | 'all'

export type CaptureDeviceType = 'cucm' | 'csr1000v'

// Filter for packet capture
export interface CaptureFilter {
  host?: string        // Filter by host IP (bidirectional)
  src?: string         // Filter by source IP (cannot use with host)
  dest?: string        // Filter by destination IP (cannot use with host)
  port?: number        // Filter by port number (1-65535)
  protocol?: CaptureProtocol  // Protocol filter (default: "ip")
}

// Request to start a packet capture
export interface StartCaptureRequest {
  device_type?: CaptureDeviceType // Device type: cucm or csr1000v (default: cucm)
  host: string                    // Device IP/FQDN
  port?: number                   // SSH port (default: 22)
  username: string                // SSH username
  password: string                // SSH password
  duration_sec: number            // Capture duration 10-600 seconds
  interface?: string              // Network interface (cucm: eth0, csr1000v: GigabitEthernet1)
  filename?: string               // Custom filename (auto-generated if not provided)
  filter?: CaptureFilter          // Optional packet filter
  packet_count?: number           // Max packets 100-100000 (default: 100000)
  connect_timeout_sec?: number    // SSH timeout 5-120 (default: 30)
}

// Capture information
export interface CaptureInfo {
  capture_id: string
  device_type?: CaptureDeviceType
  status: CaptureStatus
  host: string
  port: number
  interface: string
  filename: string
  duration_sec: number
  filter?: CaptureFilter
  created_at: string
  started_at?: string
  completed_at?: string
  packets_captured?: number
  file_size_bytes?: number
  error?: string
}

// Response types
export interface StartCaptureResponse {
  capture_id: string
  status: CaptureStatus
  message: string
}

export interface CaptureStatusResponse {
  capture: CaptureInfo
}

export interface CaptureListResponse {
  captures: CaptureInfo[]
  total: number
}

export interface StopCaptureResponse {
  capture_id: string
  status: CaptureStatus
  message: string
}
