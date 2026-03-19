import React, { useState } from 'react';
import { Trash2, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { volunteerService } from '../services/volunteerService';
import { scheduleService } from '../services/scheduleService';
import { Volunteer } from '../types';

interface SettingsViewProps {
  volunteers: Volunteer[];
  onResetScores: () => Promise<void>;
  onFormatDatabase: () => Promise<void>;
}

export function SettingsView({ volunteers, onResetScores, onFormatDatabase }: SettingsViewProps) {
  const [isFormatting, setIsFormatting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="text-brand-primary" size={24} />
            Configuración de la Plataforma
          </h2>
          <p className="text-gray-500 mt-1">
            Administra los datos y configuraciones generales del sistema.
          </p>
        </div>

        <div className="p-6 space-y-8">
          {/* Reset Scores Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Reiniciar Puntajes</h3>
              <p className="text-gray-500 text-sm">
                Esta acción pondrá en cero los puntajes de todos los voluntarios y marcará todos los turnos del calendario como no evaluados. Útil para iniciar un nuevo mes o trimestre.
              </p>
            </div>
            <button
              onClick={handleResetScores}
              disabled={isResetting || volunteers.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={18} className={isResetting ? 'animate-spin' : ''} />
              {isResetting ? 'Reiniciando...' : 'Reiniciar Todos los Puntajes'}
            </button>
          </div>

          <hr className="border-gray-200" />

          {/* Format Database Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                <AlertTriangle size={20} />
                Zona de Peligro: Formatear Base de Datos
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                Esta acción eliminará permanentemente <strong>todos los voluntarios</strong> y <strong>todo el calendario</strong>. Utiliza esta opción solo si deseas empezar desde cero.
              </p>
            </div>
            <button
              onClick={handleFormatDatabase}
              disabled={isFormatting}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={18} />
              {isFormatting ? 'Formateando...' : 'Formatear Base de Datos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
