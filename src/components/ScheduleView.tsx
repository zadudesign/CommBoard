import React, { useState, useMemo, useEffect } from 'react';
import { Volunteer, Shift, ScheduleConfig, Role } from '../types';
import { generateSchedule, SERVICES } from '../utils/scheduler';
import { scheduleService } from '../services/scheduleService';
import { CalendarDays, AlertCircle, RefreshCw, Settings2, UserCircle2, Calendar as CalendarIcon, CalendarRange, Star, CheckCircle2, ChevronLeft, ChevronRight, List, Grid, Download, PlusCircle, X, Trash2, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';
import { ROLE_CONFIG } from '../utils/roleConfig';
import { getServiceDate, isToday, formatDate, getCurrentWeekNumber, getMonthName } from '../utils/dates';
import { EvaluationModal } from './EvaluationModal';
import { SpecialEventForm } from './SpecialEventForm';
import { SpecialEvent, RoleTasks } from '../types';
import { roleTaskService } from '../services/roleTaskService';

interface ScheduleViewProps {
  volunteers: Volunteer[];
  isAdmin: boolean;
  selectedVolunteerId: string | null;
  onSelectVolunteer: (id: string | null) => void;
  onVolunteerEvaluated: (volunteerId: string, scores: { puntualidad: number; orden: number; responsabilidad: number; note?: string }) => Promise<void>;
}

export function ScheduleView({ volunteers, isAdmin, selectedVolunteerId, onSelectVolunteer, onVolunteerEvaluated }: ScheduleViewProps) {
  const [config, setConfig] = useState<ScheduleConfig>({ maxPerMonth: 2, maxPerWeek: 1 });
  const [schedule, setSchedule] = useState<Shift[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly' | 'list' | 'calendar'>('weekly');
  const [evaluatingShift, setEvaluatingShift] = useState<{ shiftId: string, volunteerId: string, volunteerName: string } | null>(null);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [isManageEventsOpen, setIsManageEventsOpen] = useState(false);
  const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>([]);
  const [roleTasks, setRoleTasks] = useState<RoleTasks[]>([]);
  const [viewingTasksRole, setViewingTasksRole] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const selectedMonth = currentDate.getMonth();
  const selectedYear = currentDate.getFullYear();

  useEffect(() => {
    loadSchedule();
    loadRoleTasks();
  }, []);

  const loadRoleTasks = async () => {
    try {
      const data = await roleTaskService.getRoleTasks();
      setRoleTasks(data);
    } catch (error) {
      console.error('Error loading role tasks:', error);
    }
  };

  // Auto-switch to list view when a volunteer is selected
  useEffect(() => {
    if (selectedVolunteerId) {
      setViewMode('list');
    }
  }, [selectedVolunteerId]);

  // Reset view mode if admin logs out while in calendar view
  useEffect(() => {
    if (!isAdmin && viewMode === 'calendar') {
      setViewMode('weekly');
    }
  }, [isAdmin, viewMode]);

  const loadSchedule = async () => {
    setIsLoading(true);
    const [scheduleData, eventsData] = await Promise.all([
      scheduleService.getSchedule(),
      scheduleService.getSpecialEvents()
    ]);
    setSchedule(scheduleData);
    setSpecialEvents(eventsData);
    setIsLoading(false);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(selectedYear, selectedMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(selectedYear, selectedMonth + 1, 1));
  };

  const currentMonthSchedule = useMemo(() => {
    return schedule.filter(s => {
      if (s.date) {
        const d = new Date(s.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      }
      const shiftMonth = s.month ?? new Date().getMonth();
      const shiftYear = s.year ?? new Date().getFullYear();
      return shiftMonth === selectedMonth && shiftYear === selectedYear;
    });
  }, [schedule, selectedMonth, selectedYear]);

  const handleCreateSpecialEvent = async (eventData: Omit<SpecialEvent, 'id'>) => {
    const eventId = uuidv4();
    const start = new Date(eventData.startDate);
    const end = new Date(eventData.endDate);
    const newShifts: Shift[] = [];

    // Iterate through dates
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const month = current.getMonth();
      const year = current.getFullYear();
      // Week number is an approximation for special events
      const week = Math.ceil(current.getDate() / 7);

      eventData.roles.forEach(role => {
        newShifts.push({
          id: uuidv4(),
          week,
          day: eventData.name, // Use event name as day for display
          role,
          volunteerId: null,
          month,
          year,
          date: dateStr,
          eventName: eventData.name
        });
      });
      current.setDate(current.getDate() + 1);
    }

    const updatedSchedule = [...schedule, ...newShifts];
    await scheduleService.saveSchedule(updatedSchedule);
    setSchedule(updatedSchedule);
    setIsEventFormOpen(false);
    
    // Save event metadata
    const newEvent = { ...eventData, id: eventId };
    await scheduleService.saveSpecialEvent(newEvent);
    setSpecialEvents(prev => [...prev, newEvent]);
  };

  const handleDeleteSpecialEvent = async (eventId: string, eventName: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el evento "${eventName}"? Se eliminarán todos los turnos asociados.`)) {
      return;
    }

    try {
      // 1. Delete event metadata
      await scheduleService.deleteSpecialEvent(eventId);
      
      // 2. Filter out shifts associated with this event
      const updatedSchedule = schedule.filter(s => s.eventName !== eventName);
      await scheduleService.saveSchedule(updatedSchedule);
      
      // 3. Update local state
      setSchedule(updatedSchedule);
      setSpecialEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (error) {
      console.error("Error deleting special event:", error);
      alert("Error al eliminar el evento");
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const newSchedule = generateSchedule(volunteers, config, selectedMonth, selectedYear);
      const updatedSchedule = [
        ...schedule.filter(s => {
          const shiftMonth = s.month ?? new Date().getMonth();
          const shiftYear = s.year ?? new Date().getFullYear();
          return !(shiftMonth === selectedMonth && shiftYear === selectedYear);
        }),
        ...newSchedule
      ];
      await scheduleService.saveSchedule(updatedSchedule);
      setSchedule(updatedSchedule);
    } catch (error) {
      console.error("Error generating schedule:", error);
      alert("Error al generar el calendario");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteMonthSchedule = async () => {
    if (!window.confirm(`¿Estás seguro de que deseas borrar TODOS los turnos de ${getMonthName(selectedMonth, selectedYear)}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setIsLoading(true);
      await scheduleService.deleteScheduleByMonth(selectedMonth, selectedYear);
      const updatedSchedule = schedule.filter(s => {
        const shiftMonth = s.month ?? new Date().getMonth();
        const shiftYear = s.year ?? new Date().getFullYear();
        return !(shiftMonth === selectedMonth && shiftYear === selectedYear);
      });
      setSchedule(updatedSchedule);
    } catch (error) {
      console.error("Error deleting month schedule:", error);
      alert("Error al borrar el calendario");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvaluateSubmit = async (scores: { puntualidad: number; orden: number; responsabilidad: number; note?: string }) => {
    if (!evaluatingShift) return;
    try {
      const total = scores.puntualidad + scores.orden + scores.responsabilidad;
      // Update shift
      const updatedSchedule = schedule.map(s => 
        s.id === evaluatingShift.shiftId 
          ? { ...s, evaluated: true, scores: { ...scores, total } } 
          : s
      );
      await scheduleService.saveSchedule(updatedSchedule);
      setSchedule(updatedSchedule);
      
      // Update volunteer
      await onVolunteerEvaluated(evaluatingShift.volunteerId, scores);
    } catch (error) {
      console.error("Error saving evaluation:", error);
      alert("Error al guardar la evaluación");
    } finally {
      setEvaluatingShift(null);
    }
  };

  const handleReassignVolunteer = async (shiftId: string, newVolunteerId: string | null) => {
    try {
      const updatedSchedule = schedule.map(s => 
        s.id === shiftId ? { ...s, volunteerId: newVolunteerId } : s
      );
      await scheduleService.saveSchedule(updatedSchedule);
      setSchedule(updatedSchedule);
      setEditingShiftId(null);
    } catch (error) {
      console.error("Error reassigning volunteer:", error);
      alert("Error al reasignar el voluntario");
    }
  };

  const handleDownloadCSV = () => {
    if (filteredSchedule.length === 0) {
      alert("No hay turnos disponibles para exportar.");
      return;
    }

    // Define CSV headers
    const headers = ['Fecha', 'Turno', 'Rol', 'Voluntario', 'Evaluado'];

    // Map schedule data to CSV rows
    const rows = filteredSchedule
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : getServiceDate(a.week, a.day as any, selectedMonth, selectedYear);
        const dateB = b.date ? new Date(b.date) : getServiceDate(b.week, b.day as any, selectedMonth, selectedYear);
        const dateDiff = dateA.getTime() - dateB.getTime();
        if (dateDiff !== 0) return dateDiff;
        if ((a.day as string).includes('Mañana') && (b.day as string).includes('Tarde')) return -1;
        if ((a.day as string).includes('Tarde') && (b.day as string).includes('Mañana')) return 1;
        return 0;
      })
      .map(shift => {
        const date = shift.date ? new Date(shift.date) : getServiceDate(shift.week, shift.day as any, selectedMonth, selectedYear);
        const dateStr = formatDate(date);
        const shiftTime = shift.eventName ? shift.eventName : (shift.day as string).includes('Mañana') ? 'Mañana' : (shift.day as string).includes('Tarde') ? 'Tarde' : 'Todo el día';
        const volunteerName = getVolunteerName(shift.volunteerId) || 'Sin asignar';
        const evaluated = shift.evaluated ? 'Sí' : 'No';

        return [
          `"${dateStr}"`,
          `"${shiftTime}"`,
          `"${shift.role}"`,
          `"${volunteerName}"`,
          `"${evaluated}"`
        ].join(',');
      });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Create a Blob and trigger download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Calendario_${getMonthName(selectedMonth, selectedYear)}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const conflicts = useMemo(() => currentMonthSchedule.filter(s => s.volunteerId === null).length, [currentMonthSchedule]);

  const getVolunteerName = (id: string | null) => {
    if (!id) return null;
    return volunteers.find(v => v.id === id)?.name || 'Desconocido';
  };

  const selectedVolunteer = useMemo(() => volunteers.find(v => v.id === selectedVolunteerId), [volunteers, selectedVolunteerId]);

  const filteredSchedule = useMemo(() => {
    if (isAdmin) return currentMonthSchedule;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return currentMonthSchedule.filter(s => {
      const date = s.date ? new Date(s.date) : getServiceDate(s.week, s.day as any, selectedMonth, selectedYear);
      const shiftDate = new Date(date);
      shiftDate.setHours(0, 0, 0, 0);
      return shiftDate >= today;
    });
  }, [currentMonthSchedule, isAdmin, selectedMonth, selectedYear]);

  const selectedVolunteerShiftCount = useMemo(() => {
    if (!selectedVolunteerId) return 0;
    return filteredSchedule.filter(s => s.volunteerId === selectedVolunteerId).length;
  }, [filteredSchedule, selectedVolunteerId]);

  const weeks = [1, 2, 3, 4];
  const currentWeek = getCurrentWeekNumber(selectedMonth, selectedYear);
  
  const displayWeeks = useMemo(() => {
    const baseWeeks = viewMode === 'weekly' ? [currentWeek] : weeks;
    if (isAdmin) return baseWeeks;
    
    return baseWeeks.filter(week => 
      filteredSchedule.some(s => s.week === week && (!selectedVolunteerId || s.volunteerId === selectedVolunteerId))
    );
  }, [viewMode, currentWeek, weeks, isAdmin, filteredSchedule, selectedVolunteerId]);

  const allFilteredServices = useMemo(() => {
    if (viewMode !== 'monthly') return [];
    
    const services: { day: string; date: Date; shifts: Shift[]; isEvent: boolean }[] = [];
    const dayNames = Array.from(new Set(filteredSchedule.map(s => s.day)));
    
    filteredSchedule.forEach(shift => {
      if (selectedVolunteerId && shift.volunteerId !== selectedVolunteerId) return;
      
      const date = shift.date 
        ? new Date(shift.date) 
        : getServiceDate(shift.week, shift.day as any, selectedMonth, selectedYear);
      
      const existingService = services.find(s => s.date.getTime() === date.getTime() && s.day === shift.day);
      if (existingService) {
        if (!existingService.shifts.some(s => s.id === shift.id)) {
          existingService.shifts.push(shift);
        }
      } else {
        services.push({
          day: shift.day,
          date,
          shifts: [shift],
          isEvent: !!shift.eventName
        });
      }
    });
    
    return services.sort((a, b) => {
      const dateDiff = a.date.getTime() - b.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      if ((a.day as string).includes('Mañana') && (b.day as string).includes('Tarde')) return -1;
      if ((a.day as string).includes('Tarde') && (b.day as string).includes('Mañana')) return 1;
      return 0;
    });
  }, [filteredSchedule, viewMode, selectedVolunteerId, selectedMonth, selectedYear]);

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 = Sunday

  const calendarDays = Array.from({ length: Math.ceil((daysInMonth + firstDayOfMonth) / 7) * 7 }, (_, i) => {
    const dayNumber = i - firstDayOfMonth + 1;
    if (dayNumber > 0 && dayNumber <= daysInMonth) {
      return dayNumber;
    }
    return null;
  });

  const volunteerShiftsByDay = useMemo(() => {
    const shiftsMap: Record<number, Shift[]> = {};
    
    filteredSchedule.forEach(shift => {
      if (!selectedVolunteerId || shift.volunteerId === selectedVolunteerId) {
        const date = shift.date ? new Date(shift.date) : getServiceDate(shift.week, shift.day as any, selectedMonth, selectedYear);
        if (date.getMonth() === selectedMonth) {
          const day = date.getDate();
          if (!shiftsMap[day]) shiftsMap[day] = [];
          shiftsMap[day].push(shift);
        }
      }
    });
    
    // Sort shifts inside each day
    Object.keys(shiftsMap).forEach(day => {
      shiftsMap[parseInt(day)].sort((a, b) => {
        if ((a.day as string).includes('Mañana') && (b.day as string).includes('Tarde')) return -1;
        if ((a.day as string).includes('Tarde') && (b.day as string).includes('Mañana')) return 1;
        return a.role.localeCompare(b.role);
      });
    });
    
    return shiftsMap;
  }, [filteredSchedule, selectedVolunteerId, selectedMonth, selectedYear]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-black text-brand-primary tracking-tight">Calendario</h2>
            <div className="flex items-center gap-1 bg-white rounded-xl p-1 text-sm font-bold border border-brand-light/50 shadow-sm">
              <button onClick={handlePrevMonth} className="p-1.5 text-brand-secondary hover:text-brand-accent hover:bg-brand-light/20 rounded-lg transition-all"><ChevronLeft size={20}/></button>
              <span className="w-40 text-center capitalize text-brand-primary font-black tracking-wide">{getMonthName(selectedMonth, selectedYear)}</span>
              <button onClick={handleNextMonth} className="p-1.5 text-brand-secondary hover:text-brand-accent hover:bg-brand-light/20 rounded-lg transition-all"><ChevronRight size={20}/></button>
            </div>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {isAdmin ? 'Generación automática de turnos' : 'Consulta tus turnos asignados'}
          </p>
        </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-brand-primary/5 p-1.5 rounded-2xl border border-brand-light/30 shadow-inner">
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  "flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl transition-all uppercase tracking-widest",
                  viewMode === 'list' ? "bg-brand-primary text-white shadow-lg scale-105" : "text-brand-secondary hover:text-brand-primary hover:bg-white/50"
                )}
              >
                <List size={14} />
                Lista
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={clsx(
                  "flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl transition-all uppercase tracking-widest",
                  viewMode === 'weekly' ? "bg-brand-primary text-white shadow-lg scale-105" : "text-brand-secondary hover:text-brand-primary hover:bg-white/50"
                )}
              >
                <CalendarIcon size={14} />
                Semanal
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={clsx(
                  "flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl transition-all uppercase tracking-widest",
                  viewMode === 'monthly' ? "bg-brand-primary text-white shadow-lg scale-105" : "text-brand-secondary hover:text-brand-primary hover:bg-white/50"
                )}
              >
                <CalendarRange size={14} />
                Mensual
              </button>
              {isAdmin && (
                <button
                  onClick={() => setViewMode('calendar')}
                  className={clsx(
                    "flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl transition-all uppercase tracking-widest",
                    viewMode === 'calendar' ? "bg-brand-primary text-white shadow-lg scale-105" : "text-brand-secondary hover:text-brand-primary hover:bg-white/50"
                  )}
                >
                  <Grid size={14} />
                  Calendario
                </button>
              )}
            </div>

            {/* Volunteer Selector */}
            <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-brand-light/50 shadow-sm hover:border-brand-primary/50 transition-all">
              <UserCircle2 size={20} className="text-brand-accent" />
              <select
                value={selectedVolunteerId || ''}
                onChange={(e) => onSelectVolunteer(e.target.value || null)}
                className="text-xs font-black text-brand-primary bg-transparent outline-none cursor-pointer uppercase tracking-wider"
              >
                <option value="">Ver todos los turnos</option>
                {volunteers.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            {/* Admin Controls */}
            {isAdmin && (
              <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-brand-light/50 shadow-sm">
                <div className="flex items-center gap-2 px-3 border-r border-brand-light/30">
                  <Settings2 size={18} className="text-brand-secondary" />
                  <span className="text-xs font-black text-brand-secondary uppercase tracking-widest">Max/Mes:</span>
                  <select
                    value={config.maxPerMonth}
                    onChange={(e) => setConfig({ ...config, maxPerMonth: Number(e.target.value) })}
                    className="text-xs font-black text-brand-accent bg-transparent outline-none cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || volunteers.length === 0}
                  className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2.5 rounded-xl hover:bg-brand-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed font-black text-xs shadow-md active:scale-95 uppercase tracking-widest"
                >
                  <RefreshCw size={18} className={isGenerating ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">Generar</span>
                </button>
                <button
                  onClick={handleDeleteMonthSchedule}
                  disabled={currentMonthSchedule.length === 0 || isGenerating}
                  className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-black text-xs shadow-md active:scale-95 uppercase tracking-widest"
                  title="Borrar turnos del mes"
                >
                  <Trash2 size={18} />
                  <span className="hidden sm:inline">Borrar</span>
                </button>
                <button
                  onClick={handleDownloadCSV}
                  disabled={filteredSchedule.length === 0}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-black text-xs shadow-md active:scale-95 uppercase tracking-widest"
                  title="Descargar CSV"
                >
                  <Download size={18} />
                  <span className="hidden sm:inline">CSV</span>
                </button>
                <button
                  onClick={() => setIsEventFormOpen(true)}
                  className="flex items-center gap-2 bg-brand-accent text-white px-5 py-2.5 rounded-xl hover:bg-brand-accent/90 transition-all font-black text-xs shadow-md active:scale-95 uppercase tracking-widest"
                >
                  <PlusCircle size={18} />
                  <span className="hidden sm:inline">Evento</span>
                </button>
                {specialEvents.length > 0 && (
                  <button
                    onClick={() => setIsManageEventsOpen(true)}
                    className="flex items-center gap-2 bg-brand-light/10 text-brand-secondary border border-brand-light/50 px-4 py-2.5 rounded-xl hover:bg-brand-light/20 transition-all font-black text-xs shadow-sm uppercase tracking-widest"
                    title="Gestionar Eventos"
                  >
                    <CalendarRange size={18} />
                    <span className="hidden sm:inline">Gestionar</span>
                  </button>
                )}
              </div>
            )}
          </div>
      </div>

      {currentMonthSchedule.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="bg-brand-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="text-brand-primary" size={28} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay calendario generado</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            {isAdmin 
              ? 'Configura las reglas y presiona "Generar" para crear la asignación mensual automáticamente.' 
              : 'El administrador aún no ha generado el calendario de este mes.'}
          </p>
          {isAdmin && (
            <button
              onClick={handleGenerate}
              disabled={volunteers.length === 0}
              className="bg-brand-primary text-white px-6 py-2.5 rounded-xl hover:bg-brand-secondary transition-colors font-medium disabled:opacity-50"
            >
              Generar Ahora
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {isAdmin && conflicts > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-amber-800 font-medium">Atención: Turnos sin cubrir</h4>
                <p className="text-amber-700 text-sm mt-1">
                  Hay {conflicts} turnos que no pudieron ser asignados debido a falta de disponibilidad o límites mensuales.
                </p>
              </div>
            </div>
          )}

          {selectedVolunteer && (
            <div className="bg-gradient-to-r from-brand-primary/10 to-transparent p-8 rounded-3xl border border-brand-primary/20 flex items-center gap-8 mb-8 shadow-sm">
              <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-xl flex items-center justify-center overflow-hidden shrink-0">
                {selectedVolunteer.photoUrl ? (
                  <img src={selectedVolunteer.photoUrl} alt={selectedVolunteer.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black text-brand-primary">{selectedVolunteer.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h3 className="text-3xl font-black text-brand-primary uppercase tracking-tight">{selectedVolunteer.name}</h3>
                <p className="text-brand-secondary font-bold mt-1 uppercase tracking-widest text-xs">
                  Mostrando turnos asignados para {getMonthName(selectedMonth, selectedYear)}
                </p>
                <div className="flex items-center gap-2 text-xs font-black text-brand-primary mt-3 bg-white/80 px-4 py-2 rounded-xl inline-flex border border-brand-primary/10 shadow-sm uppercase tracking-wider">
                  <CalendarIcon size={16} className="text-brand-accent" />
                  {selectedVolunteerShiftCount} {selectedVolunteerShiftCount === 1 ? 'turno asignado' : 'turnos asignados'} en este mes
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {viewMode === 'calendar' && isAdmin ? (
              <div className="col-span-1 xl:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6">
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                    <div key={day} className="text-center text-sm font-bold text-gray-400 uppercase tracking-wider py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, index) => {
                    const hasShifts = day !== null && volunteerShiftsByDay[day]?.length > 0;
                    const isTodayDate = day !== null && isToday(new Date(selectedYear, selectedMonth, day));
                    
                    return (
                      <div 
                        key={index} 
                        className={clsx(
                          "min-h-[100px] p-2 rounded-xl border transition-all flex flex-col",
                          day === null ? "bg-transparent border-transparent" : 
                          hasShifts ? "bg-brand-primary/5 border-brand-primary/30 shadow-sm ring-1 ring-brand-primary/20" : 
                          isTodayDate ? "bg-gray-50 border-gray-300" : "bg-white border-gray-100"
                        )}
                      >
                        {day !== null && (
                          <>
                            <div className="flex justify-between items-start mb-2">
                              <span className={clsx(
                                "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full",
                                isTodayDate ? "bg-brand-primary text-white" : 
                                hasShifts ? "text-brand-primary" : "text-gray-500"
                              )}>
                                {day}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1 mt-auto">
                              {hasShifts && volunteerShiftsByDay[day].map(shift => {
                                const roleConfig = ROLE_CONFIG[shift.role];
                                const RoleIcon = roleConfig.icon;
                                const shiftTime = shift.day.includes('Mañana') ? 'M' : shift.day.includes('Tarde') ? 'T' : '';
                                return (
                                  <div 
                                    key={shift.id} 
                                    className={clsx(
                                      "text-[10px] font-medium flex items-center gap-1 px-1.5 py-1 rounded-md border bg-white transition-all", 
                                      roleConfig.color,
                                      isAdmin && "cursor-pointer hover:shadow-sm group",
                                      shift.eventName && "border-brand-accent/30"
                                    )} 
                                    title={`${shift.eventName || ''} - ${getVolunteerName(shift.volunteerId) || 'Sin asignar'}`}
                                    onClick={() => isAdmin && setEditingShiftId(shift.id)}
                                  >
                                    {isAdmin && editingShiftId === shift.id ? (
                                      <select
                                        autoFocus
                                        className="w-full bg-transparent outline-none text-[10px] font-bold"
                                        value={shift.volunteerId || ''}
                                        onChange={(e) => handleReassignVolunteer(shift.id, e.target.value || null)}
                                        onBlur={() => setEditingShiftId(null)}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <option value="">Sin asignar</option>
                                        {volunteers
                                          .filter(v => v.roles.includes(shift.role))
                                          .map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                          ))
                                        }
                                      </select>
                                    ) : (
                                      <>
                                        <RoleIcon size={10} className="shrink-0" />
                                        <span className="truncate">
                                          {shift.role}
                                          {!selectedVolunteerId && shift.volunteerId && (
                                            <span className="ml-1 opacity-75">- {getVolunteerName(shift.volunteerId)?.split(' ')[0]}</span>
                                          )}
                                        </span>
                                        {shiftTime && !shift.eventName && <span className="ml-auto font-bold opacity-50">{shiftTime}</span>}
                                        {shift.eventName && <span className="ml-auto font-bold text-brand-accent">!</span>}
                                        {isAdmin && <Settings2 size={8} className="text-gray-300 group-hover:text-brand-primary ml-0.5 shrink-0" />}
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : viewMode === 'list' ? (
              <div className="col-span-1 xl:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {filteredSchedule
                    .filter(s => !selectedVolunteerId || s.volunteerId === selectedVolunteerId)
                    .sort((a, b) => {
                      const dateA = a.date ? new Date(a.date) : getServiceDate(a.week, a.day as any, selectedMonth, selectedYear);
                      const dateB = b.date ? new Date(b.date) : getServiceDate(b.week, b.day as any, selectedMonth, selectedYear);
                      const dateDiff = dateA.getTime() - dateB.getTime();
                      if (dateDiff !== 0) return dateDiff;
                      if ((a.day as string).includes('Mañana') && (b.day as string).includes('Tarde')) return -1;
                      if ((a.day as string).includes('Tarde') && (b.day as string).includes('Mañana')) return 1;
                      return 0;
                    })
                    .map(shift => {
                      const date = shift.date ? new Date(shift.date) : getServiceDate(shift.week, shift.day as any, selectedMonth, selectedYear);
                      const dateStr = formatDate(date);
                      const shiftTime = shift.eventName ? shift.eventName : (shift.day as string).includes('Mañana') ? 'Mañana' : (shift.day as string).includes('Tarde') ? 'Tarde' : '';
                      const roleConfig = ROLE_CONFIG[shift.role];
                      const RoleIcon = roleConfig.icon;
                      const volunteerName = getVolunteerName(shift.volunteerId);
                      const isUnfilled = !shift.volunteerId;
                      
                      return (
                        <div key={shift.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={clsx(
                              "p-3 rounded-xl shadow-sm border",
                              isToday(date) ? "bg-brand-primary text-white border-brand-primary/20" : "bg-gray-50 text-gray-500 border-gray-100"
                            )}>
                              <CalendarIcon size={24} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className={clsx("font-bold text-base capitalize", isToday(date) ? "text-brand-primary" : "text-gray-900")}>
                                  {dateStr}
                                </h4>
                                {isToday(date) && (
                                  <span className="bg-brand-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Hoy
                                  </span>
                                )}
                                {shift.eventName && (
                                  <span className="bg-brand-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Evento
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {shiftTime && (
                                  <span className={clsx(
                                    "text-xs font-medium uppercase tracking-wider px-2 py-0.5 rounded-md",
                                    shift.eventName ? "bg-brand-accent/10 text-brand-accent" : "bg-gray-100 text-gray-500"
                                  )}>
                                    {shiftTime}
                                  </span>
                                )}
                                <span className={clsx("text-xs font-medium flex items-center gap-1 px-2 py-0.5 rounded-md border", roleConfig.color, "bg-white")}>
                                  <RoleIcon size={12} />
                                  {shift.role}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingTasksRole(shift.role);
                                    }}
                                    className="ml-1.5 p-1 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-full transition-all"
                                    title="Ver tareas"
                                  >
                                    <Info size={14} />
                                  </button>
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                            {!selectedVolunteerId && (
                              <div className="flex items-center gap-2">
                                <UserCircle2 size={16} className={isUnfilled ? "text-red-400" : "text-gray-400"} />
                                {isAdmin && editingShiftId === shift.id ? (
                                  <select
                                    autoFocus
                                    className="text-sm font-bold text-brand-primary bg-white border border-brand-primary/30 rounded-lg px-2 py-1 outline-none shadow-sm"
                                    value={shift.volunteerId || ''}
                                    onChange={(e) => handleReassignVolunteer(shift.id, e.target.value || null)}
                                    onBlur={() => setEditingShiftId(null)}
                                  >
                                    <option value="">Sin asignar</option>
                                    {volunteers
                                      .filter(v => v.roles.includes(shift.role))
                                      .map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                      ))
                                    }
                                  </select>
                                ) : (
                                  <div 
                                    className={clsx(
                                      "flex items-center gap-1.5",
                                      isAdmin && "cursor-pointer hover:bg-gray-100 px-2 py-1 rounded-lg transition-colors group"
                                    )}
                                    onClick={() => isAdmin && setEditingShiftId(shift.id)}
                                  >
                                    <span className={clsx("text-sm font-medium", isUnfilled ? "text-red-600" : "text-gray-700")}>
                                      {isUnfilled ? 'Sin asignar' : volunteerName}
                                    </span>
                                    {isAdmin && <Settings2 size={12} className="text-gray-300 group-hover:text-brand-primary transition-colors" />}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {isAdmin && !isUnfilled && !shift.evaluated && (
                              <button
                                onClick={() => setEvaluatingShift({ shiftId: shift.id, volunteerId: shift.volunteerId!, volunteerName: volunteerName! })}
                                className="text-xs font-medium text-brand-accent bg-brand-accent/10 hover:bg-brand-accent/20 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Star size={14} /> Evaluar
                              </button>
                            )}
                            {isAdmin && !isUnfilled && shift.evaluated && (
                              <div className="text-xs font-medium text-emerald-600 bg-emerald-50 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-emerald-100">
                                <CheckCircle2 size={14} /> Evaluado
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {filteredSchedule.filter(s => !selectedVolunteerId || s.volunteerId === selectedVolunteerId).length === 0 && (
                    <div className="p-12 text-center">
                      <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CalendarIcon className="text-gray-400" size={28} />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No hay turnos</h3>
                      <p className="text-gray-500">
                        {selectedVolunteerId 
                          ? 'No tienes turnos pendientes para el resto del mes.' 
                          : 'No hay turnos programados para el resto del mes.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (viewMode === 'monthly' ? allFilteredServices.length > 0 : displayWeeks.length > 0) ? (
              viewMode === 'monthly' ? (
                <div className="col-span-1 xl:col-span-2 space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="divide-y divide-gray-100">
                      {allFilteredServices.map(service => {
                        const isServiceToday = isToday(service.date);
                        const dateStr = formatDate(service.date).replace(',', '');
                        const shiftTime = service.isEvent 
                          ? service.day 
                          : (service.day as string).includes('Mañana') ? 'Mañana' : (service.day as string).includes('Tarde') ? 'Tarde' : '';

                        return (
                          <div key={`${service.date.getTime()}-${service.day}`} className={clsx("p-5 transition-colors hover:bg-gray-50", isServiceToday && "bg-brand-primary/5")}>
                            <div className={clsx(
                              "flex items-center justify-between mb-4 p-3 rounded-xl border",
                              isServiceToday 
                                ? "bg-brand-primary/10 border-brand-primary/20 shadow-sm" 
                                : "bg-gray-50 border-gray-200"
                            )}>
                              <div className="flex items-center gap-3">
                                <div className={clsx(
                                  "p-2 rounded-lg",
                                  isServiceToday ? "bg-brand-primary text-white shadow-sm" : "bg-white text-gray-500 shadow-sm border border-gray-100"
                                )}>
                                  <CalendarIcon size={20} />
                                </div>
                                <div className="flex flex-col">
                                  <h4 className={clsx(
                                    "font-bold text-base capitalize",
                                    isServiceToday ? "text-brand-primary" : "text-gray-900"
                                  )}>
                                    {dateStr}
                                  </h4>
                                  {shiftTime && (
                                    <span className={clsx(
                                      "text-xs font-bold uppercase tracking-wider mt-0.5",
                                      service.isEvent ? "text-brand-accent" : "text-gray-500"
                                    )}>
                                      {service.isEvent ? `Evento: ${shiftTime}` : shiftTime}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isServiceToday && (
                                <span className="bg-brand-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                  Hoy
                                </span>
                              )}
                              {service.isEvent && !isServiceToday && (
                                <span className="bg-brand-accent text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                  Evento
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {[...service.shifts].sort((a, b) => a.role.localeCompare(b.role)).map(shift => {
                                const volunteerName = getVolunteerName(shift.volunteerId);
                                const isUnfilled = !shift.volunteerId;
                                const isEvaluated = shift.evaluated;
                                const isHighlighted = selectedVolunteerId && shift.volunteerId === selectedVolunteerId;
                                const isDimmed = selectedVolunteerId && !isHighlighted;
                                const roleConfig = ROLE_CONFIG[shift.role];
                                const RoleIcon = roleConfig.icon;
                                
                                return (
                                  <div 
                                    key={shift.id} 
                                    className={twMerge(
                                      clsx(
                                        "flex flex-col p-3 rounded-xl border transition-all duration-300",
                                        isHighlighted 
                                          ? "bg-brand-primary/10 border-brand-primary ring-2 ring-brand-primary shadow-md transform scale-[1.02] z-10" 
                                          : isUnfilled 
                                            ? "bg-red-50 border-red-100" 
                                            : "bg-gray-50 border-gray-100",
                                        isDimmed && "opacity-40 grayscale-[50%]"
                                      )
                                    )}
                                  >
                                    <span className={twMerge(
                                      clsx(
                                        "text-xs font-medium mb-1 flex items-center gap-1",
                                        isHighlighted ? "text-brand-primary" : roleConfig.color
                                      )
                                    )}>
                                      <RoleIcon size={12} />
                                      {shift.role}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setViewingTasksRole(shift.role);
                                        }}
                                        className="ml-1.5 p-1 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-full transition-all"
                                        title="Ver tareas"
                                      >
                                        <Info size={14} />
                                      </button>
                                    </span>
                                    <span className={twMerge(
                                      clsx(
                                        "font-medium text-sm",
                                        isHighlighted ? "text-brand-secondary font-bold" :
                                        isUnfilled ? "text-red-600 flex items-center gap-1" : "text-gray-900"
                                      )
                                    )}>
                                      {isUnfilled && <AlertCircle size={14} />}
                                      {isAdmin && editingShiftId === shift.id ? (
                                        <select
                                          autoFocus
                                          className="text-sm font-bold text-brand-primary bg-white border border-brand-primary/30 rounded-lg px-1 py-0.5 outline-none shadow-sm w-full"
                                          value={shift.volunteerId || ''}
                                          onChange={(e) => handleReassignVolunteer(shift.id, e.target.value || null)}
                                          onBlur={() => setEditingShiftId(null)}
                                        >
                                          <option value="">Sin asignar</option>
                                          {volunteers
                                            .filter(v => v.roles.includes(shift.role))
                                            .map(v => (
                                              <option key={v.id} value={v.id}>{v.name}</option>
                                            ))
                                          }
                                        </select>
                                      ) : (
                                        <div 
                                          className={clsx(
                                            "flex items-center gap-1.5",
                                            isAdmin && "cursor-pointer hover:bg-white/50 px-1 rounded transition-colors group"
                                          )}
                                          onClick={() => isAdmin && setEditingShiftId(shift.id)}
                                        >
                                          <span className="truncate">{isUnfilled ? 'Sin asignar' : volunteerName}</span>
                                          {isAdmin && <Settings2 size={10} className="text-gray-400 group-hover:text-brand-primary transition-colors shrink-0" />}
                                        </div>
                                      )}
                                    </span>
                                    
                                    {isAdmin && !isUnfilled && !isEvaluated && (
                                      <button
                                        onClick={() => setEvaluatingShift({ shiftId: shift.id, volunteerId: shift.volunteerId!, volunteerName: volunteerName! })}
                                        className="mt-2 text-xs font-medium text-brand-accent bg-brand-accent/10 hover:bg-brand-accent/20 py-1 px-2 rounded-md flex items-center justify-center gap-1 transition-colors"
                                      >
                                        <Star size={12} /> Evaluar
                                      </button>
                                    )}
                                    {isAdmin && !isUnfilled && isEvaluated && (
                                      <div className="mt-2 text-xs font-medium text-emerald-600 bg-emerald-50 py-1 px-2 rounded-md flex items-center justify-center gap-1">
                                        <CheckCircle2 size={12} /> Evaluado
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                displayWeeks.map(week => (
                <div key={week} className={clsx("bg-white rounded-2xl border shadow-sm overflow-hidden", viewMode === 'weekly' ? "border-brand-primary/30 shadow-md" : "border-gray-200")}>
                  <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900">
                      {viewMode === 'weekly' ? 'Esta Semana' : `Semana ${week}`}
                    </h3>
                  </div>
                  
                  <div className="divide-y divide-gray-100">
                    {(() => {
                      const weekShifts = filteredSchedule.filter(s => s.week === week);
                      const uniqueServiceDays = Array.from(new Set(weekShifts.map(s => s.day)));
                      const weekServices = uniqueServiceDays.map(dayName => {
                        const shifts = weekShifts.filter(s => s.day === dayName);
                        const firstShift = shifts[0];
                        const date = firstShift.date 
                          ? new Date(firstShift.date) 
                          : getServiceDate(week, dayName as any, selectedMonth, selectedYear);
                        return { 
                          day: dayName, 
                          date, 
                          shifts,
                          isEvent: !!firstShift.eventName 
                        };
                      }).sort((a, b) => {
                        const dateDiff = a.date.getTime() - b.date.getTime();
                        if (dateDiff !== 0) return dateDiff;
                        if ((a.day as string).includes('Mañana') && (b.day as string).includes('Tarde')) return -1;
                        if ((a.day as string).includes('Tarde') && (b.day as string).includes('Mañana')) return 1;
                        return 0;
                      });

                        return weekServices.map(service => {
                          const isServiceToday = isToday(service.date);
                          const dateStr = formatDate(service.date).replace(',', '');
                          const shiftTime = service.isEvent 
                            ? service.day 
                            : (service.day as string).includes('Mañana') ? 'Mañana' : (service.day as string).includes('Tarde') ? 'Tarde' : '';

                          return (
                            <div key={service.day} className={clsx("p-5 transition-colors border-b border-gray-100 last:border-0", isServiceToday && "bg-brand-primary/5")}>
                              <div className={clsx(
                                "flex items-center justify-between mb-4 p-3 rounded-xl border",
                                isServiceToday 
                                  ? "bg-brand-primary/10 border-brand-primary/20 shadow-sm" 
                                  : "bg-gray-50 border-gray-200"
                              )}>
                                <div className="flex items-center gap-3">
                                  <div className={clsx(
                                    "p-2 rounded-lg",
                                    isServiceToday ? "bg-brand-primary text-white shadow-sm" : "bg-white text-gray-500 shadow-sm border border-gray-100"
                                  )}>
                                    <CalendarIcon size={20} />
                                  </div>
                                  <div className="flex flex-col">
                                    <h4 className={clsx(
                                      "font-bold text-base capitalize",
                                      isServiceToday ? "text-brand-primary" : "text-gray-900"
                                    )}>
                                      {dateStr}
                                    </h4>
                                    {shiftTime && (
                                      <span className={clsx(
                                        "text-xs font-bold uppercase tracking-wider mt-0.5",
                                        service.isEvent ? "text-brand-accent" : "text-gray-500"
                                      )}>
                                        {service.isEvent ? `Evento: ${shiftTime}` : shiftTime}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              {isServiceToday && (
                                <span className="bg-brand-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                  Hoy
                                </span>
                              )}
                              {service.isEvent && !isServiceToday && (
                                <span className="bg-brand-accent text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                  Evento
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {[...service.shifts].sort((a, b) => a.role.localeCompare(b.role)).map(shift => {
                              const volunteerName = getVolunteerName(shift.volunteerId);
                              const isUnfilled = !shift.volunteerId;
                              const isEvaluated = shift.evaluated;
                              const isHighlighted = selectedVolunteerId && shift.volunteerId === selectedVolunteerId;
                              const isDimmed = selectedVolunteerId && !isHighlighted;
                              const roleConfig = ROLE_CONFIG[shift.role];
                              const RoleIcon = roleConfig.icon;
                              
                              return (
                                <div 
                                  key={shift.id} 
                                  className={twMerge(
                                    clsx(
                                      "flex flex-col p-3 rounded-xl border transition-all duration-300",
                                      isHighlighted 
                                        ? "bg-brand-primary/10 border-brand-primary ring-2 ring-brand-primary shadow-md transform scale-[1.02] z-10" 
                                        : isUnfilled 
                                          ? "bg-red-50 border-red-100" 
                                          : "bg-gray-50 border-gray-100",
                                      isDimmed && "opacity-40 grayscale-[50%]"
                                    )
                                  )}
                                >
                                  <span className={twMerge(
                                    clsx(
                                      "text-xs font-medium mb-1 flex items-center gap-1",
                                      isHighlighted ? "text-brand-primary" : roleConfig.color
                                    )
                                  )}>
                                    <RoleIcon size={12} />
                                    {shift.role}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setViewingTasksRole(shift.role);
                                      }}
                                      className="ml-1.5 p-1 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-full transition-all"
                                      title="Ver tareas"
                                    >
                                      <Info size={14} />
                                    </button>
                                  </span>
                                  <span className={twMerge(
                                    clsx(
                                      "font-medium text-sm",
                                      isHighlighted ? "text-brand-secondary font-bold" :
                                      isUnfilled ? "text-red-600 flex items-center gap-1" : "text-gray-900"
                                    )
                                  )}>
                                    {isUnfilled && <AlertCircle size={14} />}
                                    {isAdmin && editingShiftId === shift.id ? (
                                      <select
                                        autoFocus
                                        className="text-sm font-bold text-brand-primary bg-white border border-brand-primary/30 rounded-lg px-1 py-0.5 outline-none shadow-sm w-full"
                                        value={shift.volunteerId || ''}
                                        onChange={(e) => handleReassignVolunteer(shift.id, e.target.value || null)}
                                        onBlur={() => setEditingShiftId(null)}
                                      >
                                        <option value="">Sin asignar</option>
                                        {volunteers
                                          .filter(v => v.roles.includes(shift.role))
                                          .map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                          ))
                                        }
                                      </select>
                                    ) : (
                                      <div 
                                        className={clsx(
                                          "flex items-center gap-1.5",
                                          isAdmin && "cursor-pointer hover:bg-white/50 px-1 rounded transition-colors group"
                                        )}
                                        onClick={() => isAdmin && setEditingShiftId(shift.id)}
                                      >
                                        <span className="truncate">{isUnfilled ? 'Sin asignar' : volunteerName}</span>
                                        {isAdmin && <Settings2 size={10} className="text-gray-400 group-hover:text-brand-primary transition-colors shrink-0" />}
                                      </div>
                                    )}
                                  </span>
                                  
                                  {isAdmin && !isUnfilled && !isEvaluated && (
                                    <button
                                      onClick={() => setEvaluatingShift({ shiftId: shift.id, volunteerId: shift.volunteerId!, volunteerName: volunteerName! })}
                                      className="mt-2 text-xs font-medium text-brand-accent bg-brand-accent/10 hover:bg-brand-accent/20 py-1 px-2 rounded-md flex items-center justify-center gap-1 transition-colors"
                                    >
                                      <Star size={12} /> Evaluar
                                    </button>
                                  )}
                                  {isAdmin && !isUnfilled && isEvaluated && (
                                    <div className="mt-2 text-xs font-medium text-emerald-600 bg-emerald-50 py-1 px-2 rounded-md flex items-center justify-center gap-1">
                                      <CheckCircle2 size={12} /> Evaluado
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                  </div>
                </div>
              ))
            )
          ) : (
              <div className="col-span-1 xl:col-span-2 p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="text-gray-400" size={28} />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No hay turnos</h3>
                <p className="text-gray-500">
                  {selectedVolunteerId 
                    ? 'No tienes turnos pendientes para el resto del mes.' 
                    : 'No hay turnos programados para el resto del mes.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {evaluatingShift && (
        <EvaluationModal
          volunteerName={evaluatingShift.volunteerName}
          onClose={() => setEvaluatingShift(null)}
          onSubmit={handleEvaluateSubmit}
        />
      )}

      {isEventFormOpen && isAdmin && (
        <SpecialEventForm
          onSubmit={handleCreateSpecialEvent}
          onCancel={() => setIsEventFormOpen(false)}
        />
      )}

      {isManageEventsOpen && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Gestionar Eventos Especiales</h2>
              <button onClick={() => setIsManageEventsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {specialEvents.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay eventos especiales creados.</p>
              ) : (
                <div className="space-y-3">
                  {specialEvents
                    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                    .map(event => (
                    <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <h4 className="font-bold text-gray-900">{event.name}</h4>
                        <p className="text-xs text-gray-500">
                          {new Date(event.startDate).toLocaleDateString('es-ES')} - {new Date(event.endDate).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteSpecialEvent(event.id, event.name)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar Evento"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setIsManageEventsOpen(false)}
                className="px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Tasks Modal */}
      {viewingTasksRole && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-in fade-in duration-200">
          <div className={clsx(
            "bg-white rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl flex flex-col scale-in border-4",
            ROLE_CONFIG[viewingTasksRole]?.border || 'border-brand-primary'
          )}>
            <div className="p-6 flex items-center justify-between bg-white relative overflow-hidden border-b border-gray-100">
              {/* Decorative background icon */}
              <div className={clsx(
                "absolute -right-6 -bottom-6 opacity-5 rotate-12",
                ROLE_CONFIG[viewingTasksRole as Role]?.color || 'text-brand-primary'
              )}>
                {(() => {
                  const RoleIcon = ROLE_CONFIG[viewingTasksRole as Role]?.icon || Info;
                  return <RoleIcon size={120} />;
                })()}
              </div>

              <div className="flex items-center gap-4 relative z-10">
                <div className={clsx(
                  "p-3 rounded-2xl shadow-inner",
                  ROLE_CONFIG[viewingTasksRole as Role]?.bg || 'bg-brand-primary/10'
                )}>
                  {(() => {
                    const RoleIcon = ROLE_CONFIG[viewingTasksRole as Role]?.icon || Info;
                    return <RoleIcon size={28} className={ROLE_CONFIG[viewingTasksRole as Role]?.color || 'text-brand-primary'} />;
                  })()}
                </div>
                <div>
                  <h2 className={clsx(
                    "text-2xl font-black tracking-tight",
                    ROLE_CONFIG[viewingTasksRole as Role]?.color || 'text-brand-primary'
                  )}>
                    {viewingTasksRole}
                  </h2>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Tareas Específicas</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingTasksRole(null)}
                className={clsx(
                  "p-2 hover:bg-gray-100 rounded-xl transition-all relative z-10 active:scale-90",
                  ROLE_CONFIG[viewingTasksRole as Role]?.color || "text-gray-400"
                )}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className={clsx(
              "p-6 overflow-y-auto flex-1",
              ROLE_CONFIG[viewingTasksRole as Role]?.bg || 'bg-gray-50'
            )}>
              <div className="space-y-4">
                {(() => {
                  const tasks = roleTasks.find(rt => rt.role === viewingTasksRole)?.tasks || [];
                  if (tasks.length === 0) {
                    return (
                      <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-200">
                        <div className={clsx(
                          "mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4",
                          ROLE_CONFIG[viewingTasksRole as Role]?.bg || 'bg-gray-100'
                        )}>
                          <Info className={ROLE_CONFIG[viewingTasksRole as Role]?.color} size={32} />
                        </div>
                        <p className="text-gray-500 font-medium">No hay tareas asignadas aún</p>
                        <p className="text-gray-400 text-xs mt-1">Contacta al administrador para definirlas</p>
                      </div>
                    );
                  }
                  return tasks.map((task, index) => (
                    <div 
                      key={index} 
                      className={clsx(
                        "bg-white p-5 rounded-2xl border flex items-start gap-4 shadow-sm hover:shadow-md transition-all animate-in slide-in-from-bottom-2 duration-300",
                        ROLE_CONFIG[viewingTasksRole as Role]?.border || 'border-gray-100'
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className={clsx(
                        "mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0 shadow-sm border-2 bg-white",
                        ROLE_CONFIG[viewingTasksRole as Role]?.color || 'text-brand-primary',
                        ROLE_CONFIG[viewingTasksRole as Role]?.border || 'border-brand-primary'
                      )}>
                        {index + 1}
                      </div>
                      <p className="text-gray-700 font-medium leading-relaxed">{task}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-white">
              <button
                onClick={() => setViewingTasksRole(null)}
                className={clsx(
                  "w-full py-4 px-6 text-white font-black rounded-2xl transition-all shadow-xl active:scale-95 uppercase tracking-wider text-sm",
                  ROLE_CONFIG[viewingTasksRole as Role]?.darkBg || 'bg-brand-primary',
                  "hover:brightness-110 ring-4 ring-offset-2",
                  ROLE_CONFIG[viewingTasksRole as Role]?.bg?.replace('bg-', 'ring-') || 'ring-brand-primary/20'
                )}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
