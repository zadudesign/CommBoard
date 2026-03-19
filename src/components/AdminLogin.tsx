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
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Lock size={20} className="text-brand-primary" /> Acceso Admin
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
              Ingrese el PIN de Administrador
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none text-center text-3xl tracking-[0.5em] font-mono transition-all"
              autoFocus
              maxLength={8}
              placeholder="••••"
            />
            {error && <p className="text-red-500 text-sm mt-2 text-center font-medium">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={!pin}
            className="w-full bg-brand-primary text-white py-3 rounded-xl hover:bg-brand-secondary transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
