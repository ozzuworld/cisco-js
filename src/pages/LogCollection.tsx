import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import JSZip from 'jszip'
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
  Divider,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Collapse,
  alpha,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  ArrowBack,
  CheckCircle,
  Error as ErrorIcon,
  HelpOutline,
  Download,
  Add,
  Delete,
  PlayArrow,
  ExpandMore,
  ExpandLess,
  FolderOpen,
  Close,
  ContentCopy,
  Dns as CucmIcon,
  Router as CubeIcon,
  Hub as ExpresswayIcon,
  DevicesOther,
  CloudDownload,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { logService, jobService } from '@/services'
import type {
  ClusterNode,
  LogProfile,
  LogDeviceType,
  DeviceProfile,
} from '@/types'

type DeviceType = 'cucm' | 'cube' | 'expressway'

interface DeviceEntry {
  id: string
  type: DeviceType
  host: string
  port: number
  username: string
  password: string
  // CUCM-specific
  discoveredNodes?: ClusterNode[]
  selectedNodes?: string[]
  // CUBE/Expressway-specific
  profile?: string
}

interface DeviceProgress {
  status: 'pending' | 'discovering' | 'running' | 'completed' | 'failed'
  progress: number
  message?: string
  downloadAvailable?: boolean
  collectionId?: string
  jobId?: string
}

const deviceTypeConfig: Record<DeviceType, { label: string; icon: React.ReactElement; color: string; defaultPort: number }> = {
  cucm: { label: 'CUCM', icon: <CucmIcon />, color: '#1976d2', defaultPort: 22 },
  cube: { label: 'CUBE', icon: <CubeIcon />, color: '#ed6c02', defaultPort: 22 },
  expressway: { label: 'Expressway', icon: <ExpresswayIcon />, color: '#9c27b0', defaultPort: 443 },
}

export default function LogCollection() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()

  // Device list
  const [devices, setDevices] = useState<DeviceEntry[]>([])
  const [deviceProgress, setDeviceProgress] = useState<Record<string, DeviceProgress>>({})

  // Add device dialog
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [newDeviceType, setNewDeviceType] = useState<DeviceType>('cucm')
  const [newHost, setNewHost] = useState('')
  const [newPort, setNewPort] = useState<number>(22)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // CUCM node selection dialog
  const [nodeSelectionDevice, setNodeSelectionDevice] = useState<DeviceEntry | null>(null)

  // Collection state
  const [isCollecting, setIsCollecting] = useState(false)
  const [collectionComplete, setCollectionComplete] = useState(false)

  // Profiles for CUBE/Expressway
  const [cubeProfiles, setCubeProfiles] = useState<DeviceProfile[]>([])
  const [expresswayProfiles, setExpresswayProfiles] = useState<DeviceProfile[]>([])
  const [selectedCubeProfile, setSelectedCubeProfile] = useState('voip_trace')
  const [selectedExpresswayProfile, setSelectedExpresswayProfile] = useState('diagnostic_logs')

  // CUCM profiles
  const [cucmProfiles, setCucmProfiles] = useState<LogProfile[]>([])
  const [selectedCucmProfile, setSelectedCucmProfile] = useState('callmanager_full')

  // Detail modal
  const [selectedDevice, setSelectedDevice] = useState<DeviceEntry | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  // Bundle state
  const [isBundling, setIsBundling] = useState(false)
  const [bundleProgress, setBundleProgress] = useState(0)

  // Fallback profiles
  const fallbackCubeProfiles: DeviceProfile[] = [
    { name: 'voip_trace', description: 'VoIP Trace logs - SIP signaling', device_type: 'cube', method: 'voip_trace', include_debug: false },
    { name: 'sip_debug', description: 'SIP debug messages (CPU intensive)', device_type: 'cube', method: 'debug', include_debug: true, duration_sec: 30 },
    { name: 'config_dump', description: 'Configuration snapshot', device_type: 'cube', method: 'config', include_debug: false },
  ]

  const fallbackExpresswayProfiles: DeviceProfile[] = [
    { name: 'diagnostic_full', description: 'Full diagnostic with packet capture', device_type: 'expressway', method: 'diagnostic', tcpdump: true },
    { name: 'diagnostic_logs', description: 'Diagnostic logs only', device_type: 'expressway', method: 'diagnostic', tcpdump: false },
    { name: 'event_log', description: 'Event log snapshot', device_type: 'expressway', method: 'event_log', tcpdump: false },
  ]

  // Fetch profiles on mount
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const response = await logService.getDeviceProfiles()
        setCubeProfiles(response.cube_profiles?.length > 0 ? response.cube_profiles : fallbackCubeProfiles)
        setExpresswayProfiles(response.expressway_profiles?.length > 0 ? response.expressway_profiles : fallbackExpresswayProfiles)
      } catch {
        setCubeProfiles(fallbackCubeProfiles)
        setExpresswayProfiles(fallbackExpresswayProfiles)
      }

      try {
        const profilesResponse = await logService.getProfiles()
        setCucmProfiles(profilesResponse.profiles)
      } catch {
        // CUCM profiles are optional
      }
    }
    fetchProfiles()
  }, [])

  const handleDeviceTypeChange = (type: DeviceType) => {
    setNewDeviceType(type)
    setNewPort(deviceTypeConfig[type].defaultPort)
  }

  const handleAddDevice = () => {
    if (!newHost || !newUsername || !newPassword) {
      enqueueSnackbar('Please fill in all required fields', { variant: 'warning' })
      return
    }

    const newDevice: DeviceEntry = {
      id: `${newDeviceType}-${Date.now()}`,
      type: newDeviceType,
      host: newHost,
      port: newPort,
      username: newUsername,
      password: newPassword,
    }

    setDevices([...devices, newDevice])
    setNewHost('')
    setNewUsername('')
    setNewPassword('')
    setShowAddDevice(false)
    enqueueSnackbar(`Added ${deviceTypeConfig[newDeviceType].label}: ${newHost}`, { variant: 'success' })

    // Auto-discover for CUCM
    if (newDeviceType === 'cucm') {
      handleDiscoverNodes(newDevice)
    }
  }

  const handleRemoveDevice = (id: string) => {
    setDevices(devices.filter(d => d.id !== id))
    setDeviceProgress(prev => {
      const updated = { ...prev }
      delete updated[id]
      return updated
    })
  }

  const handleDiscoverNodes = async (device: DeviceEntry) => {
    setDeviceProgress(prev => ({
      ...prev,
      [device.id]: { status: 'discovering', progress: 0, message: 'Discovering cluster nodes...' }
    }))

    try {
      const response = await logService.discoverNodes({
        publisher_host: device.host,
        username: device.username,
        password: device.password,
        port: device.port,
      })

      setDevices(prev => prev.map(d =>
        d.id === device.id
          ? { ...d, discoveredNodes: response.nodes, selectedNodes: response.nodes.map(n => n.ip) }
          : d
      ))

      setDeviceProgress(prev => ({
        ...prev,
        [device.id]: { status: 'pending', progress: 0, message: `${response.nodes.length} nodes discovered` }
      }))

      enqueueSnackbar(`Discovered ${response.nodes.length} nodes`, { variant: 'success' })
    } catch (error) {
      setDeviceProgress(prev => ({
        ...prev,
        [device.id]: { status: 'failed', progress: 0, message: error instanceof Error ? error.message : 'Discovery failed' }
      }))
      enqueueSnackbar('Failed to discover nodes', { variant: 'error' })
    }
  }

  const handleToggleNode = (deviceId: string, nodeIp: string) => {
    setDevices(prev => prev.map(d =>
      d.id === deviceId
        ? {
            ...d,
            selectedNodes: d.selectedNodes?.includes(nodeIp)
              ? d.selectedNodes.filter(ip => ip !== nodeIp)
              : [...(d.selectedNodes || []), nodeIp]
          }
        : d
    ))
  }

  const canStartCollection = () => {
    if (devices.length === 0) return false

    // Check CUCM devices have discovered and selected nodes
    const cucmDevices = devices.filter(d => d.type === 'cucm')
    for (const d of cucmDevices) {
      if (!d.discoveredNodes || d.discoveredNodes.length === 0) return false
      if (!d.selectedNodes || d.selectedNodes.length === 0) return false
    }

    // Check no devices are still discovering
    const isDiscovering = Object.values(deviceProgress).some(p => p.status === 'discovering')
    if (isDiscovering) return false

    return true
  }

  const handleStartCollection = async () => {
    if (!canStartCollection()) return

    setIsCollecting(true)
    setCollectionComplete(false)

    // Initialize progress
    const initialProgress: Record<string, DeviceProgress> = {}
    devices.forEach(d => {
      initialProgress[d.id] = { status: 'running', progress: 5, message: 'Starting collection...' }
    })
    setDeviceProgress(initialProgress)

    // Start collections
    for (const device of devices) {
      try {
        if (device.type === 'cucm') {
          const job = await jobService.createJob({
            publisher_host: device.host,
            username: device.username,
            password: device.password,
            port: device.port,
            nodes: device.selectedNodes || [],
            profile: selectedCucmProfile,
          })

          setDeviceProgress(prev => ({
            ...prev,
            [device.id]: { ...prev[device.id], jobId: job.id }
          }))

          pollCucmJob(device.id, job.id)
        } else {
          const profileName = device.type === 'cube' ? selectedCubeProfile : selectedExpresswayProfile

          const response = await logService.startCollection({
            device_type: device.type as LogDeviceType,
            host: device.host,
            port: device.port,
            username: device.username,
            password: device.password,
            profile: profileName,
          })

          setDeviceProgress(prev => ({
            ...prev,
            [device.id]: { ...prev[device.id], collectionId: response.collection_id }
          }))

          pollDeviceCollection(device.id, response.collection_id)
        }
      } catch (error) {
        setDeviceProgress(prev => ({
          ...prev,
          [device.id]: { status: 'failed', progress: 0, message: error instanceof Error ? error.message : 'Failed to start' }
        }))
      }
    }
  }

  const pollCucmJob = async (deviceId: string, jobId: string) => {
    const poll = async () => {
      try {
        const status = await jobService.getJobStatus(jobId)
        const jobStatus = status.status?.toLowerCase() || ''

        if (jobStatus === 'queued' || jobStatus === 'running') {
          setDeviceProgress(prev => ({
            ...prev,
            [deviceId]: {
              ...prev[deviceId],
              status: 'running',
              progress: Math.min(status.percent_complete || (prev[deviceId]?.progress || 0) + 5, 90),
              message: 'Collecting logs...'
            }
          }))
          setTimeout(poll, 3000)
        } else if (jobStatus === 'succeeded' || jobStatus === 'partial') {
          setDeviceProgress(prev => ({
            ...prev,
            [deviceId]: {
              ...prev[deviceId],
              status: 'completed',
              progress: 100,
              downloadAvailable: status.download_available === true,
              message: 'Collection complete'
            }
          }))
        } else {
          setDeviceProgress(prev => ({
            ...prev,
            [deviceId]: { ...prev[deviceId], status: 'failed', progress: 0, message: 'Collection failed' }
          }))
        }
      } catch {
        setDeviceProgress(prev => ({
          ...prev,
          [deviceId]: { ...prev[deviceId], status: 'failed', progress: 0, message: 'Connection error' }
        }))
      }
    }
    poll()
  }

  const pollDeviceCollection = async (deviceId: string, collectionId: string) => {
    const poll = async () => {
      try {
        const response = await logService.getCollectionStatus(collectionId)
        const status = response.collection?.status || 'pending'
        const downloadAvailable = response.collection?.download_available || response.download_available || false

        if (status === 'running' || status === 'pending') {
          setDeviceProgress(prev => ({
            ...prev,
            [deviceId]: {
              ...prev[deviceId],
              status: 'running',
              progress: Math.min((prev[deviceId]?.progress || 0) + 10, 90),
              message: 'Collecting logs...'
            }
          }))
          setTimeout(poll, 3000)
        } else if (status === 'completed') {
          if (downloadAvailable) {
            setDeviceProgress(prev => ({
              ...prev,
              [deviceId]: {
                ...prev[deviceId],
                status: 'completed',
                progress: 100,
                downloadAvailable: true,
                message: 'Collection complete'
              }
            }))
          } else {
            setTimeout(poll, 2000)
          }
        } else {
          setDeviceProgress(prev => ({
            ...prev,
            [deviceId]: { ...prev[deviceId], status: 'failed', progress: 0, message: 'Collection failed' }
          }))
        }
      } catch {
        setDeviceProgress(prev => ({
          ...prev,
          [deviceId]: { ...prev[deviceId], status: 'failed', progress: 0, message: 'Connection error' }
        }))
      }
    }
    poll()
  }

  // Check for collection complete
  useEffect(() => {
    if (!isCollecting) return

    const progressValues = Object.values(deviceProgress)
    if (progressValues.length !== devices.length) return

    const allDone = progressValues.every(p => p.status === 'completed' || p.status === 'failed')
    if (allDone) {
      setIsCollecting(false)
      setCollectionComplete(true)
      const successCount = progressValues.filter(p => p.status === 'completed').length
      enqueueSnackbar(`Collection complete: ${successCount}/${devices.length} devices`, { variant: 'success' })
    }
  }, [deviceProgress, devices.length, isCollecting, enqueueSnackbar])

  const handleDownloadDevice = (device: DeviceEntry) => {
    const progress = deviceProgress[device.id]
    if (!progress?.downloadAvailable) return

    if (device.type === 'cucm' && progress.jobId) {
      jobService.downloadAllArtifacts(progress.jobId)
    } else if (progress.collectionId) {
      logService.downloadCollection(progress.collectionId, `logs_${device.type}_${device.host}.tar.gz`)
    }
    enqueueSnackbar(`Downloading logs from ${device.host}...`, { variant: 'info' })
  }

  const handleDownloadBundle = async () => {
    const downloadable = devices.filter(d => deviceProgress[d.id]?.downloadAvailable)
    if (downloadable.length === 0) return

    setIsBundling(true)
    setBundleProgress(0)

    try {
      const zip = new JSZip()
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

      for (let i = 0; i < downloadable.length; i++) {
        const device = downloadable[i]
        const progress = deviceProgress[device.id]

        try {
          let blob: Blob
          let filename: string

          if (device.type === 'cucm' && progress?.jobId) {
            blob = await jobService.fetchArtifactsBlob(progress.jobId)
            filename = `cucm_${device.host.replace(/\./g, '_')}.zip`
          } else if (progress?.collectionId) {
            blob = await logService.fetchCollectionBlob(progress.collectionId)
            filename = `${device.type}_${device.host.replace(/\./g, '_')}.tar.gz`
          } else {
            continue
          }

          zip.file(filename, blob)
          setBundleProgress(Math.round(((i + 1) / downloadable.length) * 100))
        } catch (error) {
          console.error(`Failed to fetch ${device.host}:`, error)
        }
      }

      const bundleBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(bundleBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `log_collection_${timestamp}.zip`
      link.click()
      URL.revokeObjectURL(url)

      enqueueSnackbar('Bundle download complete!', { variant: 'success' })
    } catch (error) {
      enqueueSnackbar('Failed to create bundle', { variant: 'error' })
    } finally {
      setIsBundling(false)
      setBundleProgress(0)
    }
  }

  const getStatusIcon = (status: DeviceProgress['status'], size: number = 24) => {
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ fontSize: size }} color="success" />
      case 'failed':
        return <ErrorIcon sx={{ fontSize: size }} color="error" />
      case 'running':
      case 'discovering':
        return <CircularProgress size={size} />
      default:
        return <HelpOutline sx={{ fontSize: size }} color="disabled" />
    }
  }

  const copyToClipboard = async (data: unknown, label: string) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      enqueueSnackbar(`${label} copied to clipboard`, { variant: 'success' })
    } catch {
      enqueueSnackbar('Failed to copy', { variant: 'error' })
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const getDownloadableCount = () => {
    return devices.filter(d => deviceProgress[d.id]?.downloadAvailable).length
  }

  // Workflow step calculation
  const getActiveStep = () => {
    if (collectionComplete) return 3
    if (isCollecting) return 2
    if (devices.length > 0) return 1
    return 0
  }

  const workflowSteps = [
    { label: 'Add Devices', description: 'Add CUCM, CUBE, or Expressway' },
    { label: 'Configure', description: 'Select nodes and profiles' },
    { label: 'Collect', description: 'Gather logs from devices' },
    { label: 'Download', description: 'Get your log bundle' },
  ]

  // Device counts by type
  const deviceCounts = {
    cucm: devices.filter(d => d.type === 'cucm').length,
    cube: devices.filter(d => d.type === 'cube').length,
    expressway: devices.filter(d => d.type === 'expressway').length,
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" fontWeight={600}>Log Collection</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setShowAddDevice(true)}
            disabled={isCollecting}
          >
            Add Device
          </Button>
          {devices.length > 0 && !collectionComplete && (
            <Button
              variant="contained"
              startIcon={isCollecting ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
              onClick={handleStartCollection}
              disabled={!canStartCollection() || isCollecting}
            >
              {isCollecting ? 'Collecting...' : 'Collect Logs'}
            </Button>
          )}
          {collectionComplete && getDownloadableCount() > 0 && (
            <Button
              variant="contained"
              startIcon={isBundling ? <CircularProgress size={20} color="inherit" /> : <Download />}
              onClick={handleDownloadBundle}
              disabled={isBundling}
            >
              {isBundling ? `Bundling ${bundleProgress}%` : `Download All (${getDownloadableCount()})`}
            </Button>
          )}
        </Box>
      </Box>

      {/* Compact Workflow & Stats Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: 2,
          p: 1.5,
          bgcolor: theme => alpha(theme.palette.primary.main, 0.04),
          borderRadius: 2,
        }}
      >
        {/* Mini Stepper */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {workflowSteps.map((step, index) => {
            const isActive = index === getActiveStep()
            const isCompleted = index < getActiveStep()
            return (
              <Box key={step.label} sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip
                  size="small"
                  label={step.label}
                  icon={isCompleted ? <CheckCircle sx={{ fontSize: 16 }} /> : undefined}
                  sx={{
                    height: 28,
                    fontSize: '0.75rem',
                    fontWeight: isActive ? 600 : 400,
                    bgcolor: isCompleted ? 'success.main' : isActive ? 'primary.main' : 'transparent',
                    color: isCompleted || isActive ? 'white' : 'text.secondary',
                    border: !isCompleted && !isActive ? '1px solid' : 'none',
                    borderColor: 'divider',
                    '& .MuiChip-icon': { color: 'white' },
                  }}
                />
                {index < workflowSteps.length - 1 && (
                  <Box
                    sx={{
                      width: 20,
                      height: 2,
                      bgcolor: isCompleted ? 'success.main' : 'divider',
                      mx: 0.5,
                    }}
                  />
                )}
              </Box>
            )
          })}
        </Box>

        {/* Compact Stats */}
        {devices.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              size="small"
              icon={<DevicesOther sx={{ fontSize: 16 }} />}
              label={`${devices.length} devices`}
              sx={{ bgcolor: alpha('#1976d2', 0.1) }}
            />
            {deviceCounts.cucm > 0 && (
              <Chip
                size="small"
                icon={<CucmIcon sx={{ fontSize: 16, color: '#1976d2' }} />}
                label={deviceCounts.cucm}
                sx={{ bgcolor: alpha('#1976d2', 0.1), minWidth: 50 }}
              />
            )}
            {deviceCounts.cube > 0 && (
              <Chip
                size="small"
                icon={<CubeIcon sx={{ fontSize: 16, color: '#ed6c02' }} />}
                label={deviceCounts.cube}
                sx={{ bgcolor: alpha('#ed6c02', 0.1), minWidth: 50 }}
              />
            )}
            {deviceCounts.expressway > 0 && (
              <Chip
                size="small"
                icon={<ExpresswayIcon sx={{ fontSize: 16, color: '#9c27b0' }} />}
                label={deviceCounts.expressway}
                sx={{ bgcolor: alpha('#9c27b0', 0.1), minWidth: 50 }}
              />
            )}
            {getDownloadableCount() > 0 && (
              <Chip
                size="small"
                icon={<CloudDownload sx={{ fontSize: 16 }} />}
                label={`${getDownloadableCount()} ready`}
                color="success"
              />
            )}
          </Box>
        )}
      </Box>

      {/* No devices state */}
      {devices.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <FolderOpen sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Devices
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowAddDevice(true)}
            sx={{ mt: 2 }}
          >
            Add Device
          </Button>
        </Paper>
      )}

      {/* Collection Summary */}
      {collectionComplete && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CheckCircle sx={{ fontSize: 48 }} color="success" />
              <Box>
                <Typography variant="h5">Collection Complete</Typography>
                <Typography color="text.secondary">
                  {getDownloadableCount()} of {devices.length} devices ready for download
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              onClick={() => {
                setDevices([])
                setDeviceProgress({})
                setCollectionComplete(false)
              }}
            >
              New Collection
            </Button>
          </Box>
        </Paper>
      )}

      {/* Device Cards - Compact Grid */}
      {devices.length > 0 && (
        <Grid container spacing={2}>
          {devices.map(device => {
            const config = deviceTypeConfig[device.type]
            const progress = deviceProgress[device.id]
            const status = progress?.status || 'pending'

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={device.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    overflow: 'hidden',
                    borderLeft: `3px solid ${config.color}`,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: `0 4px 12px rgba(0,0,0,0.12)`,
                    },
                  }}
                >
                  {/* Compact header */}
                  <Box
                    sx={{
                      px: 2,
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      bgcolor: alpha(config.color, 0.05),
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {React.cloneElement(config.icon, { sx: { fontSize: 18, color: config.color } })}
                      <Typography variant="caption" fontWeight={600} color={config.color}>
                        {config.label}
                      </Typography>
                      {/* Status dot */}
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: status === 'completed' ? '#4caf50' :
                                   status === 'failed' ? '#f44336' :
                                   status === 'running' || status === 'discovering' ? '#ff9800' :
                                   'grey.300',
                        }}
                      />
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveDevice(device.id)}
                      disabled={isCollecting}
                      sx={{ p: 0.5 }}
                    >
                      <Delete sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>

                  <CardContent sx={{ flexGrow: 1, p: 1.5, pt: 1.5 }}>
                    {/* Host */}
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {device.host}
                    </Typography>

                    {/* Connection details - inline */}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      :{device.port} · {device.username}
                    </Typography>

                    {/* Status message */}
                    {status === 'discovering' && (
                      <Chip
                        size="small"
                        label="Discovering..."
                        sx={{ height: 20, fontSize: '0.7rem', mb: 1, bgcolor: alpha('#ff9800', 0.1), color: '#ed6c02' }}
                      />
                    )}

                    {/* CUCM discovered nodes - compact list */}
                    {device.type === 'cucm' && device.discoveredNodes && device.discoveredNodes.length > 0 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1 }}>
                        {device.discoveredNodes.map(node => (
                          <Box
                            key={node.ip}
                            onClick={() => handleToggleNode(device.id, node.ip)}
                            sx={{
                              p: 0.75,
                              borderRadius: 1,
                              bgcolor: device.selectedNodes?.includes(node.ip) ? alpha('#1976d2', 0.1) : 'grey.50',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              '&:hover': { bgcolor: alpha('#1976d2', 0.1) },
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: device.selectedNodes?.includes(node.ip) ? 600 : 400 }}>
                              {node.host} <span style={{ color: '#888' }}>({node.role})</span>
                            </Typography>
                            <Checkbox
                              size="small"
                              checked={device.selectedNodes?.includes(node.ip) || false}
                              sx={{ p: 0, '& .MuiSvgIcon-root': { fontSize: 16 } }}
                            />
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* Status / Progress */}
                    {(status === 'running' || status === 'discovering') && (
                      <LinearProgress
                        variant="determinate"
                        value={progress?.progress || 0}
                        sx={{ height: 3, borderRadius: 1, bgcolor: 'grey.200' }}
                      />
                    )}

                    {status === 'completed' && progress?.downloadAvailable && (
                      <Chip size="small" label="Ready" color="success" sx={{ height: 20, fontSize: '0.7rem' }} />
                    )}

                    {status === 'failed' && (
                      <Chip size="small" label="Failed" color="error" sx={{ height: 20, fontSize: '0.7rem' }} />
                    )}

                    {/* CUCM discover button */}
                    {device.type === 'cucm' && !device.discoveredNodes && status !== 'discovering' && (
                      <Button size="small" variant="text" onClick={() => handleDiscoverNodes(device)} sx={{ p: 0, minWidth: 0, fontSize: '0.75rem' }}>
                        Discover
                      </Button>
                    )}
                  </CardContent>

                  <CardActions sx={{ px: 1.5, pb: 1, pt: 0 }}>
                    <Button
                      size="small"
                      startIcon={<Download sx={{ fontSize: 14 }} />}
                      onClick={() => handleDownloadDevice(device)}
                      disabled={!progress?.downloadAvailable}
                      variant={progress?.downloadAvailable ? 'contained' : 'text'}
                      sx={{ ml: 'auto', fontSize: '0.75rem', py: 0.25 }}
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

      {/* Collection Profiles - show before collection starts */}
      {devices.length > 0 && !isCollecting && !collectionComplete && (
        <Paper
          sx={{
            p: 3,
            mt: 3,
            background: theme => theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(30,30,50,0.9) 0%, rgba(40,40,60,0.9) 100%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
            border: theme => `1px solid ${theme.palette.divider}`,
            borderRadius: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box
              sx={{
                width: 8,
                height: 28,
                borderRadius: 1,
                bgcolor: 'primary.main',
              }}
            />
            <Typography variant="h6" fontWeight={600}>Collection Profiles</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select the log collection profile for each device type
          </Typography>
          <Grid container spacing={3}>
            {devices.some(d => d.type === 'cucm') && (
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(25,118,210,0.1)' : 'rgba(25,118,210,0.05)',
                    border: '1px solid',
                    borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(25,118,210,0.3)' : 'rgba(25,118,210,0.2)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <CucmIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={600}>CUCM</Typography>
                  </Box>
                  <FormControl fullWidth size="small">
                    <InputLabel>Profile</InputLabel>
                    <Select
                      value={selectedCucmProfile}
                      label="Profile"
                      onChange={e => setSelectedCucmProfile(e.target.value)}
                    >
                      <MenuItem value="callmanager_full">CallManager Full Bundle</MenuItem>
                      {cucmProfiles.map(p => (
                        <MenuItem key={p.name} value={p.name}>{p.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
            )}
            {devices.some(d => d.type === 'cube') && (
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(237,108,2,0.1)' : 'rgba(237,108,2,0.05)',
                    border: '1px solid',
                    borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(237,108,2,0.3)' : 'rgba(237,108,2,0.2)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <CubeIcon sx={{ color: '#ed6c02', fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={600}>CUBE</Typography>
                  </Box>
                  <FormControl fullWidth size="small">
                    <InputLabel>Profile</InputLabel>
                    <Select
                      value={selectedCubeProfile}
                      label="Profile"
                      onChange={e => setSelectedCubeProfile(e.target.value)}
                    >
                      {cubeProfiles.map(p => (
                        <MenuItem key={p.name} value={p.name}>{p.name} - {p.description}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
            )}
            {devices.some(d => d.type === 'expressway') && (
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(156,39,176,0.1)' : 'rgba(156,39,176,0.05)',
                    border: '1px solid',
                    borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(156,39,176,0.3)' : 'rgba(156,39,176,0.2)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <ExpresswayIcon sx={{ color: '#9c27b0', fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={600}>Expressway</Typography>
                  </Box>
                  <FormControl fullWidth size="small">
                    <InputLabel>Profile</InputLabel>
                    <Select
                      value={selectedExpresswayProfile}
                      label="Profile"
                      onChange={e => setSelectedExpresswayProfile(e.target.value)}
                    >
                      {expresswayProfiles.map(p => (
                        <MenuItem key={p.name} value={p.name}>{p.name} - {p.description}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
            )}
          </Grid>
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
                onChange={e => handleDeviceTypeChange(e.target.value as DeviceType)}
              >
                <MenuItem value="cucm">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CucmIcon /> CUCM Cluster
                  </Box>
                </MenuItem>
                <MenuItem value="cube">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CubeIcon /> CUBE / IOS-XE
                  </Box>
                </MenuItem>
                <MenuItem value="expressway">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <ExpresswayIcon /> Expressway
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid item xs={8}>
                <TextField
                  label={newDeviceType === 'cucm' ? 'Publisher Host' : 'Device Host'}
                  value={newHost}
                  onChange={e => setNewHost(e.target.value)}
                  placeholder="10.1.1.10"
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
              label="Username"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              fullWidth
            />

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
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

      {/* CUCM Node Selection Dialog */}
      <Dialog
        open={!!nodeSelectionDevice}
        onClose={() => setNodeSelectionDevice(null)}
        maxWidth="sm"
        fullWidth
      >
        {nodeSelectionDevice && (
          <>
            <DialogTitle>Select Nodes - {nodeSelectionDevice.host}</DialogTitle>
            <DialogContent>
              <List>
                {nodeSelectionDevice.discoveredNodes?.map(node => (
                  <ListItem key={node.ip} disablePadding>
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={nodeSelectionDevice.selectedNodes?.includes(node.ip) || false}
                        onChange={() => handleToggleNode(nodeSelectionDevice.id, node.ip)}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={node.host}
                      secondary={`${node.ip} - ${node.role}`}
                    />
                  </ListItem>
                ))}
              </List>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setNodeSelectionDevice(null)}>Done</Button>
            </DialogActions>
          </>
        )}
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
                    icon={deviceTypeConfig[selectedDevice.type].icon}
                    label={deviceTypeConfig[selectedDevice.type].label}
                    sx={{
                      bgcolor: deviceTypeConfig[selectedDevice.type].color,
                      color: 'white',
                    }}
                  />
                  <Typography variant="h6">{selectedDevice.host}</Typography>
                </Box>
                <IconButton onClick={() => setSelectedDevice(null)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              {/* Device Info */}
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
                    <Typography variant="body2">Host: {selectedDevice.host}</Typography>
                    <Typography variant="body2">Port: {selectedDevice.port}</Typography>
                    <Typography variant="body2">Username: {selectedDevice.username}</Typography>
                    {selectedDevice.type === 'cucm' && selectedDevice.discoveredNodes && (
                      <Typography variant="body2">
                        Nodes: {selectedDevice.selectedNodes?.length || 0} / {selectedDevice.discoveredNodes.length}
                      </Typography>
                    )}
                  </Box>
                </Collapse>
              </Paper>

              {/* Collection Status */}
              {deviceProgress[selectedDevice.id] && (
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
                    onClick={() => toggleSection('status')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(deviceProgress[selectedDevice.id].status, 24)}
                      <Typography variant="subtitle1" fontWeight="medium">Collection Status</Typography>
                    </Box>
                    {expandedSections.status !== false ? <ExpandLess /> : <ExpandMore />}
                  </Box>
                  <Collapse in={expandedSections.status !== false}>
                    <Divider />
                    <Box sx={{ p: 2 }}>
                      <Typography variant="body2">
                        Status: {deviceProgress[selectedDevice.id].status}
                      </Typography>
                      <Typography variant="body2">
                        Progress: {deviceProgress[selectedDevice.id].progress}%
                      </Typography>
                      {deviceProgress[selectedDevice.id].message && (
                        <Typography variant="body2">
                          Message: {deviceProgress[selectedDevice.id].message}
                        </Typography>
                      )}
                    </Box>
                  </Collapse>
                </Paper>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                startIcon={<ContentCopy />}
                onClick={() => copyToClipboard(selectedDevice, 'Device data')}
              >
                Copy
              </Button>
              <Button
                startIcon={<Download />}
                onClick={() => handleDownloadDevice(selectedDevice)}
                disabled={!deviceProgress[selectedDevice.id]?.downloadAvailable}
              >
                Download
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
