import React, { useState, useMemo, useEffect } from 'react';
import { Volunteer, Role, Day, Shift } from '../types';
import { Edit2, Trash2, UserPlus, Calendar, Briefcase, Eye, CalendarOff, Filter, CalendarCheck2, PlusCircle, Star } from 'lucide-react';
import { ROLE_CONFIG } from '../utils/roleConfig';
import { scheduleService } from '../services/scheduleService';
import { volunteerService } from '../services/volunteerService';
import { clsx } from 'clsx';

interface VolunteerListProps {
  volunteers: Volunteer[];
  isAdmin: boolean;
  onAdd: () => void;
  onEdit: (v: Volunteer) => void;
  onDelete: (id: string) => void;
  onSelectVolunteer: (id: string) => void;
  onUpdateVolunteers: () => void;
}

export function VolunteerList({ volunteers, isAdmin, onAdd, onEdit, onDelete, onSelectVolunteer, onUpdateVolunteers }: VolunteerListProps) {
  const [roleFilter, setRoleFilter] = useState<Role | 'Todos'>('Todos');
  const [dayFilter, setDayFilter] = useState<Day | 'Todos'>('Todos');
  const [schedule, setSchedule] = useState<Shift[]>([]);
  const [isUpdatingExtra, setIsUpdatingExtra] = useState<string | null>(null);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    const data = await scheduleService.getSchedule();
    setSchedule(data);
  };

  const handleAddExtraPoints = async (id: string, currentPoints: number) => {
    const amount = window.prompt('¿Cuántos puntos extra deseas agregar? (Puedes usar números negativos para restar)', '5');
    if (amount === null) return;
    
    const points = parseInt(amount);
    if (isNaN(points)) {
      alert('Por favor ingresa un número válido.');
      return;
    }

    try {
      setIsUpdatingExtra(id);
      const volunteer = volunteers.find(v => v.id === id);
      if (!volunteer) return;

      const currentStats = volunteer.stats || { puntualidad: 0, orden: 0, responsabilidad: 0, extraPoints: 0, total: 0 };
      const newStats = {
        ...currentStats,
        extraPoints: (currentStats.extraPoints || 0) + points
      };

      await volunteerService.updateVolunteer(id, { stats: newStats });
      onUpdateVolunteers();
    } catch (error) {
      console.error('Error updating extra points:', error);
      alert('Error al actualizar puntos extra.');
    } finally {
      setIsUpdatingExtra(null);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await volunteerService.updateVolunteer(id, { active: !currentStatus });
      onUpdateVolunteers();
    } catch (error) {
      console.error('Error toggling active status:', error);
      alert('Error al actualizar el estado del voluntario.');
    }
  };

  const currentMonthShifts = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return schedule.filter(s => {
      const shiftMonth = s.month ?? new Date().getMonth();
      const shiftYear = s.year ?? new Date().getFullYear();
      return shiftMonth === currentMonth && shiftYear === currentYear && s.volunteerId;
    });
  }, [schedule]);

  const getVolunteerShiftCount = (volunteerId: string) => {
    return currentMonthShifts.filter(s => s.volunteerId === volunteerId).length;
  };

  const filteredVolunteers = useMemo(() => {
    return volunteers.filter(v => {
      const matchesRole = roleFilter === 'Todos' || v.roles.includes(roleFilter);
      const matchesDay = dayFilter === 'Todos' || v.days.includes(dayFilter);
      return matchesRole && matchesDay;
    });
  }, [volunteers, roleFilter, dayFilter]);

  const ROLES: Role[] = ['Coordinación', 'Coordina Piso', 'Medios Digitales', 'Proyección', 'Sonido', 'Transmisión'];
  const DAYS: Day[] = ['Miércoles', 'Sábado Mañana', 'Sábado Tarde'];

  const activeCount = useMemo(() => {
    return volunteers.filter(v => v.active !== false).length;
  }, [volunteers]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 sm:gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-brand-primary tracking-tight">Voluntarios</h2>
              {isAdmin && (
                <span className="bg-brand-accent text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 sm:py-1 rounded-full shadow-sm uppercase tracking-wider">
                  {activeCount} {activeCount === 1 ? 'habilitado' : 'habilitados'}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
              {isAdmin ? 'Gestiona el equipo de comunicaciones' : 'Conoce al equipo de comunicaciones'}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
          {isAdmin && (
            <>
              <div className="flex items-center gap-2 bg-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-brand-light/50 shadow-sm flex-1 sm:flex-none">
                <Filter size={14} className="text-brand-secondary sm:w-4 sm:h-4" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as Role | 'Todos')}
                  className="text-xs sm:text-sm font-bold text-brand-primary bg-transparent outline-none cursor-pointer w-full"
                >
                  <option value="Todos">Todas las funciones</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              
              <div className="flex items-center gap-2 bg-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-brand-light/50 shadow-sm flex-1 sm:flex-none">
                <Filter size={14} className="text-brand-secondary sm:w-4 sm:h-4" />
                <select
                  value={dayFilter}
                  onChange={(e) => setDayFilter(e.target.value as Day | 'Todos')}
                  className="text-xs sm:text-sm font-bold text-brand-primary bg-transparent outline-none cursor-pointer w-full"
                >
                  <option value="Todos">Todos los días</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </>
          )}

          {isAdmin && (
            <button
              onClick={onAdd}
              className="flex items-center justify-center gap-1.5 bg-brand-primary text-white px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl hover:bg-brand-secondary transition-all shadow-md active:scale-95 w-full sm:w-auto"
            >
              <UserPlus size={16} className="sm:w-4.5 sm:h-4.5" />
              <span className="font-bold uppercase tracking-wider text-xs sm:text-sm">Nuevo Voluntario</span>
            </button>
          )}
        </div>
      </div>

      {volunteers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="bg-brand-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <UserPlus className="text-brand-primary" size={24} />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">No hay voluntarios</h3>
          <p className="text-gray-500 text-xs max-w-sm mx-auto">
            {isAdmin ? 'Comienza agregando voluntarios para poder generar el calendario de turnos.' : 'Aún no hay voluntarios registrados en el equipo.'}
          </p>
        </div>
      ) : filteredVolunteers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <Filter className="text-gray-400" size={24} />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">No hay coincidencias</h3>
          <p className="text-gray-500 text-xs max-w-sm mx-auto">
            Ningún voluntario coincide con los filtros seleccionados.
          </p>
          <button 
            onClick={() => { setRoleFilter('Todos'); setDayFilter('Todos'); }}
            className="mt-3 text-brand-primary font-bold text-sm hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredVolunteers.map(v => (
            <div key={v.id} className={clsx(
              "bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between",
              v.active === false ? "opacity-60 border-gray-200 grayscale-[0.5]" : "border-brand-light/40"
            )}>
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-brand-light/20 border-2 border-brand-light/50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative">
                      {v.photoUrl ? (
                        <img src={v.photoUrl} alt={v.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl sm:text-3xl font-black text-brand-primary">{v.name.charAt(0)}</span>
                      )}
                      {v.active === false && (
                        <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center">
                          <span className="text-[7px] sm:text-[8px] font-black text-white uppercase tracking-tighter bg-red-600 px-1.5 py-0.5 rounded">Inactivo</span>
                        </div>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-black text-base sm:text-lg text-brand-primary leading-tight tracking-tight capitalize truncate">{v.name}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1 sm:mt-1.5">
                        <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-white bg-brand-secondary px-2 py-0.5 rounded-lg uppercase tracking-wider shadow-sm shrink-0">
                          <CalendarCheck2 size={9} />
                          {getVolunteerShiftCount(v.id)} {getVolunteerShiftCount(v.id) === 1 ? 'turno' : 'turnos'}
                        </div>
                        {v.stats?.extraPoints !== undefined && v.stats.extraPoints !== 0 && (
                          <div className={clsx(
                            "flex items-center gap-1 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider shadow-sm shrink-0",
                            v.stats.extraPoints > 0 ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                          )}>
                            <Star size={9} fill="currentColor" />
                            {v.stats.extraPoints > 0 ? `+${v.stats.extraPoints}` : v.stats.extraPoints} extra
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 sm:gap-1.5 shrink-0">
                      <button 
                        onClick={() => handleToggleActive(v.id, v.active ?? true)}
                        className={clsx(
                          "p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all",
                          v.active === false ? "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50" : "text-emerald-600 hover:bg-emerald-50"
                        )}
                        title={v.active === false ? "Habilitar Voluntario" : "Inhabilitar Voluntario"}
                      >
                        {v.active === false ? <CalendarCheck2 size={16} /> : <CalendarOff size={16} />}
                      </button>
                      <button 
                        onClick={() => handleAddExtraPoints(v.id, v.stats?.extraPoints || 0)} 
                        disabled={isUpdatingExtra === v.id}
                        className="p-1.5 sm:p-2 text-brand-secondary hover:text-emerald-600 hover:bg-emerald-50 rounded-lg sm:rounded-xl transition-all disabled:opacity-50" 
                        title="Agregar Puntos Extra"
                      >
                        <PlusCircle size={16} />
                      </button>
                      <button onClick={() => onEdit(v)} className="p-1.5 sm:p-2 text-brand-secondary hover:text-brand-primary hover:bg-brand-light/20 rounded-lg sm:rounded-xl transition-all" title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => onDelete(v.id)} className="p-1.5 sm:p-2 text-brand-secondary hover:text-red-600 hover:bg-red-50 rounded-lg sm:rounded-xl transition-all" title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 sm:space-y-3.5">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <Briefcase size={16} className="text-brand-accent mt-0.5 shrink-0 sm:w-[18px] sm:h-[18px]" />
                    <div className="flex flex-wrap gap-1">
                      {v.roles.map(r => {
                        const config = ROLE_CONFIG[r];
                        const Icon = config.icon;
                        return (
                          <span key={r} className={`flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border shadow-xs ${config.bg} ${config.color} ${config.border} uppercase tracking-wider`}>
                            <Icon size={10} />
                            {r}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <Calendar size={16} className="text-brand-secondary mt-0.5 shrink-0 sm:w-[18px] sm:h-[18px]" />
                    <div className="flex flex-wrap gap-1">
                      {v.days.map(d => (
                        <span key={d} className="text-[9px] sm:text-[10px] font-bold bg-brand-light/20 text-brand-secondary px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-brand-light/30 uppercase tracking-wider">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  {v.restrictedDates && v.restrictedDates.length > 0 && (
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <CalendarOff size={16} className="text-red-400 mt-0.5 shrink-0 sm:w-[18px] sm:h-[18px]" />
                      <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto pr-1">
                        {v.restrictedDates.map(date => {
                          const [year, month, day] = date.split('-');
                          const formattedDate = `${day}/${month}/${year}`;
                          return (
                            <span key={date} className="text-[9px] sm:text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-red-100 uppercase tracking-wider shrink-0">
                              {formattedDate}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 sm:mt-6 pt-3.5 sm:pt-5 border-t border-brand-light/20">
                <button 
                  onClick={() => onSelectVolunteer(v.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 sm:py-3 text-xs sm:text-sm font-black text-white bg-brand-primary hover:bg-brand-secondary rounded-xl transition-all shadow-md active:scale-95 uppercase tracking-wider sm:tracking-widest"
                >
                  <Eye size={16} />
                  Ver mis turnos
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
