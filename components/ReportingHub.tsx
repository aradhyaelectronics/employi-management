
import React, { useState, useMemo } from 'react';
import { User, AppState, UserRole } from '../types';

interface Props {
  user: User;
  state: AppState;
}

const ReportingHub: React.FC<Props> = ({ user, state }) => {
  const [reportType, setReportType] = useState<'DAILY' | 'MONTHLY' | 'EMPLOYEE'>('DAILY');
  const [targetEmployee, setTargetEmployee] = useState('');
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().split('T')[0].slice(0, 7));
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);

  const companyPersonnel = state.users.filter(u => u.companyId === user.companyId);

  const filteredLogs = useMemo(() => {
    return state.workLogs.filter(log => {
      if (log.companyId !== user.companyId) return false;
      if (reportType === 'DAILY' && log.installationDate !== targetDate) return false;
      if (reportType === 'MONTHLY' && !log.installationDate.startsWith(targetMonth)) return false;
      if (reportType === 'EMPLOYEE' && targetEmployee && log.userId !== targetEmployee) return false;
      return true;
    });
  }, [state.workLogs, user.companyId, reportType, targetDate, targetMonth, targetEmployee]);

  const stats = useMemo(() => {
    const total = filteredLogs.reduce((s, l) => s + l.meters, 0);
    const count = filteredLogs.length;
    const uniqSites = new Set(filteredLogs.map(l => l.siteId)).size;
    return { total, count, uniqSites };
  }, [filteredLogs]);

  const downloadCSV = () => {
    if (filteredLogs.length === 0) return alert("Export Blocked: No telemetry data available for the selected period.");

    const headers = ["Index", "Work Date", "Staff Member", "Site Location", "Task Category", "Production (Meters)", "Staff Feedback"];
    const rows = filteredLogs.map((log, idx) => {
      const emp = state.users.find(u => u.id === log.userId);
      const site = state.sites.find(s => s.id === log.siteId);
      return [
        (idx + 1).toString(),
        log.installationDate,
        emp?.name || "ID: " + log.userId,
        site?.name || "General/External",
        log.workType,
        log.meters.toString(),
        `"${(log.description || "Routine Commit").replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    // Dynamic naming based on target context
    let fileName = `Pragati_Ops_Report_${new Date().getTime()}.csv`;
    if (reportType === 'DAILY') fileName = `WorkReport_Daily_${targetDate}.csv`;
    if (reportType === 'MONTHLY') fileName = `WorkReport_Monthly_${targetMonth}.csv`;
    if (reportType === 'EMPLOYEE') fileName = `WorkReport_Staff_${targetEmployee || 'All'}_${new Date().toISOString().split('T')[0]}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter flex items-center">
              <span className="w-8 h-1 bg-orange-500 mr-3"></span> Field Intelligence Hub
            </h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 italic">Pragati Enterprise Production Reporting</p>
          </div>
          <button 
            onClick={downloadCSV}
            className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95"
          >
            <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Download CSV Workbook
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mb-10 bg-gray-50 p-2 rounded-2xl inline-flex border border-gray-100">
          <button onClick={() => setReportType('DAILY')} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportType === 'DAILY' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-400 hover:text-slate-600'}`}>Daily Summary</button>
          <button onClick={() => setReportType('MONTHLY')} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportType === 'MONTHLY' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-400 hover:text-slate-600'}`}>Monthly View</button>
          <button onClick={() => setReportType('EMPLOYEE')} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportType === 'EMPLOYEE' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-400 hover:text-slate-600'}`}>Personnel Drill-down</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 animate-in zoom-in-95 duration-300">
          {reportType === 'DAILY' && (
             <div className="col-span-3 md:col-span-1 space-y-2">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Select Operations Date</label>
                <input type="date" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-xs uppercase focus:border-blue-500 outline-none transition-all" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
             </div>
          )}
          {reportType === 'MONTHLY' && (
             <div className="col-span-3 md:col-span-1 space-y-2">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Operations Month</label>
                <input type="month" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-xs uppercase focus:border-blue-500 outline-none transition-all" value={targetMonth} onChange={e => setTargetMonth(e.target.value)} />
             </div>
          )}
          {reportType === 'EMPLOYEE' && (
             <div className="col-span-3 md:col-span-1 space-y-2">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Staff Member Filter</label>
                <select className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-xs uppercase focus:border-blue-500 outline-none transition-all" value={targetEmployee} onChange={e => setTargetEmployee(e.target.value)}>
                   <option value="">Full Cluster Staff</option>
                   {companyPersonnel.map(u => <option key={u.id} value={u.id}>{u.name} (ID: {u.id})</option>)}
                </select>
             </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
           <div className="bg-blue-50/50 border border-blue-100 p-8 rounded-3xl text-center">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Total Production</p>
              <p className="text-4xl font-black text-blue-900 tracking-tighter">{stats.total.toLocaleString()}m</p>
           </div>
           <div className="bg-orange-50/50 border border-orange-100 p-8 rounded-3xl text-center">
              <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-2">Telemetry Events</p>
              <p className="text-4xl font-black text-orange-900 tracking-tighter">{stats.count}</p>
           </div>
           <div className="bg-green-50/50 border border-green-100 p-8 rounded-3xl text-center">
              <p className="text-[9px] font-black text-green-400 uppercase tracking-widest mb-2">Unique Site Nodes</p>
              <p className="text-4xl font-black text-green-900 tracking-tighter">{stats.uniqSites}</p>
           </div>
        </div>

        <div className="overflow-x-auto rounded-[2.5rem] border-2 border-slate-50">
           <table className="w-full text-left">
              <thead className="bg-slate-50/80">
                 <tr>
                    <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Personnel</th>
                    <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                    <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Progress</th>
                    <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Commit Date</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {filteredLogs.slice().sort((a,b) => b.installationDate.localeCompare(a.installationDate)).map(log => {
                    const emp = state.users.find(u => u.id === log.userId);
                    return (
                       <tr key={log.id} className="hover:bg-blue-50/20 transition-all group">
                          <td className="px-10 py-6">
                             <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{emp?.name}</p>
                             <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Mobile: {emp?.mobile}</p>
                          </td>
                          <td className="px-10 py-6">
                             <p className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 inline-block px-2 py-0.5 rounded-lg">{log.workType}</p>
                             <p className="text-[9px] text-slate-400 font-medium truncate max-w-[150px] mt-1 italic">"{log.description || 'Verified Commit'}"</p>
                          </td>
                          <td className="px-10 py-6 text-center">
                             <span className="text-sm font-black text-green-600">{log.meters}m</span>
                          </td>
                          <td className="px-10 py-6 text-right">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{log.installationDate}</p>
                          </td>
                       </tr>
                    )
                 })}
                 {filteredLogs.length === 0 && (
                    <tr>
                       <td colSpan={4} className="py-24 text-center">
                          <div className="flex flex-col items-center">
                             <div className="w-16 h-1 bg-slate-100 mb-4 rounded-full"></div>
                             <p className="font-black text-[10px] text-slate-300 uppercase tracking-[0.5em]">No Cluster Records for Current Filter</p>
                          </div>
                       </td>
                    </tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

export default ReportingHub;
