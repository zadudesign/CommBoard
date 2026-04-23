import { supabase } from '../supabase';
import { SystemSettings } from '../types';

const DEFAULT_PIN = '1234';
const DEFAULT_SETTINGS: SystemSettings = {
  enabledAvailabilityMonths: []
};

// Check if Supabase URL is configured
const isSupabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

export const settingsService = {
  async verifyPin(pin: string): Promise<boolean> {
    const currentPin = await this.getPin();
    return pin === currentPin;
  },
  
  async getPin(): Promise<string> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('data')
          .eq('id', 'auth')
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw error;
        }

        if (data) {
          return (data.data as any).pin;
        } else {
          await this.changePin(DEFAULT_PIN);
          return DEFAULT_PIN;
        }
      } catch (e) {
        console.error("Error reading PIN from Supabase, falling back to local", e);
        return localStorage.getItem('admin_pin') || DEFAULT_PIN;
      }
    } else {
      return localStorage.getItem('admin_pin') || DEFAULT_PIN;
    }
  },
  
  async changePin(newPin: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('settings')
        .upsert({ id: 'auth', data: { pin: newPin } });
      
      if (error) throw error;
    } else {
      localStorage.setItem('admin_pin', newPin);
    }
  },

  async getSettings(): Promise<SystemSettings> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('data')
          .eq('id', 'system_settings')
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') return DEFAULT_SETTINGS;
          throw error;
        }
        
        return {
          enabledAvailabilityMonths: (data.data as any).enabledAvailabilityMonths || []
        };
      } catch (e) {
        console.error("Error loading settings from Supabase, falling back to local", e);
        const data = localStorage.getItem('system_settings');
        return data ? JSON.parse(data) : DEFAULT_SETTINGS;
      }
    } else {
      const data = localStorage.getItem('system_settings');
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    }
  },

  async updateSettings(settings: SystemSettings): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('settings')
          .upsert({
            id: 'system_settings',
            data: { enabledAvailabilityMonths: settings.enabledAvailabilityMonths },
            updated_at: new Date().toISOString()
          });
        
        if (error) throw error;
      } catch (e) {
        console.error("Error saving settings to Supabase, falling back to local", e);
        localStorage.setItem('system_settings', JSON.stringify(settings));
      }
    } else {
      localStorage.setItem('system_settings', JSON.stringify(settings));
    }
  }
};
