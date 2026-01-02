import { useState } from 'react'
import { Box, Typography, Grid, Paper, Button } from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { ConnectionForm, JobStatusCard, NodeList, LoadingSpinner } from '@/components'
import { useDiscoverCluster, useJobs, useCancelJob, useDownloadAllLogs } from '@/hooks'
import type { ClusterNode, ConnectionRequest } from '@/types'

export default function Dashboard() {
  const [showConnection, setShowConnection] = useState(false)
  const [discoveredNodes, setDiscoveredNodes] = useState<ClusterNode[]>([])
  const { enqueueSnackbar } = useSnackbar()

  // Fetch recent jobs (limit to first page)
  const { data: jobsData, isLoading: jobsLoading } = useJobs(1, 6)
  const discoverMutation = useDiscoverCluster()
  const cancelMutation = useCancelJob()
  const downloadAllLogs = useDownloadAllLogs()

  const handleConnect = async (data: ConnectionRequest) => {
    try {
      const result = await discoverMutation.mutateAsync(data)
      setDiscoveredNodes(result.nodes)
      enqueueSnackbar(
        `Successfully discovered ${result.totalNodes} nodes from ${result.publisher}`,
        {
          variant: 'success',
        }
      )
      setShowConnection(false)
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : 'Failed to connect to CUCM', {
        variant: 'error',
      })
    }
  }

  const handleViewJob = (jobId: string) => {
    console.log('View job:', jobId)
    enqueueSnackbar('Job details view coming in Sprint 4', { variant: 'info' })
  }

  const handleCancelJob = async (jobId: string) => {
    try {
      await cancelMutation.mutateAsync(jobId)
      enqueueSnackbar('Job cancelled successfully', { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : 'Failed to cancel job', {
        variant: 'error',
      })
    }
  }

  const handleDownloadLogs = async (jobId: string) => {
    try {
      await downloadAllLogs(jobId)
      enqueueSnackbar('Logs download started', { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : 'Failed to download logs', {
        variant: 'error',
      })
    }
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
          <ConnectionForm
            onSubmit={handleConnect}
            isLoading={discoverMutation.isPending}
            error={discoverMutation.error?.message}
          />
        </Box>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="primary">
              {jobsData?.total || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Jobs
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="info.main">
              {(jobsData?.items || []).filter(j => j.status === 'running').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Running
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="success.main">
              {(jobsData?.items || []).filter(j => j.status === 'completed').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Completed
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="text.secondary">
              {discoveredNodes.length > 0 ? 1 : 0}
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
      {jobsLoading ? (
        <LoadingSpinner message="Loading jobs..." />
      ) : jobsData && jobsData.items.length > 0 ? (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {jobsData.items.slice(0, 6).map(job => (
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
      ) : (
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          No jobs yet. Create your first job to get started.
        </Typography>
      )}

      {/* Cluster Nodes */}
      {discoveredNodes.length > 0 && (
        <>
          <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
            Last Discovered Nodes
          </Typography>
          <NodeList nodes={discoveredNodes} />
        </>
      )}
    </Box>
  )
}
