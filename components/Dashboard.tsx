
import React, { useState, useMemo } from 'react';
import { User, AppState, UserRole, Task } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ICONS, Logo } from '../constants';

interface Props {
  user: User;
  state: AppState;
  updatePassword?: (id: string, password: string) => Promise<void>;
  updateTaskStatus?: (id: string, status: 'TODO' | 'IN_PROGRESS' | 'DONE') => void;
  getAiSystemContext: (companyId?: string) => any;
}

const Dashboard: React.FC<Props> = ({ user, state, getAiSystemContext, updateTaskStatus }) => {
  const isSuper = user.role === UserRole.SUPER_ADMIN;
  const isAdmin = user.role === UserRole.ADMIN;
  const isSupervisor = user.role === UserRole.SUPERVISOR;
  
  const [copied, setCopied] = useState(false);

  // APK URL from global state
  const APK_DOWNLOAD_URL = state.apkUrl;

  const handleShareApp = () => {
    const shareData = {
      title: 'Pragati Workforce Platform',
      text: 'Download our official enterprise field application for reporting and attendance:',
      url: APK_DOWNLOAD_URL
    };

    if (window.AndroidInterface && (window.AndroidInterface as any).shareApp) {
      (window.AndroidInterface as any).shareApp(APK_DOWNLOAD_URL);
    } else if (navigator.share) {
      navigator.share(shareData).catch(() => {
        copyToClipboard();
      });
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(APK_DOWNLOAD_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (window.AndroidInterface) window.AndroidInterface.showToast("App Link Copied!");
  };

  const stats = useMemo(() => {
    if (isSuper) {
      return [
        { label: 'Enterprises', value: state.companies.length, color: 'text-blue-600' },
        { label: 'Total Personnel', value: state.users.length, color: 'text-green-600' },
        { label: 'Global Traffic', value: state.workLogs.length, color: 'text-orange-600' },
        { label: 'Blocked Nodes', value: state.companies.filter(c => c.status === 'BLOCKED').length, color: 'text-red-600' },
      ];
    }
    const companyUsers = state.users.filter(u => u.companyId === user.companyId);
    const companyWork = state.workLogs.filter(l => l.companyId === user.companyId);
    if (isAdmin) {
      return [
        { label: 'Workforce', value: companyUsers.length, color: 'text-blue-600' },
        { label: 'Output (M)', value: companyWork.reduce((sum, l) => sum + l.meters, 0), color: 'text-green-600' },
        { label: 'Pending', value: state.requests.filter(r => r.companyId === user.companyId && r.status === 'PENDING').length, color: 'text-orange-600' },
        { label: 'Sites', value: state.sites.filter(s => s.companyId === user.companyId).length, color: 'text-purple-600' },
      ];
    }
    return [
      { label: 'My Output', value: `${state.workLogs.filter(l => l.userId === user.id).reduce((s,l)=>s+l.meters,0)}m`, color: 'text-blue-600' },
      { label: 'Adv Approved', value: `₹${state.requests.filter(r => r.userId === user.id && r.status === 'APPROVED').reduce((s,r)=>s+r.amount,0)}`, color: 'text-orange-600' },
    ];
  }, [state, user, isSuper, isAdmin]);

  return (
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white px-4 py-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
            <p className="text-gray-400 text-[8px] font-black uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <p className={`text-lg font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {(isAdmin || isSupervisor) && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden border border-slate-800 group">
           <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 blur-[60px] rounded-full -mr-24 -mt-24 group-hover:bg-blue-600/20 transition-all"></div>
           <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-4">
                 <div className="p-3 bg-green-500/10 rounded-xl">
                    <ICONS.Android className="w-6 h-6 text-green-500" />
                 </div>
                 <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Pragati Android APK</h3>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">Build v4.8.2-Stable</p>
                 </div>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed mb-6">
                 Authorized Field Application. Share this link with your employees to allow them to report attendance and work telemetry.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                 <button 
                  onClick={handleShareApp} 
                  className="flex-1 bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl flex items-center justify-center space-x-2 transition-all active:scale-95"
                 >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    <span>{copied ? 'Link Copied!' : 'Share App Link'}</span>
                 </button>
                 <a 
                  href={APK_DOWNLOAD_URL} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-6 bg-slate-800 hover:bg-slate-700 py-4 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center transition-all border border-slate-700 hover:border-slate-500"
                 >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download
                 </a>
              </div>
           </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-[#0D47A1] to-[#1a237e] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
         <div className="relative z-10">
            <h2 className="text-3xl font-black tracking-tighter mb-2">Hello, {user.name.split(' ')[0]}</h2>
            <p className="text-xs text-blue-100/70 font-bold mb-8">Node status: STABLE. Ready for telemetry sync.</p>
            <button className="w-full bg-white text-[#0D47A1] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Get AI Insights</button>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
