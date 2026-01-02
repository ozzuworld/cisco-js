// Cluster Health Status Types

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown'
export type HealthCheckType = 'replication' | 'services' | 'ntp' | 'diagnostics' | 'cores'

// Request Types
export interface ClusterHealthRequest {
  publisher_host: string
  port?: number
  username: string
  password: string
  connect_timeout_sec?: number
  command_timeout_sec?: number
  nodes?: string[]
  checks?: HealthCheckType[]
}

// Response Types
export interface ClusterHealthResponse {
  cluster_status: HealthStatus
  publisher_host: string
  checked_at: string
  total_nodes: number
  healthy_nodes: number
  degraded_nodes: number
  critical_nodes: number
  unreachable_nodes: number
  nodes: NodeHealthStatus[]
  checks_performed: HealthCheckType[]
  message: string | null
}

export interface NodeHealthStatus {
  ip: string
  hostname: string | null
  role: 'Publisher' | 'Subscriber' | null
  status: HealthStatus
  reachable: boolean
  error: string | null
  checks: {
    replication?: ReplicationStatus
    services?: ServicesStatus
    ntp?: NTPStatus
    diagnostics?: DiagnosticsStatus
    cores?: CoreFilesStatus
  }
  checked_at: string
}

// Replication Check
export interface ReplicationStatus {
  status: HealthStatus
  checked_at: string
  db_version: string | null
  repl_timeout: number | null
  tables_checked: number | null
  tables_total: number | null
  errors_found: boolean
  mismatches_found: boolean
  nodes: ReplicationNodeStatus[]
  message: string | null
}

export interface ReplicationNodeStatus {
  server_name: string
  ip_address: string
  ping_ms: number | null
  db_mon: string | null
  repl_queue: number | null
  group_id: string | null
  setup_state: number | null
  setup_status: string | null
}

// Services Check
export interface ServicesStatus {
  status: HealthStatus
  checked_at: string
  total_services: number
  running_services: number
  stopped_services: number
  critical_services_down: string[]
  services: ServiceInfo[]
  message: string | null
}

export interface ServiceInfo {
  name: string
  status: 'STARTED' | 'STOPPED' | 'STARTING' | 'STOPPING' | 'NOT ACTIVATED'
  is_running: boolean
}

// NTP Check
export interface NTPStatus {
  status: HealthStatus
  checked_at: string
  synchronized: boolean
  stratum: number | null
  ntp_server: string | null
  offset_ms: number | null
  message: string | null
}

// Diagnostics Check
export interface DiagnosticsStatus {
  status: HealthStatus
  checked_at: string
  total_tests: number
  passed_tests: number
  failed_tests: number
  tests: DiagnosticTest[]
  message: string | null
}

export interface DiagnosticTest {
  name: string
  passed: boolean
  message: string | null
}

// Core Files Check
export interface CoreFilesStatus {
  status: HealthStatus
  checked_at: string
  core_count: number
  core_files: string[]
  message: string | null
}
