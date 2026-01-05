
import React, { useMemo } from 'react';
import { AppState, User, UserRole } from '../types';
// Import ICONS from constants to fix the missing name error
import { ICONS } from '../constants';

interface Props {
  user: User;
  state: AppState;
}

const NodeTelemetry: React.FC<Props> = ({ user, state }) => {
  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;

  const companyAttendance = useMemo(() => state.attendance.filter(a => a.companyId === user.companyId), [state.attendance, user.companyId]);
  const activeStaff = companyAttendance.filter(a => a.isActive === 1);
  const recentLogs = useMemo(() => state.workLogs.filter(l => l.companyId === user.companyId).slice(-15).reverse(), [state.workLogs, user.companyId]);

  return (
    <div className="space-y-10 animate-in fade-in pb-24">
      {/* Real-time Counter Header */}
      <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-10">
         <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Site Telemetry Node</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1">
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
               Real-time Monitoring Active
            </p>
         </div>
         <div className="flex gap-4">
            <div className="bg-slate-50 px-8 py-4 rounded-3xl border border-slate-100 text-center">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">System Health</p>
               <p className="text-xl font-black text-blue-600 uppercase">99.9% Uptime</p>
            </div>
            <div className="bg-slate-900 px-8 py-4 rounded-3xl text-center shadow-xl">
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Clusters</p>
               <p className="text-xl font-black text-white uppercase">{state.sites.filter(s => s.companyId === user.companyId).length} Units</p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10"></div>
            <h3 className="text-xs font-black uppercase text-green-400 tracking-widest mb-6">Staff Presence Index</h3>
            <p className="text-6xl font-black tracking-tighter mb-2">{activeStaff.length}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personnel on Duty</p>
         </div>

         <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10"></div>
            <h3 className="text-xs font-black uppercase text-blue-400 tracking-widest mb-6">Aggregate Shift Yield</h3>
            <p className="text-6xl font-black tracking-tighter mb-2">
               {state.workLogs.filter(l => l.companyId === user.companyId && l.installationDate === new Date().toISOString().split('T')[0]).reduce((s,l)=>s+l.meters,0)}m
            </p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Cumulative Units</p>
         </div>

         <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10"></div>
            <h3 className="text-xs font-black uppercase text-orange-400 tracking-widest mb-6">Pending Operations</h3>
            <p className="text-6xl font-black tracking-tighter mb-2">{state.requests.filter(r => r.companyId === user.companyId && r.status === 'PENDING').length}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Approvals Required</p>
         </div>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-sm">
         <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
            <div>
               <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Cluster Activity Stream</h3>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Encrypted Telemetry Payload Logs</p>
            </div>
            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full uppercase tracking-widest border border-blue-100">Sync Frequency: 5s</span>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50/50">
                     <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Origin Identity</th>
                     <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Activity Hash</th>
                     <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Yield Payload</th>
                     <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Event Timestamp</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {recentLogs.map(log => {
                    const personnel = state.users.find(u => u.id === log.userId);
                    const site = state.sites.find(s => s.id === log.siteId);
                    return (
                      <tr key={log.id} className="hover:bg-blue-50/20 transition-all group">
                         <td className="px-10 py-6">
                            <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{personnel?.name || 'External Node'}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{site?.name || 'General Node'}</p>
                         </td>
                         <td className="px-10 py-6">
                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg uppercase border border-blue-100">{log.workType}</span>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 max-w-[120px] truncate uppercase">{log.description || 'Verified Telemetry'}</p>
                         </td>
                         <td className="px-10 py-6 text-center">
                            <span className="text-lg font-black text-slate-800">{log.meters}m</span>
                         </td>
                         <td className="px-10 py-6 text-right">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter leading-none">{log.installationDate}</p>
                            <p className="text-[8px] font-black text-slate-300 uppercase mt-1">{new Date(parseInt(log.id.split('-')[1])).toLocaleTimeString()}</p>
                         </td>
                      </tr>
                    )
                  })}
                  {recentLogs.length === 0 && (
                     <tr>
                        <td colSpan={4} className="py-32 text-center">
                           <div className="flex flex-col items-center opacity-20">
                              <ICONS.Rocket className="w-12 h-12 text-slate-400 mb-4" />
                              <p className="font-black text-[10px] text-slate-400 uppercase tracking-[0.5em]">Waiting for Cluster Pulse...</p>
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

export default NodeTelemetry;
