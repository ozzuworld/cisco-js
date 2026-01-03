import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Chip,
  Slider,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import {
  Phone as CucmIcon,
  Router as CubeIcon,
  Link as ExpresswayIcon,
  Visibility,
  VisibilityOff,
  ArrowBack,
  ArrowForward,
  CheckCircle,
  Error as ErrorIcon,
  Pending as PendingIcon,
  Download,
  Add,
  Delete,
  Stop,
  PlayArrow,
  Timer,
  ExpandMore,
  Refresh,
  History,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { captureService } from '@/services'
import type {
  CaptureDeviceType,
  CaptureSessionStatus,
  CaptureTargetStatus,
  CaptureTargetInfo,
  CaptureSessionInfo,
  CaptureSessionStatusResponse,
} from '@/types'
import {
  shouldPollCaptureSession,
  getSessionPollingInterval,
  canDownloadSession,
  defaultCaptureInterfaces,
  defaultCapturePorts,
} from '@/types'

type WizardStep = 'devices' | 'configure' | 'credentials' | 'review' | 'active'

interface TargetEntry {
  id: string
  device_type: CaptureDeviceType
  host: string
  port?: number
  interface?: string
  username: string
  password: string
}

const steps = ['Select Devices', 'Configure', 'Credentials', 'Review']

const deviceTypeConfig: Record<CaptureDeviceType, { label: string; icon: React.ReactElement; color: string }> = {
  cucm: { label: 'CUCM', icon: <CucmIcon />, color: '#1976d2' },
  cube: { label: 'CUBE', icon: <CubeIcon />, color: '#ed6c02' },
  csr1000v: { label: 'CSR1000v', icon: <CubeIcon />, color: '#f57c00' },
  expressway: { label: 'Expressway', icon: <ExpresswayIcon />, color: '#9c27b0' },
}

const targetStatusConfig: Record<CaptureTargetStatus, { color: 'default' | 'info' | 'success' | 'error' | 'warning'; label: string }> = {
  pending: { color: 'default', label: 'Pending' },
  configuring: { color: 'info', label: 'Configuring' },
  ready: { color: 'info', label: 'Ready' },
  capturing: { color: 'info', label: 'Capturing' },
  stopping: { color: 'warning', label: 'Stopping' },
  collecting: { color: 'info', label: 'Collecting' },
  completed: { color: 'success', label: 'Completed' },
  failed: { color: 'error', label: 'Failed' },
  cancelled: { color: 'warning', label: 'Cancelled' },
}

export default function CaptureSession() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('devices')

  // Targets list
  const [targets, setTargets] = useState<TargetEntry[]>([])

  // Add target form
  const [newDeviceType, setNewDeviceType] = useState<CaptureDeviceType>('cucm')
  const [newHost, setNewHost] = useState('')
  const [newPort, setNewPort] = useState<number>(22)
  const [newInterface, setNewInterface] = useState('')

  // Configuration
  const [sessionName, setSessionName] = useState('')
  const [duration, setDuration] = useState(60)
  const [filterHost, setFilterHost] = useState('')
  const [filterPort, setFilterPort] = useState<number | ''>('')

  // Per-device password visibility
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})

  // Session state
  const [activeSession, setActiveSession] = useState<CaptureSessionStatusResponse | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)

  // History
  const [sessions, setSessions] = useState<CaptureSessionInfo[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Countdown timer
  const [countdown, setCountdown] = useState<{ elapsed: number; remaining: number } | null>(null)

  // Load session history
  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true)
    try {
      const response = await captureService.getSessions(20)
      setSessions(response.sessions || [])
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setIsLoadingSessions(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Poll active session
  useEffect(() => {
    if (!activeSession?.session) return

    const status = activeSession.session.status
    if (!shouldPollCaptureSession(status)) return

    const interval = getSessionPollingInterval(status)
    const timer = setTimeout(async () => {
      try {
        const response = await captureService.getSessionStatus(activeSession.session.session_id)
        setActiveSession(response)

        // Update countdown during capturing
        if (response.elapsed_sec !== undefined && response.remaining_sec !== undefined) {
          setCountdown({ elapsed: response.elapsed_sec, remaining: response.remaining_sec })
        }

        // Check if completed
        if (canDownloadSession(response.session.status)) {
          enqueueSnackbar('Capture session completed! Downloads ready.', { variant: 'success' })
          loadSessions()
        } else if (response.session.status === 'failed') {
          enqueueSnackbar('Capture session failed', { variant: 'error' })
          loadSessions()
        }
      } catch (error) {
        console.error('Failed to poll session:', error)
      }
    }, interval)

    return () => clearTimeout(timer)
  }, [activeSession, enqueueSnackbar, loadSessions])

  const getActiveStep = () => {
    switch (currentStep) {
      case 'devices': return 0
      case 'configure': return 1
      case 'credentials': return 2
      case 'review': return 3
      default: return 0
    }
  }

  const handleAddTarget = () => {
    if (!newHost) {
      enqueueSnackbar('Please enter a host address', { variant: 'warning' })
      return
    }

    if (targets.length >= 10) {
      enqueueSnackbar('Maximum 10 devices allowed', { variant: 'warning' })
      return
    }

    const newTarget: TargetEntry = {
      id: `${newDeviceType}-${Date.now()}`,
      device_type: newDeviceType,
      host: newHost,
      port: newPort || defaultCapturePorts[newDeviceType],
      interface: newInterface || defaultCaptureInterfaces[newDeviceType],
      username: '',
      password: '',
    }

    setTargets([...targets, newTarget])
    setNewHost('')
    setNewInterface('')

    enqueueSnackbar(`Added ${deviceTypeConfig[newDeviceType].label}: ${newHost}`, { variant: 'success' })
  }

  const handleRemoveTarget = (id: string) => {
    setTargets(targets.filter(t => t.id !== id))
  }

  // Check if all targets have credentials filled in
  const allCredentialsFilled = targets.length > 0 && targets.every(t => t.username && t.password)

  const handleStartSession = async () => {
    if (targets.length === 0) {
      enqueueSnackbar('Please add at least one device', { variant: 'warning' })
      return
    }

    if (!allCredentialsFilled) {
      enqueueSnackbar('Please enter credentials for all devices', { variant: 'warning' })
      return
    }

    setIsStarting(true)
    setCurrentStep('active')

    try {
      const response = await captureService.startSession({
        name: sessionName || undefined,
        duration_sec: duration,
        filter: filterHost || filterPort ? {
          host: filterHost || undefined,
          port: filterPort || undefined,
        } : undefined,
        targets: targets.map(t => ({
          device_type: t.device_type,
          host: t.host,
          port: t.port,
          interface: t.interface,
          username: t.username,
          password: t.password,
        })),
      })

      // Start polling
      const statusResponse = await captureService.getSessionStatus(response.session_id)
      setActiveSession(statusResponse)
      setCountdown(null)

      enqueueSnackbar('Capture session started!', { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Failed to start session',
        { variant: 'error' }
      )
      setCurrentStep('review')
    } finally {
      setIsStarting(false)
    }
  }

  const handleStopSession = async () => {
    if (!activeSession?.session) return

    setIsStopping(true)
    try {
      await captureService.stopSession(activeSession.session.session_id)
      enqueueSnackbar('Stop signal sent', { variant: 'info' })
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Failed to stop session',
        { variant: 'error' }
      )
    } finally {
      setIsStopping(false)
    }
  }

  const handleDownload = (sessionId: string, filename?: string) => {
    captureService.downloadSessionBundle(sessionId, filename)
    enqueueSnackbar('Download started', { variant: 'success' })
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await captureService.deleteSession(sessionId)
      enqueueSnackbar('Session deleted', { variant: 'success' })
      loadSessions()
    } catch (error) {
      enqueueSnackbar('Failed to delete session', { variant: 'error' })
    }
  }

  const handleNewSession = () => {
    setCurrentStep('devices')
    setTargets([])
    setSessionName('')
    setDuration(60)
    setFilterHost('')
    setFilterPort('')
    setShowPasswords({})
    setActiveSession(null)
    setCountdown(null)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
  }

  const getStatusMessage = (status: CaptureSessionStatus): string => {
    switch (status) {
      case 'pending': return 'Preparing...'
      case 'configuring': return 'Configuring devices... (CSR devices may take ~2-3 minutes)'
      case 'ready': return 'All devices ready'
      case 'starting': return 'Starting captures...'
      case 'capturing': return 'Capturing packets...'
      case 'stopping': return 'Stopping captures...'
      case 'collecting': return 'Retrieving capture files...'
      case 'completed': return 'Session complete'
      case 'partial': return 'Some devices completed'
      case 'failed': return 'Session failed'
      case 'cancelled': return 'Session cancelled'
      default: return status
    }
  }

  // Render wizard step 1: Devices
  const renderDevicesStep = () => (
    <Box>
      <Typography variant="h5" gutterBottom>Select Devices</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Add devices to capture packets from simultaneously. Max 10 devices.
      </Typography>

      <Grid container spacing={3}>
        {/* Add Device Form */}
        <Grid item xs={12} md={5}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Add /> Add Device
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Device Type</InputLabel>
                  <Select
                    value={newDeviceType}
                    label="Device Type"
                    onChange={e => {
                      const type = e.target.value as CaptureDeviceType
                      setNewDeviceType(type)
                      setNewPort(defaultCapturePorts[type])
                      setNewInterface('')
                    }}
                  >
                    <MenuItem value="cucm">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CucmIcon fontSize="small" /> CUCM / UC Servers
                      </Box>
                    </MenuItem>
                    <MenuItem value="csr1000v">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CubeIcon fontSize="small" /> CSR1000v / IOS-XE Routers
                      </Box>
                    </MenuItem>
                    <MenuItem value="expressway">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ExpresswayIcon fontSize="small" /> Expressway / VCS
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                <Grid container spacing={1}>
                  <Grid item xs={8}>
                    <TextField
                      label="Host IP/Hostname"
                      value={newHost}
                      onChange={e => setNewHost(e.target.value)}
                      placeholder="172.168.0.101"
                      size="small"
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Port"
                      type="number"
                      value={newPort}
                      onChange={e => setNewPort(Number(e.target.value))}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                </Grid>

                <TextField
                  label="Interface"
                  value={newInterface}
                  onChange={e => setNewInterface(e.target.value)}
                  placeholder={defaultCaptureInterfaces[newDeviceType]}
                  helperText={`Default: ${defaultCaptureInterfaces[newDeviceType]}`}
                  size="small"
                  fullWidth
                />

                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAddTarget}
                  disabled={!newHost || targets.length >= 10}
                  fullWidth
                >
                  Add Device
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Device List */}
        <Grid item xs={12} md={7}>
          <Card variant="outlined" sx={{ minHeight: 350 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Devices to Capture ({targets.length}/10)
              </Typography>
              <Divider sx={{ my: 2 }} />

              {targets.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <CubeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography color="text.secondary">
                    No devices added yet. Add devices to capture from.
                  </Typography>
                </Box>
              ) : (
                <List dense>
                  {targets.map(target => {
                    const config = deviceTypeConfig[target.device_type]
                    return (
                      <ListItem key={target.id} sx={{ bgcolor: 'action.hover', mb: 1, borderRadius: 1 }}>
                        <ListItemIcon>
                          <Chip
                            icon={config.icon}
                            label={config.label}
                            size="small"
                            sx={{ bgcolor: config.color, color: 'white' }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={target.host}
                          secondary={`Port: ${target.port} | Interface: ${target.interface}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => handleRemoveTarget(target.id)}
                          >
                            <Delete />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    )
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )

  // Render wizard step 2: Configure
  const renderConfigureStep = () => (
    <Box>
      <Typography variant="h5" gutterBottom>Configure Capture</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Set capture duration and optional filters.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Session Settings</Typography>
            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Session Name (Optional)"
                value={sessionName}
                onChange={e => setSessionName(e.target.value)}
                placeholder="e.g., Call Flow Debug - Ticket #12345"
                fullWidth
              />

              <Box>
                <Typography variant="body2" gutterBottom>
                  Capture Duration: {formatTime(duration)}
                </Typography>
                <Slider
                  value={duration}
                  onChange={(_, value) => setDuration(value as number)}
                  min={10}
                  max={600}
                  step={10}
                  marks={[
                    { value: 60, label: '1m' },
                    { value: 120, label: '2m' },
                    { value: 300, label: '5m' },
                    { value: 600, label: '10m' },
                  ]}
                />
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Packet Filters (Optional)</Typography>
            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Filter by Host IP"
                value={filterHost}
                onChange={e => setFilterHost(e.target.value)}
                placeholder="e.g., 10.10.20.50"
                helperText="Filter packets to/from this IP address"
                fullWidth
              />

              <TextField
                label="Filter by Port"
                type="number"
                value={filterPort}
                onChange={e => setFilterPort(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g., 5060"
                helperText="Filter packets on this port number"
                fullWidth
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )

  // Update target credentials
  const updateTargetCredentials = (id: string, field: 'username' | 'password', value: string) => {
    setTargets(targets.map(t =>
      t.id === id ? { ...t, [field]: value } : t
    ))
  }

  // Toggle password visibility for a target
  const toggleShowPassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Render wizard step 3: Credentials
  const renderCredentialsStep = () => (
    <Box>
      <Typography variant="h5" gutterBottom>Enter Credentials</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Enter credentials for each device ({targets.length} device{targets.length !== 1 ? 's' : ''}).
      </Typography>

      <Grid container spacing={3}>
        {targets.map((target) => {
          const config = deviceTypeConfig[target.device_type]
          return (
            <Grid item xs={12} md={6} key={target.id}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Chip
                    icon={config.icon}
                    label={config.label}
                    size="small"
                    sx={{ bgcolor: config.color, color: 'white' }}
                  />
                  <Typography variant="subtitle1" fontWeight="medium">
                    {target.host}
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Username"
                    value={target.username}
                    onChange={e => updateTargetCredentials(target.id, 'username', e.target.value)}
                    required
                    fullWidth
                    size="small"
                  />

                  <TextField
                    label="Password"
                    type={showPasswords[target.id] ? 'text' : 'password'}
                    value={target.password}
                    onChange={e => updateTargetCredentials(target.id, 'password', e.target.value)}
                    required
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => toggleShowPassword(target.id)} edge="end" size="small">
                            {showPasswords[target.id] ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
          )
        })}
      </Grid>
    </Box>
  )

  // Render wizard step 4: Review
  const renderReviewStep = () => (
    <Box>
      <Typography variant="h5" gutterBottom>Review & Start</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Review your capture session configuration.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Session Summary</Typography>
            <Divider sx={{ my: 2 }} />

            <List dense>
              <ListItem>
                <ListItemText
                  primary="Session Name"
                  secondary={sessionName || '(Auto-generated)'}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Duration"
                  secondary={formatTime(duration)}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Devices"
                  secondary={`${targets.length} device(s)`}
                />
              </ListItem>
              {(filterHost || filterPort) && (
                <ListItem>
                  <ListItemText
                    primary="Filters"
                    secondary={[
                      filterHost ? `Host: ${filterHost}` : null,
                      filterPort ? `Port: ${filterPort}` : null,
                    ].filter(Boolean).join(', ')}
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Devices</Typography>
            <Divider sx={{ my: 2 }} />

            <List dense>
              {targets.map(target => {
                const config = deviceTypeConfig[target.device_type]
                return (
                  <ListItem key={target.id}>
                    <ListItemIcon>
                      <Chip
                        label={config.label}
                        size="small"
                        sx={{ bgcolor: config.color, color: 'white', minWidth: 80 }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={target.host}
                      secondary={`${target.interface} • User: ${target.username}`}
                    />
                  </ListItem>
                )
              })}
            </List>
          </Paper>
        </Grid>

        {targets.some(t => t.device_type === 'csr1000v') && (
          <Grid item xs={12}>
            <Alert severity="warning">
              <strong>CSR1000v Configuration Time:</strong> CSR/IOS-XE devices require Embedded Packet Capture (EPC) configuration which takes approximately 2-3 minutes per device.
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  )

  // Render active capture
  const renderActiveCapture = () => {
    if (!activeSession?.session) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress size={64} />
          <Typography variant="h6" sx={{ mt: 2 }}>Starting capture session...</Typography>
        </Box>
      )
    }

    const session = activeSession.session
    const isCapturing = session.status === 'capturing'
    const isFinished = canDownloadSession(session.status)
    const isFailed = session.status === 'failed' || session.status === 'cancelled'

    return (
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          {isFinished ? (
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          ) : isFailed ? (
            <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          ) : (
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <CircularProgress
                variant={isCapturing && countdown ? 'determinate' : 'indeterminate'}
                value={isCapturing && countdown ? (countdown.elapsed / duration) * 100 : undefined}
                size={80}
                thickness={4}
              />
              {isCapturing && countdown && (
                <Box sx={{
                  position: 'absolute',
                  top: 0, left: 0, bottom: 0, right: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Timer color="primary" />
                </Box>
              )}
            </Box>
          )}

          <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
            {session.name || 'Capture Session'}
          </Typography>
          <Typography color="text.secondary">
            {getStatusMessage(session.status)}
          </Typography>

          {/* Countdown Timer */}
          {isCapturing && countdown && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h3" sx={{ fontFamily: 'monospace' }}>
                {formatTime(countdown.remaining)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatTime(countdown.elapsed)} elapsed / {formatTime(duration)} total
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(countdown.elapsed / duration) * 100}
                sx={{ mt: 2, height: 8, borderRadius: 4 }}
              />
            </Box>
          )}
        </Box>

        {/* Device Status */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Device Status</Typography>
          <Divider sx={{ my: 2 }} />

          <List>
            {session.targets.map((target: CaptureTargetInfo, index: number) => {
              const config = deviceTypeConfig[target.device_type]
              const statusConf = targetStatusConfig[target.status] || targetStatusConfig.pending

              return (
                <ListItem key={index}>
                  <ListItemIcon>
                    {target.status === 'completed' ? (
                      <CheckCircle color="success" />
                    ) : target.status === 'failed' ? (
                      <ErrorIcon color="error" />
                    ) : target.status === 'capturing' || target.status === 'configuring' ? (
                      <CircularProgress size={24} />
                    ) : (
                      <PendingIcon color="disabled" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={config.label} size="small" sx={{ bgcolor: config.color, color: 'white' }} />
                        {target.host}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Chip label={statusConf.label} color={statusConf.color} size="small" sx={{ mr: 1 }} />
                        {target.message && <Typography variant="caption">{target.message}</Typography>}
                        {target.packets_captured !== undefined && (
                          <Typography variant="caption" sx={{ ml: 1 }}>
                            {target.packets_captured.toLocaleString()} packets
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              )
            })}
          </List>
        </Paper>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          {!isFinished && !isFailed && (
            <Button
              variant="contained"
              color="error"
              startIcon={isStopping ? <CircularProgress size={20} color="inherit" /> : <Stop />}
              onClick={handleStopSession}
              disabled={isStopping || session.status === 'stopping' || session.status === 'collecting'}
              size="large"
            >
              {isStopping ? 'Stopping...' : 'Stop Capture'}
            </Button>
          )}

          {isFinished && activeSession.download_available && (
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={() => handleDownload(session.session_id, session.bundle_filename)}
              size="large"
            >
              Download Bundle
            </Button>
          )}

          {(isFinished || isFailed) && (
            <Button
              variant="outlined"
              startIcon={<PlayArrow />}
              onClick={handleNewSession}
              size="large"
            >
              New Session
            </Button>
          )}
        </Box>
      </Box>
    )
  }

  // Render session history
  const renderHistory = () => (
    <Accordion expanded={showHistory} onChange={() => setShowHistory(!showHistory)} sx={{ mt: 3 }}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <History />
          <Typography variant="h6">Session History</Typography>
          <Chip label={sessions.length} size="small" sx={{ ml: 1 }} />
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {isLoadingSessions ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : sessions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">No previous sessions</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Devices</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.map(session => {
                  const canDL = canDownloadSession(session.status)
                  return (
                    <TableRow key={session.session_id}>
                      <TableCell>{session.name || session.session_id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <Chip
                          label={session.status}
                          size="small"
                          color={canDL ? 'success' : session.status === 'failed' ? 'error' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{session.targets.length}</TableCell>
                      <TableCell>{formatTime(session.duration_sec)}</TableCell>
                      <TableCell>{formatDate(session.created_at)}</TableCell>
                      <TableCell align="right">
                        {canDL && (
                          <Tooltip title="Download">
                            <IconButton
                              size="small"
                              onClick={() => handleDownload(session.session_id, session.bundle_filename)}
                            >
                              <Download />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteSession(session.session_id)}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button startIcon={<Refresh />} onClick={loadSessions} disabled={isLoadingSessions}>
            Refresh
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  )

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/')}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h4">Packet Capture Session</Typography>
          <Typography color="text.secondary">
            Capture packets simultaneously from multiple devices
          </Typography>
        </Box>
      </Box>

      {currentStep !== 'active' && (
        <Stepper activeStep={getActiveStep()} sx={{ mb: 4 }}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      )}

      <Paper sx={{ p: 4, minHeight: 500 }}>
        {currentStep === 'devices' && renderDevicesStep()}
        {currentStep === 'configure' && renderConfigureStep()}
        {currentStep === 'credentials' && renderCredentialsStep()}
        {currentStep === 'review' && renderReviewStep()}
        {currentStep === 'active' && renderActiveCapture()}

        {/* Navigation buttons */}
        {currentStep !== 'active' && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => {
                if (currentStep === 'devices') {
                  navigate('/')
                } else if (currentStep === 'configure') {
                  setCurrentStep('devices')
                } else if (currentStep === 'credentials') {
                  setCurrentStep('configure')
                } else if (currentStep === 'review') {
                  setCurrentStep('credentials')
                }
              }}
            >
              {currentStep === 'devices' ? 'Cancel' : 'Back'}
            </Button>

            {currentStep === 'devices' && (
              <Button
                variant="contained"
                endIcon={<ArrowForward />}
                onClick={() => setCurrentStep('configure')}
                disabled={targets.length === 0}
              >
                Next: Configure
              </Button>
            )}

            {currentStep === 'configure' && (
              <Button
                variant="contained"
                endIcon={<ArrowForward />}
                onClick={() => setCurrentStep('credentials')}
              >
                Next: Credentials
              </Button>
            )}

            {currentStep === 'credentials' && (
              <Button
                variant="contained"
                endIcon={<ArrowForward />}
                onClick={() => setCurrentStep('review')}
                disabled={!allCredentialsFilled}
              >
                Next: Review
              </Button>
            )}

            {currentStep === 'review' && (
              <Button
                variant="contained"
                color="success"
                startIcon={isStarting ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
                onClick={handleStartSession}
                disabled={isStarting}
                size="large"
              >
                {isStarting ? 'Starting...' : 'Start Capture'}
              </Button>
            )}
          </Box>
        )}
      </Paper>

      {/* Session History */}
      {renderHistory()}
    </Box>
  )
}
