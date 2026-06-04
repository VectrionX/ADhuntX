import React, { useState, useEffect } from 'react';
import { ADUserProcessed } from '../types';
import { ArrowUpDown, AlertTriangle, Shield, CheckCircle, User, Users, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';

interface Props {
  users: ADUserProcessed[];
  initialRiskFilter?: string;
  initialSearch?: string;
  onUserClick: (user: ADUserProcessed) => void;
}

export const UserTable: React.FC<Props> = ({ users, initialRiskFilter = 'All', initialSearch = '', onUserClick }) => {
  const [filter, setFilter] = useState(initialSearch);
  const [riskFilter, setRiskFilter] = useState(initialRiskFilter);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ADUserProcessed | 'totalRiskScore'; direction: 'asc' | 'desc' } | null>({ key: 'totalRiskScore', direction: 'desc' });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Update internal state if props change (drill-down behavior)
  useEffect(() => {
    setRiskFilter(initialRiskFilter);
    setFilter(initialSearch);
    setCurrentPage(1); // Reset to page 1 on external filter change
  }, [initialRiskFilter, initialSearch]);

  // Reset to page 1 when internal filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, riskFilter]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.UserName.toLowerCase().includes(filter.toLowerCase()) || 
                          user.SamAccountName.toLowerCase().includes(filter.toLowerCase()) ||
                          user.Department?.toLowerCase().includes(filter.toLowerCase());
    const matchesRisk = riskFilter === 'All' || user.risk.riskLevel === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortConfig) return 0;
    
    let aVal: any = a[sortConfig.key as keyof ADUserProcessed];
    let bVal: any = b[sortConfig.key as keyof ADUserProcessed];

    if (sortConfig.key === 'totalRiskScore') {
        aVal = a.risk.totalRiskScore;
        bVal = b.risk.totalRiskScore;
    }

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: any) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Pagination Logic
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, startIndex + itemsPerPage);

  const getRiskBadge = (level: string) => {
    const styles = {
      Critical: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
      High: 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.2)]',
      Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]',
      Low: 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border ${styles[level as keyof typeof styles] || styles.Low}`}>
        {level}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#1A1D26] p-4 rounded-xl border border-[#2A2F3A]">
        <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Filter size={14} />
            </div>
             <input
                type="text"
                placeholder="Search users..."
                className="w-full pl-9 pr-4 py-2.5 bg-[#0B0E11] border border-[#2A2F3A] rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none text-slate-200 placeholder-slate-600 text-sm transition-all"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            />
        </div>
       
        <div className="flex gap-2 flex-wrap">
            {['All', 'Critical', 'High', 'Medium', 'Low'].map(lvl => (
                <button
                    key={lvl}
                    onClick={() => setRiskFilter(lvl)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all border ${
                        riskFilter === lvl 
                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' 
                        : 'bg-[#0B0E11] text-slate-400 border-[#2A2F3A] hover:bg-[#2A2F3A] hover:text-white'
                    }`}
                >
                    {lvl}
                </button>
            ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#2A2F3A] shadow-2xl bg-[#15171E]">
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#1A1D26] text-[11px] uppercase text-slate-400 font-bold tracking-wider border-b border-[#2A2F3A]">
                <tr>
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('UserName')}>
                    <div className="flex items-center gap-2">IDENTITY <ArrowUpDown size={12} /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('Department')}>
                    <div className="flex items-center gap-2">DEPT <ArrowUpDown size={12} /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('totalRiskScore')}>
                    <div className="flex items-center gap-2">
                        RISK SCORE <ArrowUpDown size={12} />
                        <Tooltip text="Combined score of Privilege Risk (60%) and Password Hygiene (40%)" />
                    </div>
                </th>
                <th className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        BREAKDOWN
                        <Tooltip text="Individual scores for Group Privileges and Password settings (0-100)" />
                    </div>
                </th>
                <th className="px-6 py-4">ISSUES</th>
                <th className="px-6 py-4">ACTION</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2F3A]">
                {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#1F2937]/50 transition-colors group">
                    <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-[#0B0E11] border border-[#2A2F3A] text-blue-500 shadow-sm">
                            <User size={16} />
                        </div>
                        <div>
                            <div className="font-semibold text-white group-hover:text-blue-400 transition-colors">{user.UserName}</div>
                            <div className="text-xs text-slate-500 font-mono">{user.SamAccountName}</div>
                        </div>
                    </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{user.Department || <span className="opacity-50">N/A</span>}</td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <span className={`text-lg font-bold ${user.risk.totalRiskScore > 70 ? 'text-red-500' : user.risk.totalRiskScore > 40 ? 'text-orange-400' : 'text-slate-200'}`}>
                                {user.risk.totalRiskScore}
                            </span>
                            {getRiskBadge(user.risk.riskLevel)}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 text-[11px]">
                            <div className="flex items-center justify-between w-32 bg-[#0B0E11] px-2 py-1 rounded border border-[#2A2F3A]">
                                <span className="text-slate-500">Privilege</span>
                                <b className={`font-mono ${user.risk.privilegeScore > 50 ? 'text-orange-400' : 'text-slate-300'}`}>{user.risk.privilegeScore}</b>
                            </div>
                            <div className="flex items-center justify-between w-32 bg-[#0B0E11] px-2 py-1 rounded border border-[#2A2F3A]">
                                <span className="text-slate-500">Hygiene</span>
                                <b className={`font-mono ${user.risk.passwordHygieneScore > 50 ? 'text-red-400' : 'text-slate-300'}`}>{user.risk.passwordHygieneScore}</b>
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        {user.risk.issues.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {user.risk.issues.slice(0, 2).map((issue, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-red-500/5 text-red-400 border border-red-500/10">
                                        <AlertTriangle size={10} /> {issue}
                                    </span>
                                ))}
                                {user.risk.issues.length > 2 && (
                                    <div className="relative group/more inline-flex">
                                        <span className="cursor-pointer text-[10px] text-slate-400 bg-[#0B0E11] px-2 py-1 rounded border border-[#2A2F3A] hover:text-white transition-colors">
                                            +{user.risk.issues.length - 2}
                                        </span>
                                        {/* Issues Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-[#1A1D26] text-slate-200 text-xs rounded-xl shadow-xl border border-[#2A2F3A] opacity-0 group-hover/more:opacity-100 pointer-events-none z-50">
                                            <ul className="list-disc pl-3 space-y-1 text-[11px]">
                                                {user.risk.issues.slice(2).map((issue, k) => (
                                                    <li key={k}>{issue}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="text-green-500 flex items-center gap-1.5 text-xs font-medium bg-green-500/5 px-2 py-1 rounded border border-green-500/10 w-fit"><CheckCircle size={12}/> Clean</span>
                        )}
                    </td>
                    <td className="px-6 py-4">
                    {user.risk.recommendations.length > 0 ? (
                        <button 
                                onClick={() => onUserClick(user)}
                                className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white text-xs font-semibold border border-blue-500/20 transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                        >
                            Review
                            <ChevronRight size={12} />
                        </button>
                    ) : <span className="text-slate-600 text-xs">-</span>}
                    </td>
                </tr>
                ))}
                {paginatedUsers.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center">
                                <div className="p-4 bg-[#1A1D26] rounded-full mb-3 border border-[#2A2F3A]">
                                    <Shield size={32} className="text-slate-600"/>
                                </div>
                                <p className="text-sm font-medium">No users found matching filters.</p>
                                <button onClick={() => {setFilter(''); setRiskFilter('All')}} className="mt-2 text-blue-400 text-xs hover:text-blue-300 font-medium">Clear Search</button>
                            </div>
                        </td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-2 px-1">
         <div className="text-xs text-slate-500 font-medium">
             Showing <span className="text-white">{Math.min(startIndex + 1, sortedUsers.length)}</span> to <span className="text-white">{Math.min(startIndex + itemsPerPage, sortedUsers.length)}</span> of <span className="text-white">{sortedUsers.length}</span> users
         </div>
         
         <div className="flex items-center gap-4">
             <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>Rows:</span>
                <select 
                    value={itemsPerPage} 
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="bg-[#1A1D26] border border-[#2A2F3A] rounded-lg px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-500 transition-colors text-white"
                >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
             </div>

             <div className="flex items-center gap-2">
                 <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-[#1A1D26] border border-[#2A2F3A] hover:bg-[#2A2F3A] hover:text-white disabled:opacity-30 disabled:hover:bg-[#1A1D26] text-slate-400 transition-all shadow-sm"
                    aria-label="Previous Page"
                 >
                     <ChevronLeft size={14} />
                 </button>
                 <span className="text-xs text-slate-400 px-2 min-w-[80px] text-center font-medium">
                    Page <span className="text-white">{currentPage}</span> / {Math.max(1, totalPages)}
                 </span>
                 <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-2 rounded-lg bg-[#1A1D26] border border-[#2A2F3A] hover:bg-[#2A2F3A] hover:text-white disabled:opacity-30 disabled:hover:bg-[#1A1D26] text-slate-400 transition-all shadow-sm"
                    aria-label="Next Page"
                 >
                     <ChevronRight size={14} />
                 </button>
             </div>
         </div>
      </div>
    </div>
  );
};