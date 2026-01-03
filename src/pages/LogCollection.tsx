import { useState, useEffect } from 'react'
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
  Card,
  CardContent,
  TextField,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Checkbox,
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
  ExpandMore,
  Dns,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { logService, jobService } from '@/services'
import type {
  ClusterNode,
  LogProfile,
  LogDeviceType,
  LogCollectionStatus,
  DeviceProfile,
} from '@/types'

type DeviceType = 'cucm' | 'cube' | 'expressway'
type WizardStep = 'devices' | 'options' | 'progress'

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
  jobId?: string  // Track CUCM job ID
  // CUBE/Expressway-specific
  profile?: string           // Selected profile name
  includeDebug?: boolean     // Legacy - now use profile
  debugDuration?: number     // For debug profiles
  collectionId?: string      // Track CUBE/Expressway collection ID
}

const steps = ['Add Devices', 'Collection Options', 'Collect']

const deviceTypeConfig = {
  cucm: { label: 'CUCM Cluster', icon: <CucmIcon />, defaultPort: 22, color: '#1976d2' },
  cube: { label: 'CUBE', icon: <CubeIcon />, defaultPort: 22, color: '#ed6c02' },
  expressway: { label: 'Expressway', icon: <ExpresswayIcon />, defaultPort: 443, color: '#9c27b0' },
}

export default function LogCollection() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('devices')

  // Device list
  const [devices, setDevices] = useState<DeviceEntry[]>([])
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null)

  // Add device form
  const [newDeviceType, setNewDeviceType] = useState<DeviceType>('cucm')
  const [newHost, setNewHost] = useState('')
  const [newPort, setNewPort] = useState<number>(22)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // CUCM discovery state
  const [isDiscovering, setIsDiscovering] = useState<string | null>(null)

  // Collection options - CUCM
  const [collectionType, setCollectionType] = useState<'regular' | 'profile'>('regular')
  const [profiles, setProfiles] = useState<LogProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState('')
  const [timeRangeType, setTimeRangeType] = useState<'relative' | 'absolute'>('relative')
  const [relativeMinutes, setRelativeMinutes] = useState(60)

  // Collection options - CUBE/Expressway
  const [cubeProfiles, setCubeProfiles] = useState<DeviceProfile[]>([])
  const [expresswayProfiles, setExpresswayProfiles] = useState<DeviceProfile[]>([])
  const [selectedCubeProfile, setSelectedCubeProfile] = useState('')
  const [selectedExpresswayProfile, setSelectedExpresswayProfile] = useState('')
  const [debugDuration, setDebugDuration] = useState(30)

  // Collection state
  const [collectionStatus, setCollectionStatus] = useState<LogCollectionStatus | null>(null)
  const [collectionError, setCollectionError] = useState<string | null>(null)
  const [deviceProgress, setDeviceProgress] = useState<Record<string, {
    status: string
    progress: number
    downloadAvailable?: boolean
    collectionId?: string  // For CUBE/Expressway
    jobId?: string         // For CUCM
  }>>({})

  // Fallback profiles if API is unavailable
  const fallbackCubeProfiles: DeviceProfile[] = [
    { name: 'voip_trace', description: 'VoIP Trace logs - SIP signaling (recommended)', device_type: 'cube', method: 'voip_trace', include_debug: false },
    { name: 'voip_trace_detail', description: 'Detailed VoIP Trace with internal events', device_type: 'cube', method: 'voip_trace', include_debug: false },
    { name: 'sip_debug', description: 'SIP debug messages (CPU intensive)', device_type: 'cube', method: 'debug', include_debug: true, duration_sec: 30 },
    { name: 'voice_debug_full', description: 'Full voice debugging (CPU intensive)', device_type: 'cube', method: 'debug', include_debug: true, duration_sec: 30 },
    { name: 'config_dump', description: 'Configuration and status snapshot', device_type: 'cube', method: 'config', include_debug: false },
  ]

  const fallbackExpresswayProfiles: DeviceProfile[] = [
    { name: 'diagnostic_full', description: 'Full diagnostic logs with packet capture', device_type: 'expressway', method: 'diagnostic', tcpdump: true },
    { name: 'diagnostic_logs', description: 'Diagnostic logs only (faster)', device_type: 'expressway', method: 'diagnostic', tcpdump: false },
    { name: 'event_log', description: 'Event log snapshot (quick status)', device_type: 'expressway', method: 'event_log', tcpdump: false },
  ]

  // Fetch device profiles on mount
  useEffect(() => {
    const fetchDeviceProfiles = async () => {
      try {
        const response = await logService.getDeviceProfiles()
        const cubeProfs = response.cube_profiles?.length > 0 ? response.cube_profiles : fallbackCubeProfiles
        const expProfs = response.expressway_profiles?.length > 0 ? response.expressway_profiles : fallbackExpresswayProfiles
        setCubeProfiles(cubeProfs)
        setExpresswayProfiles(expProfs)
        // Set default selections to first profile
        setSelectedCubeProfile(cubeProfs[0].name)
        setSelectedExpresswayProfile(expProfs[0].name)
      } catch (error) {
        console.error('Failed to fetch device profiles:', error)
        // Use fallback profiles if API fails
        setCubeProfiles(fallbackCubeProfiles)
        setExpresswayProfiles(fallbackExpresswayProfiles)
        setSelectedCubeProfile(fallbackCubeProfiles[0].name)
        setSelectedExpresswayProfile(fallbackExpresswayProfiles[0].name)
      }
    }
    fetchDeviceProfiles()
  }, [])

  const getActiveStep = () => {
    switch (currentStep) {
      case 'devices': return 0
      case 'options': return 1
      case 'progress': return 2
      default: return 0
    }
  }

  // Check if all CUCM devices have completed discovery and have nodes selected
  const areCucmDevicesReady = () => {
    const cucmDevices = devices.filter(d => d.type === 'cucm')
    if (cucmDevices.length === 0) return true // No CUCM devices, OK to proceed

    return cucmDevices.every(d =>
      d.discoveredNodes &&
      d.discoveredNodes.length > 0 &&
      d.selectedNodes &&
      d.selectedNodes.length > 0
    )
  }

  // Check if any CUCM device is still discovering
  const isAnyDiscovering = () => {
    return isDiscovering !== null
  }

  // Get reason why we can't proceed (for tooltip/message)
  const getBlockingReason = () => {
    if (devices.length === 0) return 'Add at least one device'
    if (isAnyDiscovering()) return 'Discovery in progress...'

    const cucmDevices = devices.filter(d => d.type === 'cucm')
    for (const d of cucmDevices) {
      if (!d.discoveredNodes) return `Discover nodes for ${d.host || 'CUCM'}`
      if (!d.selectedNodes || d.selectedNodes.length === 0) return `Select nodes for ${d.host || 'CUCM'}`
    }
    return null
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
      port: newPort || deviceTypeConfig[newDeviceType].defaultPort,
      username: newUsername,
      password: newPassword,
      includeDebug: false,
      debugDuration: 30,
    }

    setDevices([...devices, newDevice])
    setExpandedDevice(newDevice.id)

    // Clear form
    setNewHost('')
    setNewUsername('')
    setNewPassword('')
    setNewPort(deviceTypeConfig[newDeviceType].defaultPort)

    enqueueSnackbar(`Added ${deviceTypeConfig[newDeviceType].label}: ${newHost}`, { variant: 'success' })

    // Auto-discover for CUCM
    if (newDeviceType === 'cucm') {
      handleDiscoverNodes(newDevice)
    }
  }

  const handleRemoveDevice = (id: string) => {
    setDevices(devices.filter(d => d.id !== id))
    if (expandedDevice === id) {
      setExpandedDevice(null)
    }
  }

  const handleDiscoverNodes = async (device: DeviceEntry) => {
    setIsDiscovering(device.id)
    try {
      const response = await logService.discoverNodes({
        publisher_host: device.host,
        username: device.username,
        password: device.password,
        port: device.port,
      })

      setDevices(prev => prev.map(d =>
        d.id === device.id
          ? {
              ...d,
              discoveredNodes: response.nodes,
              selectedNodes: response.nodes.map(n => n.ip),
            }
          : d
      ))

      // Fetch profiles if not already loaded
      if (profiles.length === 0) {
        try {
          const profilesResponse = await logService.getProfiles()
          setProfiles(profilesResponse.profiles)
        } catch {
          // Profiles are optional
        }
      }

      enqueueSnackbar(`Discovered ${response.nodes.length} nodes in cluster`, { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Failed to discover nodes',
        { variant: 'error' }
      )
    } finally {
      setIsDiscovering(null)
    }
  }

  const handleToggleNode = (deviceId: string, hostname: string) => {
    setDevices(prev => prev.map(d =>
      d.id === deviceId
        ? {
            ...d,
            selectedNodes: d.selectedNodes?.includes(hostname)
              ? d.selectedNodes.filter(h => h !== hostname)
              : [...(d.selectedNodes || []), hostname],
          }
        : d
    ))
  }

  const handleUpdateDevice = (deviceId: string, updates: Partial<DeviceEntry>) => {
    setDevices(prev => prev.map(d =>
      d.id === deviceId ? { ...d, ...updates } : d
    ))
  }

  const handleStartCollection = async () => {
    if (devices.length === 0) {
      enqueueSnackbar('Please add at least one device', { variant: 'warning' })
      return
    }

    // Validate CUCM devices have discovered and selected nodes
    const cucmDevices = devices.filter(d => d.type === 'cucm')
    for (const device of cucmDevices) {
      if (!device.discoveredNodes || device.discoveredNodes.length === 0) {
        enqueueSnackbar(`Please discover nodes for CUCM cluster ${device.host} first`, { variant: 'warning' })
        return
      }
      if (!device.selectedNodes || device.selectedNodes.length === 0) {
        enqueueSnackbar(`Please select at least one node for ${device.host}`, { variant: 'warning' })
        return
      }
    }

    setCurrentStep('progress')
    setCollectionError(null)

    // Initialize progress for each device
    const initialProgress: Record<string, { status: string; progress: number }> = {}
    devices.forEach(d => {
      initialProgress[d.id] = { status: 'pending', progress: 0 }
    })
    setDeviceProgress(initialProgress)

    // Start collections for all devices
    try {
      // Start CUCM jobs
      for (const device of cucmDevices) {
        setDeviceProgress(prev => ({
          ...prev,
          [device.id]: { status: 'running', progress: 5 },
        }))

        try {
          const job = await jobService.createJob({
            publisher_host: device.host,
            username: device.username,
            password: device.password,
            port: device.port || 22,
            nodes: device.selectedNodes || [],
            profile: selectedProfile || 'callmanager_full',
          })

          // Store job ID in progress state for reliable download access
          setDeviceProgress(prev => ({
            ...prev,
            [device.id]: { ...prev[device.id], jobId: job.id },
          }))

          // Start polling for CUCM job
          pollCucmJobStatus(device.id, job.id)
        } catch (error) {
          setDeviceProgress(prev => ({
            ...prev,
            [device.id]: { status: 'failed', progress: 0 },
          }))
          enqueueSnackbar(
            `Failed to start collection for ${device.host}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { variant: 'error' }
          )
        }
      }

      // Start CUBE/Expressway collections
      for (const device of devices.filter(d => d.type === 'cube' || d.type === 'expressway')) {
        setDeviceProgress(prev => ({
          ...prev,
          [device.id]: { status: 'running', progress: 10 },
        }))

        try {
          // Determine profile based on device type
          const profileName = device.type === 'cube' ? selectedCubeProfile : selectedExpresswayProfile
          const profiles = device.type === 'cube' ? cubeProfiles : expresswayProfiles
          const profileInfo = profiles.find(p => p.name === profileName)
          const isDebugProfile = profileInfo?.include_debug || profileName.includes('debug')

          const response = await logService.startCollection({
            device_type: device.type as LogDeviceType,
            host: device.host,
            port: device.port,
            username: device.username,
            password: device.password,
            profile: profileName,
            duration_sec: isDebugProfile ? debugDuration : undefined,
          })

          console.log(`[${device.type}] Started collection:`, response.collection_id)

          // Store collection ID in progress state for reliable download access
          setDeviceProgress(prev => ({
            ...prev,
            [device.id]: { ...prev[device.id], collectionId: response.collection_id },
          }))

          setCollectionStatus(response.status)

          // Start polling for this device
          pollDeviceStatus(device.id, response.collection_id)
        } catch (error) {
          setDeviceProgress(prev => ({
            ...prev,
            [device.id]: { status: 'failed', progress: 0 },
          }))
          enqueueSnackbar(
            `Failed to start collection for ${device.host}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { variant: 'error' }
          )
        }
      }

      enqueueSnackbar('Collection started on all devices', { variant: 'success' })
    } catch (error) {
      setCollectionError(error instanceof Error ? error.message : 'Failed to start collection')
    }
  }

  // Poll CUCM job status
  const pollCucmJobStatus = async (deviceId: string, jobId: string) => {
    const poll = async () => {
      try {
        const status = await jobService.getJobStatus(jobId)

        if (status.status === 'running') {
          setDeviceProgress(prev => ({
            ...prev,
            [deviceId]: {
              ...prev[deviceId],
              status: 'running',
              progress: status.percent_complete || Math.min((prev[deviceId]?.progress || 0) + 5, 90),
            },
          }))
          setTimeout(poll, 3000)
        } else if (status.status === 'completed') {
          setDeviceProgress(prev => ({
            ...prev,
            [deviceId]: { ...prev[deviceId], status: 'completed', progress: 100, downloadAvailable: true },
          }))
          // useEffect will handle completion check
        } else if (status.status === 'failed') {
          setDeviceProgress(prev => ({
            ...prev,
            [deviceId]: { ...prev[deviceId], status: 'failed', progress: 0, downloadAvailable: false },
          }))
          // useEffect will handle completion check
        } else {
          // Keep polling for pending status
          setTimeout(poll, 3000)
        }
      } catch {
        setDeviceProgress(prev => ({
          ...prev,
          [deviceId]: { ...prev[deviceId], status: 'failed', progress: 0, downloadAvailable: false },
        }))
        // useEffect will handle completion check
      }
    }

    poll()
  }

  // Poll CUBE/Expressway collection status
  const pollDeviceStatus = async (deviceId: string, collectionIdParam: string) => {
    const poll = async () => {
      try {
        const response = await logService.getCollectionStatus(collectionIdParam)
        const status = response.collection?.status || 'pending'
        // Backend returns download_available inside collection object
        const downloadAvailable = response.collection?.download_available || response.download_available || false

        console.log(`[Poll ${collectionIdParam}] status=${status}, downloadAvailable=${downloadAvailable}`)

        if (status === 'running' || status === 'pending') {
          setDeviceProgress(prev => ({
            ...prev,
            [deviceId]: {
              ...prev[deviceId],
              status: 'running',
              progress: Math.min((prev[deviceId]?.progress || 0) + 10, 90),
              downloadAvailable: false,
            },
          }))
          setTimeout(poll, 3000)
        } else if (status === 'completed') {
          // Only mark as fully complete when download is available
          if (downloadAvailable) {
            console.log(`[Poll ${collectionIdParam}] Collection complete, download available`)
            setDeviceProgress(prev => ({
              ...prev,
              [deviceId]: { ...prev[deviceId], status: 'completed', progress: 100, downloadAvailable: true },
            }))
            // useEffect will handle completion check
          } else {
            // Status is completed but download not yet ready, keep polling
            setDeviceProgress(prev => ({
              ...prev,
              [deviceId]: { ...prev[deviceId], status: 'completed', progress: 95, downloadAvailable: false },
            }))
            setTimeout(poll, 2000)
          }
        } else if (status === 'failed' || status === 'cancelled') {
          setDeviceProgress(prev => ({
            ...prev,
            [deviceId]: { ...prev[deviceId], status: 'failed', progress: 0, downloadAvailable: false },
          }))
          // useEffect will handle completion check
        }
      } catch {
        setDeviceProgress(prev => ({
          ...prev,
          [deviceId]: { ...prev[deviceId], status: 'failed', progress: 0, downloadAvailable: false },
        }))
        // useEffect will handle completion check
      }
    }

    poll()
  }

  // Watch deviceProgress and check for completion when all devices are done
  useEffect(() => {
    const progressValues = Object.values(deviceProgress)
    if (progressValues.length === 0) return
    if (progressValues.length !== devices.length) return // Wait for all devices to have progress

    const allDone = progressValues.every(
      p => (p.status === 'completed' && p.downloadAvailable) || p.status === 'failed'
    )

    if (allDone && collectionStatus !== 'completed' && collectionStatus !== 'failed') {
      const allSuccess = progressValues.every(p => p.status === 'completed' && p.downloadAvailable)
      if (allSuccess) {
        setCollectionStatus('completed')
        enqueueSnackbar('All collections complete! Downloads ready.', { variant: 'success' })
      } else {
        setCollectionStatus('failed')
      }
    }
  }, [deviceProgress, devices.length, collectionStatus, enqueueSnackbar])

  // Download logs for a single device
  const handleDownloadDevice = (device: DeviceEntry) => {
    const progress = deviceProgress[device.id]

    if (!progress?.downloadAvailable) {
      enqueueSnackbar('Download not available yet', { variant: 'warning' })
      return
    }

    if (device.type === 'cucm') {
      // Use jobId from progress state
      const jobId = progress.jobId
      if (jobId) {
        console.log(`[Download] CUCM job ${jobId}`)
        jobService.downloadAllArtifacts(jobId)
        enqueueSnackbar(`Downloading logs from ${device.host}...`, { variant: 'info' })
      } else {
        enqueueSnackbar('Job ID not found', { variant: 'error' })
      }
    } else {
      // CUBE/Expressway - use collectionId from progress state
      const collectionId = progress.collectionId
      if (collectionId) {
        console.log(`[Download] ${device.type} collection ${collectionId}`)
        logService.downloadCollection(collectionId, `logs_${device.type}_${device.host}.tar.gz`)
        enqueueSnackbar(`Downloading logs from ${device.host}...`, { variant: 'info' })
      } else {
        enqueueSnackbar('Collection ID not found', { variant: 'error' })
      }
    }
  }

  // Download all completed logs with staggered timing to avoid browser blocking
  const handleDownloadAll = () => {
    const downloadableDevices = devices.filter(device => {
      const progress = deviceProgress[device.id]
      return progress?.status === 'completed' && progress?.downloadAvailable
    })

    if (downloadableDevices.length === 0) {
      enqueueSnackbar('No downloads available yet', { variant: 'warning' })
      return
    }

    enqueueSnackbar(`Starting ${downloadableDevices.length} download(s)...`, { variant: 'success' })

    // Stagger downloads with 500ms delay to prevent browser from blocking
    downloadableDevices.forEach((device, index) => {
      setTimeout(() => {
        const progress = deviceProgress[device.id]
        if (device.type === 'cucm' && progress?.jobId) {
          console.log(`[Download All] CUCM job ${progress.jobId} (${index + 1}/${downloadableDevices.length})`)
          jobService.downloadAllArtifacts(progress.jobId)
        } else if ((device.type === 'cube' || device.type === 'expressway') && progress?.collectionId) {
          console.log(`[Download All] ${device.type} collection ${progress.collectionId} (${index + 1}/${downloadableDevices.length})`)
          logService.downloadCollection(progress.collectionId, `logs_${device.type}_${device.host}.tar.gz`)
        }
      }, index * 500) // 500ms delay between each download
    })
  }

  const handleNewCollection = () => {
    setCurrentStep('devices')
    setDevices([])
    setCollectionStatus(null)
    setCollectionError(null)
    setDeviceProgress({})
  }

  const getTotalProgress = () => {
    const progressValues = Object.values(deviceProgress)
    if (progressValues.length === 0) return 0
    return Math.round(progressValues.reduce((sum, p) => sum + p.progress, 0) / progressValues.length)
  }

  // Render device list step
  const renderDevicesStep = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Add Devices to Collect
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Add all devices you want to collect logs from. Logs will be collected simultaneously.
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
                      const type = e.target.value as DeviceType
                      setNewDeviceType(type)
                      setNewPort(deviceTypeConfig[type].defaultPort)
                    }}
                  >
                    <MenuItem value="cucm">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CucmIcon fontSize="small" /> CUCM Cluster
                      </Box>
                    </MenuItem>
                    <MenuItem value="cube">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CubeIcon fontSize="small" /> CUBE
                      </Box>
                    </MenuItem>
                    <MenuItem value="expressway">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ExpresswayIcon fontSize="small" /> Expressway
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                <Grid container spacing={1}>
                  <Grid item xs={8}>
                    <TextField
                      label={newDeviceType === 'cucm' ? 'Publisher IP/Hostname' : 'Device IP/Hostname'}
                      value={newHost}
                      onChange={e => setNewHost(e.target.value)}
                      placeholder="10.1.1.10"
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
                  label="Username"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  size="small"
                  fullWidth
                />

                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  size="small"
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

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
            </CardContent>
          </Card>
        </Grid>

        {/* Device List */}
        <Grid item xs={12} md={7}>
          <Card variant="outlined" sx={{ minHeight: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Dns /> Devices to Collect ({devices.length})
              </Typography>
              <Divider sx={{ my: 2 }} />

              {devices.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Dns sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography color="text.secondary">
                    No devices added yet. Add devices to collect logs from.
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {devices.map(device => {
                    const config = deviceTypeConfig[device.type]
                    return (
                      <Accordion
                        key={device.id}
                        expanded={expandedDevice === device.id}
                        onChange={() => setExpandedDevice(expandedDevice === device.id ? null : device.id)}
                        sx={{ mb: 1 }}
                      >
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                            <Chip
                              icon={config.icon}
                              label={config.label}
                              size="small"
                              sx={{ bgcolor: config.color, color: 'white' }}
                            />
                            <Typography sx={{ flexGrow: 1 }}>{device.host}</Typography>
                            {device.type === 'cucm' && device.discoveredNodes && (
                              <Chip
                                label={`${device.selectedNodes?.length || 0}/${device.discoveredNodes.length} nodes`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                            {isDiscovering === device.id && (
                              <CircularProgress size={20} />
                            )}
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          {device.type === 'cucm' && (
                            <Box>
                              {!device.discoveredNodes ? (
                                <Box sx={{ textAlign: 'center', py: 2 }}>
                                  <Button
                                    variant="outlined"
                                    onClick={() => handleDiscoverNodes(device)}
                                    disabled={isDiscovering === device.id}
                                    startIcon={isDiscovering === device.id ? <CircularProgress size={16} /> : undefined}
                                  >
                                    {isDiscovering === device.id ? 'Discovering...' : 'Discover Nodes'}
                                  </Button>
                                </Box>
                              ) : (
                                <List dense>
                                  {device.discoveredNodes.map(node => (
                                    <ListItem key={node.ip} disablePadding>
                                      <ListItemIcon sx={{ minWidth: 36 }}>
                                        <Checkbox
                                          edge="start"
                                          checked={device.selectedNodes?.includes(node.ip) || false}
                                          onChange={() => handleToggleNode(device.id, node.ip)}
                                          size="small"
                                        />
                                      </ListItemIcon>
                                      <ListItemText
                                        primary={node.host}
                                        secondary={`${node.ip} - ${node.role}`}
                                      />
                                    </ListItem>
                                  ))}
                                </List>
                              )}
                            </Box>
                          )}

                          {(device.type === 'cube' || device.type === 'expressway') && (
                            <Box>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={device.includeDebug || false}
                                    onChange={e => handleUpdateDevice(device.id, { includeDebug: e.target.checked })}
                                    size="small"
                                  />
                                }
                                label="Include debug logs (CPU intensive)"
                              />
                              {device.includeDebug && (
                                <FormControl size="small" sx={{ ml: 4, minWidth: 120 }}>
                                  <InputLabel>Duration</InputLabel>
                                  <Select
                                    value={device.debugDuration || 30}
                                    label="Duration"
                                    onChange={e => handleUpdateDevice(device.id, { debugDuration: Number(e.target.value) })}
                                  >
                                    <MenuItem value={15}>15 sec</MenuItem>
                                    <MenuItem value={30}>30 sec</MenuItem>
                                    <MenuItem value={60}>60 sec</MenuItem>
                                  </Select>
                                </FormControl>
                              )}
                            </Box>
                          )}

                          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<Delete />}
                              onClick={() => handleRemoveDevice(device.id)}
                            >
                              Remove
                            </Button>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    )
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )

  // Render collection options step
  const renderOptionsStep = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Collection Options
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Configure collection settings for {devices.length} device(s)
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Collection Type
            </Typography>
            <Divider sx={{ my: 2 }} />
            <RadioGroup value={collectionType} onChange={e => setCollectionType(e.target.value as 'regular' | 'profile')}>
              <FormControlLabel value="regular" control={<Radio />} label="Regular Bundle (recommended)" />
              <FormControlLabel value="profile" control={<Radio />} label="Choose by Service" />
            </RadioGroup>

            {collectionType === 'profile' && profiles.length > 0 && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Profile</InputLabel>
                <Select
                  value={selectedProfile}
                  label="Profile"
                  onChange={e => setSelectedProfile(e.target.value)}
                >
                  {profiles.map(p => (
                    <MenuItem key={p.name} value={p.name}>
                      {p.name} - {p.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {collectionType === 'regular' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Uses <strong>callmanager_full</strong> profile (complete CallManager logs)
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Time Range
            </Typography>
            <Divider sx={{ my: 2 }} />
            <RadioGroup value={timeRangeType} onChange={e => setTimeRangeType(e.target.value as 'relative' | 'absolute')}>
              <FormControlLabel
                value="relative"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Last
                    <Select
                      size="small"
                      value={relativeMinutes}
                      onChange={e => setRelativeMinutes(Number(e.target.value))}
                      sx={{ minWidth: 80 }}
                    >
                      <MenuItem value={30}>30</MenuItem>
                      <MenuItem value={60}>60</MenuItem>
                      <MenuItem value={120}>120</MenuItem>
                      <MenuItem value={240}>240</MenuItem>
                    </Select>
                    minutes
                  </Box>
                }
              />
              <FormControlLabel value="absolute" control={<Radio />} label="Custom Range" disabled />
            </RadioGroup>
          </Paper>
        </Grid>

        {/* CUBE Profile Selection */}
        {devices.some(d => d.type === 'cube') && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                CUBE Collection Profile
              </Typography>
              <Divider sx={{ my: 2 }} />
              <FormControl fullWidth>
                <InputLabel>Profile</InputLabel>
                <Select
                  value={selectedCubeProfile}
                  label="Profile"
                  onChange={e => setSelectedCubeProfile(e.target.value as string)}
                >
                  {cubeProfiles.map(p => (
                    <MenuItem key={p.name} value={p.name}>
                      {p.name} - {p.description}
                    </MenuItem>
                  ))}
                  {cubeProfiles.length === 0 && (
                    <MenuItem value="" disabled>Loading profiles...</MenuItem>
                  )}
                </Select>
              </FormControl>
              {(() => {
                const selectedProfile = cubeProfiles.find(p => p.name === selectedCubeProfile)
                const isDebugProfile = selectedProfile?.include_debug || selectedCubeProfile.includes('debug')
                return isDebugProfile ? (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Debug Duration: {debugDuration} seconds
                    </Typography>
                    <Select
                      size="small"
                      value={debugDuration}
                      onChange={e => setDebugDuration(Number(e.target.value))}
                      sx={{ minWidth: 120 }}
                    >
                      <MenuItem value={15}>15 sec</MenuItem>
                      <MenuItem value={30}>30 sec</MenuItem>
                      <MenuItem value={60}>60 sec</MenuItem>
                      <MenuItem value={120}>120 sec</MenuItem>
                      <MenuItem value={180}>180 sec</MenuItem>
                      <MenuItem value={300}>300 sec</MenuItem>
                    </Select>
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      Debug mode is CPU intensive and auto-disables after collection
                    </Alert>
                  </Box>
                ) : null
              })()}
            </Paper>
          </Grid>
        )}

        {/* Expressway Profile Selection */}
        {devices.some(d => d.type === 'expressway') && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Expressway Collection Profile
              </Typography>
              <Divider sx={{ my: 2 }} />
              <FormControl fullWidth>
                <InputLabel>Profile</InputLabel>
                <Select
                  value={selectedExpresswayProfile}
                  label="Profile"
                  onChange={e => setSelectedExpresswayProfile(e.target.value as string)}
                >
                  {expresswayProfiles.map(p => (
                    <MenuItem key={p.name} value={p.name}>
                      {p.name} - {p.description}
                    </MenuItem>
                  ))}
                  {expresswayProfiles.length === 0 && (
                    <MenuItem value="" disabled>Loading profiles...</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Paper>
          </Grid>
        )}

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Devices Summary
            </Typography>
            <Divider sx={{ my: 2 }} />
            <List dense>
              {devices.map(device => {
                const config = deviceTypeConfig[device.type]
                const getProfileLabel = () => {
                  if (device.type === 'cucm') {
                    return `${device.selectedNodes?.length || 0} nodes selected`
                  } else if (device.type === 'cube') {
                    return `Profile: ${selectedCubeProfile}`
                  } else {
                    return `Profile: ${selectedExpresswayProfile}`
                  }
                }
                return (
                  <ListItem key={device.id}>
                    <ListItemIcon>
                      <Chip
                        icon={config?.icon}
                        label={config?.label || device.type}
                        size="small"
                        sx={{ bgcolor: config?.color || '#666', color: 'white' }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={device.host || 'Unknown host'}
                      secondary={getProfileLabel()}
                    />
                  </ListItem>
                )
              })}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )

  // Render progress step
  const renderProgressStep = () => (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {collectionError ? (
        <Box sx={{ textAlign: 'center' }}>
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="error">
            Collection Failed
          </Typography>
          <Alert severity="error" sx={{ mb: 3 }}>
            {collectionError}
          </Alert>
          <Button variant="contained" onClick={handleNewCollection}>
            Try Again
          </Button>
        </Box>
      ) : collectionStatus === 'completed' ? (
        <Box>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Collection Complete
            </Typography>
            <Typography color="text.secondary">
              Logs collected from {devices.length} device(s)
            </Typography>
          </Box>

          {/* Individual device downloads */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Download Individual Logs
            </Typography>
            <Divider sx={{ my: 2 }} />
            <List dense>
              {devices.map(device => {
                const config = deviceTypeConfig[device.type]
                const progress = deviceProgress[device.id]
                const canDownload = progress?.status === 'completed' && progress?.downloadAvailable
                return (
                  <ListItem key={device.id}>
                    <ListItemIcon>
                      {canDownload ? (
                        <CheckCircle color="success" />
                      ) : progress?.status === 'failed' ? (
                        <ErrorIcon color="error" />
                      ) : (
                        <PendingIcon color="disabled" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={config?.label || device.type} size="small" sx={{ bgcolor: config?.color || '#666', color: 'white' }} />
                          {device.host || 'Unknown'}
                        </Box>
                      }
                      secondary={canDownload ? 'Ready to download' : progress?.status === 'failed' ? 'Collection failed' : 'Processing...'}
                    />
                    <ListItemSecondaryAction>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={() => handleDownloadDevice(device)}
                        disabled={!canDownload}
                      >
                        Download
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                )
              })}
            </List>
          </Paper>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="contained" startIcon={<Download />} onClick={handleDownloadAll}>
              Download All ({devices.filter(d => deviceProgress[d.id]?.downloadAvailable).length})
            </Button>
            <Button variant="outlined" onClick={handleNewCollection}>
              New Collection
            </Button>
          </Box>
        </Box>
      ) : (
        <Box>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <PendingIcon sx={{ fontSize: 64, color: 'info.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Collecting Logs...
            </Typography>
            <Typography color="text.secondary">
              Collecting from {devices.length} device(s) simultaneously
            </Typography>
          </Box>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Overall Progress</Typography>
                <Typography variant="body2">{getTotalProgress()}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={getTotalProgress()} sx={{ height: 8, borderRadius: 4 }} />
            </Box>

            <Divider sx={{ my: 2 }} />

            <List dense>
              {devices.map(device => {
                const config = deviceTypeConfig[device.type]
                const progress = deviceProgress[device.id] || { status: 'pending', progress: 0 }
                const canDownload = progress.status === 'completed' && progress.downloadAvailable
                return (
                  <ListItem key={device.id}>
                    <ListItemIcon>
                      {progress.status === 'completed' ? (
                        <CheckCircle color="success" />
                      ) : progress.status === 'failed' ? (
                        <ErrorIcon color="error" />
                      ) : progress.status === 'running' ? (
                        <CircularProgress size={24} />
                      ) : (
                        <PendingIcon color="disabled" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={config?.label || device.type} size="small" sx={{ bgcolor: config?.color || '#666', color: 'white' }} />
                          {device.host || 'Unknown'}
                        </Box>
                      }
                      secondary={
                        <LinearProgress
                          variant="determinate"
                          value={progress.progress}
                          sx={{ mt: 1, height: 4, borderRadius: 2 }}
                        />
                      }
                    />
                    <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {canDownload ? (
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleDownloadDevice(device)}
                          title="Download"
                        >
                          <Download />
                        </IconButton>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {progress.progress}%
                        </Typography>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                )
              })}
            </List>
          </Paper>

          <Box sx={{ textAlign: 'center' }}>
            <Button variant="outlined" color="error" onClick={handleNewCollection}>
              Cancel
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  )

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/')}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h4">Log Collection</Typography>
          <Typography color="text.secondary">
            Collect logs from CUCM clusters, CUBE, and Expressway devices
          </Typography>
        </Box>
      </Box>

      <Stepper activeStep={getActiveStep()} sx={{ mb: 4 }}>
        {steps.map(label => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 4, minHeight: 500 }}>
        {currentStep === 'devices' && renderDevicesStep()}
        {currentStep === 'options' && renderOptionsStep()}
        {currentStep === 'progress' && renderProgressStep()}

        {/* Navigation buttons */}
        {currentStep !== 'progress' && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => {
                if (currentStep === 'options') {
                  setCurrentStep('devices')
                } else {
                  navigate('/')
                }
              }}
            >
              {currentStep === 'devices' ? 'Cancel' : 'Back'}
            </Button>

            {currentStep === 'devices' ? (() => {
              const blockingReason = getBlockingReason()
              return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {blockingReason && (
                  <Typography variant="body2" color="text.secondary">
                    {blockingReason}
                  </Typography>
                )}
                <Button
                  variant="contained"
                  endIcon={<ArrowForward />}
                  onClick={() => setCurrentStep('options')}
                  disabled={devices.length === 0 || !areCucmDevicesReady() || isAnyDiscovering()}
                >
                  Next: Options
                </Button>
              </Box>
              )
            })() : (
              <Button
                variant="contained"
                endIcon={<ArrowForward />}
                onClick={handleStartCollection}
                disabled={devices.length === 0 || !areCucmDevicesReady()}
              >
                Start Collection
              </Button>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  )
}
