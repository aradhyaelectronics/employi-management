
import React, { useState } from 'react';
import { AppState, User, UserStatus, Company, SubscriptionPlan, IntegrationConfig } from '../types';

interface Props {
  state: AppState;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  updateCompanyStatus: (id: string, status: UserStatus) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  removeCompany: (id: string) => Promise<void>;
  purchaseSubscription: (companyId: string, planId: string, months?: number) => void;
  updateSubscriptionPlanConfig: (id: string, updates: Partial<SubscriptionPlan>) => Promise<void>;
  addSite: (site: any) => Promise<void>;
  removeSite: (id: string) => Promise<void>;
  updateIntegrations: (updates: Partial<IntegrationConfig>) => void;
  updateApkUrl: (url: string) => void;
}

const BackendConsole: React.FC<Props> = ({ 
  state, 
  removeCompany, 
  purchaseSubscription, 
  updateSubscriptionPlanConfig,
  updateIntegrations, 
  updateApkUrl,
  updateUser,
  updateCompanyStatus,
  removeUser,
  addSite,
  removeSite
}) => {
  const [activeView, setActiveView] = useState<'status' | 'enterprises' | 'plans' | 'logs' | 'integrations' | 'distribution'>('status');
  const [apkUrlInput, setApkUrlInput] = useState(state.apkUrl);
  const [intConfig, setIntConfig] = useState<IntegrationConfig>(state.integrations);

  const [assigningTo, setAssigningTo] = useState<Company | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedMonths, setSelectedMonths] = useState(1);

  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const handleUpdateApk = () => {
    updateApkUrl(apkUrlInput);
    alert("System-wide APK Distribution link updated successfully.");
  };

  const handleSaveIntegrations = () => {
    updateIntegrations(intConfig);
    alert("Razorpay Gateway configurations committed to master cluster.");
  };

  const handleManualAssign = () => {
    if (!assigningTo || !selectedPlanId) return;
    purchaseSubscription(assigningTo.id, selectedPlanId, selectedMonths);
    setAssigningTo(null);
    alert(`Success: ${assigningTo.name} node provisioned for ${selectedMonths} months.`);
  };

  const handleSavePlanEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    await updateSubscriptionPlanConfig(editingPlan.id, editingPlan);
    setEditingPlan(null);
    alert("Service Tier configuration synchronized across all clusters.");
  };

  const getDaysRemaining = (expiry: string | undefined) => {
    if (!expiry) return 0;
    const diff = new Date(expiry).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="bg-slate-950 min-h-[85vh] rounded-[3rem] overflow-hidden shadow-2xl border border-slate-800 flex flex-col md:flex-row animate-in fade-in duration-700">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-slate-900/40 p-10 border-r border-slate-800/50 flex flex-col">
        <div className="mb-12">
          <div className="flex items-center space-x-3 mb-4">
             <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
             <h2 className="text-white font-black uppercase tracking-tighter text-xl leading-none">Cloud Master</h2>
          </div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">v{state.version}</p>
        </div>
        
        <nav className="flex-1 space-y-2">
          {[
            { id: 'status', label: 'Cluster Health' },
            { id: 'enterprises', label: 'Tenants' },
            { id: 'plans', label: 'Service Tiers' },
            { id: 'distribution', label: 'Distribution' },
            { id: 'integrations', label: 'Gateways' },
            { id: 'logs', label: 'Server Logs' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as any)}
              className={`w-full text-left px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeView === item.id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Area */}
      <main className="flex-1 p-12 overflow-y-auto max-h-[85vh] bg-slate-950 custom-scrollbar">
        
        {/* View: Status */}
        {activeView === 'status' && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-10">System Infrastructure</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="p-10 bg-slate-900/50 rounded-[2.5rem] border border-slate-800">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Active Tenants</p>
                    <p className="text-5xl font-black text-white">{state.companies.length}</p>
                 </div>
                 <div className="p-10 bg-slate-900/50 rounded-[2.5rem] border border-slate-800">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Registered Personnel</p>
                    <p className="text-5xl font-black text-white">{state.users.length}</p>
                 </div>
                 <div className="p-10 bg-slate-900/50 rounded-[2.5rem] border border-slate-800">
                    <p className="text-[10px] font-black text-green-400 uppercase tracking-[0.3em] mb-4">Telemetry Stream</p>
                    <p className="text-5xl font-black text-green-400">{state.workLogs.length}</p>
                 </div>
              </div>
           </div>
        )}

        {/* View: Enterprises (Tenants) */}
        {activeView === 'enterprises' && (
          <div className="animate-in fade-in duration-500 space-y-8">
             <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Enterprise Registry</h3>
                <div className="px-5 py-2 bg-blue-600/10 text-blue-500 rounded-full text-[9px] font-black uppercase tracking-widest">Global Managed Nodes</div>
             </div>

             <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-slate-900/60">
                      <tr>
                         <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Enterprise Node</th>
                         <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Agreement Status</th>
                         <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Identity Count</th>
                         <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Ops</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800/50 text-white">
                      {state.companies.map(c => {
                         const days = getDaysRemaining(c.subscriptionExpiry);
                         const plan = state.subscriptionPlans.find(p => p.id === c.subscriptionPlanId);
                         return (
                            <tr key={c.id} className="hover:bg-white/5 transition-all">
                               <td className="px-8 py-6">
                                  <div className="font-black text-sm uppercase tracking-tight">{c.name}</div>
                                  <div className="text-[8px] font-bold text-slate-500 uppercase mt-1">EST: {new Date(c.createdAt).toLocaleDateString()}</div>
                               </td>
                               <td className="px-8 py-6">
                                  <div className="flex items-center space-x-3">
                                     <span className="text-[10px] font-black text-blue-400 uppercase">{plan?.name || 'Standard'}</span>
                                     <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${days > 10 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {days} Days Left
                                     </span>
                                     <button 
                                       onClick={() => { setAssigningTo(c); setSelectedPlanId(c.subscriptionPlanId || ''); }}
                                       className="text-[8px] font-black text-blue-600 uppercase underline"
                                     >
                                        Override
                                     </button>
                                  </div>
                               </td>
                               <td className="px-8 py-6 text-center text-sm font-black">
                                  {state.users.filter(u => u.companyId === c.id).length}
                               </td>
                               <td className="px-8 py-6 text-right">
                                  <button onClick={() => removeCompany(c.id)} className="p-2 text-slate-700 hover:text-red-500 transition-all">
                                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                               </td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* View: Subscription Plan Editor */}
        {activeView === 'plans' && (
           <div className="animate-in fade-in duration-500 space-y-10">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Service Tier Management</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {state.subscriptionPlans.map(plan => (
                    <div key={plan.id} className="bg-slate-900/60 p-10 rounded-[3rem] border border-slate-800 group hover:border-blue-600 transition-all">
                       <h4 className="text-xl font-black text-white uppercase tracking-tight mb-2">{plan.name}</h4>
                       <p className="text-4xl font-black text-blue-500 tracking-tighter mb-6">₹{plan.price}</p>
                       <ul className="space-y-4 mb-10 opacity-50">
                          <li className="text-[10px] font-black text-white uppercase tracking-widest">Max Users: {plan.userLimit}</li>
                          <li className="text-[10px] font-black text-white uppercase tracking-widest">Validity: {plan.durationDays} Days</li>
                       </ul>
                       <button 
                        onClick={() => setEditingPlan(plan)}
                        className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all"
                       >
                          Edit Definition
                       </button>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* View: Integrations */}
        {activeView === 'integrations' && (
          <div className="space-y-10 animate-in fade-in duration-500">
             <div className="bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-800">
                <div className="flex justify-between items-start mb-10">
                   <div>
                      <h4 className="text-white font-black uppercase text-xl tracking-tight mb-2">Razorpay Gateway</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed max-w-lg">
                        Manage global transaction endpoints for license upgrades.
                      </p>
                   </div>
                   <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Master Enable</span>
                        <button 
                          onClick={() => setIntConfig({...intConfig, razorpayEnabled: !intConfig.razorpayEnabled})}
                          className={`w-14 h-8 rounded-full transition-all relative ${intConfig.razorpayEnabled ? 'bg-blue-600' : 'bg-slate-800'}`}
                        >
                           <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${intConfig.razorpayEnabled ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Sandbox Mode</span>
                        <button 
                          onClick={() => setIntConfig({...intConfig, isSandboxMode: !intConfig.isSandboxMode})}
                          className={`w-14 h-8 rounded-full transition-all relative ${intConfig.isSandboxMode ? 'bg-orange-600' : 'bg-slate-800'}`}
                        >
                           <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${intConfig.isSandboxMode ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-6">
                      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                         <label className="block text-[9px] font-black text-blue-500 uppercase tracking-widest mb-3 ml-1">Merchant Key ID</label>
                         <input type="text" className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-4 text-xs font-mono outline-none focus:border-blue-500" value={intConfig.razorpayKeyId} onChange={e => setIntConfig({...intConfig, razorpayKeyId: e.target.value})} placeholder="rzp_test_..." />
                      </div>
                      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                         <label className="block text-[9px] font-black text-blue-500 uppercase tracking-widest mb-3 ml-1">Merchant Secret</label>
                         <input type="password" className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-4 text-xs font-mono outline-none focus:border-blue-500" value={intConfig.razorpayKeySecret} onChange={e => setIntConfig({...intConfig, razorpayKeySecret: e.target.value})} placeholder="••••••••••••••••" />
                      </div>
                   </div>
                   <div className="space-y-6">
                      <button onClick={handleSaveIntegrations} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl active:scale-95 transition-all">Sync Gateway Credentials</button>
                      <div className={`p-8 rounded-2xl border text-[10px] font-black uppercase tracking-widest text-center ${intConfig.isSandboxMode ? 'bg-orange-900/10 border-orange-900/20 text-orange-400' : 'bg-green-900/10 border-green-900/20 text-green-400'}`}>
                        Environment: {intConfig.isSandboxMode ? 'Sandbox (Mock)' : 'Live Production'}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* View: Distribution */}
        {activeView === 'distribution' && (
          <div className="space-y-10 animate-in fade-in duration-500">
             <div className="bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-800">
                <h4 className="text-white font-black uppercase text-sm tracking-tight mb-6">Mobile App Deployment Hub</h4>
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                   <label className="block text-[9px] font-black text-blue-500 uppercase tracking-widest mb-3 ml-1">APK Master URL</label>
                   <input type="url" className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-4 text-xs font-mono outline-none" value={apkUrlInput} onChange={e => setApkUrlInput(e.target.value)} />
                </div>
                <button onClick={handleUpdateApk} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest mt-8">Update Distribution Link</button>
             </div>
          </div>
        )}
      </main>

      {/* Modal: Manual License Assignment */}
      {assigningTo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 rounded-[3rem] border border-slate-800 p-12 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 text-center">Manual License Provisioning</h3>
            <div className="space-y-6">
              <div>
                 <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Service Tier</label>
                 <select className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl font-black text-sm outline-none" value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)}>
                    <option value="">Select Tier...</option>
                    {state.subscriptionPlans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                 </select>
              </div>
              <div>
                 <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Validity (Months)</label>
                 <div className="grid grid-cols-4 gap-2">
                    {[1, 3, 6, 12].map(m => (
                       <button key={m} onClick={() => setSelectedMonths(m)} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedMonths === m ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}>
                          {m}M
                       </button>
                    ))}
                 </div>
              </div>
              <div className="flex space-x-3 pt-6">
                 <button onClick={handleManualAssign} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl">Commit Override</button>
                 <button onClick={() => setAssigningTo(null)} className="px-8 py-5 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-[11px] tracking-widest">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Service Tier Editor */}
      {editingPlan && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-slate-900 rounded-[3rem] border border-slate-800 p-12 w-full max-w-lg shadow-2xl">
               <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 text-center">Edit Service Tier Def</h3>
               <form onSubmit={handleSavePlanEdit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Plan Name</label>
                        <input type="text" className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl font-black text-sm outline-none" value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Price (₹)</label>
                        <input type="number" className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl font-black text-sm outline-none" value={editingPlan.price} onChange={e => setEditingPlan({...editingPlan, price: parseInt(e.target.value) || 0})} />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Personnel Limit</label>
                        <input type="number" className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl font-black text-sm outline-none" value={editingPlan.userLimit} onChange={e => setEditingPlan({...editingPlan, userLimit: parseInt(e.target.value) || 0})} />
                     </div>
                  </div>
                  <div className="flex space-x-3 pt-6">
                     <button type="submit" className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl">Save Definition</button>
                     <button type="button" onClick={() => setEditingPlan(null)} className="px-8 py-5 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-[11px] tracking-widest">Cancel</button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default BackendConsole;
