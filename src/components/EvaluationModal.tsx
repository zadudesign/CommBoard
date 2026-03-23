import React, { useState } from 'react';
import { X, Star } from 'lucide-react';

interface EvaluationModalProps {
  volunteerName: string;
  onClose: () => void;
  onSubmit: (scores: { puntualidad: number; orden: number; responsabilidad: number; note?: string }) => void;
}

export function EvaluationModal({ volunteerName, onClose, onSubmit }: EvaluationModalProps) {
  const [puntualidad, setPuntualidad] = useState<number | null>(null);
  const [orden, setOrden] = useState<number | null>(null);
  const [responsabilidad, setResponsabilidad] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (puntualidad === null || orden === null || responsabilidad === null) {
      alert('Por favor califica todos los aspectos.');
      return;
    }
    onSubmit({ puntualidad, orden, responsabilidad, note: note.trim() || undefined });
  };

  const renderScoreButtons = (value: number | null, onChange: (val: number) => void) => {
    const scores = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
    return (
      <div className="flex flex-wrap justify-center gap-1">
        {scores.map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ${
              value === score 
                ? score > 0 ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 
                  score < 0 ? 'bg-red-500 text-white border-red-600 shadow-sm' : 
                  'bg-gray-500 text-white border-gray-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            {score > 0 ? `+${score}` : score}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-brand-light/20 bg-brand-primary/5">
          <h2 className="text-xl font-black text-brand-primary uppercase tracking-tight">Evaluar Turno</h2>
          <button onClick={onClose} className="text-brand-secondary hover:text-brand-accent transition-all p-1 hover:bg-brand-light/20 rounded-lg">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="text-center mb-2 bg-brand-light/10 p-4 rounded-2xl border border-brand-light/20">
            <p className="text-[10px] font-black text-brand-secondary uppercase tracking-widest mb-1">Voluntario</p>
            <p className="font-black text-brand-primary text-xl capitalize tracking-tight">{volunteerName}</p>
          </div>

          <div className="space-y-8">
            <div className="flex flex-col items-center gap-4">
              <label className="text-xs font-black text-brand-secondary uppercase tracking-widest">Puntualidad</label>
              {renderScoreButtons(puntualidad, setPuntualidad)}
            </div>
            <div className="flex flex-col items-center gap-4">
              <label className="text-xs font-black text-brand-secondary uppercase tracking-widest">Orden</label>
              {renderScoreButtons(orden, setOrden)}
            </div>
            <div className="flex flex-col items-center gap-4">
              <label className="text-xs font-black text-brand-secondary uppercase tracking-widest">Responsabilidad</label>
              {renderScoreButtons(responsabilidad, setResponsabilidad)}
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-brand-secondary uppercase tracking-widest block">Nota / Detalle (Opcional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej. Excelente manejo de la consola, llegó temprano..."
                className="w-full px-4 py-4 border border-brand-light/50 rounded-2xl focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all text-sm min-h-[100px] resize-none font-bold text-brand-primary placeholder:text-gray-300 shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-brand-primary text-white py-4 rounded-2xl hover:bg-brand-secondary transition-all font-black shadow-lg active:scale-95 uppercase tracking-widest text-sm"
          >
            Guardar Evaluación
          </button>
        </form>
      </div>
    </div>
  );
}
