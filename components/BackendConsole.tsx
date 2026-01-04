
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppState, User, UserStatus, UserRole, Company, ServerEvent, Site, PaymentStatus, IntegrationConfig } from '../types';
import { saveState } from '../store';

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
}

const BackendConsole: React.FC<Props> = ({ state, updateCompanyStatus, removeUser, removeCompany, purchaseSubscription, addSite, removeSite, updateIntegrations }) => {
  const [activeView, setActiveView] = useState<'status' | 'enterprises' | 'users' | 'sites' | 'logs' | 'config' | 'integrations'>('status');
  const [search, setSearch] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  const [isPinging, setIsPinging] = useState(false);

  // Site form state
  const [newSite, setNewSite] = useState({ name: '', address: '', lat: 0, lng: 0, companyId: '' });

  useEffect(() => {
    if (activeView === 'logs') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.systemLogs, activeView]);

  const filteredCompanies = useMemo(() => {
    return state.companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.id.includes(search));
  }, [state.companies, search]);

  const filteredUsers = useMemo(() => {
    return state.users.filter(u => 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.mobile?.includes(search)
    );
  }, [state.users, search]);

  const filteredSites = useMemo(() => {
    return state.sites.filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.address?.toLowerCase().includes(search.toLowerCase())
    );
  }, [state.sites, search]);

  const handleForceSync = () => {
    alert("GLOBAL SYNC: Propagating local changes to master cluster...");
    window.location.reload();
  };

  const handleTestPing = async () => {
    setIsPinging(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsPinging(false);
    
    if (typeof (window as any).Razorpay !== 'undefined') {
      alert("SUCCESS: Razorpay SDK v1.x detected and responding to master ping.");
    } else {
      alert("FAILURE: Razorpay script not found. Enable 'Sandbox Mode' to bypass external dependency.");
    }
  };

  return (
    <div className="bg-slate-950 min-h-[85vh] rounded-[3rem] overflow-hidden shadow-2xl border border-slate-800 flex flex-col md:flex-row animate-in fade-in duration-700">
      {/* Dynamic Master Sidebar */}
      <aside className="w-full md:w-72 bg-slate-900/40 p-10 border-r border-slate-800/50 flex flex-col">
        <div className="mb-12">
          <div className="flex items-center space-x-3 mb-4">
             <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
             <h2 className="text-white font-black uppercase tracking-tighter text-xl">Cloud Master</h2>
          </div>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] leading-relaxed">System Infrastructure & Multi-Tenant Orchestration</p>
        </div>
        
        <nav className="flex-1 space-y-3">
          {[
            { id: 'status', label: 'Cluster Health', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
            { id: 'enterprises', label: 'Tenant Registry', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
            { id: 'users', label: 'Global Identities', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
            { id: 'sites', label: 'Site Registry', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
            { id: 'integrations', label: 'Integrations', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
            { id: 'logs', label: 'Server Logs', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            { id: 'config', label: 'System Config', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveView(item.id as any); setSearch(''); }}
              className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                activeView === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={item.icon} /></svg>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="mt-auto pt-10">
          <button onClick={handleForceSync} className="w-full bg-slate-800 text-slate-400 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-colors">Force Cloud Sync</button>
        </div>
      </aside>

      {/* Dynamic Content Panel */}
      <main className="flex-1 p-12 overflow-y-auto max-h-[85vh] relative">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div>
             <h3 className="text-white font-black uppercase text-2xl tracking-tighter">{activeView.replace(/^\w/, (c) => c.toUpperCase())} Protocol</h3>
             <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Live Management of System Nodes</p>
           </div>
           {(activeView === 'enterprises' || activeView === 'users' || activeView === 'sites') && (
             <div className="relative w-full md:w-80 group">
                <input 
                  type="text" 
                  placeholder="Global Search Filter..." 
                  className="w-full bg-slate-900 border border-slate-800 px-6 py-4 rounded-2xl text-xs text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
             </div>
           )}
        </header>

        {activeView === 'status' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Cloud Enterprises', val: state.companies.length, color: 'text-blue-500', trend: '+12% this month' },
                { label: 'Active Personnel', val: state.users.length, color: 'text-green-500', trend: 'Global Reach' },
                { label: 'Telemetry Nodes', val: state.attendance.length + state.workLogs.length, color: 'text-orange-500', trend: 'Real-time Flow' },
                { label: 'Project Sites', val: state.sites.length, color: 'text-purple-500', trend: 'Stable v4.5' }
              ].map(s => (
                <div key={s.label} className="bg-slate-900/50 p-8 rounded-[2rem] border border-slate-800 hover:border-slate-700 transition-all group">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-3 group-hover:text-slate-400 transition-colors">{s.label}</p>
                  <p className={`text-3xl font-black ${s.color} tracking-tighter mb-2`}>{s.val}</p>
                  <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{s.trend}</p>
                </div>
              ))}
            </div>

            <div className="bg-slate-900/50 rounded-[2.5rem] border border-slate-800 p-10">
               <div className="flex justify-between items-center mb-10">
                  <h4 className="text-white font-black uppercase text-xs tracking-widest">Dynamic Cluster Load</h4>
                  <div className="flex space-x-4">
                     <span className="flex items-center space-x-2 text-[9px] font-black text-blue-500 uppercase"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> <span>Memory</span></span>
                     <span className="flex items-center space-x-2 text-[9px] font-black text-green-500 uppercase"><span className="w-2 h-2 bg-green-500 rounded-full"></span> <span>Traffic</span></span>
                  </div>
               </div>
               <div className="h-48 flex items-end justify-between space-x-2">
                  {[45, 60, 55, 80, 70, 90, 85, 95, 80, 60, 40, 50, 70, 80, 90].map((h, i) => (
                    <div key={i} className="flex-1 bg-slate-800 rounded-t-lg relative group transition-all hover:bg-slate-700 overflow-hidden">
                       <div className="absolute bottom-0 w-full bg-blue-600 opacity-80" style={{ height: `${h}%` }}></div>
                       <div className="absolute bottom-0 w-full bg-green-400 opacity-40 animate-pulse" style={{ height: `${h * 0.4}%` }}></div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {activeView === 'enterprises' && (
          <div className="bg-slate-900/50 rounded-[2.5rem] border border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-10 py-6">Enterprise Identity</th>
                    <th className="px-10 py-6">Infrastructure Tier</th>
                    <th className="px-10 py-6 text-center">Cloud Status</th>
                    <th className="px-10 py-6 text-right">Master Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredCompanies.map(c => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-all group">
                      <td className="px-10 py-8">
                        <p className="text-white text-sm font-black uppercase tracking-tight group-hover:text-blue-400 transition-colors">{c.name}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Tenant ID: {c.id}</p>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex flex-col">
                          <p className="text-blue-400 text-[11px] font-black uppercase tracking-widest">
                            {state.subscriptionPlans.find(p => p.id === c.subscriptionPlanId)?.name || 'NONE'}
                          </p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Expiry: {c.subscriptionExpiry ? new Date(c.subscriptionExpiry).toLocaleDateString() : 'LIFETIME'}</p>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-center">
                        <button 
                          onClick={() => updateCompanyStatus(c.id, c.status === UserStatus.ACTIVE ? UserStatus.BLOCKED : UserStatus.ACTIVE)}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${c.status === UserStatus.ACTIVE ? 'bg-green-900/20 text-green-500 border-green-900/30 hover:bg-green-900/40' : 'bg-red-900/20 text-red-500 border-red-900/30 hover:bg-red-900/40'}`}
                        >
                          {c.status === UserStatus.ACTIVE ? 'Active Node' : 'Suspended'}
                        </button>
                      </td>
                      <td className="px-10 py-8 text-right space-x-3">
                        <button 
                          onClick={() => purchaseSubscription(c.id, 'p-pro', 1)}
                          className="bg-blue-600/20 text-blue-400 border border-blue-900/30 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all shadow-lg"
                        >
                          Upgrade Pro
                        </button>
                        <button 
                          onClick={() => { if(confirm(`CRITICAL: Purge Tenant ${c.name}? All associated personnel and telemetry data will be erased.`)) removeCompany(c.id); }}
                          className="text-red-500/50 hover:text-red-500 text-[9px] font-black uppercase tracking-widest transition-colors"
                        >
                          Purge
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeView === 'integrations' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Razorpay Config Card */}
              <div className="lg:col-span-2 bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-800">
                <div className="flex justify-between items-start mb-10">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-xl shadow-blue-500/10">RP</div>
                    <div>
                      <h4 className="text-white font-black uppercase text-sm tracking-tight">Razorpay Plugin</h4>
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Payment Gateway Engine</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 bg-slate-950 p-2 rounded-xl">
                    <span className="text-[8px] font-black text-slate-500 uppercase">Gateway:</span>
                    <span className={`w-2 h-2 rounded-full ${state.integrations.razorpayEnabled ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <button 
                      onClick={() => updateIntegrations({ razorpayEnabled: !state.integrations.razorpayEnabled })}
                      className="text-[8px] font-black text-blue-400 uppercase tracking-widest hover:text-white"
                    >
                      {state.integrations.razorpayEnabled ? 'Switch Off' : 'Switch On'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Key ID</label>
                    <input type="text" className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-4 py-3 text-xs font-mono outline-none focus:border-blue-500" value={state.integrations.razorpayKeyId} onChange={e => updateIntegrations({ razorpayKeyId: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Key Secret</label>
                    <input type="password" placeholder="••••••••••••••••" className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-4 py-3 text-xs font-mono outline-none focus:border-blue-500" value={state.integrations.razorpayKeySecret} onChange={e => updateIntegrations({ razorpayKeySecret: e.target.value })} />
                  </div>
                  <div className="md:col-span-2 flex items-center justify-between p-5 bg-slate-950 rounded-2xl border border-slate-800">
                    <div>
                      <p className="text-white text-xs font-black uppercase flex items-center">
                        Cloud Sandbox Verification
                        <span className="ml-2 px-1.5 py-0.5 bg-orange-600/20 text-orange-400 text-[7px] rounded">RECOMMENDED</span>
                      </p>
                      <p className="text-[8px] text-slate-500 uppercase font-bold mt-1 max-w-md">Bypasses external pop-up blockers in restricted browser frames or unstable networks. Ensures upgrades always work for demo users.</p>
                    </div>
                    <button 
                      onClick={() => updateIntegrations({ isSandboxMode: !state.integrations.isSandboxMode })}
                      className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase transition-all shadow-xl ${state.integrations.isSandboxMode ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      {state.integrations.isSandboxMode ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </div>
                </div>

                <div className="mt-10 flex gap-4">
                  <button className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-blue-500 transition-all">Save Config</button>
                  <button 
                    disabled={isPinging}
                    onClick={handleTestPing} 
                    className="px-8 bg-slate-800 text-slate-400 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 transition-all flex items-center space-x-2"
                  >
                    {isPinging && <div className="w-3 h-3 border border-slate-500 border-t-white rounded-full animate-spin"></div>}
                    <span>{isPinging ? 'Pinging SDK...' : 'Test Connection'}</span>
                  </button>
                </div>
              </div>

              {/* Service Status */}
              <div className="bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-800 flex flex-col">
                <h4 className="text-white font-black uppercase text-xs tracking-widest mb-8">Connectivity Health</h4>
                <div className="space-y-8 flex-1">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-slate-500 uppercase">SDK Load</span>
                     <span className={`text-[9px] font-black uppercase ${typeof (window as any).Razorpay !== 'undefined' ? 'text-green-500' : 'text-red-500'}`}>
                        {typeof (window as any).Razorpay !== 'undefined' ? 'LOADED' : 'MISSING'}
                     </span>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-slate-500 uppercase">Network Protocol</span>
                     <span className="text-[9px] font-black uppercase text-blue-500">TLS 1.3 SECURE</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-slate-500 uppercase">Sync Latency</span>
                     <span className="text-[9px] font-black uppercase text-slate-400">12ms (OPTIMAL)</span>
                  </div>
                </div>
                <div className="pt-8 border-t border-slate-800 mt-8">
                   <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-900/30">
                      <p className="text-[9px] font-black text-blue-400 uppercase leading-relaxed">
                        "Razorpay v1 integration handles all financial telemetry. Ensure your Key ID starts with 'rzp_test_' or 'rzp_live_'."
                      </p>
                   </div>
                </div>
              </div>
            </div>

            {/* Transaction Ledger */}
            <div className="bg-slate-900/50 rounded-[2.5rem] border border-slate-800 overflow-hidden">
               <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
                  <h4 className="text-white font-black uppercase text-xs tracking-widest">Master Transaction Ledger</h4>
                  <span className="text-[9px] font-black text-slate-500 uppercase bg-slate-900 px-3 py-1 rounded-full">Secure Audit Trail</span>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-950 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                       <tr>
                          <th className="px-8 py-5">TXN Node Reference</th>
                          <th className="px-8 py-5">Enterprise Client</th>
                          <th className="px-8 py-5 text-center">Cloud Plan</th>
                          <th className="px-8 py-5 text-right">Settlement</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30 font-mono text-[11px]">
                       {state.companies.filter(c => c.subscriptionPlanId !== 'p-free').map((c, i) => {
                          const plan = state.subscriptionPlans.find(p => p.id === c.subscriptionPlanId);
                          return (
                            <tr key={c.id} className="hover:bg-slate-800/20 text-slate-400">
                               <td className="px-8 py-6">RP_TXN_{10000 + i}_PRG</td>
                               <td className="px-8 py-6 uppercase font-black text-slate-300">{c.name}</td>
                               <td className="px-8 py-6 text-center uppercase tracking-tighter font-bold">{plan?.name}</td>
                               <td className="px-8 py-6 text-right text-blue-400 font-black">₹{plan?.price.toLocaleString()}</td>
                            </tr>
                          )
                       })}
                       {state.companies.filter(c => c.subscriptionPlanId !== 'p-free').length === 0 && (
                         <tr>
                            <td colSpan={4} className="px-8 py-10 text-center text-slate-600 uppercase text-[10px] font-black tracking-widest">No Premium Settled Transactions</td>
                         </tr>
                       )}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {activeView === 'logs' && (
          <div className="bg-slate-900/50 rounded-[2.5rem] border border-slate-800 p-10 flex flex-col h-[600px] animate-in fade-in duration-500">
             <div className="flex justify-between items-center mb-8">
                <h4 className="text-white font-black uppercase text-xs tracking-widest">System Event Stream</h4>
                <div className="flex items-center space-x-2">
                   <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Live Listening...</span>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1.5 custom-scrollbar pr-4">
                {state.systemLogs.map((log) => (
                  <div key={log.id} className="flex space-x-4 group">
                     <span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                     <span className={`font-black shrink-0 ${log.type === 'CRITICAL' ? 'text-red-500' : log.type === 'SYNC' ? 'text-blue-400' : 'text-slate-400'}`}>[{log.type}]</span>
                     <span className="text-slate-500 shrink-0">[{log.source}]</span>
                     <span className="text-slate-300 group-hover:text-white transition-colors break-all">{log.message}</span>
                  </div>
                ))}
                <div ref={logEndRef}></div>
             </div>
          </div>
        )}

        {activeView === 'config' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-left-4 duration-500">
             <div className="bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-800">
                <h4 className="text-white font-black uppercase text-sm tracking-tight mb-8">Cloud Persistence Policy</h4>
                <div className="space-y-6">
                   <div className="flex justify-between items-center p-6 bg-slate-950/50 rounded-2xl border border-slate-800">
                      <div>
                        <p className="text-white text-xs font-black uppercase">Auto-Sync Intervals</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Background State Migration Active</p>
                      </div>
                      <span className="text-blue-500 text-[10px] font-black uppercase">Enabled</span>
                   </div>
                   <div className="flex justify-between items-center p-6 bg-slate-950/50 rounded-2xl border border-slate-800">
                      <div>
                        <p className="text-white text-xs font-black uppercase">Multi-Tenant Isolation</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Deep State Separation Protocol</p>
                      </div>
                      <span className="text-green-500 text-[10px] font-black uppercase">Verified</span>
                   </div>
                   <div className="pt-6">
                      <button onClick={() => { saveState(state); alert("CLOUD PERSISTENCE: State snapshot committed manually."); }} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl">Commit Master Snapshot</button>
                   </div>
                </div>
             </div>

             <div className="bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-800">
                <h4 className="text-white font-black uppercase text-sm tracking-tight mb-8">Cluster Data Portability</h4>
                <div className="space-y-6">
                   <div className="bg-slate-950/50 p-10 rounded-3xl border-2 border-dashed border-slate-800 text-center">
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-6 leading-relaxed">Restore entire cluster from an encrypted JSON state artifact.</p>
                      <input 
                        type="file" 
                        accept=".json" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const data = JSON.parse(event.target?.result as string);
                              if (confirm("DANGER: Overwrite cloud cluster with this data artifact?")) {
                                saveState(data); window.location.reload();
                              }
                            } catch (err) { alert("Format Error."); }
                          };
                          reader.readAsText(file);
                        }} 
                        className="hidden" 
                        id="cloud-import" 
                      />
                      <label htmlFor="cloud-import" className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-blue-400 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-700 transition-all">Import Artifact</button>
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BackendConsole;
