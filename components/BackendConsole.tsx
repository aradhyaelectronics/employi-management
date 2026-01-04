
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppState, User, UserStatus, UserRole, Company, ServerEvent, Site, PaymentStatus, IntegrationConfig } from '../types';

interface Props {
  state: AppState;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  updateCompanyStatus: (id: string, status: UserStatus) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  removeCompany: (id: string) => Promise<void>;
  purchaseSubscription: (companyId: string, planId: string, months?: number) => void;
  addSite: (site: Omit<Site, 'id'>) => Promise<void>;
  removeSite: (id: string) => Promise<void>;
  updateIntegrations: (updates: Partial<IntegrationConfig>) => void;
  updateApkUrl: (url: string) => void;
}

const BackendConsole: React.FC<Props> = ({ state, updateCompanyStatus, removeUser, removeCompany, purchaseSubscription, addSite, removeSite, updateIntegrations, updateApkUrl }) => {
  const [activeView, setActiveView] = useState<'status' | 'enterprises' | 'users' | 'sites' | 'logs' | 'config' | 'integrations' | 'distribution'>('status');
  const [search, setSearch] = useState('');
  const [apkUrlInput, setApkUrlInput] = useState(state.apkUrl);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [isPinging, setIsPinging] = useState(false);

  useEffect(() => {
    if (activeView === 'logs') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.systemLogs, activeView]);

  const filteredCompanies = useMemo(() => {
    return state.companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.id.includes(search));
  }, [state.companies, search]);

  const handleUpdateApk = () => {
    updateApkUrl(apkUrlInput);
    alert("System-wide APK Distribution link updated successfully.");
  };

  return (
    <div className="bg-slate-950 min-h-[85vh] rounded-[3rem] overflow-hidden shadow-2xl border border-slate-800 flex flex-col md:flex-row animate-in fade-in duration-700">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-slate-900/40 p-10 border-r border-slate-800/50 flex flex-col">
        <div className="mb-12">
          <div className="flex items-center space-x-3 mb-4">
             <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
             <h2 className="text-white font-black uppercase tracking-tighter text-xl">Cloud Master</h2>
          </div>
        </div>
        
        <nav className="flex-1 space-y-2">
          {[
            { id: 'status', label: 'Cluster Health', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
            { id: 'enterprises', label: 'Tenants', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16' },
            { id: 'distribution', label: 'App Distribution', icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z' },
            { id: 'integrations', label: 'Integrations', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0' },
            { id: 'logs', label: 'Server Logs', icon: 'M9 12h6m-6 4h6m2 5H7' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as any)}
              className={`w-full flex items-center space-x-4 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeView === item.id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 p-12 overflow-y-auto max-h-[85vh] bg-slate-950 custom-scrollbar">
        {activeView === 'distribution' && (
          <div className="space-y-10 animate-in fade-in duration-500">
             <div className="bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-800">
                <h4 className="text-white font-black uppercase text-sm tracking-tight mb-6">Mobile App Deployment Hub</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-10 leading-relaxed">
                  Provide the public URL for the Pragati Cloud Android APK. This link will be visible to all Enterprise Admins to share with their field teams.
                </p>
                <div className="space-y-6">
                   <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                      <label className="block text-[9px] font-black text-blue-500 uppercase tracking-widest mb-3 ml-1">APK Master URL</label>
                      <input 
                        type="url" 
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-4 text-xs font-mono outline-none focus:border-blue-500" 
                        value={apkUrlInput} 
                        onChange={e => setApkUrlInput(e.target.value)}
                        placeholder="https://example.com/app.apk"
                      />
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                         <h5 className="text-[10px] font-black text-white uppercase tracking-widest mb-2">Build Version</h5>
                         <p className="text-sm font-black text-blue-400">v4.8.2-STABLE</p>
                      </div>
                      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                         <h5 className="text-[10px] font-black text-white uppercase tracking-widest mb-2">Release Date</h5>
                         <p className="text-sm font-black text-green-400">{new Date().toLocaleDateString()}</p>
                      </div>
                   </div>
                   <button onClick={handleUpdateApk} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-blue-500 transition-all">Update Distribution Link</button>
                </div>
             </div>

             <div className="bg-blue-600/10 p-10 rounded-[2.5rem] border border-blue-600/20 text-center">
                <p className="text-white text-xs font-black uppercase mb-4 tracking-tighter">Download Link QR Preview</p>
                <div className="w-48 h-48 bg-white mx-auto rounded-3xl p-4 flex items-center justify-center shadow-2xl">
                   {/* Simulated QR Code for the distribution link */}
                   <div className="grid grid-cols-5 gap-1 opacity-80">
                      {[...Array(25)].map((_, i) => (
                        <div key={i} className={`w-6 h-6 rounded-sm ${Math.random() > 0.4 ? 'bg-slate-900' : 'bg-transparent'}`}></div>
                      ))}
                   </div>
                </div>
                <p className="text-[9px] text-blue-400 font-black uppercase mt-6 tracking-widest">Share this with Field Supervisors</p>
             </div>
          </div>
        )}

        {activeView === 'status' && (
           <div className="text-white">
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-8">System Health Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <div className="p-8 bg-slate-900/50 rounded-3xl border border-slate-800">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Global Nodes</p>
                    <p className="text-3xl font-black text-white">{state.companies.length}</p>
                 </div>
                 <div className="p-8 bg-slate-900/50 rounded-3xl border border-slate-800">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Identity Matrix</p>
                    <p className="text-3xl font-black text-white">{state.users.length}</p>
                 </div>
                 <div className="p-8 bg-slate-900/50 rounded-3xl border border-slate-800">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Telemetry Traffic</p>
                    <p className="text-3xl font-black text-green-400">{state.workLogs.length}</p>
                 </div>
              </div>
           </div>
        )}

        {/* Other views implementation placeholder */}
        {(['enterprises', 'integrations', 'logs']).includes(activeView) && (
           <div className="text-slate-500 font-black uppercase text-xs tracking-widest text-center py-20">View initialized. Content in telemetry buffer.</div>
        )}
      </main>
    </div>
  );
};

export default BackendConsole;
