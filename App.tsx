import React, { useState, useEffect } from 'react';
import { Upload, Shield, Users, Lock, AlertOctagon, FileText, Download, Activity, RefreshCw, ChevronRight, BarChart3, LayoutDashboard, X, User, BookOpen, Linkedin, Github, Radar, Search, Bell } from 'lucide-react';
import { parseCSV, processUserData, generateSampleCSV, exportToCSV, downloadCSVTemplate } from './utils';
import { ADUserProcessed } from './types';
import { Card, StatCard } from './components/ui/Card';
import { RiskDistributionChart, IssuesBarChart, RiskMatrix } from './components/Charts';
import { UserTable } from './components/UserTable';

type Tab = 'dashboard' | 'users' | 'reports' | 'documentation';

const Footer = () => (
  <footer className="mt-12 py-6 text-center text-slate-600 text-xs border-t border-[#1F2937]">
    <div className="flex flex-col md:flex-row items-center justify-center gap-6">
      <p>&copy; {new Date().getFullYear()} ADhuntX. MIT License.</p>
      <div className="flex items-center gap-4">
        <a href="https://www.linkedin.com/in/mag99/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors flex items-center gap-1">
          <Linkedin size={14} /> LinkedIn
        </a>
        <a href="https://github.com/SuperMag99" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors flex items-center gap-1">
          <Github size={14} /> GitHub
        </a>
      </div>
    </div>
  </footer>
);

const App: React.FC = () => {
  const [data, setData] = useState<ADUserProcessed[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Navigation State
  const [currentTab, setCurrentTab] = useState<Tab>('dashboard');
  
  // Drill-down filter state
  const [userTableFilters, setUserTableFilters] = useState({ riskLevel: 'All', search: '' });

  // Modal State
  const [selectedUser, setSelectedUser] = useState<ADUserProcessed | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rawUsers = parseCSV(text);
        if (rawUsers.length === 0) throw new Error("No valid users found in CSV.");
        const processed = processUserData(rawUsers);
        setData(processed);
        localStorage.setItem('adSentinelLastImport', JSON.stringify(processed.slice(0, 100))); // Persist sample
      } catch (err) {
        setError("Failed to parse CSV. Ensure format is correct.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const loadSample = () => {
      const text = generateSampleCSV();
      const raw = parseCSV(text);
      setData(processUserData(raw));
  };

  const handleExport = () => {
      if (data) {
          exportToCSV(data);
      }
  };

  const navigateToUsers = (filters: { riskLevel?: string, search?: string }) => {
      setUserTableFilters({
          riskLevel: filters.riskLevel || 'All',
          search: filters.search || ''
      });
      setCurrentTab('users');
  };

  // KPI Calculations
  const metrics = data ? {
      total: data.length,
      critical: data.filter(u => u.risk.riskLevel === 'Critical').length,
      high: data.filter(u => u.risk.riskLevel === 'High').length,
      avgScore: Math.round(data.reduce((acc, curr) => acc + curr.risk.totalRiskScore, 0) / data.length),
      mfaRate: Math.round((data.filter(u => u.hasMFA).length / data.length) * 100)
  } : null;

  // --- Modal Component (Inline) ---
  const UserDetailModal = () => {
    if (!selectedUser) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-[#0B0E11] border border-[#2A2F3A] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar relative overflow-hidden">
          {/* Top Gradient Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>

          <div className="flex justify-between items-center p-6 border-b border-[#1F2937] sticky top-0 bg-[#0B0E11]/95 backdrop-blur z-10">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600/10 rounded-xl border border-blue-600/20 text-blue-500">
                    <User size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">{selectedUser.UserName}</h2>
                    <p className="text-slate-400 text-sm font-medium">{selectedUser.SamAccountName} • <span className="text-slate-500">{selectedUser.Department || 'No Dept'}</span></p>
                </div>
            </div>
            <button onClick={() => setSelectedUser(null)} className="p-2 rounded-lg hover:bg-[#1F2937] text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-8 space-y-8">
            {/* Risk Score Summary */}
            <div className="grid grid-cols-2 gap-6">
                <div className={`p-6 rounded-2xl border ${selectedUser.risk.totalRiskScore > 70 ? 'bg-red-500/5 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'bg-[#15171E] border-[#2A2F3A]'}`}>
                    <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-2">Total Risk Score</p>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-bold ${selectedUser.risk.totalRiskScore > 70 ? 'text-red-500' : 'text-white'}`}>{selectedUser.risk.totalRiskScore}</span>
                        <span className="text-sm text-slate-600 font-medium">/ 100</span>
                    </div>
                </div>
                <div className="p-6 rounded-2xl bg-[#15171E] border border-[#2A2F3A]">
                    <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-4">Account Status</p>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm items-center">
                            <span className="text-slate-400">Enabled</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${selectedUser.isEnabled ? "bg-green-500/10 text-green-400 border border-green-500/10" : "bg-slate-700 text-slate-300"}`}>{selectedUser.isEnabled ? 'ACTIVE' : 'DISABLED'}</span>
                        </div>
                         <div className="flex justify-between text-sm items-center">
                            <span className="text-slate-400">MFA Active</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${selectedUser.hasMFA ? "bg-green-500/10 text-green-400 border border-green-500/10" : "bg-red-500/10 text-red-400 border border-red-500/10"}`}>{selectedUser.hasMFA ? 'ENABLED' : 'MISSING'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Group Memberships */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Users size={14} className="text-blue-500"/> Group Memberships
                </h3>
                <div className="bg-[#050505] rounded-xl border border-[#1F2937] p-4 max-h-48 overflow-y-auto custom-scrollbar shadow-inner">
                    {selectedUser.groups.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {selectedUser.groups.map((group, idx) => {
                                // Highlight sensitive groups
                                const isHighPriv = ['admin', 'operator', 'backup'].some(k => group.toLowerCase().includes(k));
                                return (
                                    <span 
                                        key={idx} 
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all hover:scale-105 cursor-default ${isHighPriv ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]' : 'bg-[#1A1D26] text-slate-300 border-[#2A2F3A] hover:bg-[#252936]'}`}
                                    >
                                        {group}
                                    </span>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-slate-600 text-sm italic">No group memberships found.</p>
                    )}
                </div>
            </div>

            {/* Specific Issues */}
            <div>
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <AlertOctagon size={14} className="text-red-500"/> Identified Risks
                </h3>
                <ul className="space-y-3">
                    {selectedUser.risk.issues.length > 0 ? selectedUser.risk.issues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-xl text-red-300 text-sm font-medium">
                            <AlertOctagon size={16} className="mt-0.5 shrink-0 text-red-500" />
                            {issue}
                        </li>
                    )) : (
                        <li className="p-4 bg-green-500/5 border border-green-500/10 rounded-xl text-green-400 text-sm flex items-center gap-2 font-medium">
                            <Shield size={16}/> No critical risks identified.
                        </li>
                    )}
                </ul>
            </div>

             {/* Remediation */}
             <div>
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Shield size={14} className="text-purple-500"/> Remediation Plan
                </h3>
                <div className="bg-blue-600/5 border border-blue-600/10 rounded-xl p-6">
                     <ul className="list-disc pl-5 space-y-2 text-blue-200 text-sm">
                        {selectedUser.risk.recommendations.length > 0 ? selectedUser.risk.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                        )) : <li>No actions required.</li>}
                     </ul>
                </div>
            </div>

          </div>
        </div>
      </div>
    );
  };


  if (!data) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-4xl w-full animate-in fade-in duration-700 flex-1 flex flex-col justify-center items-center z-10">
<<<<<<< HEAD
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center p-5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl mb-6 shadow-blue-500/30">
                    <Radar size={56} className="text-white" />
                </div>
                <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">ADhuntX <span className="text-blue-500">Pro</span></h1>
                <p className="text-lg text-slate-400 font-light max-w-lg mx-auto">The offline-first Active Directory security analytics platform.</p>
            </div>

=======
            {/* Announcement Banner */}
            <div className="mb-8 w-full max-w-2xl bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 text-center backdrop-blur-sm shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                <div className="flex items-center justify-center gap-2 mb-3">
                     <Shield size={18} className="text-blue-400" />
                     <h3 className="font-bold text-blue-400 tracking-wider uppercase text-sm">Initial Release Guarantee</h3>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Welcome to the initial version of ADhuntX. <strong className="text-white">No data is ever saved, stored, or transmitted.</strong> All analysis is fully loaded into your browser's RAM, and all data is permanently destroyed immediately after closing the session.
                </p>
            </div>

            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center p-5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl mb-6 shadow-blue-500/30">
                    <Radar size={56} className="text-white" />
                </div>
                <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">ADhuntX <span className="text-blue-500">Pro</span></h1>
                <p className="text-lg text-slate-400 font-light max-w-lg mx-auto">The offline-first Active Directory security analytics platform.</p>
            </div>

>>>>>>> e09ee21 (Home Page Update)
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                {/* Upload Card */}
                <div className="bg-[#15171E] rounded-3xl p-1 border border-[#2A2F3A] shadow-2xl">
                    <div className="bg-[#15171E] rounded-[22px] border border-[#1F2937] p-8 h-full flex flex-col items-center justify-center text-center hover:border-blue-500/30 transition-colors group">
                        <div className="w-16 h-16 bg-[#1A1D26] rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-[#2A2F3A]">
                            <Upload className="h-8 w-8 text-blue-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Initialize Dashboard</h2>
                        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                            Upload your AD export CSV to begin local analysis.
                        </p>
                        
                        <label className="w-full cursor-pointer bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-4 px-6 rounded-xl shadow-lg shadow-blue-900/20 transition-all transform hover:-translate-y-1 active:translate-y-0 text-center flex items-center justify-center gap-2">
                            <span>Select Data File</span>
                            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                        </label>
                        {error && <p className="mt-4 text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/10 py-2 px-4 rounded-lg">{error}</p>}
                    </div>
                </div>

                {/* Sample Data Card */}
                <div className="bg-[#15171E] rounded-3xl p-1 border border-[#2A2F3A] shadow-2xl">
                    <div className="bg-[#15171E] rounded-[22px] border border-[#1F2937] p-8 h-full flex flex-col items-center justify-center text-center hover:border-purple-500/30 transition-colors group">
                         <div className="w-16 h-16 bg-[#1A1D26] rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-[#2A2F3A]">
                            <Activity className="h-8 w-8 text-purple-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Try Demo Mode</h2>
                        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                            Explore features with generated sample data.
                        </p>
                        <button onClick={loadSample} className="w-full bg-[#1A1D26] hover:bg-[#252936] text-white font-semibold py-4 px-6 rounded-xl border border-[#2A2F3A] transition-all hover:border-purple-500/30">
                            Load Demo Data
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                    <Shield size={16} className="text-green-500"/> 100% Offline
                </div>
                 <div className="flex items-center gap-2">
                    <Lock size={16} className="text-blue-500"/> Zero-Trust Ready
                </div>
            </div>
        </div>
        <Footer />
      </div>
    );
  }

  const NavButton = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
    <button 
        onClick={() => setCurrentTab(id)}
        className={`group flex items-center gap-3 w-full px-4 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden ${currentTab === id ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-[#1A1D26]'}`}
    >
        {currentTab === id && (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent border-l-4 border-blue-500 opacity-100"></div>
        )}
        <Icon size={20} className={`relative z-10 transition-colors ${currentTab === id ? 'text-blue-400' : 'group-hover:text-slate-200'}`} />
        <span className="relative z-10 font-medium tracking-wide text-sm">{label}</span>
        {currentTab === id && <ChevronRight size={14} className="ml-auto opacity-100 text-blue-500 relative z-10"/>}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0B0E11] flex font-sans text-slate-200 overflow-hidden">
        <UserDetailModal />
        
        {/* Sidebar */}
        <aside className="hidden lg:flex w-72 bg-[#0B0E11] border-r border-[#1F2937] flex-col fixed h-full z-20 shadow-2xl">
            <div className="p-8 pb-4">
                <div className="flex items-center gap-3 font-bold text-white text-2xl tracking-tight mb-8">
                    <div className="p-2.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg shadow-blue-900/20">
                         <Radar className="text-white" size={24} />
                    </div>
                    <span>ADhuntX</span>
                </div>

                <div className="bg-[#15171E] rounded-xl p-4 border border-[#1F2937] mb-6 flex items-center gap-3 shadow-lg">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-slate-600 text-xs font-bold text-white">
                        AD
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">Domain Admin</p>
                        <p className="text-xs text-slate-500 truncate">Security Analyst</p>
                    </div>
                </div>
            </div>
            
            <nav className="flex-1 px-4 space-y-1">
                <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 mt-2">Menu</p>
                <NavButton id="dashboard" label="Dashboard" icon={LayoutDashboard} />
                <NavButton id="users" label="User Analysis" icon={Users} />
                <NavButton id="reports" label="Reports" icon={FileText} />
                <NavButton id="documentation" label="Documentation" icon={BookOpen} />
            </nav>

            <div className="p-6">
                <button onClick={() => setData(null)} className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#1A1D26] hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all border border-[#2A2F3A] text-slate-400 text-sm font-medium group">
                    <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500"/>
                    <span>Reset Data</span>
                </button>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-72 p-6 lg:p-10 h-screen overflow-y-auto relative custom-scrollbar">
            {/* Top Bar */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
                        {currentTab === 'dashboard' && 'Security Overview'}
                        {currentTab === 'users' && 'User Risk Analysis'}
                        {currentTab === 'reports' && 'Export Reports'}
                        {currentTab === 'documentation' && 'Documentation'}
                    </h1>
                    <p className="text-slate-400 text-sm font-medium">
                        Last scan updated: <span className="text-blue-400">{new Date().toLocaleDateString()}</span>
                    </p>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* Search Bar - Visual Only */}
                    <div className="hidden md:flex relative group">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                        <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2.5 bg-[#15171E] border border-[#2A2F3A] rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-64 transition-all" />
                    </div>

                    <div className="h-10 w-10 rounded-xl bg-[#15171E] border border-[#2A2F3A] flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors cursor-pointer relative">
                        <Bell size={18} />
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full"></span>
                    </div>

                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all transform active:scale-95 text-sm ml-auto md:ml-0"
                    >
                        <Download size={16} /> 
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <div className="space-y-8 pb-10">

                {/* DASHBOARD VIEW */}
                {currentTab === 'dashboard' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* KPI Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard 
                                label="Total Users" 
                                value={metrics?.total || 0} 
                                icon={<Users size={20}/>} 
                                onClick={() => navigateToUsers({})}
                            />
                            <StatCard 
                                label="Critical Risk" 
                                value={metrics?.critical || 0} 
                                color="text-red-500"
                                trend="Elevated Risk Detected"
                                icon={<AlertOctagon size={20}/>} 
                                onClick={() => navigateToUsers({ riskLevel: 'Critical' })}
                                tooltipText="Users with a Risk Score > 70"
                            />
                            <StatCard 
                                label="Avg Risk Score" 
                                value={metrics?.avgScore || 0} 
                                trend={metrics?.avgScore && metrics.avgScore > 50 ? "Above Threshold" : "Stable"}
                                color={metrics?.avgScore && metrics.avgScore > 50 ? "text-orange-500" : "text-green-500"}
                                icon={<Activity size={20}/>} 
                                tooltipText="Average combined risk score"
                            />
                            <StatCard 
                                label="MFA Adoption" 
                                value={`${metrics?.mfaRate}%`} 
                                color={metrics?.mfaRate && metrics.mfaRate < 80 ? "text-orange-500" : "text-green-500"}
                                trend="Target: 100%"
                                icon={<Lock size={20}/>} 
                                tooltipText="% of users with MFA enabled"
                            />
                        </div>

                        {/* Charts Row 1 */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card title="Risk Distribution" className="lg:col-span-1 h-full min-h-[350px]">
                                <RiskDistributionChart users={data} />
                            </Card>
                            <Card title="Risk Matrix Correlation" className="lg:col-span-2 h-full min-h-[350px]">
                                <RiskMatrix users={data} />
                            </Card>
                        </div>

                        {/* Charts Row 2 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card title="Top Security Issues">
                                <IssuesBarChart users={data} />
                            </Card>
                            <Card title="Priority Actions">
                                <div className="space-y-4">
                                    {[
                                        { title: "Dormant Privileged Accounts", count: data.filter(u=>u.isDormant && u.risk.privilegeScore > 0).length, icon: AlertOctagon, color: "red", filter: "dormant" },
                                        { title: "Missing MFA", count: data.filter(u=>!u.hasMFA).length, icon: Lock, color: "orange", filter: "MFA" },
                                        { title: "Password Never Expires", count: data.filter(u=>u.passwordNeverExpires).length, icon: Shield, color: "blue", filter: "never expire" }
                                    ].map((item, idx) => (
                                        <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                            item.color === 'red' ? 'bg-red-500/5 border-red-500/10 hover:border-red-500/30' :
                                            item.color === 'orange' ? 'bg-orange-500/5 border-orange-500/10 hover:border-orange-500/30' :
                                            'bg-blue-500/5 border-blue-500/10 hover:border-blue-500/30'
                                        }`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2.5 rounded-lg border ${
                                                    item.color === 'red' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                    item.color === 'orange' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                                    'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                }`}>
                                                    <item.icon size={20} />
                                                </div>
                                                <div>
                                                    <p className={`font-bold text-sm ${
                                                        item.color === 'red' ? 'text-red-400' :
                                                        item.color === 'orange' ? 'text-orange-400' :
                                                        'text-blue-400'
                                                    }`}>{item.title}</p>
                                                    <p className="text-slate-500 text-xs font-medium">Affects {item.count} users</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => navigateToUsers({ search: item.filter })} 
                                                className="px-4 py-2 bg-[#1A1D26] hover:bg-[#252936] text-white text-xs font-semibold rounded-lg border border-[#2A2F3A] transition-colors shadow-sm"
                                            >
                                                Review
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* USERS VIEW */}
                {currentTab === 'users' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card title="User Risk Analysis" className="min-h-[600px] border-[#2A2F3A]">
                            <UserTable 
                                users={data} 
                                initialRiskFilter={userTableFilters.riskLevel}
                                initialSearch={userTableFilters.search}
                                onUserClick={setSelectedUser}
                            />
                        </Card>
                    </div>
                )}

                {/* REPORTS VIEW */}
                {currentTab === 'reports' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="min-h-[400px] flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/10 to-transparent pointer-events-none"></div>
                            <div className="text-center py-16 relative z-10">
                                <div className="mx-auto w-20 h-20 bg-[#1A1D26] rounded-3xl flex items-center justify-center mb-6 border border-[#2A2F3A] shadow-2xl">
                                    <FileText size={40} className="text-blue-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Export Security Findings</h3>
                                <p className="text-slate-400 max-w-md mx-auto mb-10 text-sm leading-relaxed">
                                    Generate a comprehensive CSV report containing user risk scores, detected vulnerabilities, and recommended remediation steps.
                                </p>
                                <button 
                                    onClick={handleExport}
                                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-1 active:translate-y-0"
                                >
                                    <Download size={20} />
                                    Download Full Report
                                </button>
                            </div>
                        </Card>
                    </div>
                )}
                
                {/* DOCUMENTATION VIEW */}
                {currentTab === 'documentation' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <Card title="System Overview" className="border-l-4 border-l-blue-500">
                            <div className="prose prose-invert max-w-none text-slate-300">
                                <p className="text-lg font-light leading-relaxed">
                                    <strong className="text-white">ADhuntX</strong> is an advanced, offline-first security analytics platform designed to audit Active Directory environments. It correlates privilege data with password hygiene metrics to produce a unified risk score.
                                </p>
                            </div>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card title="Risk Methodology">
                                <div className="space-y-6">
                                    {[
                                        { title: "Privilege Risk (60%)", formula: "Group Weight + Escalation Paths", color: "orange" },
                                        { title: "Hygiene Risk (40%)", formula: "Password Age + MFA Status", color: "red" },
                                        { title: "Total Score", formula: "Weighted Average (0-100)", color: "blue" }
                                    ].map((metric, i) => (
                                        <div key={i} className="bg-[#1A1D26] p-4 rounded-xl border border-[#2A2F3A]">
                                            <h4 className={`text-sm font-bold uppercase tracking-wider mb-2 ${
                                                metric.color === 'orange' ? 'text-orange-400' :
                                                metric.color === 'red' ? 'text-red-400' : 'text-blue-400'
                                            }`}>{metric.title}</h4>
                                            <p className="text-xs font-mono text-slate-400 bg-[#0B0E11] p-3 rounded-lg border border-[#2A2F3A]">
                                                {metric.formula}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <Card title="Data Acquisition">
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded">RECOMMENDED</span>
                                            <h4 className="text-white font-semibold text-sm">PowerShell Export</h4>
                                        </div>
                                        <div className="bg-[#0B0E11] p-4 rounded-xl border border-[#2A2F3A] overflow-x-auto custom-scrollbar group relative">
                                            <pre className="text-[10px] font-mono text-green-400 leading-relaxed">
{`Get-ADUser -Filter * -Properties ... | Export-Csv "ADUsers.csv"`}
                                            </pre>
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <span className="text-[10px] text-slate-500">Copy script from README</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-4 border-t border-[#2A2F3A]">
                                        <h4 className="text-white font-semibold text-sm mb-2">CSV Template</h4>
                                        <p className="text-slate-400 text-xs mb-4">
                                            If you cannot run PowerShell, download our template and fill it manually.
                                        </p>
                                        <button 
                                            onClick={downloadCSVTemplate}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1A1D26] hover:bg-[#252936] text-white font-semibold rounded-lg border border-[#2A2F3A] transition-colors text-sm"
                                        >
                                            <FileText size={16} />
                                            Download Template
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </main>
    </div>
  );
};

export default App;
