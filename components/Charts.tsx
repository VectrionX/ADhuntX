import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ADUserProcessed } from '../types';

interface ChartsProps {
  users: ADUserProcessed[];
}

// Neon Palette matching NeuroBank
const COLORS = {
  Critical: '#EF4444', // Red Neon
  High: '#F97316',     // Orange Neon
  Medium: '#EAB308',   // Yellow Neon
  Low: '#10B981',      // Green Neon
  Primary: '#3B82F6',  // Blue Neon
  Secondary: '#8B5CF6' // Purple Neon
};

const AXIS_STYLE = { fontSize: 11, fill: '#64748B', fontWeight: 500 }; 
const TOOLTIP_STYLE = { 
    backgroundColor: '#15171E', 
    borderColor: '#2A2F3A', 
    color: '#F8FAFC',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
};

export const RiskDistributionChart: React.FC<ChartsProps> = ({ users }) => {
  const data = [
    { name: 'Critical', value: users.filter(u => u.risk.riskLevel === 'Critical').length, color: COLORS.Critical },
    { name: 'High', value: users.filter(u => u.risk.riskLevel === 'High').length, color: COLORS.High },
    { name: 'Medium', value: users.filter(u => u.risk.riskLevel === 'Medium').length, color: COLORS.Medium },
    { name: 'Low', value: users.filter(u => u.risk.riskLevel === 'Low').length, color: COLORS.Low },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <defs>
            {/* Gradients for Pie Segments */}
            {data.map((entry, index) => (
                <linearGradient key={`grad-${index}`} id={`grad-${entry.name}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={entry.color} stopOpacity={1}/>
                    <stop offset="100%" stopColor={entry.color} stopOpacity={0.6}/>
                </linearGradient>
            ))}
        </defs>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={90}
          paddingAngle={4}
          dataKey="value"
          stroke="none"
          cornerRadius={6}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={`url(#grad-${entry.name})`} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#f8fafc' }} />
        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }}/>
      </PieChart>
    </ResponsiveContainer>
  );
};

export const IssuesBarChart: React.FC<ChartsProps> = ({ users }) => {
  const dormantCount = users.filter(u => u.isDormant).length;
  const noMfaCount = users.filter(u => !u.hasMFA).length;
  const passwordNeverExpiresCount = users.filter(u => u.passwordNeverExpires).length;
  const highPrivCount = users.filter(u => u.risk.privilegeScore > 50).length;

  const data = [
    { name: 'No MFA', count: noMfaCount },
    { name: 'Dormant', count: dormantCount },
    { name: 'Pwd No Exp', count: passwordNeverExpiresCount },
    { name: 'High Priv', count: highPrivCount },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={COLORS.Primary} />
            <stop offset="100%" stopColor={COLORS.Secondary} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#2A2F3A" />
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" width={90} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
        <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="count" fill="url(#barGradient)" radius={[0, 6, 6, 0]} barSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const RiskMatrix: React.FC<ChartsProps> = ({ users }) => {
    // Simplification for Matrix: Bucket users by Priv Score vs Pwd Score
    const matrix = [
        { x: 'Low Priv', y: 'Low Hyg', count: 0, r: 0 },
        { x: 'Low Priv', y: 'High Hyg', count: 0, r: 0 },
        { x: 'High Priv', y: 'Low Hyg', count: 0, r: 0 },
        { x: 'High Priv', y: 'High Hyg', count: 0, r: 0 },
    ];

    users.forEach(u => {
        const isHighPriv = u.risk.privilegeScore > 50;
        const isBadHyg = u.risk.passwordHygieneScore > 50; // "High Risk" in hygiene means BAD hygiene

        if (!isHighPriv && !isBadHyg) matrix[0].count++;
        if (!isHighPriv && isBadHyg) matrix[1].count++;
        if (isHighPriv && !isBadHyg) matrix[2].count++;
        if (isHighPriv && isBadHyg) matrix[3].count++;
    });

    return (
        <div className="grid grid-cols-2 gap-2 h-[300px] p-2 relative rounded-xl">
             {/* Labels */}
             <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold text-slate-500 uppercase tracking-widest origin-center">Password Risk</div>
             <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Privilege Risk</div>

            {/* Q2: High Priv / Low Pass Risk */}
            <div className={`flex flex-col items-center justify-center rounded-lg border border-border p-2 bg-[#1A1D26] ${matrix[2].count > 0 ? 'bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20' : ''}`}>
                <span className="text-3xl font-bold text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">{matrix[2].count}</span>
                <span className="text-[10px] uppercase font-semibold text-center text-slate-500 mt-2">High Priv<br/>Good Hygiene</span>
            </div>

            {/* Q4: High Priv / High Pass Risk (CRITICAL) */}
            <div className={`flex flex-col items-center justify-center rounded-lg border border-border p-2 bg-[#1A1D26] ${matrix[3].count > 0 ? 'bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20 shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]' : ''}`}>
                 <span className="text-3xl font-bold text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">{matrix[3].count}</span>
                 <span className="text-[10px] uppercase font-semibold text-center text-slate-500 mt-2">High Priv<br/>Poor Hygiene</span>
            </div>

            {/* Q1: Low Priv / Low Pass Risk */}
            <div className={`flex flex-col items-center justify-center rounded-lg border border-border p-2 bg-[#1A1D26] ${matrix[0].count > 0 ? 'bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20' : ''}`}>
                <span className="text-3xl font-bold text-green-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">{matrix[0].count}</span>
                <span className="text-[10px] uppercase font-semibold text-center text-slate-500 mt-2">Low Priv<br/>Good Hygiene</span>
            </div>

             {/* Q3: Low Priv / High Pass Risk */}
             <div className={`flex flex-col items-center justify-center rounded-lg border border-border p-2 bg-[#1A1D26] ${matrix[1].count > 0 ? 'bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20' : ''}`}>
                <span className="text-3xl font-bold text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">{matrix[1].count}</span>
                <span className="text-[10px] uppercase font-semibold text-center text-slate-500 mt-2">Low Priv<br/>Poor Hygiene</span>
            </div>
        </div>
    )
}