import { Volunteer, Shift, Role, Day, ScheduleConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getServiceDate } from './dates';

const WEEKS = 4;
const FULL_ROLES: Role[] = ['Coordinación', 'Medios Digitales', 'Proyección', 'Sonido', 'Transmisión'];

export const SERVICES: { day: Day; roles: Role[] }[] = [
  { day: 'Miércoles', roles: FULL_ROLES },
  { day: 'Sábado Mañana', roles: FULL_ROLES },
  { day: 'Sábado Tarde', roles: FULL_ROLES },
];

export function generateSchedule(volunteers: Volunteer[], config: ScheduleConfig, month: number, year: number): Shift[] {
  // Filter active volunteers
  const activeVolunteers = volunteers.filter(v => v.active !== false);
  
  const schedule: Shift[] = [];
  const assignmentsCount: Record<string, number> = {}; // volunteerId -> total shifts in month
  const weeklyAssignments: Record<number, Record<string, { day: Day, role: Role }[]>> = {}; // week -> volunteerId -> assignments
  const roleAssignmentsCount: Record<string, Record<string, number>> = {}; // volunteerId -> role -> count
  const dayAssignmentsCount: Record<string, Record<string, number>> = {}; // volunteerId -> day -> count

  // Initialize tracking
  activeVolunteers.forEach(v => {
    assignmentsCount[v.id] = 0;
    roleAssignmentsCount[v.id] = {};
    dayAssignmentsCount[v.id] = {};
  });
  for (let w = 1; w <= WEEKS; w++) {
    weeklyAssignments[w] = {};
  }

  for (let week = 1; week <= WEEKS; week++) {
    for (const service of SERVICES) {
      const serviceDate = getServiceDate(week, service.day, month, year);
      const yearStr = serviceDate.getFullYear();
      const monthStr = String(serviceDate.getMonth() + 1).padStart(2, '0');
      const d = String(serviceDate.getDate()).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${d}`;

      for (const role of service.roles) {
        // Find eligible volunteers
        const eligible = activeVolunteers.filter(v => {
          // Check restricted dates
          if (v.restrictedDates && v.restrictedDates.includes(dateStr)) return false;
          // Has the required role
          if (!v.roles.includes(role)) return false;
          // Available on the required day
          if (!v.days.includes(service.day)) return false;
          
          const weekAssignments = weeklyAssignments[week][v.id] || [];
          const sameDayAssignments = weekAssignments.filter(a => a.day === service.day);
          
          if (sameDayAssignments.length > 0) {
            // Already assigned THIS day.
            // Can only combine Coordinación with ONE other role
            if (role === 'Coordinación') {
              if (sameDayAssignments.some(a => a.role === 'Coordinación')) return false; // Already coordinating
            } else {
              // Assigning a normal role
              const hasNormalRole = sameDayAssignments.some(a => a.role !== 'Coordinación');
              if (hasNormalRole) return false; // Already has a normal role
            }
          }
          
          // Hasn't exceeded monthly limit
          if (assignmentsCount[v.id] >= config.maxPerMonth) return false;
          return true;
        });

        // Sort candidates
        eligible.sort((a, b) => {
          // 1. Weekly load (balance shifts within the SAME week to avoid fatigue)
          const aWeekLoad = (weeklyAssignments[week][a.id] || []).length;
          const bWeekLoad = (weeklyAssignments[week][b.id] || []).length;
          if (aWeekLoad !== bWeekLoad) return aWeekLoad - bWeekLoad;

          // 2. Role rotation (fewest times doing THIS role)
          const aRoleCount = roleAssignmentsCount[a.id]?.[role] || 0;
          const bRoleCount = roleAssignmentsCount[b.id]?.[role] || 0;
          if (aRoleCount !== bRoleCount) return aRoleCount - bRoleCount;

          // 3. Day rotation (fewest times doing THIS day)
          const aDayCount = dayAssignmentsCount[a.id]?.[service.day] || 0;
          const bDayCount = dayAssignmentsCount[b.id]?.[service.day] || 0;
          if (aDayCount !== bDayCount) return aDayCount - bDayCount;

          // 4. Prioritize those with fewer total assignments (balance)
          const countDiff = assignmentsCount[a.id] - assignmentsCount[b.id];
          if (countDiff !== 0) return countDiff;

          // 5. Avoid consecutive weeks if possible
          const aWorkedLastWeek = week > 1 && (weeklyAssignments[week - 1][a.id] || []).length > 0;
          const bWorkedLastWeek = week > 1 && (weeklyAssignments[week - 1][b.id] || []).length > 0;
          if (aWorkedLastWeek && !bWorkedLastWeek) return 1;
          if (!aWorkedLastWeek && bWorkedLastWeek) return -1;

          // 6. Randomize to avoid always picking the same person for ties
          return Math.random() - 0.5;
        });

        let assignedId: string | null = null;
        if (eligible.length > 0) {
          const selected = eligible[0];
          assignedId = selected.id;
          
          if (!weeklyAssignments[week][selected.id]) {
            weeklyAssignments[week][selected.id] = [];
          }
          weeklyAssignments[week][selected.id].push({ day: service.day, role });
          
          const sameDayAssignments = weeklyAssignments[week][selected.id].filter(a => a.day === service.day);
          
          // Only count as a new shift if it's the first role they take on this specific day
          if (sameDayAssignments.length === 1) {
            assignmentsCount[selected.id]++;
            
            if (!dayAssignmentsCount[selected.id]) {
              dayAssignmentsCount[selected.id] = {};
            }
            dayAssignmentsCount[selected.id][service.day] = (dayAssignmentsCount[selected.id][service.day] || 0) + 1;
          }
          
          if (!roleAssignmentsCount[selected.id]) {
            roleAssignmentsCount[selected.id] = {};
          }
          roleAssignmentsCount[selected.id][role] = (roleAssignmentsCount[selected.id][role] || 0) + 1;
        }

        schedule.push({
          id: uuidv4(),
          week,
          day: service.day,
          role,
          volunteerId: assignedId,
          month,
          year
        });
      }
    }
  }

  return schedule;
}
