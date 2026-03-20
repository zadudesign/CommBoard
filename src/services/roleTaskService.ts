import { supabase } from '../supabase';
import { RoleTasks, Role } from '../types';

const isSupabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

const INITIAL_TASKS: RoleTasks[] = [
  { role: 'Sonido', tasks: [] },
  { role: 'Transmisión', tasks: [] },
  { role: 'Proyección', tasks: [] },
  { role: 'Medios Digitales', tasks: [] },
  { role: 'Coordinación', tasks: [] },
];

export const roleTaskService = {
  async getRoleTasks(): Promise<RoleTasks[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('data')
          .eq('id', 'role_tasks')
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data?.data?.tasks) {
          return data.data.tasks;
        } else {
          // If no tasks found, return initial tasks but don't save yet
          // to avoid unnecessary writes on first load
          return INITIAL_TASKS;
        }
      } catch (e) {
        console.error("Error reading role tasks from Supabase, falling back to local", e);
        const local = localStorage.getItem('role_tasks');
        return local ? JSON.parse(local) : INITIAL_TASKS;
      }
    } else {
      const local = localStorage.getItem('role_tasks');
      return local ? JSON.parse(local) : INITIAL_TASKS;
    }
  },

  async saveRoleTasks(tasks: RoleTasks[]): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('settings')
        .upsert({ id: 'role_tasks', data: { tasks } });
      
      if (error) throw error;
    } else {
      localStorage.setItem('role_tasks', JSON.stringify(tasks));
    }
  }
};
