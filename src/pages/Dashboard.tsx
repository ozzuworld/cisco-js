import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Grid, Paper, Button } from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { JobStatusCard, JobWizard, LoadingSpinner } from '@/components'
import { useJobs, useCancelJob, useDownloadAllLogs } from '@/hooks'

export default function Dashboard() {
  const [showWizard, setShowWizard] = useState(false)
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()

  // Fetch recent jobs (limit to first page)
  const { data: jobsData, isLoading: jobsLoading } = useJobs(1, 6)
  const cancelMutation = useCancelJob()
  const downloadAllLogs = useDownloadAllLogs()

  const handleJobCreated = (jobId: string) => {
    enqueueSnackbar(`Job ${jobId} is now running`, { variant: 'success' })
  }

  const handleViewJob = (jobId: string) => {
    navigate(`/jobs/${jobId}`)
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
          onClick={() => setShowWizard(true)}
        >
          New Job
        </Button>
      </Box>

      <JobWizard open={showWizard} onClose={() => setShowWizard(false)} onSuccess={handleJobCreated} />

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
            <Typography variant="h3" color="error.main">
              {(jobsData?.items || []).filter(j => j.status === 'failed').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Failed
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
      ) : jobsData?.items?.length ? (
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
          No jobs yet. Click &quot;New Job&quot; to get started.
        </Typography>
      )}
    </Box>
  )
}
