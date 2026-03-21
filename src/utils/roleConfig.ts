import { Headphones, Radio, MonitorPlay, Smartphone, ClipboardList, LucideIcon } from 'lucide-react';
import { Role } from '../types';

export const ROLE_CONFIG: Record<Role, { icon: LucideIcon, color: string, bg: string, border: string, darkBg: string }> = {
  'Sonido': {
    icon: Headphones,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    darkBg: 'bg-blue-700'
  },
  'Transmisión': {
    icon: Radio,
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    darkBg: 'bg-red-700'
  },
  'Proyección': {
    icon: MonitorPlay,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    darkBg: 'bg-purple-700'
  },
  'Medios Digitales': {
    icon: Smartphone,
    color: 'text-pink-700',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    darkBg: 'bg-pink-700'
  },
  'Coordinación': {
    icon: ClipboardList,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    darkBg: 'bg-emerald-700'
  }
};
