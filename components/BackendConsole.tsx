
import React, { useState } from 'react';
import { AppState, User, UserStatus, Company, SubscriptionPlan, IntegrationConfig, Offer, Advertisement, Announcement } from '../types';

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
  addOffer: (o: any) => void;
  updateOffer: (id: string, u: any) => void;
  removeOffer: (id: string) => void;
  addAd: (a: any) => void;
  updateAd: (id: string, u: any) => void;
  removeAd: (id: string) => void;
  updateAnnouncement: (ann: any) => void;
}

const BackendConsole: React.FC<Props> = ({ 
  state, removeCompany, purchaseSubscription, updateSubscriptionPlanConfig,
  updateIntegrations, updateApkUrl, addOffer, updateOffer, removeOffer,
  addAd, updateAd, removeAd, updateAnnouncement 
}) => {
  const [activeView, setActiveView] = useState<'status' | 'enterprises' | 'plans' | 'marketing' | 'deployment' | 'plugins' | 'provisioning'>('status');
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [provisioningForm, setProvisioningForm] = useState({ companyId: '', planId: '', months: 1 });
  const [newOffer, setNewOffer] = useState({ name: '', code: '', discountPercent: 10, active: true });
  const [newAd, setNewAd] = useState({ imageUrl: '', link: '', active: true, position: 'DASHBOARD_BANNER' as const });
  const [annInput, setAnnInput] = useState(state.announcement || { title: '', message: '', active: false });

  const handleSavePlanEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    await updateSubscriptionPlanConfig(editingPlan.id, { ...editingPlan, updatedAt: new Date().toISOString() });
    setEditingPlan(null);
    alert("Subscription Node Updated.");
  };

  const handleManualProvision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisioningForm.companyId || !provisioningForm.planId) {
      alert("Select Enterprise and Plan.");
      return;
    }
    purchaseSubscription(provisioningForm.companyId, provisioningForm.planId, provisioningForm.months);
    alert("Manual Provisioning Complete.");
    setProvisioningForm({ companyId: '', planId: '', months: 1 });
  };

  return (
    <div className="bg-slate-950 min-h-[80vh] rounded-[3rem] overflow-hidden shadow-2xl border border-slate-800 flex flex-col md:flex-row">
      <aside className="w-full md:w-72 bg-slate-900/40 p-10 border-r border-slate-800/50 flex flex-col">
        <h2 className="text-white font-black uppercase tracking-tighter text-xl mb-12 italic">Pragati Master</h2>
        <nav className="space-y-3">
          {[
            { id: 'status', label: 'Cluster Info' },
            { id: 'enterprises', label: 'Tenants' },
            { id: 'provisioning', label: 'Manual Provision' },
            { id: 'plans', label: 'Pricing Engine' },
            { id: 'marketing', label: 'Marketing Hub' },
            { id: 'plugins', label: 'API & Gateway' },
            { id: 'deployment', label: 'System Logs' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveView(item.id as any)} className={`w-full text-left px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === item.id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto max-h-[85vh] custom-scrollbar">
        {activeView === 'status' && (
           <div className="animate-in fade-in">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-10">Cluster Telemetry</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="p-10 bg-slate-900/50 rounded-[2.5rem] border border-slate-800">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Companies</p>
                    <p className="text-5xl font-black text-white">{state.companies.length}</p>
                 </div>
                 <div className="p-10 bg-slate-900/50 rounded-[2.5rem] border border-slate-800">
                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-4">Total Users</p>
                    <p className="text-5xl font-black text-white">{state.users.length}</p>
                 </div>
                 <div className="p-10 bg-slate-900/50 rounded-[2.5rem] border border-slate-800">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-4">Work Logs</p>
                    <p className="text-5xl font-black text-white">{state.workLogs.length}</p>
                 </div>
              </div>
           </div>
        )}

        {activeView === 'provisioning' && (
           <div className="animate-in fade-in space-y-10 max-w-2xl">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-10">Manual Node Provisioning</h3>
              <form onSubmit={handleManualProvision} className="bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-800 space-y-6">
                 <div>
                    <label className="text-[9px] text-slate-500 font-black uppercase mb-1 block">Enterprise Node</label>
                    <select className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-5 py-4 text-xs font-bold" value={provisioningForm.companyId} onChange={e => setProvisioningForm({...provisioningForm, companyId: e.target.value})} required>
                       <option value="">Choose Tenant...</option>
                       {state.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-[9px] text-slate-500 font-black uppercase mb-1 block">Subscription Plan</label>
                    <select className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-5 py-4 text-xs font-bold" value={provisioningForm.planId} onChange={e => setProvisioningForm({...provisioningForm, planId: e.target.value})} required>
                       <option value="">Select Plan...</option>
                       {state.subscriptionPlans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-[9px] text-slate-500 font-black uppercase mb-1 block">Validity (Months)</label>
                    <input type="number" className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-5 py-4 text-xs font-bold" value={provisioningForm.months} onChange={e => setProvisioningForm({...provisioningForm, months: parseInt(e.target.value) || 1})} min="1" />
                 </div>
                 <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Activate License Node</button>
              </form>
           </div>
        )}

        {activeView === 'marketing' && (
          <div className="animate-in fade-in space-y-16">
            <div>
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-10">Broadcast Management</h3>
              <div className="bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-800 space-y-6">
                 <div className="flex gap-4">
                    <input type="text" placeholder="Global Announcement Title" className="flex-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-5 py-4 text-xs font-bold" value={annInput.title} onChange={e => setAnnInput({...annInput, title: e.target.value})} />
                    <button onClick={() => setAnnInput({...annInput, active: !annInput.active})} className={`px-6 py-4 rounded-xl text-[9px] font-black uppercase ${annInput.active ? 'bg-green-600' : 'bg-slate-800'} text-white`}>{annInput.active ? 'LIVE' : 'OFF'}</button>
                 </div>
                 <textarea placeholder="Write global broadcast message..." className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-5 py-4 text-xs font-bold" rows={3} value={annInput.message} onChange={e => setAnnInput({...annInput, message: e.target.value})} />
                 <button onClick={() => { updateAnnouncement(annInput); alert("Broadcast Synced."); }} className="bg-blue-600 text-white px-10 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl">Deploy Announcement</button>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8">Voucher & Offer Engine</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800 space-y-4">
                   <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Create New Voucher</h4>
                   <input type="text" placeholder="Campaign Name" className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-xs" value={newOffer.name} onChange={e => setNewOffer({...newOffer, name: e.target.value})} />
                   <div className="flex gap-2">
                      <input type="text" placeholder="PROMO_CODE" className="flex-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-xs font-black" value={newOffer.code} onChange={e => setNewOffer({...newOffer, code: e.target.value.toUpperCase()})} />
                      <input type="number" placeholder="%" className="w-20 bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-xs" value={newOffer.discountPercent} onChange={e => setNewOffer({...newOffer, discountPercent: parseInt(e.target.value) || 0})} />
                   </div>
                   <button onClick={() => { addOffer(newOffer); setNewOffer({name:'', code:'', discountPercent:10, active:true}); }} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase">Commit Offer Node</button>
                </div>
                <div className="space-y-4">
                  {state.offers.map(off => (
                    <div key={off.id} className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 flex justify-between items-center group">
                       <div>
                          <p className="text-white font-black text-xs uppercase">{off.name}</p>
                          <code className="text-[10px] text-blue-500">{off.code} (-{off.discountPercent}%)</code>
                       </div>
                       <button onClick={() => removeOffer(off.id)} className="text-red-500 text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all">DELETE</button>
                    </div>
                  ))}
                  {state.offers.length === 0 && <p className="text-center py-10 text-[10px] text-slate-600 font-black uppercase">No Active Vouchers</p>}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8">Dashboard Ad Banners</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                 <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800 space-y-4">
                   <h4 className="text-xs font-black text-orange-400 uppercase tracking-widest mb-2">Initialize Banner Node</h4>
                   <input type="text" placeholder="Creative Asset URL (HTTPS)" className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-xs" value={newAd.imageUrl} onChange={e => setNewAd({...newAd, imageUrl: e.target.value})} />
                   <input type="text" placeholder="Redirect Target Link" className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-xs" value={newAd.link} onChange={e => setNewAd({...newAd, link: e.target.value})} />
                   <button onClick={() => { addAd(newAd); setNewAd({imageUrl:'', link:'', active:true, position:'DASHBOARD_BANNER'}); }} className="w-full bg-orange-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-orange-900/20">Inject Ad Banner</button>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   {state.ads.map(ad => (
                      <div key={ad.id} className="relative group rounded-xl overflow-hidden border border-slate-800 aspect-video">
                         <img src={ad.imageUrl} className="w-full h-full object-cover" alt="Banner" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                            <button onClick={() => removeAd(ad.id)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase">Eject Asset</button>
                         </div>
                      </div>
                   ))}
                   {state.ads.length === 0 && <div className="col-span-2 text-center py-10 text-[10px] text-slate-600 font-black uppercase border-2 border-dashed border-slate-800 rounded-2xl">Asset Library Empty</div>}
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'plugins' && (
          <div className="animate-in fade-in space-y-12">
            <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-10">API & Integration Hub</h3>
            
            <div className="bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-800 space-y-8">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500 font-black">RP</div>
                 <div>
                    <h4 className="text-white font-black text-sm uppercase">Razorpay Payment Gateway</h4>
                    <p className="text-[10px] text-slate-500 font-bold">Remote Node for Enterprise Subscriptions</p>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="text-[9px] text-slate-500 font-black uppercase ml-1 block mb-1">Gateway Public Key (ID)</label>
                    <input type="text" className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-xs font-mono" value={state.integrations.razorpayKeyId} onChange={e => updateIntegrations({ razorpayKeyId: e.target.value })} />
                 </div>
                 <div>
                    <label className="text-[9px] text-slate-500 font-black uppercase ml-1 block mb-1">Operating Mode</label>
                    <select className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-xs font-black uppercase" value={state.integrations.isSandboxMode ? 'TEST' : 'LIVE'} onChange={e => updateIntegrations({ isSandboxMode: e.target.value === 'TEST' })}>
                       <option value="TEST">SANDBOX / DEVELOPMENT</option>
                       <option value="LIVE">PRODUCTION / ACTIVE</option>
                    </select>
                 </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                 <span className="text-[10px] font-black text-slate-400 uppercase">Remote Handshake Status</span>
                 <button onClick={() => updateIntegrations({ razorpayEnabled: !state.integrations.razorpayEnabled })} className={`px-8 py-2.5 rounded-full text-[9px] font-black uppercase ${state.integrations.razorpayEnabled ? 'bg-green-600' : 'bg-red-600'} text-white shadow-xl shadow-black/20`}>
                    {state.integrations.razorpayEnabled ? 'LINKED' : 'DETACHED'}
                 </button>
              </div>
            </div>

            <div className="bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-800 space-y-6">
               <div className="flex items-center gap-4 mb-2">
                 <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center text-green-500 font-black">APK</div>
                 <h4 className="text-white font-black text-sm uppercase">Workforce Mobile App Delivery</h4>
               </div>
               <div>
                  <label className="text-[9px] text-slate-500 font-black uppercase ml-1 block mb-1">Production Binary URL (Direct Download)</label>
                  <div className="flex gap-4">
                     <input type="text" className="flex-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-5 py-4 text-xs font-mono" value={state.apkUrl} onChange={e => updateApkUrl(e.target.value)} />
                     <button onClick={() => alert("APK Reference Updated.")} className="px-8 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Commit URL</button>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeView === 'deployment' && (
           <div className="animate-in fade-in space-y-12">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-10">Cluster System Logs</h3>
              <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 overflow-hidden">
                 <table className="w-full text-left">
                    <thead className="bg-slate-900/60 font-black text-[9px] text-slate-500 uppercase">
                       <tr>
                          <th className="px-10 py-6">Timestamp</th>
                          <th className="px-10 py-6">Origin</th>
                          <th className="px-10 py-6">Payload Message</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                       {state.systemLogs.slice(0, 50).map(log => (
                          <tr key={log.id} className="hover:bg-white/5">
                             <td className="px-10 py-5 text-[10px] font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                             <td className="px-10 py-5"><span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-[9px] font-black">{log.source}</span></td>
                             <td className="px-10 py-5 text-xs text-white font-medium">{log.message}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {activeView === 'plans' && (
           <div className="animate-in fade-in space-y-10">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-10">Infrastructure Tier Config</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 {state.subscriptionPlans.map(plan => (
                    <div key={plan.id} className="bg-slate-900/60 p-8 rounded-[2rem] border border-slate-800 group hover:border-blue-600 transition-all">
                       <h4 className="text-white font-black uppercase text-sm mb-4">{plan.name}</h4>
                       <div className="space-y-4">
                          <div className="flex justify-between">
                             <span className="text-[9px] text-slate-500 font-black">RATE</span>
                             <span className="text-xl font-black text-blue-500">₹{plan.price}</span>
                          </div>
                          <div className="flex justify-between">
                             <span className="text-[9px] text-slate-500 font-black">CAPACITY</span>
                             <span className="text-sm font-black text-white">{plan.userLimit} Users</span>
                          </div>
                          <button onClick={() => setEditingPlan(plan)} className="w-full bg-slate-800 py-3 rounded-xl text-[9px] font-black text-white uppercase mt-4 group-hover:bg-blue-600 transition-all">Recalibrate Tier</button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {activeView === 'enterprises' && (
           <div className="animate-in fade-in space-y-8">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-10">Active Tenant Registry</h3>
              <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 overflow-hidden">
                 <table className="w-full text-left">
                    <thead className="bg-slate-900/60 font-black text-[9px] text-slate-500 uppercase">
                       <tr>
                          <th className="px-10 py-6">Entity</th>
                          <th className="px-10 py-6 text-center">Infrastructure Tier</th>
                          <th className="px-10 py-6 text-right">Operational Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-white">
                       {state.companies.map(c => (
                          <tr key={c.id} className="hover:bg-white/5">
                             <td className="px-10 py-6">
                                <p className="font-black text-sm uppercase">{c.name}</p>
                                <code className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">ID: {c.id}</code>
                             </td>
                             <td className="px-10 py-6 text-center text-[10px] font-black uppercase text-blue-400">
                                {state.subscriptionPlans.find(p => p.id === c.subscriptionPlanId)?.name || 'STANDALONE'}
                             </td>
                             <td className="px-10 py-6 text-right">
                                <button onClick={() => confirm("Execute Remote Node Termination?") && removeCompany(c.id)} className="text-red-500 font-black text-[9px] uppercase tracking-widest border border-red-900/50 px-4 py-1.5 rounded-lg hover:bg-red-600 hover:text-white transition-all">KILL NODE</button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}
      </main>

      {editingPlan && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 rounded-[3rem] border border-slate-800 p-12 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
               <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 text-center">Calibrate Subscription Node</h3>
               <form onSubmit={handleSavePlanEdit} className="space-y-6">
                  <div>
                     <label className="text-[9px] text-slate-500 font-black uppercase ml-1 block mb-1">Tier Name</label>
                     <input type="text" className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl font-black text-sm uppercase" value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[9px] text-slate-500 font-black uppercase ml-1 block mb-1">Amount (₹)</label>
                        <input type="number" className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl font-black text-sm" value={editingPlan.price} onChange={e => setEditingPlan({...editingPlan, price: parseInt(e.target.value) || 0})} />
                     </div>
                     <div>
                        <label className="text-[9px] text-slate-500 font-black uppercase ml-1 block mb-1">Personnel Limit</label>
                        <input type="number" className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl font-black text-sm" value={editingPlan.userLimit} onChange={e => setEditingPlan({...editingPlan, userLimit: parseInt(e.target.value) || 1})} />
                     </div>
                  </div>
                  <div className="flex space-x-3 pt-6">
                     <button type="submit" className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl">Apply Global Sync</button>
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
