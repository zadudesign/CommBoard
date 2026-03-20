import React, { useState, useEffect, useMemo } from 'react';
import { Volunteer, Shift } from '../types';
import { Trophy, Medal, Award, RotateCcw, ChevronLeft, ChevronRight, History, User, Calendar as CalendarIcon, Download } from 'lucide-react';
import { scheduleService } from '../services/scheduleService';
import { getMonthName, getServiceDate } from '../utils/dates';
import { clsx } from 'clsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RankingViewProps {
  volunteers: Volunteer[];
  isAdmin: boolean;
  onResetScores: () => void;
}

export function RankingView({ volunteers, isAdmin, onResetScores }: RankingViewProps) {
  const [schedule, setSchedule] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryVolunteerId, setSelectedHistoryVolunteerId] = useState<string>('');
  const selectedMonth = currentDate.getMonth();
  const selectedYear = currentDate.getFullYear();

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    setIsLoading(true);
    const data = await scheduleService.getSchedule();
    setSchedule(data);
    setIsLoading(false);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(selectedYear, selectedMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(selectedYear, selectedMonth + 1, 1));
  };

  const currentMonthEvaluatedShifts = useMemo(() => {
    return schedule.filter(s => {
      if (s.date) {
        const d = new Date(s.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && s.evaluated && s.scores;
      }
      const shiftMonth = s.month ?? new Date().getMonth();
      const shiftYear = s.year ?? new Date().getFullYear();
      return shiftMonth === selectedMonth && shiftYear === selectedYear && s.evaluated && s.scores;
    }).sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(selectedYear, selectedMonth, (a.week - 1) * 7 + 1);
      const dateB = b.date ? new Date(b.date) : new Date(selectedYear, selectedMonth, (b.week - 1) * 7 + 1);
      return dateA.getTime() - dateB.getTime();
    });
  }, [schedule, selectedMonth, selectedYear]);

  const historyVolunteers = useMemo(() => {
    const ids = new Set(currentMonthEvaluatedShifts.map(s => s.volunteerId));
    return volunteers.filter(v => ids.has(v.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [currentMonthEvaluatedShifts, volunteers]);

  const filteredHistoryShifts = useMemo(() => {
    if (!selectedHistoryVolunteerId) return currentMonthEvaluatedShifts;
    return currentMonthEvaluatedShifts.filter(s => s.volunteerId === selectedHistoryVolunteerId);
  }, [currentMonthEvaluatedShifts, selectedHistoryVolunteerId]);

  const rankedVolunteers = useMemo(() => {
    // 1. Calculate assigned shifts count for ALL volunteers in the month
    const assignedCounts: Record<string, number> = {};
    schedule.forEach(s => {
      const shiftMonth = s.month ?? new Date().getMonth();
      const shiftYear = s.year ?? new Date().getFullYear();
      if (shiftMonth === selectedMonth && shiftYear === selectedYear && s.volunteerId) {
        assignedCounts[s.volunteerId] = (assignedCounts[s.volunteerId] || 0) + 1;
      }
    });

    const maxAssignedShifts = Math.max(...Object.values(assignedCounts), 1);

    // 2. Calculate scores per volunteer
    const volunteerScores: Record<string, { puntualidad: number; orden: number; responsabilidad: number; total: number; evaluatedCount: number; extraPoints: number }> = {};
    
    schedule.forEach(shift => {
      const shiftMonth = shift.month ?? new Date().getMonth();
      const shiftYear = shift.year ?? new Date().getFullYear();
      if (shiftMonth !== selectedMonth || shiftYear !== selectedYear) return;
      if (!shift.volunteerId || !shift.evaluated || !shift.scores) return;

      if (!volunteerScores[shift.volunteerId]) {
        volunteerScores[shift.volunteerId] = { puntualidad: 0, orden: 0, responsabilidad: 0, total: 0, evaluatedCount: 0, extraPoints: 0 };
      }
      volunteerScores[shift.volunteerId].puntualidad += shift.scores.puntualidad;
      volunteerScores[shift.volunteerId].orden += shift.scores.orden;
      volunteerScores[shift.volunteerId].responsabilidad += shift.scores.responsabilidad;
      volunteerScores[shift.volunteerId].total += shift.scores.total;
      volunteerScores[shift.volunteerId].evaluatedCount += 1;
    });

    // 3. Map to volunteers and sort
    return volunteers
      .map(v => {
        const stats = volunteerScores[v.id];
        const assignedCount = assignedCounts[v.id] || 0;
        const extraPoints = v.stats?.extraPoints || 0;
        
        if (!stats && extraPoints === 0) return { ...v, calculatedStats: null };
        
        const currentStats = stats || { puntualidad: 0, orden: 0, responsabilidad: 0, total: 0, evaluatedCount: 0 };

        // Promediamos los puntajes dividiendo por la cantidad de turnos evaluados del propio voluntario.
        // Esto garantiza que tanto el que tuvo 2 turnos como el que tuvo 10 puedan alcanzar el máximo de 50 puntos.
        // Luego escalamos el promedio (que tiene un máximo de 15) para que el máximo sea 50.
        const divisor = Math.max(currentStats.evaluatedCount, 1);
        const scaleFactor = 50 / 15;
        
        return {
          ...v,
          calculatedStats: {
            puntualidad: Number(((currentStats.puntualidad / divisor) * scaleFactor).toFixed(2)),
            orden: Number(((currentStats.orden / divisor) * scaleFactor).toFixed(2)),
            responsabilidad: Number(((currentStats.responsabilidad / divisor) * scaleFactor).toFixed(2)),
            total: Math.round(((currentStats.total / divisor) * scaleFactor) + extraPoints),
            shiftCount: currentStats.evaluatedCount,
            assignedCount: assignedCount,
            extraPoints: extraPoints
          }
        };
      })
      .filter(v => v.calculatedStats !== null)
      .sort((a, b) => (b.calculatedStats?.total || 0) - (a.calculatedStats?.total || 0));
  }, [schedule, volunteers, selectedMonth, selectedYear]);

  const top3 = rankedVolunteers.slice(0, 3);
  const rest = rankedVolunteers.slice(3);

  const globalAverage = useMemo(() => {
    if (rankedVolunteers.length === 0) return 0;
    const totalScore = rankedVolunteers.reduce((sum, v) => sum + v.calculatedStats.total, 0);
    return Math.round(totalScore / rankedVolunteers.length);
  }, [rankedVolunteers]);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const monthName = getMonthName(selectedMonth, selectedYear);
    const title = selectedHistoryVolunteerId 
      ? `Historial de Evaluaciones - ${historyVolunteers.find(v => v.id === selectedHistoryVolunteerId)?.name} - ${monthName}`
      : `Historial de Evaluaciones - Todos - ${monthName}`;

    doc.setFontSize(16);
    doc.text(title, 14, 20);

    const tableData = filteredHistoryShifts.map(shift => {
      const volunteer = volunteers.find(v => v.id === shift.volunteerId);
      const date = shift.date ? new Date(shift.date) : getServiceDate(shift.week, shift.day as any, selectedMonth, selectedYear);
      const dayNumber = date.getDate();
      const dateStr = shift.date 
        ? `${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${shift.day}` 
        : `Semana ${shift.week} - ${shift.day} ${dayNumber}`;
      
      return [
        dateStr,
        volunteer?.name || 'Desconocido',
        shift.role,
        shift.scores?.puntualidad || 0,
        shift.scores?.orden || 0,
        shift.scores?.responsabilidad || 0,
        shift.scores?.total || 0,
        shift.scores?.note || '-'
      ];
    });

    autoTable(doc, {
      startY: 30,
      head: [['Fecha/Semana', 'Voluntario', 'Rol', 'Puntualidad', 'Orden', 'Resp.', 'Total', 'Notas']],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] }, // brand primary color
    });

    const fileName = selectedHistoryVolunteerId 
      ? `Evaluaciones_${historyVolunteers.find(v => v.id === selectedHistoryVolunteerId)?.name.replace(/\s+/g, '_')}_${monthName.replace(' ', '_')}.pdf`
      : `Evaluaciones_Todos_${monthName.replace(' ', '_')}.pdf`;

    doc.save(fileName);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-gray-900">Ranking</h2>
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 text-sm font-medium border border-gray-200 shadow-sm">
              <button onClick={handlePrevMonth} className="p-1 text-gray-500 hover:text-brand-primary hover:bg-gray-50 rounded-md transition-all"><ChevronLeft size={18}/></button>
              <span className="w-36 text-center capitalize text-brand-primary font-bold">{getMonthName(selectedMonth, selectedYear)}</span>
              <button onClick={handleNextMonth} className="p-1 text-gray-500 hover:text-brand-primary hover:bg-gray-50 rounded-md transition-all"><ChevronRight size={18}/></button>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2">
            <p className="text-gray-500 text-sm">Clasificación de voluntarios por desempeño</p>
            {rankedVolunteers.length > 0 && (
              <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100 shadow-sm">
                <Award size={14} />
                Promedio Global: {globalAverage} pts
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium text-sm border",
                showHistory 
                  ? "bg-brand-primary text-white border-brand-primary shadow-md" 
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              )}
            >
              <History size={16} />
              {showHistory ? 'Ver Ranking' : 'Ver Historial Detallado'}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => {
                if (window.confirm('¿Estás seguro de que deseas reiniciar todos los puntajes a cero? Esta acción no se puede deshacer.')) {
                  onResetScores();
                }
              }}
              className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm border border-red-200"
            >
              <RotateCcw size={16} />
              Reiniciar Puntajes
            </button>
          )}
        </div>
      </div>

      {rankedVolunteers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="bg-brand-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="text-brand-accent" size={28} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aún no hay puntajes</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Los puntajes aparecerán aquí una vez que el administrador evalúe los turnos de los voluntarios.
          </p>
        </div>
      ) : showHistory && isAdmin ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <History size={20} className="text-brand-primary" />
                Historial de Evaluaciones - {getMonthName(selectedMonth, selectedYear)}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                  <User size={16} className="text-gray-500" />
                  <select
                    value={selectedHistoryVolunteerId}
                    onChange={(e) => setSelectedHistoryVolunteerId(e.target.value)}
                    className="text-sm border-none bg-transparent focus:ring-0 text-gray-700 font-medium cursor-pointer outline-none"
                  >
                    <option value="">Todos los voluntarios</option>
                    {historyVolunteers.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 bg-brand-primary text-white px-3 py-1.5 rounded-lg hover:bg-brand-primary/90 transition-colors font-medium text-sm shadow-sm"
                  title="Descargar PDF"
                >
                  <Download size={16} />
                  Descargar PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4 border-b border-gray-100">Semana / Día</th>
                    <th className="px-6 py-4 border-b border-gray-100">Voluntario</th>
                    <th className="px-6 py-4 border-b border-gray-100">Rol</th>
                    <th className="px-6 py-4 border-b border-gray-100 text-center">Puntualidad</th>
                    <th className="px-6 py-4 border-b border-gray-100 text-center">Orden</th>
                    <th className="px-6 py-4 border-b border-gray-100 text-center">Resp.</th>
                    <th className="px-6 py-4 border-b border-gray-100">Nota</th>
                    <th className="px-6 py-4 border-b border-gray-100 text-center bg-brand-primary/5">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredHistoryShifts.map((shift) => {
                    const volunteer = volunteers.find(v => v.id === shift.volunteerId);
                    if (!volunteer || !shift.scores) return null;
                    const date = shift.date ? new Date(shift.date) : getServiceDate(shift.week, shift.day as any, selectedMonth, selectedYear);
                    const dayNumber = date.getDate();
                    const dateStr = shift.date 
                      ? `${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${shift.day}` 
                      : `Semana ${shift.week} - ${shift.day} ${dayNumber}`;
                    
                    return (
                      <tr key={shift.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {shift.eventName ? (
                            <span className="flex flex-col">
                              <span className="font-bold text-brand-accent">{shift.eventName}</span>
                              <span className="text-[10px]">{dateStr}</span>
                            </span>
                          ) : (
                            dateStr
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center overflow-hidden">
                              {volunteer.photoUrl ? (
                                <img src={volunteer.photoUrl} alt={volunteer.name} className="w-full h-full object-cover" />
                              ) : (
                                <User size={14} className="text-brand-primary" />
                              )}
                            </div>
                            <span className="text-sm font-bold text-gray-900">{volunteer.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                            {shift.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={clsx(
                            "text-sm font-bold",
                            shift.scores.puntualidad > 0 ? "text-emerald-600" : shift.scores.puntualidad < 0 ? "text-red-600" : "text-gray-400"
                          )}>
                            {shift.scores.puntualidad > 0 ? `+${shift.scores.puntualidad}` : shift.scores.puntualidad}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={clsx(
                            "text-sm font-bold",
                            shift.scores.orden > 0 ? "text-emerald-600" : shift.scores.orden < 0 ? "text-red-600" : "text-gray-400"
                          )}>
                            {shift.scores.orden > 0 ? `+${shift.scores.orden}` : shift.scores.orden}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={clsx(
                            "text-sm font-bold",
                            shift.scores.responsabilidad > 0 ? "text-emerald-600" : shift.scores.responsabilidad < 0 ? "text-red-600" : "text-gray-400"
                          )}>
                            {shift.scores.responsabilidad > 0 ? `+${shift.scores.responsabilidad}` : shift.scores.responsabilidad}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate" title={shift.scores.note}>
                          {shift.scores.note || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center bg-brand-primary/5">
                          <span className={clsx(
                            "text-base font-black",
                            shift.scores.total > 0 ? "text-brand-primary" : shift.scores.total < 0 ? "text-red-700" : "text-gray-500"
                          )}>
                            {shift.scores.total > 0 ? `+${shift.scores.total}` : shift.scores.total}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Podium for Top 3 */}
          <div className="flex flex-col sm:flex-row justify-center items-center sm:items-end gap-4 sm:gap-6 mt-12 mb-16 px-4">
            {/* 2nd Place */}
            {top3[1] && (
              <div className="flex flex-col items-center order-2 sm:order-1 w-full sm:w-1/3 max-w-[200px]">
                <div className="relative mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center border-4 border-white shadow-md z-10 relative overflow-hidden">
                    {top3[1].photoUrl ? (
                      <img src={top3[1].photoUrl} alt={top3[1].name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-gray-600">{top3[1].name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-3 -right-3 bg-gray-300 rounded-full p-1.5 border-2 border-white shadow-sm z-20">
                    <Medal size={20} className="text-gray-600" />
                  </div>
                </div>
                <div className="bg-gradient-to-t from-gray-200 to-gray-100 w-full rounded-t-2xl border border-gray-200 border-b-0 pt-6 pb-4 px-2 text-center shadow-sm h-40 flex flex-col justify-start">
                  <p className="font-bold text-gray-800 line-clamp-2 leading-tight w-full px-2">{top3[1].name}</p>
                  <p className="text-2xl font-black text-gray-600 mt-1">{top3[1].calculatedStats.total} <span className="text-xs font-normal text-gray-500">pts</span></p>
                  <div className="flex flex-col items-center gap-0.5 mt-1">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      {top3[1].calculatedStats.shiftCount}/{top3[1].calculatedStats.assignedCount} turnos
                    </p>
                    {top3[1].calculatedStats.extraPoints !== 0 && (
                      <p className="text-[10px] text-emerald-600 font-bold">
                        {top3[1].calculatedStats.extraPoints > 0 ? `+${top3[1].calculatedStats.extraPoints}` : top3[1].calculatedStats.extraPoints} extra
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <div className="flex flex-col items-center order-1 sm:order-2 w-full sm:w-1/3 max-w-[220px] z-10">
                <div className="relative mb-4">
                  <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg z-10 relative overflow-hidden">
                    {top3[0].photoUrl ? (
                      <img src={top3[0].photoUrl} alt={top3[0].name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-yellow-600">{top3[0].name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-4 -right-4 bg-yellow-400 rounded-full p-2 border-2 border-white shadow-md z-20">
                    <Trophy size={24} className="text-white" />
                  </div>
                </div>
                <div className="bg-gradient-to-t from-yellow-200 to-yellow-100 w-full rounded-t-2xl border border-yellow-300 border-b-0 pt-8 pb-4 px-2 text-center shadow-md h-48 flex flex-col justify-start">
                  <p className="font-bold text-yellow-900 line-clamp-2 leading-tight w-full px-2 text-lg">{top3[0].name}</p>
                  <p className="text-3xl font-black text-yellow-700 mt-1">{top3[0].calculatedStats.total} <span className="text-sm font-normal text-yellow-600">pts</span></p>
                  <div className="flex flex-col items-center gap-0.5 mt-1">
                    <p className="text-xs text-yellow-600/70 uppercase font-bold tracking-wider">
                      {top3[0].calculatedStats.shiftCount}/{top3[0].calculatedStats.assignedCount} turnos
                    </p>
                    {top3[0].calculatedStats.extraPoints !== 0 && (
                      <p className="text-[10px] text-yellow-700 font-bold">
                        {top3[0].calculatedStats.extraPoints > 0 ? `+${top3[0].calculatedStats.extraPoints}` : top3[0].calculatedStats.extraPoints} extra
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <div className="flex flex-col items-center order-3 sm:order-3 w-full sm:w-1/3 max-w-[200px]">
                <div className="relative mb-4">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center border-4 border-white shadow-md z-10 relative overflow-hidden">
                    {top3[2].photoUrl ? (
                      <img src={top3[2].photoUrl} alt={top3[2].name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-orange-700">{top3[2].name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-3 -right-3 bg-orange-300 rounded-full p-1.5 border-2 border-white shadow-sm z-20">
                    <Award size={20} className="text-orange-800" />
                  </div>
                </div>
                <div className="bg-gradient-to-t from-orange-200 to-orange-100 w-full rounded-t-2xl border border-orange-200 border-b-0 pt-6 pb-4 px-2 text-center shadow-sm h-36 flex flex-col justify-start">
                  <p className="font-bold text-orange-900 line-clamp-2 leading-tight w-full px-2">{top3[2].name}</p>
                  <p className="text-xl font-black text-orange-800 mt-1">{top3[2].calculatedStats.total} <span className="text-xs font-normal text-orange-700">pts</span></p>
                  <div className="flex flex-col items-center gap-0.5 mt-1">
                    <p className="text-[10px] text-orange-700/60 uppercase font-bold tracking-wider">
                      {top3[2].calculatedStats.shiftCount}/{top3[2].calculatedStats.assignedCount} turnos
                    </p>
                    {top3[2].calculatedStats.extraPoints !== 0 && (
                      <p className="text-[10px] text-orange-800 font-bold">
                        {top3[2].calculatedStats.extraPoints > 0 ? `+${top3[2].calculatedStats.extraPoints}` : top3[2].calculatedStats.extraPoints} extra
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rest of Top 10 */}
          {rest.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-100">
                {rest.map((volunteer, index) => (
                  <div key={volunteer.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-8 text-center font-bold text-gray-400">
                        #{index + 4}
                      </div>
                      <div className="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary font-bold overflow-hidden">
                        {volunteer.photoUrl ? (
                          <img src={volunteer.photoUrl} alt={volunteer.name} className="w-full h-full object-cover" />
                        ) : (
                          volunteer.name.charAt(0)
                        )}
                      </div>
                      <p className="font-semibold text-gray-900">{volunteer.name}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right mr-2 hidden sm:block">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                          {volunteer.calculatedStats.shiftCount}/{volunteer.calculatedStats.assignedCount} turnos
                        </p>
                        {volunteer.calculatedStats.extraPoints !== 0 && (
                          <p className="text-[10px] text-emerald-600 font-bold">
                            {volunteer.calculatedStats.extraPoints > 0 ? `+${volunteer.calculatedStats.extraPoints}` : volunteer.calculatedStats.extraPoints} extra
                          </p>
                        )}
                      </div>
                      <div className="bg-brand-primary/5 px-3 py-1 rounded-lg border border-brand-primary/10">
                        <span className="font-black text-brand-primary">{volunteer.calculatedStats.total}</span>
                        <span className="text-xs text-brand-primary/70 ml-1">pts</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
