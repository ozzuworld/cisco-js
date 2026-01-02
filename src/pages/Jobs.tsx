import { useState, useMemo } from 'react'
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
} from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { JobStatusCard, EmptyState, LoadingSpinner } from '@/components'
import { useJobs, useCancelJob, useDownloadAllLogs } from '@/hooks'
import type { JobStatus } from '@/types'

export default function Jobs() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')
  const { enqueueSnackbar } = useSnackbar()

  // Fetch jobs from API
  const { data: jobsData, isLoading } = useJobs(1, 100)
  const cancelMutation = useCancelJob()
  const downloadAllLogs = useDownloadAllLogs()

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
      <Typography variant="h4" gutterBottom>
        Log Collection Jobs
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        View and manage all your log collection jobs
      </Typography>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
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
              ? 'No jobs yet. Create your first job to get started.'
              : 'No jobs match your search criteria. Try adjusting your filters.'
          }
        />
      )}
    </Box>
  )
}
