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
  Slider,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tooltip,
} from '@mui/material'
import {
  PlayArrow,
  Stop,
  Download,
  Delete,
  Visibility,
  VisibilityOff,
  ExpandMore,
  NetworkCheck,
  Refresh,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useCaptures, useStartCapture, useStopCapture, useDeleteCapture } from '@/hooks'
import { captureService } from '@/services'
import type { CaptureStatus, CaptureInfo, CaptureProtocol, CaptureDeviceType } from '@/types'

const statusConfig: Record<CaptureStatus, { color: 'default' | 'info' | 'success' | 'error' | 'warning'; label: string }> = {
  pending: { color: 'default', label: 'Pending' },
  running: { color: 'info', label: 'Running' },
  stopping: { color: 'warning', label: 'Stopping' },
  completed: { color: 'success', label: 'Completed' },
  failed: { color: 'error', label: 'Failed' },
  cancelled: { color: 'warning', label: 'Cancelled' },
}

export default function Captures() {
  const { enqueueSnackbar } = useSnackbar()
  const { data: capturesData, isLoading, refetch } = useCaptures()
  const startCapture = useStartCapture()
  const stopCapture = useStopCapture()
  const deleteCapture = useDeleteCapture()

  // Form state
  const [deviceType, setDeviceType] = useState<CaptureDeviceType>('cucm')
  const [host, setHost] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [interfaceName, setInterfaceName] = useState('')
  const [duration, setDuration] = useState(60)
  const [showFilters, setShowFilters] = useState(false)
  const [filterHost, setFilterHost] = useState('')
  const [filterPort, setFilterPort] = useState<number | ''>('')
  const [filterProtocol, setFilterProtocol] = useState<CaptureProtocol>('ip')

  // Interface hints based on device type
  const interfaceHint = deviceType === 'cucm' ? 'eth0' : 'GigabitEthernet1'

  const handleStartCapture = async () => {
    if (!host || !username || !password) {
      enqueueSnackbar('Please fill in all required fields', { variant: 'warning' })
      return
    }

    try {
      const request = {
        device_type: deviceType,
        host,
        username,
        password,
        duration_sec: duration,
        interface: interfaceName || undefined,
        filter: showFilters ? {
          host: filterHost || undefined,
          port: filterPort || undefined,
          protocol: filterProtocol,
        } : undefined,
      }

      await startCapture.mutateAsync(request)
      enqueueSnackbar('Packet capture started', { variant: 'success' })

      // Clear form
      setHost('')
      setUsername('')
      setPassword('')
      setInterfaceName('')
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Failed to start capture',
        { variant: 'error' }
      )
    }
  }

  const handleStopCapture = async (captureId: string) => {
    try {
      await stopCapture.mutateAsync(captureId)
      enqueueSnackbar('Capture stopped', { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Failed to stop capture',
        { variant: 'error' }
      )
    }
  }

  const handleDownload = (capture: CaptureInfo) => {
    captureService.downloadCapture(capture.capture_id, capture.filename)
    enqueueSnackbar('Download started', { variant: 'success' })
  }

  const handleDelete = async (captureId: string) => {
    try {
      await deleteCapture.mutateAsync(captureId)
      enqueueSnackbar('Capture deleted', { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Failed to delete capture',
        { variant: 'error' }
      )
    }
  }

  const formatBytes = (bytes?: number): string => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Packet Capture
          </Typography>
          <Typography color="text.secondary">
            Capture network traffic from CUCM, CUBE, and IOS-XE devices
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={() => refetch()}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* Capture Form */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <NetworkCheck /> Start Capture
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Device Type</InputLabel>
                <Select
                  value={deviceType}
                  label="Device Type"
                  onChange={e => {
                    setDeviceType(e.target.value as CaptureDeviceType)
                    setInterfaceName('') // Reset interface when device type changes
                  }}
                >
                  <MenuItem value="cucm">CUCM / UC Servers</MenuItem>
                  <MenuItem value="csr1000v">CUBE / IOS-XE Routers</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Target Host"
                value={host}
                onChange={e => setHost(e.target.value)}
                placeholder="172.168.0.101 or cucm.example.com"
                required
                fullWidth
              />
              <TextField
                label="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Interface"
                value={interfaceName}
                onChange={e => setInterfaceName(e.target.value)}
                placeholder={interfaceHint}
                helperText={`Default: ${interfaceHint}`}
                fullWidth
              />

              <Box>
                <Typography variant="body2" gutterBottom>
                  Duration: {duration} seconds ({Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')})
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

              {/* Optional Filters */}
              <Accordion expanded={showFilters} onChange={() => setShowFilters(!showFilters)}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="body2">Packet Filters (Optional)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                    <FormControl size="small" fullWidth>
                      <InputLabel>Protocol</InputLabel>
                      <Select
                        value={filterProtocol}
                        label="Protocol"
                        onChange={e => setFilterProtocol(e.target.value as CaptureProtocol)}
                      >
                        <MenuItem value="ip">IP (All IP traffic)</MenuItem>
                        <MenuItem value="arp">ARP</MenuItem>
                        <MenuItem value="rarp">RARP</MenuItem>
                        <MenuItem value="all">All Protocols</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Button
                variant="contained"
                startIcon={startCapture.isPending ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
                onClick={handleStartCapture}
                disabled={startCapture.isPending}
                fullWidth
                size="large"
              >
                {startCapture.isPending ? 'Starting...' : 'Start Capture'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Captures List */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Capture History
            </Typography>
            <Divider sx={{ my: 2 }} />

            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : capturesData?.captures?.length ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Host</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Packets</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {capturesData.captures.map((capture) => {
                      const config = statusConfig[capture.status] || statusConfig.pending
                      const isRunning = capture.status === 'running' || capture.status === 'pending'
                      const isCompleted = capture.status === 'completed'

                      return (
                        <TableRow key={capture.capture_id}>
                          <TableCell>
                            <Chip
                              label={config.label}
                              color={config.color}
                              size="small"
                              sx={isRunning ? {
                                animation: 'pulse 1.5s infinite',
                                '@keyframes pulse': {
                                  '0%': { opacity: 1 },
                                  '50%': { opacity: 0.6 },
                                  '100%': { opacity: 1 },
                                },
                              } : undefined}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{capture.host}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {capture.interface}
                            </Typography>
                          </TableCell>
                          <TableCell>{capture.duration_sec}s</TableCell>
                          <TableCell>{capture.packets_captured?.toLocaleString() || '-'}</TableCell>
                          <TableCell>{formatBytes(capture.file_size_bytes)}</TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {formatDate(capture.created_at)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {isRunning && (
                              <Tooltip title="Stop Capture">
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() => handleStopCapture(capture.capture_id)}
                                >
                                  <Stop />
                                </IconButton>
                              </Tooltip>
                            )}
                            {isCompleted && (
                              <Tooltip title="Download .cap file">
                                <IconButton
                                  color="primary"
                                  size="small"
                                  onClick={() => handleDownload(capture)}
                                >
                                  <Download />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Delete">
                              <IconButton
                                color="default"
                                size="small"
                                onClick={() => handleDelete(capture.capture_id)}
                                disabled={isRunning}
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
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <NetworkCheck sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">
                  No captures yet. Start a new capture to begin.
                </Typography>
              </Box>
            )}

            {capturesData?.captures?.some(c => c.status === 'failed') && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Some captures failed. Check the error messages for details.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
