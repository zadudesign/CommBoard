export type Role = 'Sonido' | 'Transmisión' | 'Proyección' | 'Medios Digitales' | 'Coordinación';
export type Day = 'Miércoles' | 'Sábado Mañana' | 'Sábado Tarde';

export interface VolunteerStats {
  puntualidad: number;
  orden: number;
  responsabilidad: number;
  extraPoints: number;
  total: number;
  active?: boolean;
}

export interface Volunteer {
  id: string;
  name: string;
  photoUrl?: string;
  roles: Role[];
  days: Day[];
  createdAt?: number;
  stats?: VolunteerStats;
  restrictedDates?: string[];
  active?: boolean;
}

export interface Shift {
  id: string;
  week: number;
  day: Day | string;
  role: Role;
  volunteerId: string | null;
  evaluated?: boolean;
  month?: number;
  year?: number;
  date?: string; // ISO date string for special events
  eventName?: string; // Name of the special event
  scores?: {
    puntualidad: number;
    orden: number;
    responsabilidad: number;
    total: number;
    note?: string;
  };
}

export interface SpecialEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  roles: Role[];
}

export interface ScheduleConfig {
  maxPerMonth: number;
  maxPerWeek: number;
}

export interface RoleTasks {
  role: Role;
  tasks: string[];
}
