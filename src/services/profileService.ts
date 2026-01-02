import { apiClient } from './api'
import type { LogProfile } from '@/types'

export const profileService = {
  /**
   * Get all available log profiles
   */
  async getProfiles(): Promise<LogProfile[]> {
    return apiClient.get<LogProfile[]>('/profiles')
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
