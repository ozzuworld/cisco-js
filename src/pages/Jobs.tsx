import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
} from '@mui/material'
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { JobStatusCard, EmptyState, LoadingSpinner, JobWizard } from '@/components'
import { useJobs, useCancelJob, useDownloadAllLogs } from '@/hooks'
import type { JobStatus } from '@/types'

export default function Jobs() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')
  const [showWizard, setShowWizard] = useState(false)
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()

  // Fetch jobs from API
  const { data: jobsData, isLoading } = useJobs(1, 100)
  const cancelMutation = useCancelJob()
  const downloadAllLogs = useDownloadAllLogs()

  const handleJobCreated = (jobId: string) => {
    enqueueSnackbar(`Job ${jobId} created successfully`, { variant: 'success' })
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

  const filteredJobs = useMemo(() => {
    if (!jobsData?.items) return []

    return jobsData.items.filter(job => {
      const matchesSearch =
        job.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.clusterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.profileName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [jobsData, searchQuery, statusFilter])

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Log Collection Jobs
          </Typography>
          <Typography color="text.secondary">
            View and manage all your log collection jobs
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowWizard(true)}>
          New Job
        </Button>
      </Box>

      <JobWizard open={showWizard} onClose={() => setShowWizard(false)} onSuccess={handleJobCreated} />

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, mt: 3 }}>
        <TextField
          placeholder="Search jobs..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={e => setStatusFilter(e.target.value as JobStatus | 'all')}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="running">Running</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Jobs Grid */}
      {isLoading ? (
        <LoadingSpinner message="Loading jobs..." />
      ) : filteredJobs.length > 0 ? (
        <Grid container spacing={2}>
          {filteredJobs.map(job => (
            <Grid item xs={12} md={6} lg={4} key={job.id}>
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
        <EmptyState
          title="No jobs found"
          description={
            jobsData?.total === 0
              ? 'No jobs yet. Click "New Job" to get started.'
              : 'No jobs match your search criteria. Try adjusting your filters.'
          }
        />
      )}
    </Box>
  )
}
