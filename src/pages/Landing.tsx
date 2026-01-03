import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Avatar,
  Button,
  Divider,
} from '@mui/material'
import {
  Phone as CallRoutingIcon,
  Mic as VoiceQualityIcon,
  Favorite as HealthIcon,
  ArrowForward,
} from '@mui/icons-material'

interface WorkflowCard {
  title: string
  subtitle: string
  description: string
  icon: React.ReactElement
  path: string
  color: string
  buttonText: string
}

const workflowCards: WorkflowCard[] = [
  {
    title: 'Call Routing',
    subtitle: 'Log Collection',
    description: 'Collect logs from CUCM, CUBE, and Expressway for call flow troubleshooting and analysis.',
    icon: <CallRoutingIcon sx={{ fontSize: 48 }} />,
    path: '/logs/new',
    color: '#1976d2', // blue
    buttonText: 'Start',
  },
  {
    title: 'Voice Quality',
    subtitle: 'Packet Capture',
    description: 'Capture network traffic for SIP/RTP analysis and voice quality troubleshooting.',
    icon: <VoiceQualityIcon sx={{ fontSize: 48 }} />,
    path: '/captures',
    color: '#9c27b0', // purple
    buttonText: 'Start',
  },
  {
    title: 'Health Check',
    subtitle: 'Service Status',
    description: 'Monitor cluster health, service status, replication, and system diagnostics.',
    icon: <HealthIcon sx={{ fontSize: 48 }} />,
    path: '/health',
    color: '#2e7d32', // green
    buttonText: 'Check',
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
        pt: 6,
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" gutterBottom fontWeight="medium">
          Troubleshooting Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600 }}>
          Cisco Collaboration troubleshooting tools for CUCM, CUBE, and Expressway
        </Typography>
      </Box>

      {/* Workflow Cards */}
      <Grid container spacing={4} sx={{ maxWidth: 1200, px: 2, justifyContent: 'center' }}>
        {workflowCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.title}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 8,
                },
              }}
            >
              <CardActionArea
                onClick={() => navigate(card.path)}
                sx={{
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  p: 0,
                }}
              >
                <CardContent
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    py: 4,
                    flexGrow: 1,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 100,
                      height: 100,
                      bgcolor: card.color,
                      mb: 3,
                    }}
                  >
                    {card.icon}
                  </Avatar>
                  <Typography variant="h5" gutterBottom fontWeight="medium">
                    {card.title}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    {card.subtitle}
                  </Typography>
                  <Divider sx={{ width: 40, my: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
                    {card.description}
                  </Typography>
                </CardContent>
                <Box sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    endIcon={<ArrowForward />}
                    sx={{
                      bgcolor: card.color,
                      '&:hover': { bgcolor: card.color, filter: 'brightness(0.9)' },
                    }}
                  >
                    {card.buttonText}
                  </Button>
                </Box>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Links */}
      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Quick Links
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button size="small" onClick={() => navigate('/jobs')}>
            Job History
          </Button>
          <Button size="small" onClick={() => navigate('/profiles')}>
            Log Profiles
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
