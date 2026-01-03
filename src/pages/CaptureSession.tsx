import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
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
  LinearProgress,
  Chip,
  Slider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import {
  Phone as CucmIcon,
  Router as CubeIcon,
  Link as ExpresswayIcon,
  Visibility,
  VisibilityOff,
  ArrowBack,
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
  ExpandLess,
  Refresh,
  History,
  NetworkCheck,
  Close,
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

interface TargetEntry {
  id: string
  device_type: CaptureDeviceType
  host: string
  port?: number
  interface?: string
  username: string
  password: string
}

const deviceTypeConfig: Record<CaptureDeviceType, { label: string; icon: React.ReactElement; color: string }> = {
  cucm: { label: 'CUCM', icon: <CucmIcon />, color: '#1976d2' },
  cube: { label: 'CUBE', icon: <CubeIcon />, color: '#ed6c02' },
  csr1000v: { label: 'CSR1000v', icon: <CubeIcon />, color: '#0d9488' },
  expressway: { label: 'Expressway', icon: <ExpresswayIcon />, color: '#9c27b0' },
}

const targetStatusConfig: Record<CaptureTargetStatus, { color: string; label: string }> = {
  pending: { color: '#6b7280', label: 'Pending' },
  configuring: { color: '#3b82f6', label: 'Configuring' },
  ready: { color: '#3b82f6', label: 'Ready' },
  capturing: { color: '#3b82f6', label: 'Capturing' },
  stopping: { color: '#eab308', label: 'Stopping' },
  collecting: { color: '#3b82f6', label: 'Collecting' },
  completed: { color: '#22c55e', label: 'Completed' },
  failed: { color: '#ef4444', label: 'Failed' },
  cancelled: { color: '#eab308', label: 'Cancelled' },
}

export default function CaptureSession() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()

  // Targets list
  const [targets, setTargets] = useState<TargetEntry[]>([])

  // Add device dialog
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [newDeviceType, setNewDeviceType] = useState<CaptureDeviceType>('cucm')
  const [newHost, setNewHost] = useState('')
  const [newPort, setNewPort] = useState<number>(22)
  const [newInterface, setNewInterface] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Configuration
  const [sessionName, setSessionName] = useState('')
  const [duration, setDuration] = useState(60)
  const [filterHost, setFilterHost] = useState('')
  const [filterPort, setFilterPort] = useState<number | ''>('')
  const [showFilters, setShowFilters] = useState(false)

  // Device detail modal
  const [selectedTarget, setSelectedTarget] = useState<TargetEntry | null>(null)
  const [showTargetPassword, setShowTargetPassword] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  // Session state
  const [activeSession, setActiveSession] = useState<CaptureSessionStatusResponse | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)

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
          setIsCapturing(false)
          loadSessions()
        } else if (response.session.status === 'failed') {
          enqueueSnackbar('Capture session failed', { variant: 'error' })
          setIsCapturing(false)
          loadSessions()
        }
      } catch (error) {
        console.error('Failed to poll session:', error)
      }
    }, interval)

    return () => clearTimeout(timer)
  }, [activeSession, enqueueSnackbar, loadSessions])

  const handleDeviceTypeChange = (type: CaptureDeviceType) => {
    setNewDeviceType(type)
    setNewPort(defaultCapturePorts[type])
    setNewInterface('')
  }

  const handleAddTarget = () => {
    if (!newHost) {
      enqueueSnackbar('Please enter a host address', { variant: 'warning' })
      return
    }
    if (!newUsername || !newPassword) {
      enqueueSnackbar('Please enter credentials', { variant: 'warning' })
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
      username: newUsername,
      password: newPassword,
    }

    setTargets([...targets, newTarget])
    setNewHost('')
    setNewInterface('')
    setNewUsername('')
    setNewPassword('')
    setShowAddDevice(false)

    enqueueSnackbar(`Added ${deviceTypeConfig[newDeviceType].label}: ${newHost}`, { variant: 'success' })
  }

  const handleRemoveTarget = (id: string) => {
    setTargets(targets.filter(t => t.id !== id))
  }

  const handleStartSession = async () => {
    if (targets.length === 0) {
      enqueueSnackbar('Please add at least one device', { variant: 'warning' })
      return
    }

    setIsStarting(true)
    setIsCapturing(true)

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
      setIsCapturing(false)
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
    } catch {
      enqueueSnackbar('Failed to delete session', { variant: 'error' })
    }
  }

  const handleNewSession = () => {
    setTargets([])
    setSessionName('')
    setDuration(60)
    setFilterHost('')
    setFilterPort('')
    setActiveSession(null)
    setCountdown(null)
    setIsCapturing(false)
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
      case 'configuring': return 'Configuring devices...'
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

  const getStatusColor = (status: CaptureTargetStatus) => {
    return targetStatusConfig[status]?.color || '#6b7280'
  }

  const getStatusIcon = (status: CaptureTargetStatus, size: number = 24) => {
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ fontSize: size }} color="success" />
      case 'failed':
      case 'cancelled':
        return <ErrorIcon sx={{ fontSize: size }} color="error" />
      case 'capturing':
      case 'configuring':
      case 'collecting':
      case 'stopping':
        return <CircularProgress size={size} />
      default:
        return <PendingIcon sx={{ fontSize: size }} color="disabled" />
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Get target status from active session
  const getTargetStatus = (host: string): CaptureTargetInfo | undefined => {
    return activeSession?.session?.targets?.find(t => t.host === host)
  }

  const session = activeSession?.session
  const isFinished = session && canDownloadSession(session.status)
  const isFailed = session && (session.status === 'failed' || session.status === 'cancelled')

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/')}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" gutterBottom>
              Packet Capture Session
            </Typography>
            <Typography color="text.secondary">
              Capture packets simultaneously from multiple devices
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {!isCapturing && (
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setShowAddDevice(true)}
              disabled={targets.length >= 10}
            >
              Add Device
            </Button>
          )}
          {targets.length > 0 && !isCapturing && (
            <Button
              variant="contained"
              color="success"
              startIcon={isStarting ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
              onClick={handleStartSession}
              disabled={isStarting}
            >
              {isStarting ? 'Starting...' : 'Start Capture'}
            </Button>
          )}
          {isCapturing && !isFinished && !isFailed && (
            <Button
              variant="contained"
              color="error"
              startIcon={isStopping ? <CircularProgress size={20} color="inherit" /> : <Stop />}
              onClick={handleStopSession}
              disabled={isStopping || session?.status === 'stopping' || session?.status === 'collecting'}
            >
              {isStopping ? 'Stopping...' : 'Stop Capture'}
            </Button>
          )}
          {(isFinished || isFailed) && (
            <>
              {isFinished && activeSession?.download_available && (
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={() => handleDownload(session!.session_id, session!.bundle_filename)}
                >
                  Download Bundle
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<PlayArrow />}
                onClick={handleNewSession}
              >
                New Session
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Active Capture Status */}
      {isCapturing && session && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isFinished ? (
                <CheckCircle sx={{ fontSize: 48 }} color="success" />
              ) : isFailed ? (
                <ErrorIcon sx={{ fontSize: 48 }} color="error" />
              ) : (
                <CircularProgress size={48} />
              )}
              <Box>
                <Typography variant="h5">
                  {session.name || 'Capture Session'}
                </Typography>
                <Typography color="text.secondary">
                  {getStatusMessage(session.status)}
                </Typography>
              </Box>
            </Box>

            {/* Countdown Timer */}
            {session.status === 'capturing' && countdown && (
              <Box sx={{ textAlign: 'right' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Timer color="primary" />
                  <Typography variant="h4" sx={{ fontFamily: 'monospace' }}>
                    {formatTime(countdown.remaining)}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {formatTime(countdown.elapsed)} / {formatTime(duration)}
                </Typography>
              </Box>
            )}
          </Box>

          {session.status === 'capturing' && countdown && (
            <LinearProgress
              variant="determinate"
              value={(countdown.elapsed / duration) * 100}
              sx={{ height: 8, borderRadius: 4 }}
            />
          )}

          {session.status === 'configuring' && targets.some(t => t.device_type === 'csr1000v') && (
            <Alert severity="info" sx={{ mt: 2 }}>
              CSR/IOS-XE devices require EPC configuration which takes ~2-3 minutes per device.
            </Alert>
          )}
        </Paper>
      )}

      {/* No devices state */}
      {targets.length === 0 && !isCapturing && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <NetworkCheck sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" color="text.secondary" gutterBottom>
            No Devices Added
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Add devices to capture packets from simultaneously (max 10 devices)
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

      {/* Device Cards */}
      {targets.length > 0 && (
        <Grid container spacing={3}>
          {targets.map(target => {
            const config = deviceTypeConfig[target.device_type]
            const targetStatus = getTargetStatus(target.host)
            const status = targetStatus?.status || 'pending'
            const hasStatus = !!targetStatus

            return (
              <Grid item xs={12} sm={6} md={4} key={target.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderLeft: 4,
                    borderColor: hasStatus ? getStatusColor(status) : 'grey.300',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                      <Chip
                        icon={config.icon}
                        label={config.label}
                        size="small"
                        sx={{ bgcolor: config.color, color: 'white' }}
                      />
                      {!isCapturing && (
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveTarget(target.id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      )}
                    </Box>

                    <Typography variant="h6" gutterBottom>
                      {target.host}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Interface: {target.interface}
                    </Typography>

                    {/* Status during capture */}
                    {hasStatus && (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          {getStatusIcon(status, 20)}
                          <Typography
                            variant="body2"
                            fontWeight="medium"
                            sx={{ color: getStatusColor(status) }}
                          >
                            {targetStatusConfig[status]?.label || status}
                          </Typography>
                        </Box>

                        {targetStatus.message && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {targetStatus.message}
                          </Typography>
                        )}

                        {targetStatus.packets_captured != null && (
                          <Chip
                            label={`${targetStatus.packets_captured.toLocaleString()} packets`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </>
                    )}

                    {!hasStatus && (
                      <Typography variant="body2" color="text.secondary">
                        Ready to capture
                      </Typography>
                    )}
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'flex-start', px: 2, pb: 2 }}>
                    <Button
                      size="small"
                      onClick={() => setSelectedTarget(target)}
                    >
                      View Details
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* Capture Settings - show when devices added but not capturing */}
      {targets.length > 0 && !isCapturing && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>Capture Settings</Typography>
          <Divider sx={{ my: 2 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Session Name (Optional)"
                value={sessionName}
                onChange={e => setSessionName(e.target.value)}
                placeholder="e.g., Debug Call Flow #12345"
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Duration: {formatTime(duration)}
                </Typography>
                <Slider
                  value={duration}
                  onChange={(_, value) => setDuration(value as number)}
                  min={10}
                  max={600}
                  step={10}
                  marks={[
                    { value: 60, label: '1m' },
                    { value: 300, label: '5m' },
                    { value: 600, label: '10m' },
                  ]}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  cursor: 'pointer',
                }}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Packet Filters (Optional)</Typography>
                  {showFilters ? <ExpandLess /> : <ExpandMore />}
                </Box>
              </Box>
              <Collapse in={showFilters}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  <TextField
                    label="Filter by Host IP"
                    value={filterHost}
                    onChange={e => setFilterHost(e.target.value)}
                    placeholder="e.g., 10.0.0.50"
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Filter by Port"
                    type="number"
                    value={filterPort}
                    onChange={e => setFilterPort(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g., 5060"
                    size="small"
                    fullWidth
                  />
                </Box>
              </Collapse>
            </Grid>
          </Grid>

          {targets.some(t => t.device_type === 'csr1000v') && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>CSR1000v Note:</strong> IOS-XE devices require EPC configuration which takes ~2-3 minutes per device.
            </Alert>
          )}
        </Paper>
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
                onChange={e => handleDeviceTypeChange(e.target.value as CaptureDeviceType)}
              >
                <MenuItem value="cucm">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CucmIcon /> CUCM / UC Servers
                  </Box>
                </MenuItem>
                <MenuItem value="csr1000v">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CubeIcon /> CSR1000v / IOS-XE Routers
                  </Box>
                </MenuItem>
                <MenuItem value="expressway">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ExpresswayIcon /> Expressway / VCS
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid item xs={8}>
                <TextField
                  label="Host IP/Hostname"
                  value={newHost}
                  onChange={e => setNewHost(e.target.value)}
                  placeholder="172.168.0.101"
                  fullWidth
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Port"
                  type="number"
                  value={newPort}
                  onChange={e => setNewPort(Number(e.target.value))}
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
              fullWidth
            />

            <Divider />

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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDevice(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddTarget}
            disabled={!newHost || !newUsername || !newPassword}
          >
            Add Device
          </Button>
        </DialogActions>
      </Dialog>

      {/* Device Detail Dialog */}
      <Dialog
        open={!!selectedTarget}
        onClose={() => setSelectedTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedTarget && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    icon={deviceTypeConfig[selectedTarget.device_type].icon}
                    label={deviceTypeConfig[selectedTarget.device_type].label}
                    sx={{
                      bgcolor: deviceTypeConfig[selectedTarget.device_type].color,
                      color: 'white',
                    }}
                  />
                  <Typography variant="h6">{selectedTarget.host}</Typography>
                </Box>
                <IconButton onClick={() => setSelectedTarget(null)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
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
                  onClick={() => toggleSection('info')}
                >
                  <Typography variant="subtitle1" fontWeight="medium">Device Information</Typography>
                  {expandedSections.info !== false ? <ExpandLess /> : <ExpandMore />}
                </Box>
                <Collapse in={expandedSections.info !== false}>
                  <Divider />
                  <Box sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Host</Typography>
                        <Typography variant="body1">{selectedTarget.host}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Port</Typography>
                        <Typography variant="body1">{selectedTarget.port}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Interface</Typography>
                        <Typography variant="body1">{selectedTarget.interface}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Username</Typography>
                        <Typography variant="body1">{selectedTarget.username}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">Password</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">
                            {showTargetPassword ? selectedTarget.password : '••••••••'}
                          </Typography>
                          <IconButton size="small" onClick={() => setShowTargetPassword(!showTargetPassword)}>
                            {showTargetPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Collapse>
              </Paper>

              {/* Capture status if active */}
              {(() => {
                const targetStatus = getTargetStatus(selectedTarget.host)
                if (!targetStatus) return null

                return (
                  <Paper variant="outlined">
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => toggleSection('status')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(targetStatus.status, 24)}
                        <Typography variant="subtitle1" fontWeight="medium">Capture Status</Typography>
                      </Box>
                      {expandedSections.status !== false ? <ExpandLess /> : <ExpandMore />}
                    </Box>
                    <Collapse in={expandedSections.status !== false}>
                      <Divider />
                      <Box sx={{ p: 2 }}>
                        <Typography variant="body2">
                          Status: {targetStatusConfig[targetStatus.status]?.label || targetStatus.status}
                        </Typography>
                        {targetStatus.message && (
                          <Typography variant="body2">Message: {targetStatus.message}</Typography>
                        )}
                        {targetStatus.packets_captured != null && (
                          <Typography variant="body2">
                            Packets: {targetStatus.packets_captured.toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    </Collapse>
                  </Paper>
                )
              })()}
            </DialogContent>
            <DialogActions>
              <Button variant="contained" onClick={() => setSelectedTarget(null)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Session History */}
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
                            sx={{
                              bgcolor: canDL ? '#22c55e' : session.status === 'failed' ? '#ef4444' : '#6b7280',
                              color: 'white',
                            }}
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
    </Box>
  )
}
