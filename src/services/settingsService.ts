import { supabase } from '../supabase';

const DEFAULT_PIN = '1234';

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
          return data.data.pin;
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
  }
};
