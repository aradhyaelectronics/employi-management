
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

  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
        <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter mb-10 flex items-center">
          <span className="w-8 h-1 bg-orange-500 mr-3"></span> Operations Reporting Hub
        </h3>

        <div className="flex flex-wrap gap-4 mb-10">
          <button onClick={() => setReportType('DAILY')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportType === 'DAILY' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}>Daily</button>
          <button onClick={() => setReportType('MONTHLY')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportType === 'MONTHLY' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}>Monthly</button>
          <button onClick={() => setReportType('EMPLOYEE')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportType === 'EMPLOYEE' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}>Personnel-Wise</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {reportType === 'DAILY' && (
             <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Report Target Date</label>
                <input type="date" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-black text-xs uppercase" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
             </div>
          )}
          {reportType === 'MONTHLY' && (
             <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Month</label>
                <input type="month" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-black text-xs uppercase" value={targetMonth} onChange={e => setTargetMonth(e.target.value)} />
             </div>
          )}
          {reportType === 'EMPLOYEE' && (
             <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Field Personnel</label>
                <select className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-black text-xs uppercase" value={targetEmployee} onChange={e => setTargetEmployee(e.target.value)}>
                   <option value="">All Employees</option>
                   {companyPersonnel.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
             </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-8 mb-12">
           <div className="bg-blue-50 p-8 rounded-3xl text-center">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Quantity Logged</p>
              <p className="text-3xl font-black text-blue-900">{stats.total}m</p>
           </div>
           <div className="bg-orange-50 p-8 rounded-3xl text-center">
              <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-2">Registry Logs</p>
              <p className="text-3xl font-black text-orange-900">{stats.count}</p>
           </div>
           <div className="bg-green-50 p-8 rounded-3xl text-center">
              <p className="text-[9px] font-black text-green-400 uppercase tracking-widest mb-2">Sites Covered</p>
              <p className="text-3xl font-black text-green-900">{stats.uniqSites}</p>
           </div>
        </div>

        <div className="overflow-x-auto rounded-[2rem] border border-gray-50">
           <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                 <tr>
                    <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Personnel</th>
                    <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                    <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Quantity</th>
                    <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Date</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {filteredLogs.map(log => {
                    const emp = state.users.find(u => u.id === log.userId);
                    return (
                       <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="px-8 py-6 text-xs font-black text-slate-800 uppercase">{emp?.name}</td>
                          <td className="px-8 py-6 text-[10px] font-bold text-blue-600 uppercase">{log.workType}</td>
                          <td className="px-8 py-6 text-center text-sm font-black text-green-600">{log.meters}m</td>
                          <td className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase">{log.installationDate}</td>
                       </tr>
                    )
                 })}
                 {filteredLogs.length === 0 && (
                    <tr>
                       <td colSpan={4} className="py-20 text-center font-black text-[10px] text-gray-300 uppercase tracking-[0.4em]">No Records Found for Selected Context</td>
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
