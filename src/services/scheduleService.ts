import { supabase } from '../supabase';
import { Shift, SpecialEvent } from '../types';

// Check if Supabase URL is configured
const isSupabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

export const scheduleService = {
  async getSchedule(): Promise<Shift[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('schedule')
          .select('*');
        
        if (error) throw error;
        
        return (data || []).map(d => ({
          ...d,
          volunteerId: d.volunteer_id,
          eventName: d.event_name
        } as Shift));
      } catch (e) {
        console.error("Error loading schedule from Supabase, falling back to local", e);
        const data = localStorage.getItem('schedule');
        return data ? JSON.parse(data) : [];
      }
    } else {
      const data = localStorage.getItem('schedule');
      return data ? JSON.parse(data) : [];
    }
  },
  
  async saveSchedule(schedule: Shift[]): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        // In Supabase, we can use a transaction or just delete and insert
        // For simplicity, we'll delete all and insert new ones
        const { error: deleteError } = await supabase
          .from('schedule')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
        if (deleteError) throw deleteError;
        
        if (schedule.length > 0) {
          const insertData = schedule.map(shift => ({
            id: shift.id,
            week: shift.week,
            day: shift.day,
            role: shift.role,
            volunteer_id: shift.volunteerId,
            evaluated: shift.evaluated,
            month: shift.month,
            year: shift.year,
            date: shift.date,
            event_name: shift.eventName,
            scores: shift.scores
          }));
          
          const { error: insertError } = await supabase
            .from('schedule')
            .insert(insertData);
          
          if (insertError) throw insertError;
        }
      } catch (e) {
        console.error("Error saving schedule to Supabase, falling back to local", e);
        localStorage.setItem('schedule', JSON.stringify(schedule));
      }
    } else {
      localStorage.setItem('schedule', JSON.stringify(schedule));
    }
  },

  async getSpecialEvents(): Promise<SpecialEvent[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('special_events')
          .select('*');
        
        if (error) throw error;
        
        return (data || []).map(d => ({
          ...d,
          startDate: d.start_date,
          endDate: d.end_date
        } as SpecialEvent));
      } catch (e) {
        console.error("Error loading special events from Supabase, falling back to local", e);
        const data = localStorage.getItem('specialEvents');
        return data ? JSON.parse(data) : [];
      }
    } else {
      const data = localStorage.getItem('specialEvents');
      return data ? JSON.parse(data) : [];
    }
  },

  async saveSpecialEvent(event: SpecialEvent): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('special_events')
          .upsert({
            id: event.id,
            name: event.name,
            start_date: event.startDate,
            end_date: event.endDate,
            roles: event.roles
          });
        
        if (error) throw error;
      } catch (e) {
        console.error("Error saving special event to Supabase", e);
        const events = await this.getSpecialEvents();
        localStorage.setItem('specialEvents', JSON.stringify([...events, event]));
      }
    } else {
      const events = await this.getSpecialEvents();
      localStorage.setItem('specialEvents', JSON.stringify([...events, event]));
    }
  },

  async deleteSpecialEvent(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('special_events')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      } catch (e) {
        console.error("Error deleting special event from Supabase", e);
        const events = await this.getSpecialEvents();
        localStorage.setItem('specialEvents', JSON.stringify(events.filter(e => e.id !== id)));
      }
    } else {
      const events = await this.getSpecialEvents();
      localStorage.setItem('specialEvents', JSON.stringify(events.filter(e => e.id !== id)));
    }
  },

  async deleteScheduleByMonth(month: number, year: number): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('schedule')
          .delete()
          .eq('month', month)
          .eq('year', year);
        
        if (error) throw error;
      } catch (e) {
        console.error("Error deleting month schedule from Supabase, falling back to local", e);
        const schedule = await this.getSchedule();
        const filtered = schedule.filter(s => s.month !== month || s.year !== year);
        localStorage.setItem('schedule', JSON.stringify(filtered));
      }
    } else {
      const schedule = await this.getSchedule();
      const filtered = schedule.filter(s => s.month !== month || s.year !== year);
      localStorage.setItem('schedule', JSON.stringify(filtered));
    }
  }
};
