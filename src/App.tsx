import React, { useState, useEffect } from 'react';
import { VolunteerList } from './components/VolunteerList';
import { VolunteerForm } from './components/VolunteerForm';
import { ScheduleView } from './components/ScheduleView';
import { RankingView } from './components/RankingView';
import { SettingsView } from './components/SettingsView';
import { AdminLogin } from './components/AdminLogin';
import { ChangePin } from './components/ChangePin';
import { Volunteer } from './types';
import { volunteerService, isUsingLocalFallback } from './services/volunteerService';
import { scheduleService } from './services/scheduleService';
import { Users, CalendarDays, MessageSquare, AlertTriangle, ShieldCheck, ShieldAlert, KeyRound, Trophy, Settings } from 'lucide-react';

type Tab = 'volunteers' | 'schedule' | 'ranking' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('schedule');
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  
  // Role & Auth State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string | null>(null);

  useEffect(() => {
    loadVolunteers();
  }, []);

  const loadVolunteers = async () => {
    try {
      setIsLoading(true);
      setSupabaseError(null);
      const data = await volunteerService.getVolunteers();
      const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
      setVolunteers(sortedData);
    } catch (error: any) {
      console.error('Error loading volunteers:', error);
      if (error?.code === 'PGRST301' || error?.message?.includes('JWT') || error?.message?.includes('permission denied')) {
        setSupabaseError('Error de permisos en Supabase. Por favor, verifica las políticas de RLS.');
      } else if (error?.message?.includes('fetch')) {
        setSupabaseError('Error de conexión con Supabase. Verifica tu URL y Anon Key.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVolunteer = async (volunteerData: Omit<Volunteer, 'id'>) => {
    try {
      const newVolunteer = await volunteerService.addVolunteer(volunteerData);
      setVolunteers(prev => [...prev, newVolunteer]);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error adding volunteer:', error);
      alert('Error al guardar el voluntario.');
    }
  };

  const handleEditVolunteer = async (volunteerData: Omit<Volunteer, 'id'>) => {
    if (!editingVolunteer) return;
    try {
      await volunteerService.updateVolunteer(editingVolunteer.id, volunteerData);
      setVolunteers(prev => prev.map(v => v.id === editingVolunteer.id ? { ...v, ...volunteerData, id: v.id } : v));
      setIsFormOpen(false);
      setEditingVolunteer(undefined);
    } catch (error) {
      console.error('Error updating volunteer:', error);
      alert('Error al actualizar el voluntario.');
    }
  };

  const handleDeleteVolunteer = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este voluntario?')) return;
    try {
      await volunteerService.deleteVolunteer(id);
      setVolunteers(prev => prev.filter(v => v.id !== id));
      if (selectedVolunteerId === id) setSelectedVolunteerId(null);
    } catch (error) {
      console.error('Error deleting volunteer:', error);
      alert('Error al eliminar el voluntario.');
    }
  };

  const openAddForm = () => {
    setEditingVolunteer(undefined);
    setIsFormOpen(true);
  };

  const openEditForm = (volunteer: Volunteer) => {
    setEditingVolunteer(volunteer);
    setIsFormOpen(true);
  };

  const handleSelectVolunteer = (id: string | null) => {
    setSelectedVolunteerId(id);
    setActiveTab('schedule');
  };

  const handleVolunteerEvaluated = async (volunteerId: string, scores: { puntualidad: number; orden: number; responsabilidad: number; note?: string }) => {
    const volunteer = volunteers.find(v => v.id === volunteerId);
    if (volunteer) {
      const currentStats = volunteer.stats || { puntualidad: 0, orden: 0, responsabilidad: 0, extraPoints: 0, total: 0 };
      const newStats = {
        ...currentStats,
        puntualidad: currentStats.puntualidad + scores.puntualidad,
        orden: currentStats.orden + scores.orden,
        responsabilidad: currentStats.responsabilidad + scores.responsabilidad,
        extraPoints: currentStats.extraPoints,
        total: currentStats.total + scores.puntualidad + scores.orden + scores.responsabilidad
      };
      await volunteerService.updateVolunteer(volunteerId, { stats: newStats });
      setVolunteers(prev => prev.map(v => v.id === volunteerId ? { ...v, stats: newStats } : v));
    }
  };

  const handleResetScores = async () => {
    try {
      const updatedVolunteers = await Promise.all(volunteers.map(async (v) => {
        const resetStats = { ...v.stats, puntualidad: 0, orden: 0, responsabilidad: 0, extraPoints: 0, total: 0 };
        await volunteerService.updateVolunteer(v.id, { stats: resetStats });
        return { ...v, stats: resetStats };
      }));
      setVolunteers(updatedVolunteers);
      
      // Also reset evaluated flags on schedule
      const schedule = await scheduleService.getSchedule();
      const updatedSchedule = schedule.map(s => ({ ...s, evaluated: false, scores: undefined }));
      await scheduleService.saveSchedule(updatedSchedule);
      
      alert('Puntajes reiniciados exitosamente.');
    } catch (error) {
      console.error('Error resetting scores:', error);
      alert('Error al reiniciar los puntajes.');
    }
  };

  const handleFormatDatabase = async () => {
    try {
      // Delete all volunteers
      await Promise.all(volunteers.map(async (v) => {
        await volunteerService.deleteVolunteer(v.id);
      }));
      setVolunteers([]);
      setSelectedVolunteerId(null);
      
      // Delete all schedule
      await scheduleService.saveSchedule([]);
      
    } catch (error) {
      console.error('Error formatting database:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg font-sans text-gray-900">
      {/* Header */}
      <header className="bg-brand-primary border-b border-brand-secondary sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-20 py-4 sm:py-0 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-brand-accent p-2.5 rounded-xl text-white shadow-lg">
                <MessageSquare size={26} />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-black text-white tracking-tight">
                  IASD CENTRAL
                </h1>
                <span className="text-[10px] font-bold text-brand-light uppercase tracking-[0.2em]">
                  Comunicaciones
                </span>
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex flex-wrap items-center gap-4">
              <nav className="flex gap-1.5 bg-brand-secondary/30 p-1.5 rounded-2xl backdrop-blur-sm">
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'schedule'
                      ? 'bg-white text-brand-primary shadow-lg scale-105'
                      : 'text-brand-light hover:text-white hover:bg-white/10'
                  }`}
                >
                  <CalendarDays size={18} />
                  <span className="hidden sm:inline">Calendario</span>
                </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('volunteers')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'volunteers'
                      ? 'bg-white text-brand-primary shadow-lg scale-105'
                      : 'text-brand-light hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Users size={18} />
                  <span className="hidden sm:inline">Voluntarios</span>
                </button>
              )}
                <button
                  onClick={() => setActiveTab('ranking')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'ranking'
                      ? 'bg-white text-brand-primary shadow-lg scale-105'
                      : 'text-brand-light hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Trophy size={18} />
                  <span className="hidden sm:inline">Ranking</span>
                </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'settings'
                      ? 'bg-white text-brand-primary shadow-lg scale-105'
                      : 'text-brand-light hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Settings size={18} />
                  <span className="hidden sm:inline">Ajustes</span>
                </button>
              )}
              </nav>

              <div className="h-8 w-px bg-white/20 hidden sm:block"></div>

              {/* Admin Controls */}
              {isAdmin ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowChangePinModal(true)}
                    className="p-2.5 text-brand-light hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    title="Cambiar PIN"
                  >
                    <KeyRound size={22} />
                  </button>
                  <button
                    onClick={() => {
                      setIsAdmin(false);
                      if (activeTab === 'volunteers') setActiveTab('schedule');
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-black text-white bg-brand-accent hover:bg-brand-accent/90 rounded-xl transition-all shadow-lg active:scale-95"
                  >
                    <ShieldCheck size={18} />
                    <span className="hidden sm:inline">ADMIN ACTIVO</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-brand-light hover:text-white hover:bg-white/10 rounded-xl transition-all border border-white/10"
                >
                  <ShieldAlert size={18} />
                  <span className="hidden sm:inline">Acceso Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isUsingLocalFallback && !supabaseError && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-amber-800 font-medium">Modo Local Activado</h4>
              <p className="text-amber-700 text-sm mt-1">
                La aplicación está funcionando con almacenamiento local porque no se han configurado las credenciales de Supabase. Los datos se perderán si borras la caché del navegador.
              </p>
            </div>
          </div>
        )}

        {supabaseError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
            <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="text-red-800 font-bold text-lg">Error de Conexión con Supabase</h4>
              <p className="text-red-700 text-sm mt-1 mb-3">
                {supabaseError}
              </p>
              <div className="bg-white/60 p-4 rounded-lg border border-red-100 text-sm text-red-900">
                <p className="font-medium mb-2">Pasos para solucionar:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Crea un proyecto en <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline">Supabase</a>.</li>
                  <li>Ejecuta el archivo <code className="bg-red-100 px-1 rounded">supabase_schema.sql</code> en el SQL Editor de Supabase.</li>
                  <li>Copia la <strong>URL</strong> y la <strong>Anon Key</strong> de la configuración de API.</li>
                  <li>Agrégalas como secretos en AI Studio con los nombres <code className="bg-red-100 px-1 rounded">VITE_SUPABASE_URL</code> y <code className="bg-red-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>.</li>
                </ol>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Recargar aplicación
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'volunteers' ? (
              <VolunteerList
                volunteers={volunteers}
                isAdmin={isAdmin}
                onAdd={openAddForm}
                onEdit={openEditForm}
                onDelete={handleDeleteVolunteer}
                onSelectVolunteer={handleSelectVolunteer}
                onUpdateVolunteers={loadVolunteers}
              />
            ) : activeTab === 'schedule' ? (
              <ScheduleView 
                volunteers={volunteers} 
                isAdmin={isAdmin}
                selectedVolunteerId={selectedVolunteerId}
                onSelectVolunteer={setSelectedVolunteerId}
                onVolunteerEvaluated={handleVolunteerEvaluated}
              />
            ) : activeTab === 'ranking' ? (
              <RankingView
                volunteers={volunteers}
                isAdmin={isAdmin}
                onResetScores={handleResetScores}
              />
            ) : (
              <SettingsView
                volunteers={volunteers}
                onResetScores={handleResetScores}
                onFormatDatabase={handleFormatDatabase}
              />
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {isFormOpen && isAdmin && (
        <VolunteerForm
          volunteer={editingVolunteer}
          onSubmit={editingVolunteer ? handleEditVolunteer : handleAddVolunteer}
          onCancel={() => setIsFormOpen(false)}
        />
      )}

      {showLoginModal && (
        <AdminLogin 
          onClose={() => setShowLoginModal(false)} 
          onLogin={() => {
            setIsAdmin(true);
            setShowLoginModal(false);
          }} 
        />
      )}

      {showChangePinModal && isAdmin && (
        <ChangePin onClose={() => setShowChangePinModal(false)} />
      )}
    </div>
  );
}
