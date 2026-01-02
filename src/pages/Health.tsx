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
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { useClusterHealthCheck } from '@/hooks'
import { HealthStatusBadge, NodeHealthCard } from '@/components/health'
import type { ClusterHealthResponse, HealthCheckType, HealthStatus } from '@/types'

const defaultChecks: HealthCheckType[] = ['replication', 'services', 'ntp']

export default function Health() {
  const { enqueueSnackbar } = useSnackbar()
  const healthCheck = useClusterHealthCheck()

  // Form state
  const [publisherHost, setPublisherHost] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [port, setPort] = useState<number>(22)
  const [selectedChecks, setSelectedChecks] = useState<HealthCheckType[]>(defaultChecks)

  // Result state
  const [healthResult, setHealthResult] = useState<ClusterHealthResponse | null>(null)

  const handleCheckChange = (check: HealthCheckType) => {
    setSelectedChecks(prev =>
      prev.includes(check) ? prev.filter(c => c !== check) : [...prev, check]
    )
  }

  const handleRunHealthCheck = async () => {
    if (!publisherHost || !username || !password) {
      enqueueSnackbar('Please fill in all required fields', { variant: 'warning' })
      return
    }

    try {
      const result = await healthCheck.mutateAsync({
        publisher_host: publisherHost,
        username,
        password,
        port,
        checks: selectedChecks,
      })
      setHealthResult(result)
      enqueueSnackbar('Health check completed', { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Health check failed',
        { variant: 'error' }
      )
    }
  }

  const getStatusIcon = (status: HealthStatus) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle sx={{ fontSize: 48 }} color="success" />
      case 'degraded':
        return <Warning sx={{ fontSize: 48 }} color="warning" />
      case 'critical':
        return <ErrorIcon sx={{ fontSize: 48 }} color="error" />
      default:
        return <HelpOutline sx={{ fontSize: 48 }} color="disabled" />
    }
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Cluster Health Status
          </Typography>
          <Typography color="text.secondary">
            Monitor the health of your CUCM cluster
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Connection Form */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HealthAndSafety /> Run Health Check
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Publisher Host"
                value={publisherHost}
                onChange={e => setPublisherHost(e.target.value)}
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
              <FormControl fullWidth>
                <InputLabel>SSH Port</InputLabel>
                <Select
                  value={port}
                  label="SSH Port"
                  onChange={e => setPort(Number(e.target.value))}
                >
                  <MenuItem value={22}>22 (Default)</MenuItem>
                  <MenuItem value={2222}>2222</MenuItem>
                </Select>
              </FormControl>

              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2">Checks to Run</Typography>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedChecks.includes('replication')}
                      onChange={() => handleCheckChange('replication')}
                    />
                  }
                  label="Database Replication"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedChecks.includes('services')}
                      onChange={() => handleCheckChange('services')}
                    />
                  }
                  label="Services Status"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedChecks.includes('ntp')}
                      onChange={() => handleCheckChange('ntp')}
                    />
                  }
                  label="NTP Synchronization"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedChecks.includes('diagnostics')}
                      onChange={() => handleCheckChange('diagnostics')}
                    />
                  }
                  label="Diagnostics"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedChecks.includes('cores')}
                      onChange={() => handleCheckChange('cores')}
                    />
                  }
                  label="Core Files"
                />
              </FormGroup>

              <Button
                variant="contained"
                startIcon={healthCheck.isPending ? <CircularProgress size={20} color="inherit" /> : <Refresh />}
                onClick={handleRunHealthCheck}
                disabled={healthCheck.isPending || selectedChecks.length === 0}
                fullWidth
                size="large"
              >
                {healthCheck.isPending ? 'Checking...' : 'Run Health Check'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Results */}
        <Grid item xs={12} md={8}>
          {healthCheck.isPending && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
              <CircularProgress size={60} />
              <Typography sx={{ mt: 2 }}>Running health checks...</Typography>
              <Typography variant="body2" color="text.secondary">
                This may take a few minutes
              </Typography>
            </Box>
          )}

          {healthCheck.error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {healthCheck.error.message}
            </Alert>
          )}

          {healthResult && !healthCheck.isPending && (
            <>
              {/* Cluster Summary */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {getStatusIcon(healthResult.cluster_status)}
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h5">Cluster Status</Typography>
                      <HealthStatusBadge status={healthResult.cluster_status} />
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

                {/* Node Summary Stats */}
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="text.primary">
                        {healthResult.total_nodes}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Nodes
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {healthResult.healthy_nodes}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Healthy
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        {healthResult.degraded_nodes}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Degraded
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="error.main">
                        {healthResult.critical_nodes + healthResult.unreachable_nodes}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Critical/Unreachable
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Node Cards */}
              <Typography variant="h6" gutterBottom>
                Node Details
              </Typography>
              {healthResult.nodes.map(node => (
                <NodeHealthCard key={node.ip} node={node} />
              ))}
            </>
          )}

          {!healthResult && !healthCheck.isPending && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <HealthAndSafety sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No Health Check Results
              </Typography>
              <Typography color="text.secondary">
                Enter cluster credentials and run a health check to see results
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  )
}
