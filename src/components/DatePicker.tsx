import React, { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import 'react-day-picker/dist/style.css';

interface DatePickerProps {
  value: string; // ISO date string YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  align?: 'left' | 'right';
}

export function DatePicker({ value, onChange, placeholder = 'Seleccionar fecha', className, required, align = 'left' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? parseISO(value) : undefined;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const formatted = format(date, 'yyyy-MM-dd');
      onChange(formatted);
      setIsOpen(false);
    }
  };

  return (
    <div className={clsx("relative", className)} ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-brand-primary outline-none transition-all bg-white cursor-pointer"
      >
        <CalendarIcon size={18} className="text-gray-400" />
        <span className={clsx("text-sm flex-1", !value && "text-gray-400")}>
          {value && isValid(selectedDate) ? format(selectedDate!, 'dd/MM/yyyy') : placeholder}
        </span>
      </div>
      
      {isOpen && (
        <div className={clsx(
          "absolute z-50 mt-2 p-3 bg-white rounded-2xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200",
          align === 'left' ? "left-0 origin-top-left" : "right-0 origin-top-right"
        )}>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            locale={es}
            weekStartsOn={0} // 0 = Sunday
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center mb-4",
              caption_label: "text-sm font-bold text-brand-primary capitalize",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-gray-400 rounded-md w-9 font-bold text-[11px] uppercase tracking-wider",
              row: "flex w-full mt-2",
              cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
              day: "h-9 w-9 p-0 font-medium aria-selected:opacity-100 hover:bg-brand-primary/10 hover:text-brand-primary rounded-xl transition-all",
              day_selected: "bg-brand-primary text-white hover:bg-brand-primary hover:text-white focus:bg-brand-primary focus:text-white",
              day_today: "bg-gray-100 text-brand-primary font-bold",
              day_outside: "text-gray-300 opacity-50",
              day_disabled: "text-gray-300 opacity-50",
              day_hidden: "invisible",
            }}
            components={{
              Chevron: (props) => {
                if (props.orientation === 'left') return <ChevronLeft className="h-4 w-4" />;
                return <ChevronRight className="h-4 w-4" />;
              }
            }}
          />
        </div>
      )}
      {required && !value && (
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{ opacity: 0, height: 0, padding: 0, border: 0, position: 'absolute' }}
          required
          value=""
          readOnly
        />
      )}
    </div>
  );
}
