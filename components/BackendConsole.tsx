
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
  
  const [annInput, setAnnInput] = useState(state.announcement || { title: '', message: '', active: false });

  const handleSavePlanEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    await updateSubscriptionPlanConfig(editingPlan.id, {
      ...editingPlan,
      updatedAt: new Date().toISOString()
    });
    setEditingPlan(null);
    alert("Subscription Node Updated Globally.");
  };

  const handleManualProvision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisioningForm.companyId || !provisioningForm.planId) {
      alert("Missing required fields.");
      return;
    }
    purchaseSubscription(provisioningForm.companyId, provisioningForm.planId, provisioningForm.months);
    alert(`Node Provisioned Successfully.`);
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
            { id: 'marketing', label: 'Marketing' },
            { id: 'plugins', label: 'API & Gateway' },
            { id: 'deployment', label: 'Hostinger Sync' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as any)}
              className={`w-full text-left px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeView === item.id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto max-h-[85vh] custom-scrollbar">
        {activeView === 'status' && (
           <div className="animate-in fade-in duration-500">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-10">Cluster Telemetry</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="p-10 bg-slate-900/50 rounded-[2.5rem] border border-slate-800">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Live Companies</p>
                    <p className="text-5xl font-black text-white">{state.companies.length}</p>
                 </div>
                 <div className="p-10 bg-slate-900/50 rounded-[2.5rem] border border-slate-800">
                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-4">Personnel IDs</p>
                    <p className="text-5xl font-black text-white">{state.users.length}</p>
                 </div>
                 <div className="p-10 bg-slate-900/50 rounded-[2.5rem] border border-slate-800">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-4">Total Logs</p>
                    <p className="text-5xl font-black text-white">{state.workLogs.length}</p>
                 </div>
              </div>
           </div>
        )}

        {activeView === 'provisioning' && (
          <div className="animate-in fade-in duration-500 space-y-10 max-w-2xl">
            <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-10">Manual Provisioning</h3>
            <div className="bg-slate-900/60 p-10 rounded-[3rem] border border-slate-800 shadow-xl">
              <form onSubmit={handleManualProvision} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] text-slate-500 font-black uppercase ml-1">Enterprise Node</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl font-black text-sm uppercase" 
                    value={provisioningForm.companyId}
                    onChange={e => setProvisioningForm({...provisioningForm, companyId: e.target.value})}
                    required
                  >
                    <option value="">Choose Company...</option>
                    {state.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] text-slate-500 font-black uppercase ml-1">Subscription Tier</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl font-black text-sm uppercase" 
                    value={provisioningForm.planId}
                    onChange={e => setProvisioningForm({...provisioningForm, planId: e.target.value})}
                    required
                  >
                    <option value="">Select Tier...</option>
                    {state.subscriptionPlans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] text-slate-500 font-black uppercase ml-1">Months</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl font-black text-sm" 
                    value={provisioningForm.months} 
                    onChange={e => setProvisioningForm({...provisioningForm, months: parseInt(e.target.value) || 1})} 
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-4">Execute Provisioning</button>
              </form>
            </div>
          </div>
        )}

        {activeView === 'plans' && (
           <div className="animate-in fade-in duration-500 space-y-10">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Tier Configurations</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {state.subscriptionPlans.map(plan => (
                    <div key={plan.id} className="bg-slate-900/60 p-8 rounded-[2rem] border border-slate-800">
                       <h4 className="text-white font-black uppercase text-sm mb-4">{plan.name}</h4>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center">
                             <span className="text-[9px] text-slate-500 font-black uppercase">Amount</span>
                             <span className="text-xl font-black text-blue-500">₹{plan.price}</span>
                          </div>
                          <div className="flex justify-between items-center">
                             <span className="text-[9px] text-slate-500 font-black uppercase">Users Cap</span>
                             <span className="text-sm font-black text-white">{plan.userLimit}</span>
                          </div>
                          <button onClick={() => setEditingPlan(plan)} className="w-full bg-slate-800 py-3 rounded-xl text-[9px] font-black text-white uppercase mt-4 hover:bg-blue-600 transition-all">Edit Config</button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {activeView === 'enterprises' && (
           <div className="animate-in fade-in duration-500 space-y-8">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Enterprise Registry</h3>
              <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 overflow-hidden">
                 <table className="w-full text-left">
                    <thead className="bg-slate-900/60">
                       <tr>
                          <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase">Company</th>
                          <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase text-center">Tier</th>
                          <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase text-right">Ops</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-white">
                       {state.companies.map(c => (
                          <tr key={c.id} className="hover:bg-white/5">
                             <td className="px-8 py-6">
                                <p className="font-black text-sm uppercase">{c.name}</p>
                                <p className="text-[8px] font-bold text-slate-500 uppercase">ID: {c.id}</p>
                             </td>
                             <td className="px-8 py-6 text-center text-[10px] font-black uppercase text-blue-400">
                                {state.subscriptionPlans.find(p => p.id === c.subscriptionPlanId)?.name || 'Standard'}
                             </td>
                             <td className="px-8 py-6 text-right">
                                <button onClick={() => confirm("Confirm Kill?") && removeCompany(c.id)} className="text-red-500 font-black text-[9px] uppercase">Kill Node</button>
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
               <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 text-center">Update Subscription Tier</h3>
               <form onSubmit={handleSavePlanEdit} className="space-y-6">
                  <div>
                     <label className="text-[9px] text-slate-500 font-black uppercase ml-1">Tier Name</label>
                     <input type="text" className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl font-black text-sm" value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[9px] text-slate-500 font-black uppercase ml-1">Amount (₹)</label>
                        <input type="number" className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl font-black text-sm" value={editingPlan.price} onChange={e => setEditingPlan({...editingPlan, price: parseInt(e.target.value)})} />
                     </div>
                     <div>
                        <label className="text-[9px] text-slate-500 font-black uppercase ml-1">Identity Limit</label>
                        <input type="number" className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl font-black text-sm" value={editingPlan.userLimit} onChange={e => setEditingPlan({...editingPlan, userLimit: parseInt(e.target.value)})} />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[9px] text-slate-500 font-black uppercase ml-1">Validity (Days)</label>
                        <input type="number" className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl font-black text-sm" value={editingPlan.durationDays} onChange={e => setEditingPlan({...editingPlan, durationDays: parseInt(e.target.value)})} />
                    </div>
                    <div className="flex items-center space-x-3 pt-6">
                        <input 
                          type="checkbox" 
                          id="offers_toggle"
                          className="w-5 h-5 rounded bg-slate-950 border-slate-800" 
                          checked={editingPlan.offersEnabled} 
                          onChange={e => setEditingPlan({...editingPlan, offersEnabled: e.target.checked})} 
                        />
                        <label htmlFor="offers_toggle" className="text-[9px] font-black text-white uppercase">Enable Offers</label>
                    </div>
                  </div>
                  {editingPlan.updatedAt && (
                    <div className="text-center">
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Last Updated: {new Date(editingPlan.updatedAt).toLocaleString()}</p>
                    </div>
                  )}
                  <div className="flex space-x-3 pt-4">
                     <button type="submit" className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest">Sync Globally</button>
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
