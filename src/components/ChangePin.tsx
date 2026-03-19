import React, { useState } from 'react';
import { X, KeyRound, CheckCircle2 } from 'lucide-react';
import { settingsService } from '../services/settingsService';

interface ChangePinProps {
  onClose: () => void;
}

export function ChangePin({ onClose }: ChangePinProps) {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const isValid = await settingsService.verifyPin(oldPin);
    if (!isValid) {
      setError('El PIN actual es incorrecto');
      setIsLoading(false);
      return;
    }
    
    if (newPin.length < 4) {
      setError('El nuevo PIN debe tener al menos 4 caracteres');
      setIsLoading(false);
      return;
    }
    
    await settingsService.changePin(newPin);
    setSuccess(true);
    setIsLoading(false);
    setTimeout(onClose, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <KeyRound size={20} className="text-brand-primary" /> Cambiar PIN
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {success ? (
            <div className="bg-emerald-50 text-emerald-700 p-6 rounded-xl text-center font-medium flex flex-col items-center gap-3 animate-in fade-in">
              <CheckCircle2 size={32} className="text-emerald-500" />
              PIN actualizado exitosamente
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PIN Actual</label>
                <input
                  type="password"
                  value={oldPin}
                  onChange={(e) => {
                    setOldPin(e.target.value);
                    setError('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none text-center text-2xl tracking-[0.5em] font-mono transition-all"
                  maxLength={8}
                  placeholder="••••"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nuevo PIN</label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => {
                    setNewPin(e.target.value);
                    setError('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none text-center text-2xl tracking-[0.5em] font-mono transition-all"
                  maxLength={8}
                  placeholder="••••"
                />
              </div>
              
              {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}
              
              <button
                type="submit"
                disabled={!oldPin || !newPin || isLoading}
                className="w-full bg-brand-primary text-white py-3 rounded-xl hover:bg-brand-secondary transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  'Guardar Nuevo PIN'
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
