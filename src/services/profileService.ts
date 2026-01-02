import { apiClient } from './api'
import type { LogProfile } from '@/types'

export const profileService = {
  /**
   * Get all available log profiles
   */
  async getProfiles(): Promise<LogProfile[]> {
    return apiClient.get<LogProfile[]>('/api/profiles')
  },

  /**
   * Get profile by ID
   */
  async getProfile(profileId: string): Promise<LogProfile> {
    return apiClient.get<LogProfile>(`/api/profiles/${profileId}`)
  },

  /**
   * Create custom profile
   */
  async createProfile(profile: Omit<LogProfile, 'id' | 'isCustom'>): Promise<LogProfile> {
    return apiClient.post<LogProfile>('/api/profiles', profile)
  },

  /**
   * Delete custom profile
   */
  async deleteProfile(profileId: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/api/profiles/${profileId}`)
  },
}
