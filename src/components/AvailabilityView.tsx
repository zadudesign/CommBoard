import React, { useState, useMemo, useEffect } from 'react';
import { Volunteer, Role, Day, SystemSettings } from '../types';
import { volunteerService } from '../services/volunteerService';
import { settingsService } from '../services/settingsService';
import { CalendarCheck2, User, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Save, Info, Lock, Unlock, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { getMonthName } from '../utils/dates';

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
  };

  const activeVolunteers = useMemo(() => {
    return volunteers.filter(v => v.active !== false).sort((a, b) => a.name.localeCompare(b.name));
  }, [volunteers]);

  const selectedVolunteer = useMemo(() => {
    return volunteers.find(v => v.id === selectedId);
  }, [volunteers, selectedId]);

  useEffect(() => {
    if (selectedVolunteer) {
      setLocalRoles(selectedVolunteer.roles || []);
      setLocalDays(selectedVolunteer.days || []);
      setLocalRestrictedDates(selectedVolunteer.restrictedDates || []);
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
    } catch (error) {
      console.error('Error updating settings:', error);
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
      const isPresent = prev.includes(role);
      if (isPresent) {
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const toggleDay = (day: Day) => {
    if (!isAdmin && !isMonthEnabled) return;
    setLocalDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleRestrictedDate = (dateStr: string) => {
    if (!isAdmin && !isMonthEnabled) return;
    setLocalRestrictedDates(prev => 
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
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

  const AVAILABLE_ROLES: Role[] = ['Medios Digitales', 'Proyección', 'Transmisión'];
  const AVAILABLE_DAYS: Day[] = ['Miércoles', 'Sábado Mañana', 'Sábado Tarde'];

  return (
    <div className="space-y-6">
      {/* Admin Control Bar */}
      {isAdmin && (
        <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-2xl p-6 shadow-sm animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-primary rounded-xl text-white shadow-md">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-brand-primary tracking-tight uppercase">Panel de Control Admin</h3>
                <p className="text-xs text-brand-primary/60 font-bold">Habilita o deshabilita la recepción de disponibilidad por mes</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-brand-primary/10">
              <div className="flex items-center gap-2 px-3">
                <button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-50 rounded-lg transition-all text-gray-600">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-black text-gray-900 min-w-[120px] text-center">
                  {getMonthName(selectedMonth, selectedYear)}
                </span>
                <button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-50 rounded-lg transition-all text-gray-600">
                  <ChevronRight size={18} />
                </button>
              </div>
              
              <button
                onClick={handleToggleMonth}
                disabled={isUpdatingSettings}
                className={clsx(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all shadow-md active:scale-95",
                  isMonthEnabled 
                    ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200" 
                    : "bg-red-500 text-white hover:bg-red-600 shadow-red-200",
                  isUpdatingSettings && "opacity-50 cursor-not-allowed"
                )}
              >
                {isUpdatingSettings ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : isMonthEnabled ? (
                  <>
                    <Unlock size={16} /> ABIERTO
                  </>
                ) : (
                  <>
                    <Lock size={16} /> CERRADO
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selector de Voluntario */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary">
              <CalendarCheck2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Gestión de Disponibilidad</h2>
              {!isMonthEnabled && !isAdmin ? (
                <div className="flex items-center gap-2 text-red-500 mt-1">
                  <Lock size={14} />
                  <p className="text-xs font-black uppercase tracking-wider">Recepción cerrada para {getMonthName(selectedMonth, selectedYear)}</p>
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
                <option key={v.id} value={v.id}>{v.name.toLowerCase()}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedId ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Preferencias de Servicio */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-500" />
                Áreas de Interés
              </h3>
              <p className="text-sm text-gray-500 mb-4">Selecciona las áreas en las que quieres servir:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AVAILABLE_ROLES.map(role => (
                  <button
                    key={role}
                    disabled={!isAdmin && !isMonthEnabled}
                    onClick={() => toggleRole(role)}
                    className={clsx(
                      "flex items-center justify-between p-4 rounded-xl border-2 transition-all font-bold text-sm",
                      localRoles.includes(role)
                        ? "bg-brand-primary/5 border-brand-primary text-brand-primary"
                        : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200",
                      (!isAdmin && !isMonthEnabled) && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {role}
                    {localRoles.includes(role) && <CheckCircle2 size={18} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-500" />
                Disponibilidad General
              </h3>
              <p className="text-sm text-gray-500 mb-4">Días que sueles estar disponible:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AVAILABLE_DAYS.map(day => (
                  <button
                    key={day}
                    disabled={!isAdmin && !isMonthEnabled}
                    onClick={() => toggleDay(day)}
                    className={clsx(
                      "flex items-center justify-between p-4 rounded-xl border-2 transition-all font-bold text-sm",
                      localDays.includes(day)
                        ? "bg-brand-primary/5 border-brand-primary text-brand-primary"
                        : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200",
                      (!isAdmin && !isMonthEnabled) && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {day}
                    {localDays.includes(day) && <CheckCircle2 size={18} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Días de Inasistencia Específicos */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <XCircle size={20} className="text-red-500" />
                  Días No Disponible
                </h3>
                {!isAdmin && (
                  <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                    <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600">
                      <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm font-black text-gray-900 min-w-[140px] text-center px-2">
                      {getMonthName(selectedMonth, selectedYear)}
                    </span>
                    <button onClick={handleNextMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1">
                {!isAdmin && !isMonthEnabled ? (
                  <div className="bg-red-50 rounded-2xl p-8 text-center border border-red-100">
                    <Lock className="text-red-400 mx-auto mb-4" size={48} />
                    <h4 className="text-lg font-bold text-red-900 mb-2">Recepción Cerrada</h4>
                    <p className="text-sm text-red-700">
                      Un administrador ha cerrado la recepción de disponibilidad para el mes de {getMonthName(selectedMonth, selectedYear)}.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50/50 rounded-xl p-4 mb-6 flex items-start gap-3 border border-blue-100">
                      <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                      <p className="text-xs text-blue-700 leading-relaxed font-medium">
                        Haz clic en los días específicos de este mes en los que <strong>NO</strong> podrás asistir para que el sistema no te asigne turnos.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {monthDays.map(date => {
                        const dateStr = date.toISOString().split('T')[0];
                        const isRestricted = localRestrictedDates.includes(dateStr);
                        const isWednesday = date.getDay() === 3;
                        
                        return (
                          <button
                            key={dateStr}
                            disabled={!isAdmin && !isMonthEnabled}
                            onClick={() => toggleRestrictedDate(dateStr)}
                            className={clsx(
                              "flex items-center justify-between p-4 rounded-xl border-2 transition-all font-bold text-sm",
                              isRestricted
                                ? "bg-red-50 border-red-200 text-red-600"
                                : "bg-gray-50 border-gray-100 text-gray-700 hover:border-gray-200",
                              (!isAdmin && !isMonthEnabled) && "opacity-60 cursor-not-allowed"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <span className={clsx(
                                "w-10 h-10 flex items-center justify-center rounded-lg text-sm",
                                isRestricted ? "bg-red-100" : "bg-white shadow-sm border border-gray-100"
                              )}>
                                {date.getDate()}
                              </span>
                              <div className="text-left">
                                <span className="block text-xs text-gray-400 font-medium uppercase tracking-wider">
                                  {isWednesday ? 'Miércoles' : 'Sábado'}
                                </span>
                                <span className="block">{date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
                              </div>
                            </div>
                            {isRestricted ? (
                              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-tighter bg-red-600 text-white px-2 py-1 rounded-md">
                                <XCircle size={14} /> NO DISPONIBLE
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-tighter bg-emerald-500 text-white px-2 py-1 rounded-md">
                                <CheckCircle2 size={14} /> DISPONIBLE
                              </div>
                            )}
                          </button>
                        );
                      })}
                      {monthDays.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                          No se encontraron días válidos para este mes.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {(isAdmin || isMonthEnabled) && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={clsx(
                      "w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black shadow-lg transition-all active:scale-95 uppercase tracking-widest text-sm",
                      isSaving ? "bg-gray-400 cursor-not-allowed" : "bg-brand-primary text-white hover:bg-brand-secondary"
                    )}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save size={20} />
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
