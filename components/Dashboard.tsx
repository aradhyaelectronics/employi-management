
import React, { useMemo } from 'react';
import { User, AppState, UserRole } from '../types';
import { ICONS } from '../constants';
import AiAdvisor from './AiAdvisor';

interface Props {
  user: User;
  state: AppState;
  getAiSystemContext: (companyId?: string) => any;
  onNavigate: (tabId: string) => void;
}

const Dashboard: React.FC<Props> = ({ user, state, getAiSystemContext, onNavigate }) => {
  const isSuper = user.role === UserRole.SUPER_ADMIN;
  const company = state.companies.find(c => c.id === user.companyId);

  const activeAds = useMemo(() => state.ads.filter(a => a.active), [state.ads]);
  const activeOffers = useMemo(() => state.offers.filter(o => o.active), [state.offers]);

  const daysRemaining = useMemo(() => {
    if (!company?.subscriptionExpiry) return null;
    const diff = new Date(company.subscriptionExpiry).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [company]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24">
      {/* Header */}
      <div className="bg-slate-900 p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 blur-[120px] rounded-full"></div>
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-4 mb-4">
             <span className="px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-white/5 text-blue-300 border border-white/10 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Node Active
             </span>
             {daysRemaining !== null && (
                <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${daysRemaining < 5 ? 'bg-red-500 text-white border-red-400 animate-bounce' : 'bg-white/5 text-blue-300 border-white/10'}`}>
                   License: {daysRemaining} Days
                </div>
             )}
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-tight">
            Pragati Cloud <br /> <span className="text-blue-400">Namaste, {user.name.split(' ')[0]}</span>
          </h1>
        </div>
      </div>

      {/* Operational Command (Quick Action Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-900 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full translate-x-10 -translate-y-10"></div>
            <div>
               <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Operational Command</h3>
               <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest leading-relaxed">System-wide control node for site telemetry and production audits.</p>
            </div>
            <div className="flex gap-4 mt-8">
               <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <p className="text-[8px] font-black text-blue-200 uppercase mb-1">Total Metrage</p>
                  <p className="text-xl font-black">{state.workLogs.filter(l => l.companyId === user.companyId).reduce((s,l)=>s+l.meters,0)}m</p>
               </div>
               <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <p className="text-[8px] font-black text-blue-200 uppercase mb-1">Team Strength</p>
                  <p className="text-xl font-black">{state.users.filter(u => u.companyId === user.companyId).length}</p>
               </div>
            </div>
         </div>

         {/* Extra Feature Card 1: Attendance */}
         <button onClick={() => onNavigate('attendance')} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-4 group hover:shadow-xl transition-all active:scale-95">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all">
               <ICONS.Time className="w-8 h-8" />
            </div>
            <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Attendance Portal</p>
         </button>

         {/* Extra Feature Card 2: Material Registry - ACTIVE */}
         <button onClick={() => onNavigate('materials')} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-4 group hover:shadow-xl transition-all active:scale-95">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all">
               <ICONS.Shield className="w-8 h-8" />
            </div>
            <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Material Registry</p>
         </button>

         {/* NEW Extra Card 3: Node Telemetry Scan - ACTIVE */}
         <button onClick={() => onNavigate('telemetry')} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-4 group hover:shadow-xl transition-all active:scale-95">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
               <ICONS.Rocket className="w-8 h-8" />
            </div>
            <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Node Telemetry</p>
         </button>

         {/* NEW Extra Card 4: Resource Planner */}
         <button onClick={() => onNavigate('projects')} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-4 group hover:shadow-xl transition-all active:scale-95">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-all">
               <ICONS.Work className="w-8 h-8" />
            </div>
            <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Resource Hub</p>
         </button>
      </div>

      {/* Marketing Banners */}
      {(activeAds.length > 0 || activeOffers.length > 0) && (
        <div className="flex gap-6 overflow-x-auto custom-scrollbar py-2">
           {activeOffers.map(off => (
             <div key={off.id} className="min-w-[320px] bg-slate-900 p-10 rounded-[3rem] text-white shadow-xl relative overflow-hidden shrink-0 border border-slate-800">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-2xl rounded-full"></div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-orange-400">Flash Offer</p>
                <h4 className="text-2xl font-black tracking-tighter uppercase mb-4">{off.name}</h4>
                <div className="flex items-center justify-between">
                   <span className="bg-orange-600 text-white px-5 py-2 rounded-2xl text-xs font-black tracking-widest">{off.code}</span>
                   <span className="text-xl font-black text-orange-400">-{off.discountPercent}%</span>
                </div>
             </div>
           ))}
           {activeAds.map(ad => (
              <a key={ad.id} href={ad.link} target="_blank" rel="noopener" className="min-w-[320px] h-[180px] rounded-[3rem] overflow-hidden shadow-xl shrink-0 group relative">
                 <img src={ad.imageUrl} alt="Promo" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                 <span className="absolute bottom-6 left-8 bg-white/20 backdrop-blur-md text-white px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest">Discover</span>
              </a>
           ))}
        </div>
      )}

      {(user.role === UserRole.ADMIN || isSuper) && <AiAdvisor context={getAiSystemContext(isSuper ? undefined : user.companyId)} />}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {[
            { label: isSuper ? 'Total Clusters' : 'Live Staff', value: isSuper ? state.companies.length : state.attendance.filter(a => a.companyId === user.companyId && a.isActive === 1).length, icon: ICONS.Users, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Work Units', value: state.workLogs.filter(l => l.companyId === user.companyId).reduce((s,l)=>s+l.meters,0), icon: ICONS.Document, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Active Sites', value: state.sites.filter(s => s.companyId === user.companyId).length, icon: ICONS.Work, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 transition-all hover:shadow-2xl">
              <div className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center mb-8`}>
                <stat.icon className={`w-7 h-7 ${stat.color}`} />
              </div>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1.5">{stat.label}</p>
              <p className={`text-4xl font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
            </div>
          ))}
      </div>
    </div>
  );
};

export default Dashboard;
