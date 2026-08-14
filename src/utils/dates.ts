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

export const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function formatDate(date: Date): string {
  const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][date.getDay()];
  const day = date.getDate();
  return `${dayName} ${day}`;
}

export function getMonthName(month: number, year: number): string {
  const name = monthNames[month] || 'Mes';
  return `${name} ${year}`;
}

export function getStartOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function parseShiftDate(
  shift: { date?: string; week: number; day: any; month?: number; year?: number },
  fallbackMonth?: number,
  fallbackYear?: number
): Date {
  if (shift.date) {
    const parts = shift.date.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
  }
  return getServiceDate(shift.week, shift.day, shift.month ?? fallbackMonth, shift.year ?? fallbackYear);
}

export function formatWeekRange(start: Date, end: Date): string {
  const startDay = start.getDate();
  const startMonth = monthNames[start.getMonth()];
  const endDay = end.getDate();
  const endMonth = monthNames[end.getMonth()];

  if (start.getMonth() === end.getMonth()) {
    return `Del Domingo ${startDay} al Sábado ${endDay} de ${startMonth}`;
  } else {
    return `Del Domingo ${startDay} de ${startMonth} al Sábado ${endDay} de ${endMonth}`;
  }
}

export function getCurrentWeekNumber(month?: number, year?: number): number {
  const now = new Date();
  const targetMonth = month ?? now.getMonth();
  const targetYear = year ?? now.getFullYear();
  
  if (targetMonth === now.getMonth() && targetYear === now.getFullYear()) {
    const date = now.getDate();
    // Week 1 is days leading to first Wed/Sat, relative to first service day
    return Math.ceil(date / 7);
  }
  return 1;
}
