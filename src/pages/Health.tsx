import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  InputAdornment,
  Chip,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  Tooltip,
  Switch,
  Menu,
} from '@mui/material'
import {
  Refresh,
  Visibility,
  VisibilityOff,
  HealthAndSafety,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  HelpOutline,
  Add,
  Delete,
  ExpandMore,
  ExpandLess,
  Phone as CucmIcon,
  Router as CubeIcon,
  Link as ExpresswayIcon,
  Download,
  ContentCopy,
  Close,
  Timer,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { healthService } from '@/services'
import { HealthStatusBadge } from '@/components/health'
import type {
  DeviceType,
  DeviceHealthTarget,
  DeviceHealthResponse,
  DeviceHealthResult,
  HealthStatus,
  CUCMHealthCheck,
  CUBEHealthCheck,
  ExpresswayHealthCheck,
} from '@/types'
import {
  defaultCUCMChecks,
  defaultCUBEChecks,
  defaultExpresswayChecks,
} from '@/types'

// Device entry for the form
interface DeviceEntry extends DeviceHealthTarget {
  id: string
}

// Device type configuration
const deviceTypeConfig: Record<DeviceType, { label: string; icon: React.ReactElement; color: string; defaultPort: number }> = {
  cucm: { label: 'CUCM', icon: <CucmIcon />, color: '#1976d2', defaultPort: 22 },
  cube: { label: 'CUBE', icon: <CubeIcon />, color: '#ed6c02', defaultPort: 22 },
  expressway: { label: 'Expressway', icon: <ExpresswayIcon />, color: '#9c27b0', defaultPort: 443 },
}

// Check labels
const cucmCheckLabels: Record<CUCMHealthCheck, string> = {
  replication: 'Database Replication',
  services: 'Services Status',
  ntp: 'NTP Synchronization',
  diagnostics: 'Diagnostics',
  cores: 'Core Files',
}

const cubeCheckLabels: Record<CUBEHealthCheck, string> = {
  system: 'System Info',
  environment: 'Environment',
  interfaces: 'Interfaces',
  voice_calls: 'Voice Calls',
  sip_status: 'SIP Status',
  sip_registration: 'SIP Registration',
  dsp: 'DSP Resources',
  ntp: 'NTP Status',
  redundancy: 'Redundancy/HA',
}

const expresswayCheckLabels: Record<ExpresswayHealthCheck, string> = {
  cluster: 'Cluster Status',
  licensing: 'Licensing',
  alarms: 'Alarms',
  ntp: 'NTP Status',
}

// Refresh interval options
const refreshIntervals = [
  { value: 15000, label: '15s' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '1min' },
  { value: 300000, label: '5min' },
]

export default function Health() {
  const { enqueueSnackbar } = useSnackbar()

  // Device list state
  const [devices, setDevices] = useState<DeviceEntry[]>([])

  // Add device form state
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [newDeviceType, setNewDeviceType] = useState<DeviceType>('cucm')
  const [newHost, setNewHost] = useState('')
  const [newPort, setNewPort] = useState<number>(22)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Check selections for new device
  const [cucmChecks, setCucmChecks] = useState<CUCMHealthCheck[]>(defaultCUCMChecks)
  const [cubeChecks, setCubeChecks] = useState<CUBEHealthCheck[]>(defaultCUBEChecks)
  const [expresswayChecks, setExpresswayChecks] = useState<ExpresswayHealthCheck[]>(defaultExpresswayChecks)

  // Loading and result state
  const [isChecking, setIsChecking] = useState(false)
  const [healthResult, setHealthResult] = useState<DeviceHealthResponse | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30000)
  const [refreshMenuAnchor, setRefreshMenuAnchor] = useState<null | HTMLElement>(null)

  // Detail modal state
  const [selectedDevice, setSelectedDevice] = useState<DeviceHealthResult | null>(null)
  const [expandedChecks, setExpandedChecks] = useState<Record<string, boolean>>({})

  // Handle device type change
  const handleDeviceTypeChange = (type: DeviceType) => {
    setNewDeviceType(type)
    setNewPort(deviceTypeConfig[type].defaultPort)
  }

  // Add device to list
  const handleAddDevice = () => {
    if (!newHost) {
      enqueueSnackbar('Please enter a host address', { variant: 'warning' })
      return
    }
    if (!newUsername || !newPassword) {
      enqueueSnackbar('Please enter credentials', { variant: 'warning' })
      return
    }

    const newDevice: DeviceEntry = {
      id: `${newDeviceType}-${Date.now()}`,
      device_type: newDeviceType,
      host: newHost,
      port: newPort,
      username: newUsername,
      password: newPassword,
      cucm_checks: newDeviceType === 'cucm' ? cucmChecks : undefined,
      cube_checks: newDeviceType === 'cube' ? cubeChecks : undefined,
      expressway_checks: newDeviceType === 'expressway' ? expresswayChecks : undefined,
    }

    setDevices([...devices, newDevice])
    setNewHost('')
    setNewUsername('')
    setNewPassword('')
    setShowAddDevice(false)
    enqueueSnackbar(`Added ${deviceTypeConfig[newDeviceType].label}: ${newHost}`, { variant: 'success' })
  }

  // Remove device from list
  const handleRemoveDevice = (id: string) => {
    setDevices(devices.filter(d => d.id !== id))
  }

  // Run health check
  const handleRunHealthCheck = useCallback(async () => {
    if (devices.length === 0) {
      return
    }

    // Validate all devices have credentials
    const missingCreds = devices.some(d => !d.username || !d.password)
    if (missingCreds) {
      enqueueSnackbar('Please ensure all devices have credentials', { variant: 'warning' })
      return
    }

    setIsChecking(true)
    try {
      const result = await healthService.checkDeviceHealth({
        devices: devices.map(d => ({
          device_type: d.device_type,
          host: d.host,
          port: d.port,
          username: d.username,
          password: d.password,
          cucm_checks: d.cucm_checks,
          cube_checks: d.cube_checks,
          expressway_checks: d.expressway_checks,
        })),
      })
      setHealthResult(result)
      setLastChecked(new Date())
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Health check failed',
        { variant: 'error' }
      )
    } finally {
      setIsChecking(false)
    }
  }, [devices, enqueueSnackbar])

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || devices.length === 0 || selectedDevice) return

    const timer = setInterval(() => {
      handleRunHealthCheck()
    }, refreshInterval)

    return () => clearInterval(timer)
  }, [autoRefresh, refreshInterval, devices.length, selectedDevice, handleRunHealthCheck])

  // Get status icon
  const getStatusIcon = (status: HealthStatus, size: number = 48) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle sx={{ fontSize: size }} color="success" />
      case 'degraded':
        return <Warning sx={{ fontSize: size }} color="warning" />
      case 'critical':
        return <ErrorIcon sx={{ fontSize: size }} color="error" />
      default:
        return <HelpOutline sx={{ fontSize: size }} color="disabled" />
    }
  }

  // Get status color
  const getStatusColor = (status: HealthStatus) => {
    switch (status) {
      case 'healthy': return '#22c55e'
      case 'degraded': return '#eab308'
      case 'critical': return '#ef4444'
      default: return '#6b7280'
    }
  }

  // Format time
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  // Format uptime
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    return `${days}d ${hours}h`
  }

  // Copy to clipboard
  const copyToClipboard = async (data: unknown, label: string) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      enqueueSnackbar(`${label} copied to clipboard`, { variant: 'success' })
    } catch {
      enqueueSnackbar('Failed to copy', { variant: 'error' })
    }
  }

  // Download device report
  const downloadDeviceReport = (device: DeviceHealthResult, format: 'json' | 'txt') => {
    const report = {
      report_type: 'device_health',
      generated_at: new Date().toISOString(),
      device: {
        type: device.device_type,
        host: device.host,
        status: device.status,
        reachable: device.reachable,
        checked_at: device.checked_at,
        message: device.message,
      },
      checks: device.cucm_checks || device.cube_checks || device.expressway_checks,
    }

    let content: string
    let mimeType: string
    let extension: string

    if (format === 'json') {
      content = JSON.stringify(report, null, 2)
      mimeType = 'application/json'
      extension = 'json'
    } else {
      content = `Device Health Report\n${'='.repeat(50)}\n\n`
      content += `Device: ${device.device_type.toUpperCase()}\n`
      content += `Host: ${device.host}\n`
      content += `Status: ${device.status.toUpperCase()}\n`
      content += `Checked: ${formatTime(device.checked_at)}\n`
      content += `Message: ${device.message}\n\n`
      content += `Checks:\n${JSON.stringify(report.checks, null, 2)}`
      mimeType = 'text/plain'
      extension = 'txt'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `health-report-${device.host}-${Date.now()}.${extension}`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Download full report
  const downloadFullReport = () => {
    if (!healthResult) return

    const report = {
      report_type: 'infrastructure_health',
      generated_at: new Date().toISOString(),
      overall_status: healthResult.overall_status,
      summary: {
        total: healthResult.total_devices,
        healthy: healthResult.healthy_devices,
        degraded: healthResult.degraded_devices,
        critical: healthResult.critical_devices,
        unknown: healthResult.unknown_devices,
      },
      devices: healthResult.devices,
    }

    const content = JSON.stringify(report, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `infrastructure-health-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Toggle check expansion
  const toggleCheckExpansion = (checkName: string) => {
    setExpandedChecks(prev => ({ ...prev, [checkName]: !prev[checkName] }))
  }

  // Get quick status for device card
  const getDeviceQuickStatus = (device: DeviceHealthResult) => {
    const checks: Array<{ name: string; ok: boolean }> = []

    if (device.cucm_checks) {
      if (device.cucm_checks.services) checks.push({ name: 'Services', ok: device.cucm_checks.services.status === 'healthy' })
      if (device.cucm_checks.ntp) checks.push({ name: 'NTP', ok: device.cucm_checks.ntp.status === 'healthy' })
      if (device.cucm_checks.replication) checks.push({ name: 'Replication', ok: device.cucm_checks.replication.status === 'healthy' })
    }
    if (device.cube_checks) {
      if (device.cube_checks.system) checks.push({ name: 'System', ok: device.cube_checks.system.status === 'healthy' })
      if (device.cube_checks.sip_status) checks.push({ name: 'SIP', ok: device.cube_checks.sip_status.status === 'healthy' })
      if (device.cube_checks.voice_calls) checks.push({ name: 'Calls', ok: device.cube_checks.voice_calls.status === 'healthy' })
    }
    if (device.expressway_checks) {
      if (device.expressway_checks.cluster) checks.push({ name: 'Cluster', ok: device.expressway_checks.cluster.status === 'healthy' })
      if (device.expressway_checks.alarms) checks.push({ name: 'Alarms', ok: device.expressway_checks.alarms.status === 'healthy' })
      if (device.expressway_checks.licensing) checks.push({ name: 'License', ok: device.expressway_checks.licensing.status === 'healthy' })
    }

    return checks.slice(0, 4)
  }

  // Render check section in detail modal
  const renderCheckSection = (title: string, checkName: string, status: HealthStatus, content: React.ReactNode, data: unknown) => {
    const isExpanded = expandedChecks[checkName] !== false // Default to expanded

    return (
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={() => toggleCheckExpansion(checkName)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getStatusIcon(status, 24)}
            <Typography variant="subtitle1" fontWeight="medium">{title}</Typography>
            <HealthStatusBadge status={status} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Copy">
              <IconButton size="small" onClick={e => { e.stopPropagation(); copyToClipboard(data, title) }}>
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
            {isExpanded ? <ExpandLess /> : <ExpandMore />}
          </Box>
        </Box>
        <Collapse in={isExpanded}>
          <Divider />
          <Box sx={{ p: 2 }}>
            {content}
          </Box>
        </Collapse>
      </Paper>
    )
  }

  // Render device detail modal content
  const renderDeviceDetails = (device: DeviceHealthResult) => {
    return (
      <>
        {device.error && (
          <Alert severity="error" sx={{ mb: 2 }}>{device.error}</Alert>
        )}

        {/* CUCM Checks */}
        {device.cucm_checks?.services && renderCheckSection(
          'Services',
          'services',
          device.cucm_checks.services.status,
          <Box>
            <Typography variant="body2">
              Running: {device.cucm_checks.services.running_services} / {device.cucm_checks.services.total_services}
            </Typography>
            <Typography variant="body2">
              Stopped: {device.cucm_checks.services.stopped_services}
            </Typography>
            {device.cucm_checks.services.critical_services_down.length > 0 && (
              <Alert severity="error" sx={{ mt: 1 }}>
                Down: {device.cucm_checks.services.critical_services_down.join(', ')}
              </Alert>
            )}
          </Box>,
          device.cucm_checks.services
        )}

        {device.cucm_checks?.ntp && renderCheckSection(
          'NTP',
          'ntp',
          device.cucm_checks.ntp.status,
          <Box>
            <Typography variant="body2">
              Synchronized: {device.cucm_checks.ntp.synchronized ? 'Yes' : 'No'}
            </Typography>
            {device.cucm_checks.ntp.stratum && (
              <Typography variant="body2">Stratum: {device.cucm_checks.ntp.stratum}</Typography>
            )}
            {device.cucm_checks.ntp.ntp_server && (
              <Typography variant="body2">Server: {device.cucm_checks.ntp.ntp_server}</Typography>
            )}
          </Box>,
          device.cucm_checks.ntp
        )}

        {device.cucm_checks?.replication && renderCheckSection(
          'Replication',
          'replication',
          device.cucm_checks.replication.status,
          <Box>
            <Typography variant="body2">
              Tables: {device.cucm_checks.replication.tables_checked} / {device.cucm_checks.replication.tables_total}
            </Typography>
            {device.cucm_checks.replication.errors_found && (
              <Alert severity="error" sx={{ mt: 1 }}>Errors found in replication</Alert>
            )}
          </Box>,
          device.cucm_checks.replication
        )}

        {device.cucm_checks?.diagnostics && renderCheckSection(
          'Diagnostics',
          'diagnostics',
          device.cucm_checks.diagnostics.status,
          <Box>
            <Typography variant="body2">
              Tests Passed: {device.cucm_checks.diagnostics.passed_tests} / {device.cucm_checks.diagnostics.total_tests}
            </Typography>
            {device.cucm_checks.diagnostics.failed_tests > 0 && (
              <Typography variant="body2" color="error">
                Failed: {device.cucm_checks.diagnostics.failed_tests}
              </Typography>
            )}
          </Box>,
          device.cucm_checks.diagnostics
        )}

        {/* CUBE Checks */}
        {device.cube_checks?.system && renderCheckSection(
          'System',
          'system',
          device.cube_checks.system.status,
          <Box>
            {device.cube_checks.system.hostname && (
              <Typography variant="body2">Hostname: {device.cube_checks.system.hostname}</Typography>
            )}
            {device.cube_checks.system.version && (
              <Typography variant="body2">Version: {device.cube_checks.system.version}</Typography>
            )}
            {device.cube_checks.system.uptime_seconds && (
              <Typography variant="body2">Uptime: {formatUptime(device.cube_checks.system.uptime_seconds)}</Typography>
            )}
          </Box>,
          device.cube_checks.system
        )}

        {device.cube_checks?.interfaces && renderCheckSection(
          'Interfaces',
          'interfaces',
          device.cube_checks.interfaces.status,
          <Box>
            <Typography variant="body2">
              Up: {device.cube_checks.interfaces.up_interfaces} / {device.cube_checks.interfaces.total_interfaces}
            </Typography>
            {device.cube_checks.interfaces.down_interfaces != null && device.cube_checks.interfaces.down_interfaces > 0 && (
              <Typography variant="body2" color="warning.main">
                Down: {device.cube_checks.interfaces.down_interfaces}
              </Typography>
            )}
          </Box>,
          device.cube_checks.interfaces
        )}

        {device.cube_checks?.voice_calls && renderCheckSection(
          'Voice Calls',
          'voice_calls',
          device.cube_checks.voice_calls.status,
          <Box>
            <Typography variant="body2">
              Active Calls: {device.cube_checks.voice_calls.active_calls}
            </Typography>
            {device.cube_checks.voice_calls.total_calls != null && (
              <Typography variant="body2">Total Today: {device.cube_checks.voice_calls.total_calls}</Typography>
            )}
          </Box>,
          device.cube_checks.voice_calls
        )}

        {device.cube_checks?.sip_status && renderCheckSection(
          'SIP Status',
          'sip_status',
          device.cube_checks.sip_status.status,
          <Box>
            <Typography variant="body2">
              Active Calls: {device.cube_checks.sip_status.active_calls}
            </Typography>
            <Typography variant="body2">
              Registrations: {device.cube_checks.sip_status.total_registrations}
            </Typography>
          </Box>,
          device.cube_checks.sip_status
        )}

        {device.cube_checks?.ntp && renderCheckSection(
          'NTP',
          'cube_ntp',
          device.cube_checks.ntp.status,
          <Box>
            <Typography variant="body2">
              Synchronized: {device.cube_checks.ntp.synchronized ? 'Yes' : 'No'}
            </Typography>
            {device.cube_checks.ntp.stratum && (
              <Typography variant="body2">Stratum: {device.cube_checks.ntp.stratum}</Typography>
            )}
          </Box>,
          device.cube_checks.ntp
        )}

        {/* Expressway Checks */}
        {device.expressway_checks?.cluster && renderCheckSection(
          'Cluster',
          'cluster',
          device.expressway_checks.cluster.status,
          <Box>
            <Typography variant="body2">
              Peers: {device.expressway_checks.cluster.peer_count}
            </Typography>
            <Typography variant="body2">
              All Active: {device.expressway_checks.cluster.all_peers_active ? 'Yes' : 'No'}
            </Typography>
          </Box>,
          device.expressway_checks.cluster
        )}

        {device.expressway_checks?.licensing && renderCheckSection(
          'Licensing',
          'licensing',
          device.expressway_checks.licensing.status,
          <Box>
            <Typography variant="body2">
              Valid: {device.expressway_checks.licensing.license_valid ? 'Yes' : 'No'}
            </Typography>
            {device.expressway_checks.licensing.days_remaining != null && (
              <Typography variant="body2">
                Days Remaining: {device.expressway_checks.licensing.days_remaining}
              </Typography>
            )}
          </Box>,
          device.expressway_checks.licensing
        )}

        {device.expressway_checks?.alarms && renderCheckSection(
          'Alarms',
          'alarms',
          device.expressway_checks.alarms.status,
          <Box>
            <Typography variant="body2">
              Total Alarms: {device.expressway_checks.alarms.alarm_count}
            </Typography>
            {device.expressway_checks.alarms.critical_count != null && device.expressway_checks.alarms.critical_count > 0 && (
              <Typography variant="body2" color="error">
                Critical: {device.expressway_checks.alarms.critical_count}
              </Typography>
            )}
            {device.expressway_checks.alarms.warning_count != null && device.expressway_checks.alarms.warning_count > 0 && (
              <Typography variant="body2" color="warning.main">
                Warning: {device.expressway_checks.alarms.warning_count}
              </Typography>
            )}
          </Box>,
          device.expressway_checks.alarms
        )}

        {device.expressway_checks?.ntp && renderCheckSection(
          'NTP',
          'exp_ntp',
          device.expressway_checks.ntp.status,
          <Box>
            <Typography variant="body2">
              Synchronized: {device.expressway_checks.ntp.synchronized ? 'Yes' : 'No'}
            </Typography>
          </Box>,
          device.expressway_checks.ntp
        )}
      </>
    )
  }

  // Render check selection based on device type
  const renderCheckSelection = () => {
    if (newDeviceType === 'cucm') {
      return (
        <FormGroup row>
          {(Object.keys(cucmCheckLabels) as CUCMHealthCheck[]).map(check => (
            <FormControlLabel
              key={check}
              control={
                <Checkbox
                  checked={cucmChecks.includes(check)}
                  onChange={() => setCucmChecks(prev =>
                    prev.includes(check) ? prev.filter(c => c !== check) : [...prev, check]
                  )}
                  size="small"
                />
              }
              label={cucmCheckLabels[check]}
            />
          ))}
        </FormGroup>
      )
    }
    if (newDeviceType === 'cube') {
      return (
        <FormGroup row>
          {(Object.keys(cubeCheckLabels) as CUBEHealthCheck[]).map(check => (
            <FormControlLabel
              key={check}
              control={
                <Checkbox
                  checked={cubeChecks.includes(check)}
                  onChange={() => setCubeChecks(prev =>
                    prev.includes(check) ? prev.filter(c => c !== check) : [...prev, check]
                  )}
                  size="small"
                />
              }
              label={cubeCheckLabels[check]}
            />
          ))}
        </FormGroup>
      )
    }
    return (
      <FormGroup row>
        {(Object.keys(expresswayCheckLabels) as ExpresswayHealthCheck[]).map(check => (
          <FormControlLabel
            key={check}
            control={
              <Checkbox
                checked={expresswayChecks.includes(check)}
                onChange={() => setExpresswayChecks(prev =>
                  prev.includes(check) ? prev.filter(c => c !== check) : [...prev, check]
                )}
                size="small"
              />
            }
            label={expresswayCheckLabels[check]}
          />
        ))}
      </FormGroup>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Infrastructure Health
          </Typography>
          <Typography color="text.secondary">
            Monitor the health of CUCM, CUBE, and Expressway devices
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setShowAddDevice(true)}
          >
            Add Device
          </Button>
          {devices.length > 0 && (
            <>
              <Button
                variant="contained"
                startIcon={isChecking ? <CircularProgress size={20} color="inherit" /> : <Refresh />}
                onClick={handleRunHealthCheck}
                disabled={isChecking}
              >
                {isChecking ? 'Checking...' : 'Refresh'}
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Auto-refresh">
                  <Switch
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    size="small"
                  />
                </Tooltip>
                <Chip
                  icon={<Timer />}
                  label={refreshIntervals.find(i => i.value === refreshInterval)?.label || '30s'}
                  size="small"
                  onClick={(e) => setRefreshMenuAnchor(e.currentTarget)}
                  sx={{ cursor: 'pointer' }}
                />
                <Menu
                  anchorEl={refreshMenuAnchor}
                  open={Boolean(refreshMenuAnchor)}
                  onClose={() => setRefreshMenuAnchor(null)}
                >
                  {refreshIntervals.map(({ value, label }) => (
                    <MenuItem
                      key={value}
                      selected={refreshInterval === value}
                      onClick={() => { setRefreshInterval(value); setRefreshMenuAnchor(null) }}
                    >
                      {label}
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* No devices state */}
      {devices.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <HealthAndSafety sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" color="text.secondary" gutterBottom>
            No Devices Configured
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Add devices to start monitoring their health status
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowAddDevice(true)}
          >
            Add Your First Device
          </Button>
        </Paper>
      )}

      {/* Overview Card */}
      {healthResult && devices.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {getStatusIcon(healthResult.overall_status, 56)}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5">
                    {healthResult.overall_status.toUpperCase()}
                  </Typography>
                  <Chip
                    size="small"
                    sx={{
                      bgcolor: getStatusColor(healthResult.overall_status),
                      color: 'white',
                    }}
                    label={healthResult.overall_status}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {lastChecked && `Last checked: ${formatRelativeTime(lastChecked)}`}
                  {autoRefresh && ` • Auto-refresh: ${refreshIntervals.find(i => i.value === refreshInterval)?.label}`}
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={downloadFullReport}
            >
              Download Report
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Summary Stats */}
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 2, borderRadius: 1, bgcolor: 'grey.50' }}>
                <Typography variant="h3" color="text.primary">
                  {healthResult.total_devices}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Devices
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 2, borderRadius: 1, bgcolor: '#dcfce7' }}>
                <Typography variant="h3" sx={{ color: '#22c55e' }}>
                  {healthResult.healthy_devices}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Healthy
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 2, borderRadius: 1, bgcolor: '#fef9c3' }}>
                <Typography variant="h3" sx={{ color: '#eab308' }}>
                  {healthResult.degraded_devices}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Degraded
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 2, borderRadius: 1, bgcolor: '#fee2e2' }}>
                <Typography variant="h3" sx={{ color: '#ef4444' }}>
                  {healthResult.critical_devices + healthResult.unknown_devices}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Critical/Unknown
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Device Cards */}
      {devices.length > 0 && (
        <Grid container spacing={3}>
          {(healthResult?.devices || devices.map(d => ({ device_type: d.device_type, host: d.host, status: 'unknown' as HealthStatus, reachable: true, checked_at: '', message: 'Not checked yet' }))).map((device, index) => {
            const config = deviceTypeConfig[device.device_type]
            const quickStatus = healthResult ? getDeviceQuickStatus(device as DeviceHealthResult) : []
            const isResult = 'cucm_checks' in device || 'cube_checks' in device || 'expressway_checks' in device

            return (
              <Grid item xs={12} sm={6} md={4} key={`${device.device_type}-${device.host}-${index}`}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderLeft: 4,
                    borderColor: getStatusColor(device.status),
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          icon={config.icon}
                          label={config.label}
                          size="small"
                          sx={{ bgcolor: config.color, color: 'white' }}
                        />
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveDevice(devices.find(d => d.host === device.host)?.id || '')}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>

                    <Typography variant="h6" gutterBottom>
                      {device.host}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      {getStatusIcon(device.status, 20)}
                      <Typography
                        variant="body1"
                        fontWeight="medium"
                        sx={{ color: getStatusColor(device.status) }}
                      >
                        {device.status.toUpperCase()}
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {device.message}
                    </Typography>

                    {quickStatus.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {quickStatus.map(({ name, ok }) => (
                          <Chip
                            key={name}
                            label={name}
                            size="small"
                            icon={ok ? <CheckCircle fontSize="small" /> : <Warning fontSize="small" />}
                            color={ok ? 'success' : 'warning'}
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    )}

                    {!device.reachable && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        Device unreachable
                      </Alert>
                    )}
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Button
                      size="small"
                      onClick={() => isResult && setSelectedDevice(device as DeviceHealthResult)}
                      disabled={!isResult}
                    >
                      View Details
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Download />}
                      onClick={() => isResult && downloadDeviceReport(device as DeviceHealthResult, 'json')}
                      disabled={!isResult}
                    >
                      Download
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* Loading overlay */}
      {isChecking && devices.length > 0 && !healthResult && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <CircularProgress size={60} />
          <Typography sx={{ mt: 2 }}>Running health checks...</Typography>
          <Typography variant="body2" color="text.secondary">
            Checking {devices.length} device(s)
          </Typography>
        </Box>
      )}

      {/* Add Device Dialog */}
      <Dialog open={showAddDevice} onClose={() => setShowAddDevice(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Device</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Device Type</InputLabel>
              <Select
                value={newDeviceType}
                label="Device Type"
                onChange={e => handleDeviceTypeChange(e.target.value as DeviceType)}
              >
                <MenuItem value="cucm">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CucmIcon /> CUCM
                  </Box>
                </MenuItem>
                <MenuItem value="cube">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CubeIcon /> CUBE / IOS-XE
                  </Box>
                </MenuItem>
                <MenuItem value="expressway">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ExpresswayIcon /> Expressway
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Host"
              value={newHost}
              onChange={e => setNewHost(e.target.value)}
              placeholder="172.168.0.101"
              fullWidth
            />

            <TextField
              label={newDeviceType === 'expressway' ? 'HTTPS Port' : 'SSH Port'}
              type="number"
              value={newPort}
              onChange={e => setNewPort(Number(e.target.value))}
              fullWidth
            />

            <TextField
              label="Username"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              fullWidth
            />

            <TextField
              label="Password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end">
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2">Checks to Run</Typography>
            {renderCheckSelection()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDevice(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddDevice}
            disabled={!newHost || !newUsername || !newPassword}
          >
            Add Device
          </Button>
        </DialogActions>
      </Dialog>

      {/* Device Detail Dialog */}
      <Dialog
        open={!!selectedDevice}
        onClose={() => setSelectedDevice(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedDevice && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    icon={deviceTypeConfig[selectedDevice.device_type].icon}
                    label={deviceTypeConfig[selectedDevice.device_type].label}
                    sx={{
                      bgcolor: deviceTypeConfig[selectedDevice.device_type].color,
                      color: 'white',
                    }}
                  />
                  <Typography variant="h6">{selectedDevice.host}</Typography>
                  <HealthStatusBadge status={selectedDevice.status} />
                </Box>
                <IconButton onClick={() => setSelectedDevice(null)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Typography color="text.secondary">
                  {selectedDevice.message}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Checked at {formatTime(selectedDevice.checked_at)}
                </Typography>
              </Box>

              {renderDeviceDetails(selectedDevice)}
            </DialogContent>
            <DialogActions>
              <Button
                startIcon={<ContentCopy />}
                onClick={() => copyToClipboard(selectedDevice, 'Device data')}
              >
                Copy All
              </Button>
              <Button
                startIcon={<Download />}
                onClick={() => downloadDeviceReport(selectedDevice, 'json')}
              >
                Download JSON
              </Button>
              <Button
                startIcon={<Download />}
                onClick={() => downloadDeviceReport(selectedDevice, 'txt')}
              >
                Download TXT
              </Button>
              <Button variant="contained" onClick={() => setSelectedDevice(null)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}
