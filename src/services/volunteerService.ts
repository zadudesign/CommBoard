import { supabase } from '../supabase';
import { Volunteer } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface IVolunteerService {
  getVolunteers(): Promise<Volunteer[]>;
  addVolunteer(volunteer: Omit<Volunteer, 'id'>): Promise<Volunteer>;
  updateVolunteer(id: string, volunteer: Partial<Volunteer>): Promise<void>;
  deleteVolunteer(id: string): Promise<void>;
}

class SupabaseVolunteerService implements IVolunteerService {
  private tableName = 'volunteers';

  async getVolunteers(): Promise<Volunteer[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*');
    
    if (error) throw error;
    
    return (data || []).map(v => ({
      ...v,
      photoUrl: v.photo_url,
      createdAt: v.created_at ? new Date(v.created_at).getTime() : undefined,
      restrictedDates: v.restricted_dates,
      active: v.stats?.active ?? v.active ?? true
    } as Volunteer));
  }

  async addVolunteer(volunteer: Omit<Volunteer, 'id'>): Promise<Volunteer> {
    const statsWithActive = { ...(volunteer.stats || {}), active: volunteer.active ?? true };
    
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([{
        name: volunteer.name,
        photo_url: volunteer.photoUrl,
        roles: volunteer.roles,
        days: volunteer.days,
        stats: statsWithActive,
        restricted_dates: volunteer.restrictedDates
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      ...data,
      photoUrl: data.photo_url,
      createdAt: data.created_at ? new Date(data.created_at).getTime() : undefined,
      restrictedDates: data.restricted_dates,
      active: data.stats?.active ?? true
    } as Volunteer;
  }

  async updateVolunteer(id: string, volunteer: Partial<Volunteer>): Promise<void> {
    const updateData: any = {};
    if (volunteer.name !== undefined) updateData.name = volunteer.name;
    if (volunteer.photoUrl !== undefined) updateData.photo_url = volunteer.photoUrl;
    if (volunteer.roles !== undefined) updateData.roles = volunteer.roles;
    if (volunteer.days !== undefined) updateData.days = volunteer.days;
    if (volunteer.restrictedDates !== undefined) updateData.restricted_dates = volunteer.restrictedDates;
    
    if (volunteer.active !== undefined || volunteer.stats !== undefined) {
      // Fetch current stats to merge properly
      const { data: currentData } = await supabase.from(this.tableName).select('stats').eq('id', id).single();
      const currentStats = currentData?.stats || {};
      
      updateData.stats = {
        ...currentStats,
        ...(volunteer.stats || {})
      };
      
      if (volunteer.active !== undefined) {
        updateData.stats.active = volunteer.active;
      }
    }

    const { error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
  }

  async deleteVolunteer(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

class LocalVolunteerService implements IVolunteerService {
  private getLocal(): Volunteer[] {
    const data = localStorage.getItem('volunteers');
    return data ? JSON.parse(data) : [];
  }

  private setLocal(data: Volunteer[]) {
    localStorage.setItem('volunteers', JSON.stringify(data));
  }

  async getVolunteers(): Promise<Volunteer[]> {
    return this.getLocal();
  }

  async addVolunteer(volunteer: Omit<Volunteer, 'id'>): Promise<Volunteer> {
    const volunteers = this.getLocal();
    const newVolunteer = { ...volunteer, id: uuidv4(), active: volunteer.active ?? true };
    volunteers.push(newVolunteer);
    this.setLocal(volunteers);
    return newVolunteer;
  }

  async updateVolunteer(id: string, volunteer: Partial<Volunteer>): Promise<void> {
    const volunteers = this.getLocal();
    const index = volunteers.findIndex(v => v.id === id);
    if (index !== -1) {
      volunteers[index] = { ...volunteers[index], ...volunteer };
      this.setLocal(volunteers);
    }
  }

  async deleteVolunteer(id: string): Promise<void> {
    const volunteers = this.getLocal();
    this.setLocal(volunteers.filter(v => v.id !== id));
  }
}

// Check if Supabase URL is configured
const isSupabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

export const isUsingLocalFallback = !isSupabaseConfigured;
export const volunteerService = isUsingLocalFallback ? new LocalVolunteerService() : new SupabaseVolunteerService();
