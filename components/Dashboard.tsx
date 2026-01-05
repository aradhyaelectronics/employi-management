
import React, { useMemo } from 'react';
import { User, AppState, UserRole } from '../types';
import { ICONS } from '../constants';
import AiAdvisor from './AiAdvisor';

interface Props {
  user: User;
  state: AppState;
  updateTaskStatus?: (id: string, status: 'TODO' | 'IN_PROGRESS' | 'DONE') => void;
  getAiSystemContext: (companyId?: string) => any;
}

const Dashboard: React.FC<Props> = ({ user, state, getAiSystemContext }) => {
  const isSuper = user.role === UserRole.SUPER_ADMIN;
  const isAdmin = user.role === UserRole.ADMIN;
  const company = state.companies.find(c => c.id === user.companyId);

  const daysRemaining = useMemo(() => {
    if (!company?.subscriptionExpiry) return null;
    const diff = new Date(company.subscriptionExpiry).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [company]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const liveAttendance = state.attendance.filter(a => a.date === today && a.isActive === 1);
    
    if (isSuper) {
      return [
        { label: 'Total Clusters', value: state.companies.length, icon: ICONS.Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Total Personnel', value: state.users.length, icon: ICONS.Users, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Live Present', value: liveAttendance.length, icon: ICONS.Time, color: 'text-orange-600', bg: 'bg-orange-50' },
      ];
    }

    const companyAttendance = liveAttendance.filter(a => a.companyId === user.companyId);
    const myWork = state.workLogs.filter(l => l.companyId === user.companyId);

    return [
      { label: 'Live Staff', value: companyAttendance.length, icon: ICONS.Time, color: 'text-orange-600', bg: 'bg-orange-50' },
      { label: 'Total Units', value: myWork.reduce((s,l)=>s+l.meters,0), icon: ICONS.Document, color: 'text-green-600', bg: 'bg-green-50' },
      { label: 'Active Sites', value: state.sites.filter(s => s.companyId === user.companyId).length, icon: ICONS.Work, color: 'text-blue-600', bg: 'bg-blue-50' },
    ];
  }, [state, user, isSuper]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24">
      {/* Hero / Header Card */}
      <div className="bg-slate-900 p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 blur-[120px] rounded-full"></div>
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-4 mb-4">
             <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em]">Node-01 • Secure</p>
             </div>
             {(isAdmin || isSuper) && daysRemaining !== null && (
                <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${daysRemaining < 7 ? 'bg-red-500 text-white border-red-400 animate-bounce' : 'bg-white/5 text-blue-300 border-white/10'}`}>
                   License Status: {daysRemaining} Days Left
                </div>
             )}
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-tight">
            Pragati Cloud <br /> <span className="text-blue-400">नमस्ते, {user.name.split(' ')[0]}</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-6 max-w-sm leading-relaxed">
            Enterprise Workforce Telemetry & Operational Analytics Terminal.
          </p>
        </div>
      </div>

      {(isAdmin || isSuper) && <AiAdvisor context={getAiSystemContext(isSuper ? undefined : user.companyId)} />}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 transition-all hover:shadow-2xl hover:scale-[1.02]">
            <div className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center mb-8 shadow-inner`}>
              <stat.icon className={`w-7 h-7 ${stat.color}`} />
            </div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1.5">{stat.label}</p>
            <p className={`text-4xl font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-gray-100">
         <div className="flex justify-between items-center mb-10">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.3em]">Operational Pulse</h3>
            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full uppercase">Real-Time Sync</span>
         </div>
         <div className="space-y-6">
            {state.workLogs.filter(l => isSuper || l.companyId === user.companyId).slice(-4).reverse().map(log => {
               const emp = state.users.find(u => u.id === log.userId);
               return (
                 <div key={log.id} className="flex items-center justify-between p-6 hover:bg-slate-50 rounded-[2.5rem] transition-all border border-transparent hover:border-slate-100">
                    <div className="flex items-center space-x-5">
                       <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-sm">W</div>
                       <div>
                          <p className="text-xs font-black uppercase text-slate-800 tracking-tight">{emp?.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{log.workType}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-lg font-black text-green-600">{log.meters}m</p>
                       <p className="text-[8px] font-black text-slate-300 uppercase">{log.installationDate}</p>
                    </div>
                 </div>
               );
            })}
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
