import { useState } from 'react'
import { Box, Typography, Button } from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import { ProfileSelector, LoadingSpinner } from '@/components'
import { useProfiles } from '@/hooks'

export default function Profiles() {
  const [selectedProfileId, setSelectedProfileId] = useState<string>()
  const { enqueueSnackbar } = useSnackbar()

  // Fetch profiles from API
  const { data: profiles, isLoading } = useProfiles()

  const handleSelectProfile = (profileId: string) => {
    setSelectedProfileId(profileId)
    enqueueSnackbar(`Selected profile: ${profiles?.find(p => p.id === profileId)?.name}`, {
      variant: 'info',
    })
  }

  const handleCreateProfile = () => {
    enqueueSnackbar('Custom profile creation coming in Sprint 4', { variant: 'info' })
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

      {isLoading ? (
        <LoadingSpinner message="Loading profiles..." />
      ) : profiles && profiles.length > 0 ? (
        <ProfileSelector
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          onSelect={handleSelectProfile}
        />
      ) : (
        <Typography color="text.secondary">No profiles available.</Typography>
      )}
      <Typography variant="h4" gutterBottom>
        Profiles
      </Typography>
      <Typography color="text.secondary">Manage log collection profiles.</Typography>
    </Box>
  )
}
