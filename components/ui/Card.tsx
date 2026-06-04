import React from 'react';
import { Tooltip } from './Tooltip';
import { ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '', action }) => {
  return (
    <div className={`bg-surface rounded-2xl border border-border shadow-xl overflow-hidden backdrop-blur-sm ${className}`}>
      {(title || action) && (
        <div className="px-6 py-5 flex justify-between items-center bg-surface/50">
          {title && <h3 className="text-base font-semibold text-slate-100">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6 text-slate-300">
        {children}
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  color?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  tooltipText?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, trend, color = "text-white", icon, onClick, tooltipText }) => (
  <div 
    onClick={onClick}
    className={`relative group bg-surface p-6 rounded-2xl border border-border shadow-lg flex flex-col justify-between transition-all hover:bg-[#1A1D26] hover:border-primary/30 ${onClick ? 'cursor-pointer' : ''}`}
  >
    {/* Hover Glow Effect */}
    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-0 group-hover:opacity-10 transition duration-500"></div>
    
    <div className="relative z-10 flex justify-between items-start mb-4">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300 group-hover:text-white group-hover:bg-primary/20 group-hover:border-primary/20 transition-colors`}>
           {icon}
        </div>
        <p className="text-sm font-medium text-slate-400">{label}</p>
        {tooltipText && <Tooltip text={tooltipText} />}
      </div>
      {onClick && <div className="p-1 rounded-full bg-slate-800/50 text-slate-500 group-hover:text-white transition-colors"><ChevronRight size={14} /></div>}
    </div>

    <div className="relative z-10">
      <h4 className={`text-3xl font-bold tracking-tight ${color === 'text-white' ? 'text-white' : color} mb-1`}>{value}</h4>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
            {trend.includes("Elevated") || trend.includes("Risk") ? (
                 <span className="flex items-center text-xs font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/10">
                    <ArrowUpRight size={12} className="mr-1" /> {trend}
                 </span>
            ) : (
                <span className="flex items-center text-xs font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/10">
                    <ArrowDownRight size={12} className="mr-1" /> {trend}
                 </span>
            )}
        </div>
      )}
    </div>
  </div>
);