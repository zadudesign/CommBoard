import React, { useState } from 'react';
import { X, Lock } from 'lucide-react';
import { settingsService } from '../services/settingsService';

interface AdminLoginProps {
  onClose: () => void;
  onLogin: () => void;
}

export function AdminLogin({ onClose, onLogin }: AdminLoginProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await settingsService.verifyPin(pin);
    if (isValid) {
      onLogin();
    } else {
      setError('PIN incorrecto');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-brand-light/20 bg-brand-primary/5">
          <h2 className="text-xl font-black text-brand-primary flex items-center gap-2 uppercase tracking-tight">
            <Lock size={20} className="text-brand-accent" /> Acceso Admin
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-black text-brand-secondary mb-4 text-center uppercase tracking-widest">
              Ingrese el PIN de Administrador
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-4 border border-brand-light/50 rounded-2xl focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none text-center text-4xl tracking-[0.5em] font-mono transition-all bg-brand-light/5 text-brand-primary shadow-inner"
              autoFocus
              maxLength={8}
              placeholder="••••"
            />
            {error && <p className="text-red-600 text-xs mt-3 text-center font-black uppercase tracking-wider">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={!pin}
            className="w-full bg-brand-primary text-white py-4 rounded-2xl hover:bg-brand-secondary transition-all font-black shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
