import { Day } from '../types';

const dayMap: Record<string, number> = {
  'Miércoles': 3,
  'Sábado Mañana': 6,
  'Sábado Tarde': 6,
};

export function getServiceDate(week: number, day: Day, month?: number, year?: number): Date {
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth();
  
  const targetDayOfWeek = dayMap[day];
  
  // Find the first occurrence of targetDayOfWeek in the current month
  let date = new Date(targetYear, targetMonth, 1);
  while (date.getDay() !== targetDayOfWeek) {
    date.setDate(date.getDate() + 1);
  }
  
  // Add weeks (week is 1-indexed)
  date.setDate(date.getDate() + (week - 1) * 7);
  return date;
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

export function formatDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric' });
  const formatted = formatter.format(date);
  // Capitalize first letter
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function getMonthName(month: number, year: number): string {
  const date = new Date(year, month, 1);
  const formatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
  const formatted = formatter.format(date).replace(' de ', ' ');
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function getCurrentWeekNumber(month?: number, year?: number): number {
  const now = new Date();
  const targetMonth = month ?? now.getMonth();
  const targetYear = year ?? now.getFullYear();
  
  if (targetMonth === now.getMonth() && targetYear === now.getFullYear()) {
    const date = now.getDate();
    // Simple approximation: week 1 is days 1-7, week 2 is 8-14, etc.
    return Math.min(4, Math.ceil(date / 7));
  }
  return 1;
}
