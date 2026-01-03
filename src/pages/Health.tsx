import { useState } from 'react'
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
  Phone as CucmIcon,
  Router as CubeIcon,
  Link as ExpresswayIcon,
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

export default function Health() {
  const { enqueueSnackbar } = useSnackbar()

  // Device list state
  const [devices, setDevices] = useState<DeviceEntry[]>([])

  // Add device form state
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
    enqueueSnackbar(`Added ${deviceTypeConfig[newDeviceType].label}: ${newHost}`, { variant: 'success' })
  }

  // Remove device from list
  const handleRemoveDevice = (id: string) => {
    setDevices(devices.filter(d => d.id !== id))
  }

  // Run health check
  const handleRunHealthCheck = async () => {
    if (devices.length === 0) {
      enqueueSnackbar('Please add at least one device', { variant: 'warning' })
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
      enqueueSnackbar('Health check completed', { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Health check failed',
        { variant: 'error' }
      )
    } finally {
      setIsChecking(false)
    }
  }

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

  // Format time
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  // Format uptime
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    return `${days}d ${hours}h`
  }

  // Render device check results
  const renderDeviceResults = (device: DeviceHealthResult) => {
    const config = deviceTypeConfig[device.device_type]

    return (
      <Accordion key={`${device.device_type}-${device.host}`} defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            {getStatusIcon(device.status, 32)}
            <Chip
              icon={config.icon}
              label={config.label}
              size="small"
              sx={{ bgcolor: config.color, color: 'white' }}
            />
            <Typography fontWeight="medium">{device.host}</Typography>
            <HealthStatusBadge status={device.status} />
            {!device.reachable && (
              <Chip label="Unreachable" color="error" size="small" />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {device.error ? (
            <Alert severity="error" sx={{ mb: 2 }}>{device.error}</Alert>
          ) : (
            <Typography color="text.secondary" sx={{ mb: 2 }}>{device.message}</Typography>
          )}

          {/* CUCM Results */}
          {device.cucm_checks && (
            <Grid container spacing={2}>
              {device.cucm_checks.services && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getStatusIcon(device.cucm_checks.services.status, 24)}
                        <Typography variant="subtitle2">Services</Typography>
                      </Box>
                      <Typography variant="body2">
                        {device.cucm_checks.services.running_services}/{device.cucm_checks.services.total_services} running
                      </Typography>
                      {device.cucm_checks.services.critical_services_down.length > 0 && (
                        <Typography variant="body2" color="error">
                          Down: {device.cucm_checks.services.critical_services_down.join(', ')}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {device.cucm_checks.ntp && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getStatusIcon(device.cucm_checks.ntp.status, 24)}
                        <Typography variant="subtitle2">NTP</Typography>
                      </Box>
                      <Typography variant="body2">
                        {device.cucm_checks.ntp.synchronized ? 'Synchronized' : 'Not Synchronized'}
                        {device.cucm_checks.ntp.stratum && ` (Stratum ${device.cucm_checks.ntp.stratum})`}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {device.cucm_checks.replication && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getStatusIcon(device.cucm_checks.replication.status, 24)}
                        <Typography variant="subtitle2">Replication</Typography>
                      </Box>
                      <Typography variant="body2">
                        {device.cucm_checks.replication.tables_checked}/{device.cucm_checks.replication.tables_total} tables checked
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {device.cucm_checks.diagnostics && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getStatusIcon(device.cucm_checks.diagnostics.status, 24)}
                        <Typography variant="subtitle2">Diagnostics</Typography>
                      </Box>
                      <Typography variant="body2">
                        {device.cucm_checks.diagnostics.passed_tests}/{device.cucm_checks.diagnostics.total_tests} tests passed
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}

          {/* CUBE Results */}
          {device.cube_checks && (
            <Grid container spacing={2}>
              {device.cube_checks.system && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getStatusIcon(device.cube_checks.system.status, 24)}
                        <Typography variant="subtitle2">System</Typography>
                      </Box>
                      <Typography variant="body2">
                        {device.cube_checks.system.hostname} - {device.cube_checks.system.version}
                      </Typography>
                      {device.cube_checks.system.uptime_seconds && (
                        <Typography variant="body2" color="text.secondary">
                          Uptime: {formatUptime(device.cube_checks.system.uptime_seconds)}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {device.cube_checks.interfaces && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getStatusIcon(device.cube_checks.interfaces.status, 24)}
                        <Typography variant="subtitle2">Interfaces</Typography>
                      </Box>
                      <Typography variant="body2">
                        {device.cube_checks.interfaces.up_interfaces}/{device.cube_checks.interfaces.total_interfaces} up
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {device.cube_checks.voice_calls && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getStatusIcon(device.cube_checks.voice_calls.status, 24)}
                        <Typography variant="subtitle2">Voice Calls</Typography>
                      </Box>
                      <Typography variant="body2">
                        {device.cube_checks.voice_calls.active_calls} active calls
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {device.cube_checks.sip_status && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getStatusIcon(device.cube_checks.sip_status.status, 24)}
                        <Typography variant="subtitle2">SIP Status</Typography>
                      </Box>
                      <Typography variant="body2">
                        {device.cube_checks.sip_status.active_calls} calls, {device.cube_checks.sip_status.total_registrations} registrations
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {device.cube_checks.ntp && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getStatusIcon(device.cube_checks.ntp.status, 24)}
                        <Typography variant="subtitle2">NTP</Typography>
                      </Box>
                      <Typography variant="body2">
                        {device.cube_checks.ntp.synchronized ? 'Synchronized' : 'Not Synchronized'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}

          {/* Expressway Results */}
          {device.expressway_checks && (
            <Grid container spacing={2}>
              {device.expressway_checks.cluster && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getStatusIcon(device.expressway_checks.cluster.status, 24)}
                        <Typography variant="subtitle2">Cluster</Typography>
                      </Box>
                      <Typography variant="body2">
                        {device.expressway_checks.cluster.peer_count} peers
                        {device.expressway_checks.cluster.all_peers_active && ' - All active'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {device.expressway_checks.licensing && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getStatusIcon(device.expressway_checks.licensing.status, 24)}
                        <Typography variant="subtitle2">Licensing</Typography>
                      </Box>
                      <Typography variant="body2">
                        {device.expressway_checks.licensing.license_valid ? 'Valid' : 'Invalid'}
                        {device.expressway_checks.licensing.days_remaining != null &&
                          ` (${device.expressway_checks.licensing.days_remaining} days remaining)`}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {device.expressway_checks.alarms && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getStatusIcon(device.expressway_checks.alarms.status, 24)}
                        <Typography variant="subtitle2">Alarms</Typography>
                      </Box>
                      <Typography variant="body2">
                        {device.expressway_checks.alarms.alarm_count} alarms
                        {device.expressway_checks.alarms.critical_count != null && device.expressway_checks.alarms.critical_count > 0 &&
                          ` (${device.expressway_checks.alarms.critical_count} critical)`}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {device.expressway_checks.ntp && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getStatusIcon(device.expressway_checks.ntp.status, 24)}
                        <Typography variant="subtitle2">NTP</Typography>
                      </Box>
                      <Typography variant="body2">
                        {device.expressway_checks.ntp.synchronized ? 'Synchronized' : 'Not Synchronized'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Checked at {formatTime(device.checked_at)}
          </Typography>
        </AccordionDetails>
      </Accordion>
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Device Health Check
          </Typography>
          <Typography color="text.secondary">
            Monitor the health of CUCM, CUBE, and Expressway devices
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Add Device Form */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Add /> Add Device
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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

              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddDevice}
                disabled={!newHost || !newUsername || !newPassword}
                fullWidth
              >
                Add Device
              </Button>
            </Box>
          </Paper>

          {/* Device List */}
          {devices.length > 0 && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Devices to Check ({devices.length})
              </Typography>
              <Divider sx={{ my: 2 }} />

              <List dense>
                {devices.map(device => {
                  const config = deviceTypeConfig[device.device_type]
                  return (
                    <ListItem
                      key={device.id}
                      secondaryAction={
                        <IconButton edge="end" onClick={() => handleRemoveDevice(device.id)}>
                          <Delete />
                        </IconButton>
                      }
                    >
                      <ListItemIcon>
                        <Chip
                          icon={config.icon}
                          label={config.label}
                          size="small"
                          sx={{ bgcolor: config.color, color: 'white' }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={device.host}
                        secondary={`User: ${device.username}`}
                      />
                    </ListItem>
                  )
                })}
              </List>

              <Button
                variant="contained"
                startIcon={isChecking ? <CircularProgress size={20} color="inherit" /> : <Refresh />}
                onClick={handleRunHealthCheck}
                disabled={isChecking}
                fullWidth
                size="large"
                sx={{ mt: 2 }}
              >
                {isChecking ? 'Checking...' : 'Run Health Check'}
              </Button>
            </Paper>
          )}
        </Grid>

        {/* Results */}
        <Grid item xs={12} md={8}>
          {isChecking && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
              <CircularProgress size={60} />
              <Typography sx={{ mt: 2 }}>Running health checks...</Typography>
              <Typography variant="body2" color="text.secondary">
                This may take a few minutes
              </Typography>
            </Box>
          )}

          {healthResult && !isChecking && (
            <>
              {/* Overall Summary */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {getStatusIcon(healthResult.overall_status)}
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h5">Overall Status</Typography>
                      <HealthStatusBadge status={healthResult.overall_status} />
                    </Box>
                    <Typography color="text.secondary">
                      {healthResult.message}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Checked at {formatTime(healthResult.checked_at)}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Summary Stats */}
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="text.primary">
                        {healthResult.total_devices}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Devices
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {healthResult.healthy_devices}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Healthy
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        {healthResult.degraded_devices}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Degraded
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="error.main">
                        {healthResult.critical_devices + healthResult.unknown_devices}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Critical/Unknown
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Device Results */}
              <Typography variant="h6" gutterBottom>
                Device Details
              </Typography>
              {healthResult.devices.map(device => renderDeviceResults(device))}
            </>
          )}

          {!healthResult && !isChecking && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <HealthAndSafety sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No Health Check Results
              </Typography>
              <Typography color="text.secondary">
                Add devices and run a health check to see results
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  )
}
