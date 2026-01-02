# Sprint 5: Cluster Health Status

## Overview

**Sprint Goal:** Implement cluster health monitoring dashboard
**Priority:** HIGH
**Status:** Not Started

---

## User Stories

### CUCM-22: Health Status Service & Types
**Story:** As a developer, I need TypeScript types and API service for cluster health
**Acceptance Criteria:**
- [ ] TypeScript interfaces matching backend API
- [ ] healthService with checkClusterHealth method
- [ ] React Query hook for health checks
- [ ] Error handling for auth/network/timeout errors

**Technical Tasks:**
1. Create `src/types/health.ts` with all health status types
2. Create `src/services/healthService.ts` with API call
3. Create `src/hooks/useClusterHealth.ts` hook
4. Add health types to main types export

---

### CUCM-23: Health Check Form Component
**Story:** As a user, I can enter cluster credentials to run a health check
**Acceptance Criteria:**
- [ ] Reuse ConnectionForm or create HealthCheckForm
- [ ] Select which checks to run (replication, services, ntp, diagnostics, cores)
- [ ] Optional: specify specific nodes to check
- [ ] Loading state during health check
- [ ] Error display for failed connections

**Technical Tasks:**
1. Create `HealthCheckForm.tsx` component
2. Checkbox group for check types
3. Optional node list input
4. Submit handler with validation
5. Loading spinner during API call

---

### CUCM-24: Cluster Health Dashboard
**Story:** As a user, I can see overall cluster health status at a glance
**Acceptance Criteria:**
- [ ] Overall cluster status indicator (healthy/degraded/critical/unknown)
- [ ] Node count summary (healthy/degraded/critical/unreachable)
- [ ] Last checked timestamp
- [ ] Quick health check button
- [ ] Auto-refresh option

**Technical Tasks:**
1. Create `src/pages/Health.tsx` page
2. Add `/health` route to App.tsx
3. Add Health nav item to MainLayout
4. Create `ClusterHealthSummary.tsx` component
5. Status cards with color-coded indicators
6. Refresh button and auto-refresh toggle

---

### CUCM-25: Node Health Cards
**Story:** As a user, I can see detailed health status for each node
**Acceptance Criteria:**
- [ ] Card for each node showing status
- [ ] Expandable sections for each check type
- [ ] Replication status with node table
- [ ] Services list with running/stopped indicators
- [ ] NTP sync status and stratum
- [ ] Core files warning if any exist
- [ ] Diagnostic test results

**Technical Tasks:**
1. Create `NodeHealthCard.tsx` component
2. Create `ReplicationStatus.tsx` component
3. Create `ServicesStatus.tsx` component
4. Create `NTPStatus.tsx` component
5. Create `DiagnosticsStatus.tsx` component
6. Create `CoreFilesStatus.tsx` component
7. Expandable accordion UI for each check

---

### CUCM-26: Health Status Indicators
**Story:** As a user, I can quickly understand health status through visual indicators
**Acceptance Criteria:**
- [ ] Color-coded status badges (green/yellow/red/gray)
- [ ] Status icons (checkmark/warning/error/question)
- [ ] Animated pulse for critical status
- [ ] Tooltip explanations for each status

**Technical Tasks:**
1. Create `HealthStatusBadge.tsx` component
2. Create `HealthStatusIcon.tsx` component
3. Define color palette for health states
4. Add tooltips with status descriptions

---

### CUCM-27: Dashboard Health Widget
**Story:** As a user, I can see cluster health on the main dashboard
**Acceptance Criteria:**
- [ ] Health summary card on Dashboard
- [ ] Shows last known cluster status
- [ ] Quick link to full Health page
- [ ] "Run Health Check" button

**Technical Tasks:**
1. Create `DashboardHealthWidget.tsx` component
2. Add to Dashboard page
3. Store last health check in React Query cache
4. Link to Health page for details

---

## API Types Reference

```typescript
// src/types/health.ts

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown'
export type HealthCheckType = 'replication' | 'services' | 'ntp' | 'diagnostics' | 'cores'

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

export interface NTPStatus {
  status: HealthStatus
  checked_at: string
  synchronized: boolean
  stratum: number | null
  ntp_server: string | null
  offset_ms: number | null
  message: string | null
}

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

export interface CoreFilesStatus {
  status: HealthStatus
  checked_at: string
  core_count: number
  core_files: string[]
  message: string | null
}
```

---

## UI Design

### Health Page Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Cluster Health Status                    [Run Health Check] │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│ │ ● HEALTHY   │ │ 2 Nodes     │ │ 3 Checks    │ │ Last:   │ │
│ │ All systems │ │ 2 Healthy   │ │ All passed  │ │ 2m ago  │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Nodes                                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ cucm-01 (Publisher) 172.168.0.101          ● HEALTHY   │ │
│ │ ├─ Replication ✓ All tables synced                     │ │
│ │ ├─ Services    ✓ 45/45 running                         │ │
│ │ └─ NTP         ✓ Stratum 2, synced                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ cucm-02 (Subscriber) 172.168.0.102         ● HEALTHY   │ │
│ │ ├─ Replication ✓ All tables synced                     │ │
│ │ ├─ Services    ✓ 42/42 running                         │ │
│ │ └─ NTP         ✓ Stratum 3, synced                     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Status Colors
| Status | Primary | Background | Icon |
|--------|---------|------------|------|
| healthy | #2e7d32 (green) | #e8f5e9 | CheckCircle |
| degraded | #ed6c02 (orange) | #fff3e0 | Warning |
| critical | #d32f2f (red) | #ffebee | Error |
| unknown | #757575 (gray) | #f5f5f5 | Help |

---

## Implementation Order

1. **CUCM-22** - Types & Service (foundation)
2. **CUCM-26** - Status Indicators (reusable components)
3. **CUCM-23** - Health Check Form
4. **CUCM-25** - Node Health Cards
5. **CUCM-24** - Health Dashboard Page
6. **CUCM-27** - Dashboard Widget

---

## Definition of Done

- [ ] All TypeScript types match backend API
- [ ] Health check API calls work correctly
- [ ] Visual status indicators are clear and accessible
- [ ] Error states handled gracefully
- [ ] Loading states for async operations
- [ ] Responsive design for mobile/tablet
- [ ] No console errors or warnings
