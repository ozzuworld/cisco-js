import { apiClient } from './api'
import type { LogProfile } from '@/types'

export const profileService = {
  /**
   * Get all available log profiles
   */
  async getProfiles(): Promise<LogProfile[]> {
    const response = await apiClient.get<any>('/profiles')

    console.log('Profiles API Response:', response)

    // Handle different response formats from backend
    // Backend might return: { profiles: [...] } or just [...]
    if (Array.isArray(response)) {
      console.log('Profiles returned as array:', response)
      return response
    }

    if (response && typeof response === 'object' && Array.isArray(response.profiles)) {
      console.log('Profiles extracted from object.profiles:', response.profiles)
      return response.profiles
    }

    if (response && typeof response === 'object') {
      // Try to extract profiles from object keys
      const profilesArray = Object.values(response)
      if (profilesArray.length > 0 && profilesArray.every(p => typeof p === 'object')) {
        console.log('Profiles extracted from object values:', profilesArray)
        return profilesArray as LogProfile[]
      }
    }

    // Fallback to empty array if format is unexpected
    console.error('Unexpected profiles response format:', response)
    return []
  },

  /**
   * Get profile by ID
   */
  async getProfile(profileId: string): Promise<LogProfile> {
    return apiClient.get<LogProfile>(`/profiles/${profileId}`)
  },

  /**
   * Create custom profile
   */
  async createProfile(profile: Omit<LogProfile, 'id' | 'isCustom'>): Promise<LogProfile> {
    return apiClient.post<LogProfile>('/profiles', profile)
  },

  /**
   * Delete custom profile
   */
  async deleteProfile(profileId: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/profiles/${profileId}`)
  },
}
