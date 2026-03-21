import React, { useState, useRef } from 'react';
import { Volunteer, Role, Day } from '../types';
import { X, CalendarOff, Camera } from 'lucide-react';
import { clsx } from 'clsx';
import { ROLE_CONFIG } from '../utils/roleConfig';
import { DatePicker } from './DatePicker';

interface VolunteerFormProps {
  volunteer?: Volunteer;
  onSubmit: (volunteer: Omit<Volunteer, 'id'>) => void;
  onCancel: () => void;
}

const ROLES: Role[] = ['Coordinación', 'Medios Digitales', 'Proyección', 'Sonido', 'Transmisión'];
const DAYS: Day[] = ['Miércoles', 'Sábado Mañana', 'Sábado Tarde'];

export function VolunteerForm({ volunteer, onSubmit, onCancel }: VolunteerFormProps) {
  const [name, setName] = useState(volunteer?.name || '');
  const [roles, setRoles] = useState<Role[]>(volunteer?.roles || []);
  const [days, setDays] = useState<Day[]>(volunteer?.days || []);
  const [restrictedDates, setRestrictedDates] = useState<string[]>(volunteer?.restrictedDates || []);
  const [newRestrictedDate, setNewRestrictedDate] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(volunteer?.photoUrl);
  const [active, setActive] = useState(volunteer?.active ?? true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || roles.length === 0 || days.length === 0) {
      alert('Por favor completa todos los campos (nombre, al menos un rol y un día).');
      return;
    }
    onSubmit({ name, roles, days, restrictedDates, photoUrl, active, createdAt: volunteer?.createdAt || Date.now() });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhotoUrl(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const toggleRole = (role: Role) => {
    setRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const toggleDay = (day: Day) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const addRestrictedDate = () => {
    if (newRestrictedDate && !restrictedDates.includes(newRestrictedDate)) {
      setRestrictedDates(prev => [...prev, newRestrictedDate].sort());
      setNewRestrictedDate('');
    }
  };

  const removeRestrictedDate = (dateToRemove: string) => {
    setRestrictedDates(prev => prev.filter(d => d !== dateToRemove));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-brand-light/20 bg-brand-primary/5">
          <h2 className="text-xl font-black text-brand-primary uppercase tracking-tight">
            {volunteer ? 'Editar Voluntario' : 'Nuevo Voluntario'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="flex flex-col items-center mb-6">
            <div 
              className="w-24 h-24 rounded-full bg-brand-light/10 border-2 border-dashed border-brand-light/50 flex items-center justify-center cursor-pointer overflow-hidden relative group shadow-inner"
              onClick={() => fileInputRef.current?.click()}
            >
              {photoUrl ? (
                <>
                  <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white" size={24} />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <Camera size={24} className="mb-1" />
                  <span className="text-xs font-medium">Foto</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              accept="image/*" 
              className="hidden" 
            />
            <p className="text-xs text-gray-500 mt-2">Opcional (Máx 150x150px)</p>
          </div>

          <div>
            <label className="block text-xs font-black text-brand-secondary mb-2 uppercase tracking-widest">Nombre Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-brand-light/50 rounded-2xl focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all font-bold text-brand-primary placeholder:text-gray-300 shadow-sm"
              placeholder="Ej. Juan Pérez"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-brand-light/5 rounded-2xl border border-brand-light/20">
            <div>
              <p className="text-sm font-black text-brand-primary uppercase tracking-tight">Estado del Voluntario</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                {active ? 'Habilitado para turnos' : 'Inhabilitado para turnos'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={clsx(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2",
                active ? "bg-emerald-500 ring-emerald-500/20" : "bg-gray-300 ring-gray-300/20"
              )}
            >
              <span
                className={clsx(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  active ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <div>
            <label className="block text-xs font-black text-brand-secondary mb-3 uppercase tracking-widest">Funciones Preferidas</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(role => {
                const config = ROLE_CONFIG[role];
                const Icon = config.icon;
                const isSelected = roles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border shadow-sm uppercase tracking-wider ${
                      isSelected
                        ? `${config.bg} ${config.color} ${config.border} scale-105`
                        : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={14} />
                    {role}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-brand-secondary mb-3 uppercase tracking-widest">Días Disponibles</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all border shadow-sm uppercase tracking-wider ${
                    days.includes(day)
                      ? 'bg-brand-secondary text-white border-brand-secondary scale-105'
                      : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <CalendarOff size={16} className="text-gray-400" />
              Fechas Restringidas (Opcional)
            </label>
            <div className="flex gap-2 mb-3">
              <DatePicker
                value={newRestrictedDate}
                onChange={setNewRestrictedDate}
                className="flex-1"
                placeholder="Seleccionar fecha"
              />
              <button
                type="button"
                onClick={addRestrictedDate}
                disabled={!newRestrictedDate}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
            {restrictedDates.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {restrictedDates.map(date => {
                  // Format date nicely
                  const [year, month, day] = date.split('-');
                  const formattedDate = `${day}/${month}/${year}`;
                  return (
                    <div key={date} className="flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-lg text-xs font-medium">
                      <span>{formattedDate}</span>
                      <button
                        type="button"
                        onClick={() => removeRestrictedDate(date)}
                        className="p-0.5 hover:bg-red-100 rounded-md transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-brand-light/20">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 text-xs font-black text-brand-secondary bg-white border border-brand-light/50 rounded-2xl hover:bg-brand-light/10 transition-all uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-8 py-3 text-xs font-black text-white bg-brand-primary rounded-2xl hover:bg-brand-secondary transition-all shadow-lg active:scale-95 uppercase tracking-widest"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
