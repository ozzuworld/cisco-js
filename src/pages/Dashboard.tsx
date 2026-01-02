import { useState } from 'react'
import { Box, Typography, Grid, Paper, Button } from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import { ConnectionForm, JobStatusCard, NodeList } from '@/components'
import type { Job, ClusterNode, ConnectionRequest } from '@/types'

// Sample data for demonstration
const sampleJobs: Job[] = [
  {
    id: 'job-001',
    clusterId: 'cluster-1',
    clusterName: 'CUCM Production',
    profileId: 'basic',
    profileName: 'Basic Troubleshooting',
    status: 'running',
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    nodes: ['cucm-pub.example.com', 'cucm-sub1.example.com'],
    progress: 45,
  },
  {
    id: 'job-002',
    clusterId: 'cluster-1',
    clusterName: 'CUCM Production',
    profileId: 'call-processing',
    profileName: 'Call Processing',
    status: 'completed',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 1800000).toISOString(),
    duration: 1800,
    nodes: ['cucm-pub.example.com'],
  },
]

const sampleNodes: ClusterNode[] = [
  {
    hostname: 'cucm-pub.example.com',
    ipAddress: '10.10.10.10',
    role: 'publisher',
    version: '14.0.1.12000-1',
    status: 'online',
  },
  {
    hostname: 'cucm-sub1.example.com',
    ipAddress: '10.10.10.11',
    role: 'subscriber',
    version: '14.0.1.12000-1',
    status: 'online',
  },
  {
    hostname: 'cucm-sub2.example.com',
    ipAddress: '10.10.10.12',
    role: 'subscriber',
    version: '14.0.1.12000-1',
    status: 'online',
  },
]

export default function Dashboard() {
  const [showConnection, setShowConnection] = useState(false)

  const handleConnect = async (data: ConnectionRequest) => {
    console.log('Connecting to CUCM:', data)
    // This will be connected to the backend in Sprint 3
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  const handleViewJob = (jobId: string) => {
    console.log('View job:', jobId)
  }

  const handleCancelJob = (jobId: string) => {
    console.log('Cancel job:', jobId)
  }

  const handleDownloadLogs = (jobId: string) => {
    console.log('Download logs:', jobId)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Dashboard</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowConnection(!showConnection)}
        >
          New Job
        </Button>
      </Box>

      {showConnection && (
        <Box sx={{ mb: 4 }}>
          <ConnectionForm onSubmit={handleConnect} />
        </Box>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="primary">
              12
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Jobs
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="info.main">
              2
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Running
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="success.main">
              9
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Completed
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="text.secondary">
              3
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Clusters
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Jobs */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Recent Jobs
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {sampleJobs.map(job => (
          <Grid item xs={12} md={6} key={job.id}>
            <JobStatusCard
              job={job}
              onView={handleViewJob}
              onCancel={handleCancelJob}
              onDownload={handleDownloadLogs}
            />
          </Grid>
        ))}
      </Grid>

      {/* Cluster Nodes */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Last Discovered Nodes
      </Typography>
      <NodeList nodes={sampleNodes} />
    </Box>
  )
}
