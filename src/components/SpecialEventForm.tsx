import React, { useState } from 'react';
import { X, Calendar, CheckSquare, Square } from 'lucide-react';
import { Role, SpecialEvent } from '../types';
import { DatePicker } from './DatePicker';

interface SpecialEventFormProps {
  onSubmit: (event: Omit<SpecialEvent, 'id'>) => void;
  onCancel: () => void;
}

const ROLES: Role[] = ['Coordinación', 'Medios Digitales', 'Proyección', 'Sonido', 'Transmisión'];

export function SpecialEventForm({ onSubmit, onCancel }: SpecialEventFormProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate || selectedRoles.length === 0) {
      alert('Por favor completa todos los campos y selecciona al menos una función.');
      return;
    }
    onSubmit({
      name,
      startDate,
      endDate,
      roles: selectedRoles
    });
  };

  const toggleRole = (role: Role) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role) 
        : [...prev, role]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Nuevo Evento Especial</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">
                Nombre del Evento
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Campaña de Evangelismo"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Fecha Inicio
                </label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Inicio"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Fecha Fin
                </label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Fin"
                  align="right"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">
                Funciones Requeridas
              </label>
              <div className="grid grid-cols-1 gap-2">
                {ROLES.map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                      selectedRoles.includes(role)
                        ? 'bg-brand-primary/10 border-brand-primary text-brand-primary'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {selectedRoles.includes(role) ? <CheckSquare size={20} /> : <Square size={20} />}
                    <span className="font-medium">{role}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-brand-primary text-white py-3 rounded-xl hover:bg-brand-secondary transition-colors font-medium shadow-lg shadow-brand-primary/20"
            >
              Crear Evento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
