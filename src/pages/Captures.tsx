import { Box, Typography, Paper, Grid } from '@mui/material'
import { Wifi as CaptureIcon } from '@mui/icons-material'

export default function Captures() {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <CaptureIcon color="success" sx={{ fontSize: 32 }} />
        <Typography variant="h4">Packet Captures</Typography>
      </Box>

      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Network Traffic Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Packet capture features coming soon. This section will allow you to capture network traffic
          for SIP/RTP analysis and voice quality troubleshooting.
        </Typography>
      </Paper>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>SIP Capture</Typography>
            <Typography variant="body2" color="text.secondary">
              Capture SIP signaling for call flow analysis
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>RTP Analysis</Typography>
            <Typography variant="body2" color="text.secondary">
              Analyze RTP streams for voice quality metrics
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>PCAP Export</Typography>
            <Typography variant="body2" color="text.secondary">
              Export captures in PCAP format for Wireshark
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
