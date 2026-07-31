import React, { useState, useMemo, useEffect } from 'react';
import { Volunteer, Role, Day, SystemSettings } from '../types';
import { volunteerService } from '../services/volunteerService';
import { settingsService } from '../services/settingsService';
import { CalendarCheck2, User, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Save, Info, Lock, Unlock, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { getMonthName, monthNames } from '../utils/dates';

interface AvailabilityViewProps {
  volunteers: Volunteer[];
  isAdmin: boolean;
  onUpdateVolunteers: () => void;
}

export function AvailabilityView({ volunteers, isAdmin, onUpdateVolunteers }: AvailabilityViewProps) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({ enabledAvailabilityMonths: [] });
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  
  // Local state for the selected volunteer's data to allow "Save" action
  const [localRoles, setLocalRoles] = useState<Role[]>([]);
  const [localDays, setLocalDays] = useState<Day[]>([]);
  const [localRestrictedDates, setLocalRestrictedDates] = useState<string[]>([]);

  const selectedMonth = currentDate.getMonth();
  const selectedYear = currentDate.getFullYear();
  const currentMonthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  const isMonthEnabled = settings.enabledAvailabilityMonths.includes(currentMonthKey);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await settingsService.getSettings();
    setSettings(s);
    
    // Auto-advance to the next open month if current is closed
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (!s.enabledAvailabilityMonths.includes(todayKey)) {
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
      if (s.enabledAvailabilityMonths.includes(nextMonthKey)) {
        setCurrentDate(nextMonth);
      }
    }
  };

  const activeVolunteers = useMemo(() => {
    return volunteers
      .filter(v => v.active !== false)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [volunteers]);

  const selectedVolunteer = useMemo(() => {
    return volunteers.find(v => v.id === selectedId);
  }, [volunteers, selectedId]);

  useEffect(() => {
    if (selectedVolunteer) {
      setLocalRoles(Array.isArray(selectedVolunteer.roles) ? selectedVolunteer.roles : []);
      setLocalDays(Array.isArray(selectedVolunteer.days) ? selectedVolunteer.days : []);
      setLocalRestrictedDates(Array.isArray(selectedVolunteer.restrictedDates) ? selectedVolunteer.restrictedDates : []);
    } else {
      setLocalRoles([]);
      setLocalDays([]);
      setLocalRestrictedDates([]);
    }
  }, [selectedVolunteer]);

  const handleToggleMonth = async () => {
    if (!isAdmin) return;
    try {
      setIsUpdatingSettings(true);
      const newEnabledMonths = isMonthEnabled
        ? settings.enabledAvailabilityMonths.filter(m => m !== currentMonthKey)
        : [...settings.enabledAvailabilityMonths, currentMonthKey];
      
      const newSettings = { ...settings, enabledAvailabilityMonths: newEnabledMonths };
      await settingsService.updateSettings(newSettings);
      setSettings(newSettings);
    } catch (error: any) {
      console.error('Error updating settings:', error);
      alert(`Error al guardar configuración en la nube: ${error.message || 'Verifica los permisos de Supabase'}`);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(selectedYear, selectedMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(selectedYear, selectedMonth + 1, 1));
  };

  const monthDays = useMemo(() => {
    const days: Date[] = [];
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(selectedYear, selectedMonth, d);
      // Only Wednesdays (3) and Saturdays (6)
      if (date.getDay() === 3 || date.getDay() === 6) {
        days.push(date);
      }
    }
    return days;
  }, [selectedMonth, selectedYear]);

  const toggleRole = (role: Role) => {
    if (!isAdmin && !isMonthEnabled) return;
    setLocalRoles(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const isPresent = safePrev.includes(role);
      if (isPresent) {
        return safePrev.filter(r => r !== role);
      } else {
        return [...safePrev, role];
      }
    });
  };

  const toggleDay = (day: Day) => {
    if (!isAdmin && !isMonthEnabled) return;
    setLocalDays(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.includes(day) ? safePrev.filter(d => d !== day) : [...safePrev, day]
    });
  };

  const toggleRestrictedDate = (dateStr: string) => {
    if (!isAdmin && !isMonthEnabled) return;
    setLocalRestrictedDates(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.includes(dateStr) ? safePrev.filter(d => d !== dateStr) : [...safePrev, dateStr]
    });
  };

  const handleSave = async () => {
    if (!selectedId) return;
    if (!isAdmin && !isMonthEnabled) {
      alert('La recepción de disponibilidad para este mes está cerrada.');
      return;
    }
    try {
      setIsSaving(true);
      await volunteerService.updateVolunteer(selectedId, {
        roles: localRoles,
        days: localDays,
        restrictedDates: localRestrictedDates
      });
      onUpdateVolunteers();
      alert('Disponibilidad guardada con éxito.');
    } catch (error) {
      console.error('Error saving availability:', error);
      alert('Error al guardar la disponibilidad.');
    } finally {
      setIsSaving(false);
    }
  };

  const AVAILABLE_ROLES: Role[] = ['Coordina Piso', 'Medios Digitales', 'Proyección', 'Transmisión'];
  const AVAILABLE_DAYS: Day[] = ['Miércoles', 'Sábado Mañana', 'Sábado Tarde'];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Admin Control Bar */}
      {isAdmin && (
        <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-brand-primary rounded-lg sm:rounded-xl text-white shadow-md shrink-0">
                <ShieldCheck size={18} className="sm:w-[22px] sm:h-[22px]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-lg font-black text-brand-primary tracking-tight uppercase leading-tight">Panel de Control Admin</h3>
                <p className="text-[10px] sm:text-xs text-brand-primary/60 font-bold leading-normal">Habilita o deshabilita la recepción de disponibilidad por mes</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 bg-white p-1.5 sm:p-2 rounded-xl sm:rounded-2xl shadow-sm border border-brand-primary/10">
              <div className="flex items-center gap-1 sm:gap-2 px-1 sm:px-3 text-xs sm:text-sm">
                <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-50 rounded-md transition-all text-gray-600">
                  <ChevronLeft size={16} />
                </button>
                <span className="font-black text-gray-900 min-w-[100px] sm:min-w-[120px] text-center capitalize text-[11px] sm:text-sm">
                  {getMonthName(selectedMonth, selectedYear)}
                </span>
                <button onClick={handleNextMonth} className="p-1 hover:bg-gray-50 rounded-md transition-all text-gray-600">
                  <ChevronRight size={16} />
                </button>
              </div>
              
              <button
                onClick={handleToggleMonth}
                disabled={isUpdatingSettings}
                className={clsx(
                  "flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-6 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-black transition-all shadow-md active:scale-95",
                  isMonthEnabled 
                    ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200" 
                    : "bg-red-500 text-white hover:bg-red-600 shadow-red-200",
                  isUpdatingSettings && "opacity-50 cursor-not-allowed"
                )}
              >
                {isUpdatingSettings ? (
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                ) : isMonthEnabled ? (
                  <>
                    <Unlock size={14} /> ABIERTO
                  </>
                ) : (
                  <>
                    <Lock size={14} /> CERRADO
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selector de Voluntario */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary">
              <CalendarCheck2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Gestión de Disponibilidad</h2>
              {!isMonthEnabled && !isAdmin ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-red-500 mt-1">
                    <Lock size={14} />
                    <p className="text-xs font-black uppercase tracking-wider">Recepción cerrada para {getMonthName(selectedMonth, selectedYear)}</p>
                  </div>
                  {settings.enabledAvailabilityMonths.some(m => {
                    const [y, mm] = m.split('-').map(Number);
                    return y > selectedYear || (y === selectedYear && mm > selectedMonth + 1);
                  }) && (
                    <div className="flex items-center gap-2 text-amber-600 mt-0.5">
                      <ChevronRight size={14} className="animate-pulse" />
                      <p className="text-[10px] font-bold uppercase tracking-tight">Hay meses futuros abiertos para programación</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Informa tus preferencias y días de inasistencia</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <User size={18} className="text-gray-400" />
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-brand-primary focus:border-brand-primary block w-full md:w-64 p-2.5 font-bold capitalize outline-none transition-all"
            >
              <option value="">Selecciona un Voluntario</option>
              {activeVolunteers.map(v => (
                <option key={v.id} value={v.id}>{(v.name || 'Sin nombre').toLowerCase()}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedId ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Preferencias de Servicio */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500 sm:w-5 sm:h-5" />
                Áreas de Interés
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">Selecciona las áreas en las que quieres servir:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {AVAILABLE_ROLES.map(role => (
                  <button
                    key={role}
                    disabled={!isAdmin && !isMonthEnabled}
                    onClick={() => toggleRole(role)}
                    className={clsx(
                      "flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 transition-all font-bold text-xs sm:text-sm",
                      localRoles.includes(role)
                        ? "bg-brand-primary/5 border-brand-primary text-brand-primary"
                        : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200",
                      (!isAdmin && !isMonthEnabled) && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {role}
                    {localRoles.includes(role) && <CheckCircle2 size={16} className="sm:w-4.5 sm:h-4.5" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500 sm:w-5 sm:h-5" />
                Disponibilidad General
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">Días que sueles estar disponible:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {AVAILABLE_DAYS.map(day => (
                  <button
                    key={day}
                    disabled={!isAdmin && !isMonthEnabled}
                    onClick={() => toggleDay(day)}
                    className={clsx(
                      "flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 transition-all font-bold text-xs sm:text-sm",
                      localDays.includes(day)
                        ? "bg-brand-primary/5 border-brand-primary text-brand-primary"
                        : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200",
                      (!isAdmin && !isMonthEnabled) && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {day}
                    {localDays.includes(day) && <CheckCircle2 size={16} className="sm:w-4.5 sm:h-4.5" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Días de Inasistencia Específicos */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 h-full flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <XCircle size={18} className="text-red-500 sm:w-5 sm:h-5" />
                  Días No Disponible
                </h3>
                {!isAdmin && (
                  <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                    <button onClick={handlePrevMonth} className="p-1 hover:bg-white hover:shadow-xs rounded-md transition-all text-gray-600">
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-black text-gray-900 min-w-[110px] text-center px-1 capitalize">
                      {getMonthName(selectedMonth, selectedYear)}
                    </span>
                    <button onClick={handleNextMonth} className="p-1 hover:bg-white hover:shadow-xs rounded-md transition-all text-gray-600">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1">
                {!isAdmin && !isMonthEnabled ? (
                  <div className="bg-red-50 rounded-2xl p-6 text-center border border-red-100">
                    <Lock className="text-red-400 mx-auto mb-3" size={40} />
                    <h4 className="text-base font-bold text-red-900 mb-1">Recepción Cerrada</h4>
                    <p className="text-xs text-red-700">
                      Un administrador ha cerrado la recepción de disponibilidad para el mes de {getMonthName(selectedMonth, selectedYear)}.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50/50 rounded-xl p-3 mb-4 flex items-start gap-2.5 border border-blue-100">
                      <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
                      <p className="text-xs text-blue-700 leading-relaxed font-medium">
                        Haz clic en los días específicos de este mes en los que <strong>NO</strong> podrás asistir para que el sistema no te asigne turnos.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {monthDays.map(date => {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, '0');
                        const d = String(date.getDate()).padStart(2, '0');
                        const dateStr = `${y}-${m}-${d}`;
                        const isRestricted = localRestrictedDates.includes(dateStr);
                        const isWednesday = date.getDay() === 3;
                        
                        return (
                          <button
                            key={dateStr}
                            disabled={!isAdmin && !isMonthEnabled}
                            onClick={() => toggleRestrictedDate(dateStr)}
                            className={clsx(
                              "flex items-center justify-between p-2.5 sm:p-4 rounded-xl border-2 transition-all font-bold text-xs sm:text-sm",
                              isRestricted
                                ? "bg-red-50 border-red-200 text-red-600"
                                : "bg-gray-50 border-gray-100 text-gray-700 hover:border-gray-200",
                              (!isAdmin && !isMonthEnabled) && "opacity-60 cursor-not-allowed"
                            )}
                          >
                            <div className="flex items-center gap-2.5 sm:gap-3">
                              <span className={clsx(
                                "w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg text-xs sm:text-sm shrink-0",
                                isRestricted ? "bg-red-100" : "bg-white shadow-sm border border-gray-100"
                              )}>
                                {date.getDate()}
                              </span>
                              <div className="text-left">
                                <span className="block text-xs text-gray-400 font-medium uppercase tracking-wider">
                                  {isWednesday ? 'Miércoles' : 'Sábado'}
                                </span>
                                <span className="block text-[11px] sm:text-xs text-gray-500 font-medium lowercase">
                                  {monthNames[date.getMonth()]} {date.getFullYear()}
                                </span>
                              </div>
                            </div>
                            {isRestricted ? (
                              <div className="flex items-center gap-1 text-[8px] sm:text-[10px] uppercase tracking-tighter bg-red-600 text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md shrink-0">
                                <XCircle size={12} className="sm:w-3.5 sm:h-3.5" /> NO DISPONIBLE
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[8px] sm:text-[10px] uppercase tracking-tighter bg-emerald-500 text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md shrink-0">
                                <CheckCircle2 size={12} className="sm:w-3.5 sm:h-3.5" /> DISPONIBLE
                              </div>
                            )}
                          </button>
                        );
                      })}
                      {monthDays.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-xs">
                          No se encontraron días válidos para este mes.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {(isAdmin || isMonthEnabled) && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={clsx(
                      "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black shadow-md transition-all active:scale-95 uppercase tracking-wider text-xs sm:text-sm",
                      isSaving ? "bg-gray-400 cursor-not-allowed" : "bg-brand-primary text-white hover:bg-brand-secondary"
                    )}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Guardar Disponibilidad
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center animate-in fade-in duration-300">
          <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="text-gray-300" size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Selecciona un Voluntario</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Elige un voluntario del menú superior para gestionar sus preferencias de servicio y días de inasistencia.
          </p>
        </div>
      )}
    </div>
  );
}
