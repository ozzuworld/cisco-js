import { apiClient } from './api'
import type { LogProfile } from '@/types'

export const profileService = {
  /**
   * Get all available log profiles
   */
  async getProfiles(): Promise<LogProfile[]> {
    const response = await apiClient.get<any>('/profiles')

    // Handle different response formats from backend
    // Backend might return: { profiles: [...] } or just [...]
    if (Array.isArray(response)) {
      return response
    }

    if (response && typeof response === 'object' && Array.isArray(response.profiles)) {
      return response.profiles
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
