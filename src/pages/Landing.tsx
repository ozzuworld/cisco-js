import { useNavigate } from 'react-router-dom'
import { Box, Grid, Card, CardActionArea } from '@mui/material'
import Lottie from 'lottie-react'

import callAnimation from '@/assets/call.json'
import voiceAnimation from '@/assets/voice.json'
import healthAnimation from '@/assets/health.json'

interface FeatureCardProps {
  animation: object
  title: string
  onClick: () => void
}

function FeatureCard({ animation, title, onClick }: FeatureCardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 1,
        borderRadius: 3,
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 8,
        },
      }}
    >
      <CardActionArea
        onClick={onClick}
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
        }}
      >
        <Box
          sx={{
            width: 150,
            height: 150,
            mb: 2,
          }}
        >
          <Lottie animationData={animation} loop={true} />
        </Box>
        <Box
          component="span"
          sx={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'text.primary',
          }}
        >
          {title}
        </Box>
      </CardActionArea>
    </Card>
  )
}

export default function Landing() {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Grid container spacing={4} sx={{ maxWidth: 1000, justifyContent: 'center' }}>
        <Grid item xs={12} sm={6} md={4}>
          <FeatureCard
            animation={callAnimation}
            title="Call Routing"
            onClick={() => navigate('/logs/new')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <FeatureCard
            animation={voiceAnimation}
            title="Voice Quality"
            onClick={() => navigate('/captures')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <FeatureCard
            animation={healthAnimation}
            title="Health Check"
            onClick={() => navigate('/health')}
          />
        </Grid>
      </Grid>
    </Box>
  )
}
