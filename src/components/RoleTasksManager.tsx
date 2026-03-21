import React, { useState, useEffect } from 'react';
import { Role, RoleTasks } from '../types';
import { roleTaskService } from '../services/roleTaskService';
import { Plus, Trash2, ClipboardList, Save } from 'lucide-react';

export function RoleTasksManager() {
  const [roleTasks, setRoleTasks] = useState<RoleTasks[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newTask, setNewTask] = useState<{ [key in Role]?: string }>({});

  const roles: Role[] = ['Sonido', 'Transmisión', 'Proyección', 'Medios Digitales', 'Coordinación'];

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const data = await roleTaskService.getRoleTasks();
      // Ensure all roles are present
      const completeData = roles.map(role => {
        const existing = data.find(rt => rt.role === role);
        return existing || { role, tasks: [] };
      });
      setRoleTasks(completeData);
    } catch (error) {
      console.error('Error loading role tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTask = (role: Role) => {
    const task = newTask[role]?.trim();
    if (!task) return;

    setRoleTasks(prev => prev.map(rt => {
      if (rt.role === role) {
        return { ...rt, tasks: [...rt.tasks, task] };
      }
      return rt;
    }));
    setNewTask(prev => ({ ...prev, [role]: '' }));
  };

  const handleRemoveTask = (role: Role, index: number) => {
    setRoleTasks(prev => prev.map(rt => {
      if (rt.role === role) {
        const newTasks = [...rt.tasks];
        newTasks.splice(index, 1);
        return { ...rt, tasks: newTasks };
      }
      return rt;
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await roleTaskService.saveRoleTasks(roleTasks);
      alert('Tareas guardadas exitosamente.');
    } catch (error) {
      console.error('Error saving role tasks:', error);
      alert('Error al guardar las tareas.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-black text-brand-primary flex items-center gap-2 uppercase tracking-tight">
            <ClipboardList className="text-brand-accent" size={20} />
            Tareas por Función
          </h3>
          <p className="text-gray-500 text-sm">
            Define las tareas específicas que cada voluntario debe cumplir según su función.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white rounded-xl font-black hover:bg-brand-secondary transition-all shadow-md active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs"
        >
          <Save size={18} />
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map(role => {
          const rt = roleTasks.find(r => r.role === role) || { role, tasks: [] };
          return (
            <div key={role} className="bg-brand-light/10 rounded-2xl border border-brand-light/30 p-5 space-y-4 shadow-sm">
              <h4 className="font-black text-brand-secondary border-b border-brand-light/30 pb-2 uppercase tracking-wider text-sm">
                {role}
              </h4>
              
              <div className="space-y-2">
                {rt.tasks.length === 0 ? (
                  <p className="text-gray-400 text-xs italic">No hay tareas asignadas.</p>
                ) : (
                  <ul className="space-y-2">
                    {rt.tasks.map((task, index) => (
                      <li key={index} className="flex justify-between items-start gap-2 bg-white p-2 rounded border border-gray-100 text-sm text-gray-700">
                        <span className="flex-1">{task}</span>
                        <button
                          onClick={() => handleRemoveTask(role, index)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTask[role] || ''}
                  onChange={(e) => setNewTask(prev => ({ ...prev, [role]: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTask(role)}
                  placeholder="Nueva tarea..."
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                />
                <button
                  onClick={() => handleAddTask(role)}
                  className="bg-brand-accent text-white p-2 rounded-xl hover:bg-brand-accent/90 transition-all shadow-sm active:scale-90"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
