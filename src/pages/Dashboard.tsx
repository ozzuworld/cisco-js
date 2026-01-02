import { Box, Typography } from '@mui/material'

export default function Dashboard() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography color="text.secondary">
        Welcome to CUCM Log Collector. Use the navigation to get started.
      </Typography>
    </Box>
  )
}
