import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Avatar,
} from '@mui/material'
import {
  Download as DownloadIcon,
  HealthAndSafety as HealthIcon,
  NetworkCheck as CaptureIcon,
  Folder as FolderIcon,
  History as HistoryIcon,
} from '@mui/icons-material'

interface WorkflowCard {
  title: string
  description: string
  icon: React.ReactElement
  path: string
  color: string
}

const workflowCards: WorkflowCard[] = [
  {
    title: 'Collect Logs',
    description: 'Connect to a CUCM cluster, select nodes and profiles, and download log files for troubleshooting.',
    icon: <DownloadIcon sx={{ fontSize: 40 }} />,
    path: '/jobs/new',
    color: '#1976d2', // primary blue
  },
  {
    title: 'Health Check',
    description: 'Run health diagnostics on your CUCM cluster including replication, services, NTP, and more.',
    icon: <HealthIcon sx={{ fontSize: 40 }} />,
    path: '/health',
    color: '#2e7d32', // green
  },
  {
    title: 'Packet Capture',
    description: 'Capture network traffic from CUCM nodes for SIP, RTP, and protocol troubleshooting.',
    icon: <CaptureIcon sx={{ fontSize: 40 }} />,
    path: '/captures',
    color: '#0288d1', // light blue
  },
  {
    title: 'Job History',
    description: 'View past log collection jobs, check their status, and download previously collected logs.',
    icon: <HistoryIcon sx={{ fontSize: 40 }} />,
    path: '/jobs',
    color: '#ed6c02', // orange
  },
  {
    title: 'Log Profiles',
    description: 'Browse and manage log collection profiles that define which log types to collect.',
    icon: <FolderIcon sx={{ fontSize: 40 }} />,
    path: '/profiles',
    color: '#9c27b0', // purple
  },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: 4,
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" gutterBottom fontWeight="medium">
          CUCM Log Collector
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600 }}>
          Collect logs and monitor the health of your Cisco Unified Communications Manager cluster
        </Typography>
      </Box>

      {/* Workflow Cards */}
      <Grid container spacing={4} sx={{ maxWidth: 1000, px: 2 }}>
        {workflowCards.map((card) => (
          <Grid item xs={12} sm={6} key={card.title}>
            <Card
              sx={{
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardActionArea
                onClick={() => navigate(card.path)}
                sx={{ height: '100%', p: 1 }}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', py: 4 }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: card.color,
                      mb: 2,
                    }}
                  >
                    {card.icon}
                  </Avatar>
                  <Typography variant="h5" gutterBottom>
                    {card.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Footer hint */}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 6 }}>
        Select a workflow to get started
      </Typography>
    </Box>
  )
}
