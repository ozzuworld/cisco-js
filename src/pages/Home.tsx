import { Box, Typography, Card, CardContent, Button, Grid, Link } from '@mui/material'
import {
  Phone as PhoneIcon,
  Mic as MicIcon,
  Favorite as HealthIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

interface FeatureCardProps {
  icon: React.ReactNode
  iconBgColor: string
  title: string
  subtitle: string
  description: string
  buttonText: string
  buttonColor: 'primary' | 'success' | 'secondary'
  onClick: () => void
}

function FeatureCard({
  icon,
  iconBgColor,
  title,
  subtitle,
  description,
  buttonText,
  buttonColor,
  onClick,
}: FeatureCardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 1,
      }}
    >
      <CardContent
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          p: 3,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: iconBgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
            color: 'white',
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" component="h3" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {subtitle}
        </Typography>
        <Box sx={{ my: 2, width: '40px', borderBottom: '2px solid', borderColor: 'divider' }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, flexGrow: 1 }}>
          {description}
        </Typography>
        <Button
          variant="contained"
          color={buttonColor}
          endIcon={<ArrowIcon />}
          onClick={onClick}
          fullWidth
          sx={{ mt: 'auto' }}
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function Home() {
  const navigate = useNavigate()

  return (
    <Box>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Troubleshooting Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Cisco Collaboration troubleshooting tools for CUCM, CUBE, and Expressway
        </Typography>
      </Box>

      {/* Feature Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <FeatureCard
            icon={<PhoneIcon sx={{ fontSize: 40 }} />}
            iconBgColor="#049fd9"
            title="Call Routing"
            subtitle="Log Collection"
            description="Collect logs from CUCM, CUBE, and Expressway for call flow troubleshooting and analysis."
            buttonText="START"
            buttonColor="primary"
            onClick={() => navigate('/jobs')}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FeatureCard
            icon={<MicIcon sx={{ fontSize: 40 }} />}
            iconBgColor="#6cc04a"
            title="Voice Quality"
            subtitle="Packet Capture"
            description="Capture network traffic for SIP/RTP analysis and voice quality troubleshooting."
            buttonText="START"
            buttonColor="success"
            onClick={() => navigate('/captures')}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FeatureCard
            icon={<HealthIcon sx={{ fontSize: 40 }} />}
            iconBgColor="#9c27b0"
            title="Health Check"
            subtitle="Service Status"
            description="Monitor cluster health, service status, replication, and system diagnostics."
            buttonText="CHECK"
            buttonColor="secondary"
            onClick={() => navigate('/health')}
          />
        </Grid>
      </Grid>

      {/* Quick Links */}
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Quick Links
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3 }}>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate('/jobs')}
            sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Job History
          </Link>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate('/profiles')}
            sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Log Profiles
          </Link>
        </Box>
      </Box>
    </Box>
  )
}
