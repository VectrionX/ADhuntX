import React from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  text: string;
  children?: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const id = React.useId();
  return (
    <span className="group relative inline-flex items-center gap-1 cursor-help">
      <button type="button" aria-label="More information" aria-describedby={id} className="rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
        {children || <HelpCircle size={14} className="text-slate-300 hover:text-indigo-300 transition-colors" />}
      </button>
      <span id={id} role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50 text-center font-normal leading-relaxed">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800" />
      </span>
    </span>
  );
};