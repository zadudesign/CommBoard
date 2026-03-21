import React, { useState } from 'react';
import { Trash2, AlertTriangle, RefreshCw, Database, ClipboardList } from 'lucide-react';
import { volunteerService } from '../services/volunteerService';
import { scheduleService } from '../services/scheduleService';
import { Volunteer } from '../types';
import { RoleTasksManager } from './RoleTasksManager';

interface SettingsViewProps {
  volunteers: Volunteer[];
  onResetScores: () => Promise<void>;
  onFormatDatabase: () => Promise<void>;
}

export function SettingsView({ volunteers, onResetScores, onFormatDatabase }: SettingsViewProps) {
  const [isFormatting, setIsFormatting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'tasks'>('general');

  const handleFormatDatabase = async () => {
    if (window.confirm('⚠️ ADVERTENCIA: Esta acción eliminará TODOS los voluntarios y TODO el calendario. Esta acción no se puede deshacer. ¿Estás absolutamente seguro?')) {
      const confirmText = window.prompt('Para confirmar, escribe "ELIMINAR TODO"');
      if (confirmText === 'ELIMINAR TODO') {
        try {
          setIsFormatting(true);
          await onFormatDatabase();
          alert('Base de datos formateada exitosamente.');
        } catch (error) {
          console.error('Error formatting database:', error);
          alert('Error al formatear la base de datos.');
        } finally {
          setIsFormatting(false);
        }
      } else {
        alert('Confirmación incorrecta. Acción cancelada.');
      }
    }
  };

  const handleResetScores = async () => {
    if (window.confirm('¿Estás seguro de que deseas reiniciar todos los puntajes a cero? Esta acción no se puede deshacer.')) {
      try {
        setIsResetting(true);
        await onResetScores();
      } catch (error) {
        console.error('Error resetting scores:', error);
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-brand-light/10">
          <h2 className="text-xl font-black text-brand-primary flex items-center gap-2 uppercase tracking-tight">
            <Database className="text-brand-accent" size={24} />
            Configuración de la Plataforma
          </h2>
          <p className="text-gray-500 mt-1">
            Administra los datos y configuraciones generales del sistema.
          </p>
          
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'general'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Database size={16} />
              General
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'tasks'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <ClipboardList size={16} />
              Tareas por Función
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'general' ? (
            <div className="space-y-8">
              {/* Reset Scores Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-black text-brand-primary uppercase tracking-tight">Reiniciar Puntajes</h3>
                  <p className="text-gray-500 text-sm font-medium">
                    Esta acción pondrá en cero los puntajes de todos los voluntarios y marcará todos los turnos del calendario como no evaluados. Útil para iniciar un nuevo mes o trimestre.
                  </p>
                </div>
                <button
                  onClick={handleResetScores}
                  disabled={isResetting || volunteers.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-brand-accent text-white hover:bg-brand-accent/90 rounded-xl font-black transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
                >
                  <RefreshCw size={18} className={isResetting ? 'animate-spin' : ''} />
                  {isResetting ? 'Reiniciando...' : 'Reiniciar Todos los Puntajes'}
                </button>
              </div>

              <hr className="border-gray-200" />

              {/* Format Database Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-black text-red-600 flex items-center gap-2 uppercase tracking-tight">
                    <AlertTriangle size={20} />
                    Zona de Peligro: Formatear Base de Datos
                  </h3>
                  <p className="text-gray-500 text-sm mt-1 font-medium">
                    Esta acción eliminará permanentemente <strong>todos los voluntarios</strong> y <strong>todo el calendario</strong>. Utiliza esta opción solo si deseas empezar desde cero.
                  </p>
                </div>
                <button
                  onClick={handleFormatDatabase}
                  disabled={isFormatting}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white hover:bg-red-700 rounded-xl font-black transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
                >
                  <Trash2 size={18} />
                  {isFormatting ? 'Formateando...' : 'Formatear Base de Datos'}
                </button>
              </div>
            </div>
          ) : (
            <RoleTasksManager />
          )}
        </div>
      </div>
    </div>
  );
}
