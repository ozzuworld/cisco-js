import { useState } from 'react'
import { Box, Typography, Button } from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import { ProfileSelector } from '@/components'
import type { LogProfile } from '@/types'

// Sample profiles for demonstration
const sampleProfiles: LogProfile[] = [
  {
    id: 'basic',
    name: 'Basic Troubleshooting',
    description: 'Essential logs for basic troubleshooting and diagnostics',
    logTypes: ['CCM', 'SDL', 'DBL', 'CDR'],
    isCustom: false,
  },
  {
    id: 'call-processing',
    name: 'Call Processing',
    description: 'Detailed call processing and signaling logs',
    logTypes: ['CCM', 'SDL', 'RTMT', 'SIP', 'H323', 'MGCP'],
    isCustom: false,
  },
  {
    id: 'security',
    name: 'Security Audit',
    description: 'Security-related logs for audit and compliance',
    logTypes: ['Audit', 'Tomcat', 'CCM', 'Platform'],
    isCustom: false,
  },
  {
    id: 'performance',
    name: 'Performance Analysis',
    description: 'Performance metrics and system diagnostics',
    logTypes: ['RTMT', 'Platform', 'DBL', 'SysLog'],
    isCustom: false,
  },
  {
    id: 'custom-1',
    name: 'My Custom Profile',
    description: 'Custom profile for specific troubleshooting scenario',
    logTypes: ['CCM', 'SDL', 'Custom'],
    isCustom: true,
  },
]

export default function Profiles() {
  const [selectedProfileId, setSelectedProfileId] = useState<string>()

  const handleSelectProfile = (profileId: string) => {
    setSelectedProfileId(profileId)
    console.log('Selected profile:', profileId)
  }

  const handleCreateProfile = () => {
    console.log('Create new profile')
    // This will open a dialog in Sprint 3
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Log Collection Profiles
          </Typography>
          <Typography color="text.secondary">
            Select a profile to define which logs to collect from your CUCM cluster
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateProfile}>
          Create Profile
        </Button>
      </Box>

      <ProfileSelector
        profiles={sampleProfiles}
        selectedProfileId={selectedProfileId}
        onSelect={handleSelectProfile}
      />
    </Box>
  )
}
