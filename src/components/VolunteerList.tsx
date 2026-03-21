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

  const ROLES: Role[] = ['Coordinación', 'Medios Digitales', 'Proyección', 'Sonido', 'Transmisión'];
  const DAYS: Day[] = ['Miércoles', 'Sábado Mañana', 'Sábado Tarde'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">Voluntarios</h2>
            {isAdmin && (
              <span className="bg-brand-primary/10 text-brand-primary text-sm font-bold px-3 py-1 rounded-full">
                {filteredVolunteers.length} {filteredVolunteers.length === 1 ? 'activo' : 'activos'}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {isAdmin ? 'Gestiona el equipo de comunicaciones' : 'Conoce al equipo de comunicaciones'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {isAdmin && (
            <>
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm flex-1 md:flex-none">
                <Filter size={16} className="text-gray-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as Role | 'Todos')}
                  className="text-sm font-medium text-gray-700 bg-transparent outline-none cursor-pointer w-full"
                >
                  <option value="Todos">Todas las funciones</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm flex-1 md:flex-none">
                <Filter size={16} className="text-gray-400" />
                <select
                  value={dayFilter}
                  onChange={(e) => setDayFilter(e.target.value as Day | 'Todos')}
                  className="text-sm font-medium text-gray-700 bg-transparent outline-none cursor-pointer w-full"
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
              className="flex items-center justify-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-xl hover:bg-brand-secondary transition-colors shadow-sm w-full md:w-auto"
            >
              <UserPlus size={18} />
              <span className="font-medium">Nuevo Voluntario</span>
            </button>
          )}
        </div>
      </div>

      {volunteers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="bg-brand-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="text-brand-primary" size={28} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No hay voluntarios</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            {isAdmin ? 'Comienza agregando voluntarios para poder generar el calendario de turnos.' : 'Aún no hay voluntarios registrados en el equipo.'}
          </p>
        </div>
      ) : filteredVolunteers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter className="text-gray-400" size={28} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No hay coincidencias</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Ningún voluntario coincide con los filtros seleccionados.
          </p>
          <button 
            onClick={() => { setRoleFilter('Todos'); setDayFilter('Todos'); }}
            className="mt-4 text-brand-primary font-medium hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVolunteers.map(v => (
            <div key={v.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                      {v.photoUrl ? (
                        <img src={v.photoUrl} alt={v.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-brand-primary">{v.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 leading-tight">{v.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <div className="flex items-center gap-1 text-xs font-medium text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-md">
                          <CalendarCheck2 size={12} />
                          {getVolunteerShiftCount(v.id)} {getVolunteerShiftCount(v.id) === 1 ? 'turno' : 'turnos'}
                        </div>
                        {v.stats?.extraPoints !== undefined && v.stats.extraPoints !== 0 && (
                          <div className={clsx(
                            "flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md",
                            v.stats.extraPoints > 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                          )}>
                            <Star size={12} fill="currentColor" />
                            {v.stats.extraPoints > 0 ? `+${v.stats.extraPoints}` : v.stats.extraPoints} extra
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAddExtraPoints(v.id, v.stats?.extraPoints || 0)} 
                        disabled={isUpdatingExtra === v.id}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50" 
                        title="Agregar Puntos Extra"
                      >
                        <PlusCircle size={16} />
                      </button>
                      <button onClick={() => onEdit(v)} className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors" title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => onDelete(v.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Briefcase size={16} className="text-brand-accent mt-0.5 shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {v.roles.map(r => {
                        const config = ROLE_CONFIG[r];
                        const Icon = config.icon;
                        return (
                          <span key={r} className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${config.bg} ${config.color} border ${config.border}`}>
                            <Icon size={12} />
                            {r}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Calendar size={16} className="text-brand-primary mt-0.5 shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {v.days.map(d => (
                        <span key={d} className="text-xs font-medium bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-md">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  {v.restrictedDates && v.restrictedDates.length > 0 && (
                    <div className="flex items-start gap-2">
                      <CalendarOff size={16} className="text-red-400 mt-0.5 shrink-0" />
                      <div className="flex flex-wrap gap-1">
                        {v.restrictedDates.map(date => {
                          const [year, month, day] = date.split('-');
                          const formattedDate = `${day}/${month}/${year}`;
                          return (
                            <span key={date} className="text-xs font-medium bg-red-50 text-red-600 px-2 py-0.5 rounded-md border border-red-100">
                              {formattedDate}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-5 pt-4 border-t border-gray-50">
                <button 
                  onClick={() => onSelectVolunteer(v.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10 rounded-lg transition-colors"
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
