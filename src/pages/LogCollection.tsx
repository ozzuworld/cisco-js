import { useState } from 'react'
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
  CardActionArea,
  Avatar,
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
  LinearProgress,
  Chip,
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
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { logService } from '@/services'
import type {
  ClusterNode,
  LogProfile,
  LogDeviceType,
  LogCollectionStatus,
} from '@/types'

type DeviceType = 'cucm' | 'cube' | 'expressway'
type WizardStep = 'device' | 'config' | 'progress'

const steps = ['Select Device', 'Configure', 'Collect']

export default function LogCollection() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('device')
  const [deviceType, setDeviceType] = useState<DeviceType | null>(null)

  // Connection state
  const [host, setHost] = useState('')
  const [port, setPort] = useState<number | ''>(22)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // CUCM-specific state
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [discoveredNodes, setDiscoveredNodes] = useState<ClusterNode[]>([])
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [collectionType, setCollectionType] = useState<'regular' | 'profile'>('regular')
  const [profiles, setProfiles] = useState<LogProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState('')
  const [timeRangeType, setTimeRangeType] = useState<'relative' | 'absolute'>('relative')
  const [relativeMinutes, setRelativeMinutes] = useState(60)

  // CUBE/Expressway-specific state
  const [includeDebug, setIncludeDebug] = useState(false)
  const [debugDuration, setDebugDuration] = useState(30)

  // Collection state
  const [collectionId, setCollectionId] = useState<string | null>(null)
  const [collectionStatus, setCollectionStatus] = useState<LogCollectionStatus | null>(null)
  const [collectionProgress, setCollectionProgress] = useState(0)
  const [collectionError, setCollectionError] = useState<string | null>(null)

  const getActiveStep = () => {
    switch (currentStep) {
      case 'device': return 0
      case 'config': return 1
      case 'progress': return 2
      default: return 0
    }
  }

  const handleDeviceSelect = (type: DeviceType) => {
    setDeviceType(type)
    setPort(type === 'expressway' ? 443 : 22)
    setCurrentStep('config')
  }

  const handleBack = () => {
    if (currentStep === 'config') {
      setCurrentStep('device')
      setDeviceType(null)
      // Reset form
      setHost('')
      setUsername('')
      setPassword('')
      setDiscoveredNodes([])
      setSelectedNodes([])
    }
  }

  const handleDiscoverNodes = async () => {
    if (!host || !username || !password) {
      enqueueSnackbar('Please fill in all required fields', { variant: 'warning' })
      return
    }

    setIsDiscovering(true)
    try {
      const response = await logService.discoverNodes({
        publisher_host: host,
        username,
        password,
        port: port || undefined,
      })

      setDiscoveredNodes(response.nodes)
      // Auto-select all nodes
      setSelectedNodes(response.nodes.map(n => n.hostname))

      // Also fetch profiles
      const profilesResponse = await logService.getProfiles()
      setProfiles(profilesResponse.profiles)

      enqueueSnackbar(`Discovered ${response.nodes.length} nodes`, { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Failed to discover nodes',
        { variant: 'error' }
      )
    } finally {
      setIsDiscovering(false)
    }
  }

  const handleToggleNode = (hostname: string) => {
    setSelectedNodes(prev =>
      prev.includes(hostname)
        ? prev.filter(h => h !== hostname)
        : [...prev, hostname]
    )
  }

  const handleStartCollection = async () => {
    if (!host || !username || !password) {
      enqueueSnackbar('Please fill in all required fields', { variant: 'warning' })
      return
    }

    setCurrentStep('progress')
    setCollectionError(null)

    try {
      if (deviceType === 'cucm') {
        // CUCM uses the jobs API
        // For now, redirect to the existing job wizard
        navigate('/jobs/new')
        return
      }

      // CUBE/Expressway use the logs API
      const response = await logService.startCollection({
        device_type: deviceType as LogDeviceType,
        host,
        port: port || undefined,
        username,
        password,
        include_debug: includeDebug,
        duration_sec: includeDebug ? debugDuration : undefined,
      })

      setCollectionId(response.collection_id)
      setCollectionStatus(response.status)
      enqueueSnackbar('Collection started', { variant: 'success' })

      // Start polling for status
      pollCollectionStatus(response.collection_id)
    } catch (error) {
      setCollectionError(error instanceof Error ? error.message : 'Failed to start collection')
    }
  }

  const pollCollectionStatus = async (id: string) => {
    const poll = async () => {
      try {
        const status = await logService.getCollectionStatus(id)
        setCollectionStatus(status.status)

        // Estimate progress based on status
        if (status.status === 'running') {
          setCollectionProgress(prev => Math.min(prev + 10, 90))
        } else if (status.status === 'completed') {
          setCollectionProgress(100)
          enqueueSnackbar('Collection complete!', { variant: 'success' })
          return
        } else if (status.status === 'failed') {
          setCollectionError(status.error || 'Collection failed')
          return
        }

        // Continue polling
        setTimeout(poll, 3000)
      } catch {
        setCollectionError('Failed to get collection status')
      }
    }

    poll()
  }

  const handleDownload = () => {
    if (collectionId) {
      logService.downloadCollection(collectionId, `logs_${deviceType}_${host}.zip`)
      enqueueSnackbar('Download started', { variant: 'success' })
    }
  }

  const handleNewCollection = () => {
    setCurrentStep('device')
    setDeviceType(null)
    setHost('')
    setUsername('')
    setPassword('')
    setCollectionId(null)
    setCollectionStatus(null)
    setCollectionProgress(0)
    setCollectionError(null)
    setDiscoveredNodes([])
    setSelectedNodes([])
  }

  // Render device selection step
  const renderDeviceSelection = () => (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>
        Select Device Type
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Choose the type of device to collect logs from
      </Typography>

      <Grid container spacing={3} justifyContent="center">
        {[
          { type: 'cucm' as DeviceType, icon: <CucmIcon sx={{ fontSize: 48 }} />, title: 'CUCM', subtitle: 'Cluster Discovery', color: '#1976d2' },
          { type: 'cube' as DeviceType, icon: <CubeIcon sx={{ fontSize: 48 }} />, title: 'CUBE', subtitle: 'Single Device', color: '#ed6c02' },
          { type: 'expressway' as DeviceType, icon: <ExpresswayIcon sx={{ fontSize: 48 }} />, title: 'Expressway', subtitle: 'Single Device', color: '#9c27b0' },
        ].map(({ type, icon, title, subtitle, color }) => (
          <Grid item xs={12} sm={4} key={type}>
            <Card
              sx={{
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
              }}
            >
              <CardActionArea onClick={() => handleDeviceSelect(type)} sx={{ p: 3 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Avatar sx={{ width: 80, height: 80, bgcolor: color, mx: 'auto', mb: 2 }}>
                    {icon}
                  </Avatar>
                  <Typography variant="h6">{title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {subtitle}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )

  // Render CUCM configuration
  const renderCucmConfig = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        CUCM Cluster Discovery
      </Typography>

      {discoveredNodes.length === 0 ? (
        // Discovery form
        <Paper sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Publisher IP/Hostname"
              value={host}
              onChange={e => setHost(e.target.value)}
              placeholder="10.1.1.10 or cucm-pub.example.com"
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
            <Button
              variant="contained"
              onClick={handleDiscoverNodes}
              disabled={isDiscovering}
              startIcon={isDiscovering ? <CircularProgress size={20} /> : undefined}
              fullWidth
              size="large"
            >
              {isDiscovering ? 'Discovering...' : 'Discover Nodes'}
            </Button>
          </Box>
        </Paper>
      ) : (
        // Node selection and options
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
                Select Nodes
                <Chip label={`${discoveredNodes.length} found`} size="small" />
              </Typography>
              <Divider sx={{ my: 1 }} />
              <List dense>
                {discoveredNodes.map(node => (
                  <ListItem key={node.hostname} disablePadding>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        edge="start"
                        checked={selectedNodes.includes(node.hostname)}
                        onChange={() => handleToggleNode(node.hostname)}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={node.hostname}
                      secondary={`${node.ipAddress} - ${node.role}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Collection Type
              </Typography>
              <Divider sx={{ my: 1 }} />
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
                      <MenuItem key={p.id} value={p.id}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                Time Range
              </Typography>
              <Divider sx={{ my: 1 }} />
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
        </Grid>
      )}
    </Box>
  )

  // Render CUBE/Expressway configuration
  const renderSingleDeviceConfig = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        {deviceType === 'cube' ? 'CUBE' : 'Expressway'} Log Collection
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <TextField
                label="Device IP/Hostname"
                value={host}
                onChange={e => setHost(e.target.value)}
                placeholder="10.1.1.10"
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Port"
                type="number"
                value={port}
                onChange={e => setPort(e.target.value ? Number(e.target.value) : '')}
                fullWidth
              />
            </Grid>
          </Grid>

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

          <Divider sx={{ my: 1 }} />

          <Typography variant="subtitle2">Collection Method</Typography>
          <RadioGroup value={includeDebug ? 'debug' : 'voip'} onChange={e => setIncludeDebug(e.target.value === 'debug')}>
            <FormControlLabel
              value="voip"
              control={<Radio />}
              label="VoIP Trace (recommended, low CPU)"
            />
            <FormControlLabel
              value="debug"
              control={<Radio />}
              label="Debug Mode (CPU intensive - auto-disables after collection)"
            />
          </RadioGroup>

          {includeDebug && (
            <FormControl fullWidth>
              <InputLabel>Duration</InputLabel>
              <Select
                value={debugDuration}
                label="Duration"
                onChange={e => setDebugDuration(Number(e.target.value))}
              >
                <MenuItem value={15}>15 seconds</MenuItem>
                <MenuItem value={30}>30 seconds</MenuItem>
                <MenuItem value={60}>60 seconds</MenuItem>
                <MenuItem value={120}>2 minutes</MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>
      </Paper>
    </Box>
  )

  // Render progress step
  const renderProgress = () => (
    <Box sx={{ textAlign: 'center', maxWidth: 600, mx: 'auto' }}>
      {collectionError ? (
        <>
          <Avatar sx={{ width: 80, height: 80, bgcolor: 'error.main', mx: 'auto', mb: 2 }}>
            <ErrorIcon sx={{ fontSize: 48 }} />
          </Avatar>
          <Typography variant="h5" gutterBottom color="error">
            Collection Failed
          </Typography>
          <Alert severity="error" sx={{ mb: 3 }}>
            {collectionError}
          </Alert>
          <Button variant="contained" onClick={handleNewCollection}>
            Try Again
          </Button>
        </>
      ) : collectionStatus === 'completed' ? (
        <>
          <Avatar sx={{ width: 80, height: 80, bgcolor: 'success.main', mx: 'auto', mb: 2 }}>
            <CheckCircle sx={{ fontSize: 48 }} />
          </Avatar>
          <Typography variant="h5" gutterBottom>
            Collection Complete
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Logs have been collected successfully
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleDownload}
            >
              Download Logs
            </Button>
            <Button variant="outlined" onClick={handleNewCollection}>
              New Collection
            </Button>
          </Box>
        </>
      ) : (
        <>
          <Avatar sx={{ width: 80, height: 80, bgcolor: 'info.main', mx: 'auto', mb: 2 }}>
            <PendingIcon sx={{ fontSize: 48 }} />
          </Avatar>
          <Typography variant="h5" gutterBottom>
            Collecting Logs...
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {deviceType === 'cucm' ? 'Collecting from cluster nodes' : `Connecting to ${host}`}
          </Typography>
          <Box sx={{ mb: 3 }}>
            <LinearProgress variant="determinate" value={collectionProgress} sx={{ height: 8, borderRadius: 4 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {collectionProgress}% complete
            </Typography>
          </Box>
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              if (collectionId) {
                logService.cancelCollection(collectionId)
              }
              handleNewCollection()
            }}
          >
            Cancel
          </Button>
        </>
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
            Collect logs from CUCM, CUBE, or Expressway devices
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

      <Paper sx={{ p: 4, minHeight: 400 }}>
        {currentStep === 'device' && renderDeviceSelection()}
        {currentStep === 'config' && deviceType === 'cucm' && renderCucmConfig()}
        {currentStep === 'config' && (deviceType === 'cube' || deviceType === 'expressway') && renderSingleDeviceConfig()}
        {currentStep === 'progress' && renderProgress()}

        {/* Navigation buttons */}
        {currentStep === 'config' && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button startIcon={<ArrowBack />} onClick={handleBack}>
              Back
            </Button>
            <Button
              variant="contained"
              endIcon={<ArrowForward />}
              onClick={handleStartCollection}
              disabled={
                !host || !username || !password ||
                (deviceType === 'cucm' && discoveredNodes.length > 0 && selectedNodes.length === 0)
              }
            >
              Start Collection
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
