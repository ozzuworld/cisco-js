import { useState } from 'react'
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
import { JobStatusCard, EmptyState } from '@/components'
import type { Job, JobStatus } from '@/types'

// Sample jobs for demonstration
const allJobs: Job[] = [
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
  {
    id: 'job-003',
    clusterId: 'cluster-2',
    clusterName: 'CUCM Testing',
    profileId: 'security',
    profileName: 'Security Audit',
    status: 'failed',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: new Date(Date.now() - 5400000).toISOString(),
    duration: 1800,
    nodes: ['cucm-test.example.com'],
    error: 'Connection timeout',
  },
  {
    id: 'job-004',
    clusterId: 'cluster-1',
    clusterName: 'CUCM Production',
    profileId: 'performance',
    profileName: 'Performance Analysis',
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 82800000).toISOString(),
    duration: 3600,
    nodes: ['cucm-pub.example.com', 'cucm-sub1.example.com', 'cucm-sub2.example.com'],
  },
  {
    id: 'job-005',
    clusterId: 'cluster-1',
    clusterName: 'CUCM Production',
    profileId: 'basic',
    profileName: 'Basic Troubleshooting',
    status: 'cancelled',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    nodes: ['cucm-pub.example.com'],
  },
]

export default function Jobs() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')

  const handleViewJob = (jobId: string) => {
    console.log('View job:', jobId)
  }

  const handleCancelJob = (jobId: string) => {
    console.log('Cancel job:', jobId)
  }

  const handleDownloadLogs = (jobId: string) => {
    console.log('Download logs:', jobId)
  }

  const filteredJobs = allJobs.filter(job => {
    const matchesSearch =
      job.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.clusterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.profileName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
      {filteredJobs.length > 0 ? (
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
          description="No jobs match your search criteria. Try adjusting your filters."
        />
      )}
    </Box>
  )
}
