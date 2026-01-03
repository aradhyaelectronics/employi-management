
import React, { useState, useMemo } from 'react';
import { User, AppState, UserRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { ICONS } from '../constants';

interface Props {
  user: User;
  state: AppState;
  updatePassword?: (id: string, password: string) => Promise<void>;
}

const Dashboard: React.FC<Props> = ({ user, state, updatePassword }) => {
  const isSuper = user.role === UserRole.SUPER_ADMIN;
  const isAdmin = user.role === UserRole.ADMIN || isSuper;
  const company = state.companies.find(c => c.id === user.companyId);
  
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showApkWarning, setShowApkWarning] = useState(false);

  // Filters for Work Activity Feed
  const [workSearch, setWorkSearch] = useState('');
  const [workSiteFilter, setWorkSiteFilter] = useState('');
  const [workStartDate, setWorkStartDate] = useState('');
  const [workEndDate, setWorkEndDate] = useState('');

  const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });
  const [passChangeError, setPassChangeError] = useState('');
  
  // Base logs for the current company/user
  const baseWorkLogs = useMemo(() => {
    const logs = isSuper ? state.workLogs : state.workLogs.filter(l => l.companyId === user.companyId);
    return logs.sort((a, b) => new Date(b.installationDate || b.date).getTime() - new Date(a.installationDate || a.date).getTime());
  }, [state.workLogs, user.companyId, isSuper]);

  // Filtered logs for the UI and Export
  const filteredWorkLogs = useMemo(() => {
    return baseWorkLogs.filter(log => {
      const emp = state.users.find(u => u.id === log.userId);
      const site = state.sites.find(s => s.id === log.siteId);
      
      const matchesSearch = workSearch === '' || 
        emp?.name.toLowerCase().includes(workSearch.toLowerCase()) ||
        log.workType.toLowerCase().includes(workSearch.toLowerCase());
      
      const matchesSite = workSiteFilter === '' || log.siteId === workSiteFilter;
      
      const logDate = log.installationDate || log.date;
      const matchesStart = workStartDate === '' || logDate >= workStartDate;
      const matchesEnd = workEndDate === '' || logDate <= workEndDate;

      return matchesSearch && matchesSite && matchesStart && matchesEnd;
    });
  }, [baseWorkLogs, workSearch, workSiteFilter, workStartDate, workEndDate, state.users, state.sites]);

  const relevantUsers = useMemo(() => isSuper ? state.users : state.users.filter(u => u.companyId === user.companyId), [state.users, user.companyId, isSuper]);
  const relevantRequests = useMemo(() => isSuper ? state.requests : state.requests.filter(r => r.companyId === user.companyId), [state.requests, user.companyId, isSuper]);
  
  const supervisors = useMemo(() => relevantUsers.filter(u => u.role === UserRole.SUPERVISOR), [relevantUsers]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passData.current !== user.password) return setPassChangeError('Current password incorrect.');
    if (passData.new.length < 6) return setPassChangeError('New password too short.');
    if (passData.new !== passData.confirm) return setPassChangeError('Passwords do not match.');
    if (updatePassword) {
      await updatePassword(user.id, passData.new);
      setPassData({ current: '', new: '', confirm: '' });
      alert("Security credentials updated successfully.");
    }
  };

  const exportWorkToCSV = () => {
    if (filteredWorkLogs.length === 0) return alert("No work logs available for the current filter criteria.");
    
    const headers = ["Date", "Personnel", "Site", "Work Type", "Sub Category", "Quantity (Meters)", "Description"];
    const rows = filteredWorkLogs.map(log => {
      const emp = state.users.find(u => u.id === log.userId);
      const site = state.sites.find(s => s.id === log.siteId);
      return [
        log.installationDate || log.date,
        emp?.name || "Unknown",
        site?.name || "General",
        log.workType,
        log.subCategory,
        log.meters,
        `"${(log.description || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Work_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const executeApkDownload = () => {
    setIsDownloading(true);
    setShowApkWarning(false);
    setTimeout(() => {
      try {
        const dummyData = new Uint8Array(1024 * 100); 
        for(let i=0; i<dummyData.length; i++) dummyData[i] = Math.floor(Math.random() * 256);
        const blob = new Blob([dummyData], { type: 'application/vnd.android.package-archive' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'EmployeeManagement_v3.4_Prototype.apk');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        setIsDownloading(false);
      } catch (err) {
        alert("Download blocked. Please check browser permissions.");
        setIsDownloading(false);
      }
    }, 2000);
  };

  const workSummary = useMemo(() => {
    return filteredWorkLogs.reduce((acc: any, log) => {
      const existing = acc.find((a: any) => a.name === log.workType);
      if (existing) existing.value += log.meters;
      else acc.push({ name: log.workType, value: log.meters });
      return acc;
    }, []);
  }, [filteredWorkLogs]);

  const stats = [
    { label: isSuper ? 'Enterprises' : 'Workforce', value: isSuper ? state.companies.length : relevantUsers.length, color: 'text-blue-600' },
    { label: 'Work Volume', value: filteredWorkLogs.reduce((sum, l) => sum + l.meters, 0), color: 'text-green-600' },
    { label: 'Pending Auth', value: relevantRequests.filter(r => r.status === 'PENDING').length, color: 'text-orange-600' },
    { label: 'Supervisors', value: supervisors.length, color: 'text-purple-600' },
  ];

  const runAiAudit = async () => {
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Audit site productivity: ${company?.name}. Total workforce: ${relevantUsers.length}. Work logged: ${JSON.stringify(workSummary)}. Suggest 3 efficiency improvements.`
      });
      setAiReport(response.text || "Audit report could not be generated.");
    } catch (e) {
      setAiReport("Audit currently unavailable.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white px-8 py-5 rounded-3xl shadow-sm border border-gray-100 min-w-[180px]">
            <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-2xl font-black tracking-tighter ${stat.color}`}>{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Profile */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
           <h3 className="text-lg font-black text-blue-900 uppercase tracking-tighter mb-8">Security Configuration</h3>
           <form onSubmit={handlePasswordChange} className="space-y-4">
              <input type="password" placeholder="Current Password" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={passData.current} onChange={e => setPassData({...passData, current: e.target.value})} required />
              <div className="grid grid-cols-2 gap-4">
                 <input type="password" placeholder="New" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={passData.new} onChange={e => setPassData({...passData, new: e.target.value})} required />
                 <input type="password" placeholder="Confirm" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={passData.confirm} onChange={e => setPassData({...passData, confirm: e.target.value})} required />
              </div>
              {passChangeError && <p className="text-red-500 text-[10px] font-bold uppercase ml-1">{passChangeError}</p>}
              <button type="submit" className="w-full bg-blue-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-[0.98] transition-all">Update Credentials</button>
           </form>
        </div>

        {/* Android Deployment Card */}
        <div className="bg-gradient-to-br from-[#0D47A1] to-[#0a3a82] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[320px]">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[50px] rounded-full -mr-16 -mt-16"></div>
           <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                 <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                    <ICONS.Android className="w-8 h-8 text-white" />
                 </div>
                 <div className="text-right">
                    <p className="text-blue-200 text-[8px] font-black uppercase tracking-widest">Build Status</p>
                    <p className="text-green-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-end">
                       <span className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></span>
                       Cloud Ready
                    </p>
                 </div>
              </div>
              
              <div className="mb-6">
                 <h3 className="text-xl font-black text-white uppercase tracking-tight">Android Distribution</h3>
                 <p className="text-blue-100/60 text-[10px] font-bold uppercase tracking-widest mt-1">Version 3.4.0 • Build ID: EM-{Date.now().toString().slice(-6)}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                 <div className="space-y-3">
                    <button 
                       onClick={() => setShowApkWarning(true)}
                       disabled={isDownloading}
                       className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2"
                    >
                       {isDownloading ? (
                         <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                       ) : (
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                       )}
                       <span>{isDownloading ? 'Building...' : 'Download APK'}</span>
                    </button>
                    
                    <button 
                       onClick={() => alert("Open browser menu and select 'Add to Home Screen'")}
                       className="w-full bg-white text-blue-900 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2"
                    >
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                       <span>Direct Home App</span>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Intelligence Audit Card */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-8 text-white">
               <h3 className="text-xl font-black uppercase tracking-tight">Intelligence Audit</h3>
               <button onClick={runAiAudit} disabled={isAiLoading} className="bg-purple-600 px-6 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:bg-purple-700 transition-all active:scale-95">{isAiLoading ? 'Analysing...' : 'Execute Audit'}</button>
            </div>
            {aiReport ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 animate-in fade-in duration-500"><p className="text-slate-300 text-xs font-medium leading-relaxed whitespace-pre-wrap">{aiReport}</p></div>
            ) : (
              <div className="border-2 border-dashed border-slate-700 rounded-2xl py-12 text-center text-slate-500 font-black text-[10px] uppercase tracking-widest">Awaiting Command...</div>
            )}
          </div>
      </div>

      {/* Analytics Chart */}
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 min-w-0">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-6 text-blue-900">Workforce Output Analysis</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workSummary}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} font-weight="bold" stroke="#94a3b8" />
                <YAxis fontSize={10} font-weight="bold" stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                   {workSummary.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
      </div>

      {/* ADMIN WORK ACTIVITY FEED & EXPORT */}
      {isAdmin && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b bg-gray-50/50">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div>
                   <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter">Enterprise Activity Ledger</h3>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Telemetry data across all sites</p>
                </div>
                <button 
                 onClick={exportWorkToCSV}
                 className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center space-x-2 transition-all active:scale-95"
                >
                   <ICONS.Document className="w-4 h-4" />
                   <span>Export Result (CSV)</span>
                </button>
             </div>

             {/* Dynamic Filter Console */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                   <input 
                    type="text" 
                    placeholder="Search Personnel / Type" 
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                    value={workSearch}
                    onChange={e => setWorkSearch(e.target.value)}
                   />
                   <svg className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <select 
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                  value={workSiteFilter}
                  onChange={e => setWorkSiteFilter(e.target.value)}
                >
                   <option value="">All Project Sites</option>
                   {state.sites.filter(s => isSuper || s.companyId === user.companyId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="flex items-center space-x-2">
                   <input type="date" className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-bold outline-none" value={workStartDate} onChange={e => setWorkStartDate(e.target.value)} />
                   <span className="text-gray-400 font-black text-[8px] uppercase">To</span>
                   <input type="date" className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-bold outline-none" value={workEndDate} onChange={e => setWorkEndDate(e.target.value)} />
                </div>
                <button onClick={() => { setWorkSearch(''); setWorkSiteFilter(''); setWorkStartDate(''); setWorkEndDate(''); }} className="text-blue-600 font-black text-[9px] uppercase tracking-widest hover:underline">Clear Filters</button>
             </div>
          </div>

          <div className="overflow-x-auto">
             <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/80 sticky top-0 z-20 backdrop-blur-sm">
                     <tr>
                        <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b">Date</th>
                        <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b">Personnel</th>
                        <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b">Site / Project</th>
                        <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b">Activity</th>
                        <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right border-b">Volume (Mtr)</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {filteredWorkLogs.map((log, i) => {
                        const emp = state.users.find(u => u.id === log.userId);
                        const site = state.sites.find(s => s.id === log.siteId);
                        return (
                          <tr key={i} className="hover:bg-blue-50/20 transition-all">
                             <td className="px-8 py-5 text-[11px] font-bold text-gray-500 whitespace-nowrap">{log.installationDate || log.date}</td>
                             <td className="px-8 py-5">
                                <p className="text-xs font-black text-gray-800 uppercase leading-none">{emp?.name || 'Unknown'}</p>
                                <p className="text-[8px] font-bold text-gray-400 uppercase mt-1 tracking-tighter">{emp?.role}</p>
                             </td>
                             <td className="px-8 py-5">
                                <p className="text-xs font-black text-blue-900 uppercase leading-none">{site?.name || 'General'}</p>
                                <p className="text-[8px] font-bold text-blue-300 uppercase mt-1">Operational Node</p>
                             </td>
                             <td className="px-8 py-5">
                                <p className="text-xs font-black text-orange-600 uppercase leading-none">{log.workType}</p>
                                <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">{log.subCategory}</p>
                             </td>
                             <td className="px-8 py-5 text-right font-black text-green-600 text-sm">
                                {log.meters}
                             </td>
                          </tr>
                        )
                     })}
                     {filteredWorkLogs.length === 0 && (
                       <tr>
                          <td colSpan={5} className="px-8 py-20 text-center">
                             <div className="flex flex-col items-center">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                   <ICONS.Work className="w-6 h-6" />
                                </div>
                                <p className="text-gray-300 italic font-black uppercase tracking-widest text-[10px]">No activity telemetry detected matching filters</p>
                             </div>
                          </td>
                       </tr>
                     )}
                  </tbody>
               </table>
             </div>
             <div className="p-4 bg-gray-50/50 border-t flex justify-between items-center px-8">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Displaying {filteredWorkLogs.length} Records</p>
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Aggregated Vol: {filteredWorkLogs.reduce((sum, l) => sum + l.meters, 0)} Meters</p>
             </div>
          </div>
        </div>
      )}

      {showApkWarning && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in zoom-in-95 duration-300">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg p-12 relative">
              <div className="text-center">
                 <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                   <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 </div>
                 <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Android APK Info</h3>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 mb-8">Please Read Carefully</p>
                 <div className="flex flex-col gap-3">
                    <button onClick={executeApkDownload} className="w-full bg-blue-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest">Download Prototype APK</button>
                    <button onClick={() => setShowApkWarning(false)} className="w-full text-gray-400 py-3 font-black uppercase text-[9px]">Cancel</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
