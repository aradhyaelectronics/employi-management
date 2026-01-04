
import React, { useState, useMemo } from 'react';
import { User, AppState, UserRole, SubscriptionPlan } from '../types';

interface Props {
  user: User;
  state: AppState;
  updatePlan: (plan: SubscriptionPlan) => void;
  purchasePlan: (companyId: string, planId: string, months?: number) => void;
  removeUser?: (id: string) => Promise<void>;
}

const SubscriptionCenter: React.FC<Props> = ({ user, state, updatePlan, purchasePlan, removeUser }) => {
  const isSuper = user.role === UserRole.SUPER_ADMIN;
  const company = state.companies.find(c => c.id === user.companyId);
  
  // States for Plan Architect
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  
  // States for Direct Activation Hub
  const [targetUserId, setTargetUserId] = useState('');
  const [targetPlanId, setTargetPlanId] = useState('');
  const [targetMonths, setTargetMonths] = useState(1);
  const [isActivating, setIsActivating] = useState(false);

  // States for Personnel Search & Filtering
  const [userSearch, setUserSearch] = useState('');

  // Filter only Admin users for the activation dropdown (as they own the company subscription)
  const enterpriseAdmins = useMemo(() => {
    return state.users.filter(u => u.role === UserRole.ADMIN).sort((a, b) => a.name.localeCompare(b.name));
  }, [state.users]);

  // Global Personnel List for Master View - Shows EVERYONE in the system
  const globalPersonnel = useMemo(() => {
    return state.users
      .filter(u => 
        u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
        (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.mobile && u.mobile.includes(userSearch))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.users, userSearch]);

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlan) {
      updatePlan(editingPlan);
      setEditingPlan(null);
    }
  };

  const handlePurchase = (planName: string) => {
    alert(`PLAN ACTIVATION REQUIRED\n\nPlease contact our support team to activate the "${planName}" plan.\n\nCall: 7709384869`);
  };

  const handleDirectActivation = async () => {
    if (!targetUserId || !targetPlanId) {
      alert("Please select both a Personnel and a Tier.");
      return;
    }

    const selectedUser = state.users.find(u => u.id === targetUserId);
    const selectedPlan = state.subscriptionPlans.find(p => p.id === targetPlanId);
    
    if (!selectedUser || !selectedPlan) return;

    setIsActivating(true);
    await new Promise(r => setTimeout(r, 800));
    
    purchasePlan(selectedUser.companyId, selectedPlan.id, targetMonths);
    
    const companyName = state.companies.find(c => c.id === selectedUser.companyId)?.name || 'Enterprise';
    alert(`ACTIVATION SUCCESSFUL\n\nUser: ${selectedUser.name}\nEnterprise: ${companyName}\nPlan: ${selectedPlan.name}`);
    
    setTargetUserId('');
    setTargetPlanId('');
    setIsActivating(false);
  };

  const handlePurgeAccount = async (u: User) => {
    if (u.id === user.id) return alert("SECURITY ALERT: System Root cannot delete the active session account.");
    
    const companyName = state.companies.find(c => c.id === u.companyId)?.name || 'System';
    const confirmMsg = `CRITICAL ACTION: PURGE ACCOUNT\n\nName: ${u.name}\nRole: ${u.role}\nEnterprise: ${companyName}\n\nAre you sure you want to permanently erase this user from the system? This action is irreversible.`;
    
    if (confirm(confirmMsg)) {
      if (removeUser) {
        await removeUser(u.id);
        alert(`SUCCESS: Account for ${u.name} has been purged.`);
      }
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">
      
      {/* SUPER ADMIN MASTER CONSOLE */}
      {isSuper && (
        <>
          {/* Section 1: Activation Hub */}
          <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full -mr-20 -mt-20"></div>
            <div className="relative z-10">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Direct Activation Hub</h3>
                  <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.3em]">Master Authorization Protocol</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white/5 p-6 rounded-[2rem] border border-white/10 shadow-inner">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-indigo-300 uppercase tracking-widest ml-1">Company Admin</label>
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                    value={targetUserId}
                    onChange={e => setTargetUserId(e.target.value)}
                  >
                    <option value="">Select Admin...</option>
                    {enterpriseAdmins.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({state.companies.find(c => c.id === u.companyId)?.name || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-indigo-300 uppercase tracking-widest ml-1">Tier Selection</label>
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                    value={targetPlanId}
                    onChange={e => setTargetPlanId(e.target.value)}
                  >
                    <option value="">Select Plan...</option>
                    {state.subscriptionPlans.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-indigo-300 uppercase tracking-widest ml-1">Duration</label>
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                    value={targetMonths}
                    onChange={e => setTargetMonths(parseInt(e.target.value))}
                  >
                    {[1, 3, 6, 12, 24].map(m => <option key={m} value={m}>{m} Months</option>)}
                  </select>
                </div>

                <button 
                  onClick={handleDirectActivation}
                  disabled={isActivating || !targetUserId || !targetPlanId}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-900/40 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isActivating ? 'Processing...' : 'Execute Activation'}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Global Personnel Registry & Purge Tool */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-10 border-b border-gray-50 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Global Personnel Registry</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Master Account Management • {state.users.length} Total Units</p>
              </div>
              <div className="relative w-full md:w-80 group">
                <input 
                  type="text" 
                  placeholder="Filter by Name, Email or Mobile..." 
                  className="w-full pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
                <svg className="w-5 h-5 absolute left-4 top-3.5 text-gray-300 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] border-b">Personnel Profile</th>
                    <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] border-b">Enterprise Node</th>
                    <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] border-b">Secret Keys</th>
                    <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] border-b text-right">System Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {globalPersonnel.map((u) => {
                    const userComp = state.companies.find(c => c.id === u.companyId);
                    return (
                      <tr key={u.id} className="hover:bg-blue-50/30 transition-all group">
                        <td className="px-10 py-6">
                           <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] ${u.role === UserRole.SUPER_ADMIN ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                 {u.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-black text-gray-900 uppercase text-xs">{u.name}</p>
                                <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5 tracking-tighter">
                                  {u.role} • {u.mobile || 'NO MOBILE'}
                                </p>
                              </div>
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <div className="flex flex-col">
                             <span className="text-[10px] font-black text-indigo-600 uppercase">
                               {userComp?.name || 'SYSTEM ROOT'}
                             </span>
                             <span className="text-[7px] font-bold text-gray-300 uppercase tracking-widest mt-1">ID: {u.companyId.slice(-6)}</span>
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <div className="flex flex-col space-y-1">
                              <div className="flex items-center space-x-2">
                                 <span className="text-[8px] font-black text-gray-300 uppercase w-6">PW:</span>
                                 <code className="text-[10px] font-mono font-black text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded">{u.password}</code>
                              </div>
                              <div className="flex items-center space-x-2">
                                 <span className="text-[8px] font-black text-gray-300 uppercase w-6">PIN:</span>
                                 <code className="text-[10px] font-mono font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded tracking-widest">{u.pin || '----'}</code>
                              </div>
                           </div>
                        </td>
                        <td className="px-10 py-6 text-right">
                           <button 
                             onClick={() => handlePurgeAccount(u)}
                             className="opacity-0 group-hover:opacity-100 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border border-red-100 flex items-center space-x-2 ml-auto"
                           >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Purge</span>
                           </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-gray-50 text-center border-t border-gray-100">
               <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.4em]">Audit Trail Active • All Purges are Logged</p>
            </div>
          </div>

          {/* Section 3: Plan Architect */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 bg-indigo-50/30 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-indigo-900 uppercase tracking-tighter">Plan Architect</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Global Managed Infrastructure Tiers</p>
              </div>
              <button 
                onClick={() => setEditingPlan({ id: `plan-${Date.now()}`, name: 'Elite Plus', price: 9999, durationDays: 30, userLimit: 100, features: ['24/7 Priority Support', 'Dedicated Account Manager'] })}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all"
              >
                Create New Tier
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan Designation</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pricing Structure</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Seat Limit</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Ops</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {state.subscriptionPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-5">
                         <p className="font-black text-indigo-900 uppercase text-xs">{plan.name}</p>
                         <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{plan.features.length} Activated Features</p>
                      </td>
                      <td className="px-8 py-5">
                         <span className="text-sm font-black text-gray-900">₹{plan.price.toLocaleString()}</span>
                         <span className="text-[9px] font-bold text-gray-400 uppercase ml-1">/ {plan.durationDays} Days</span>
                      </td>
                      <td className="px-8 py-5 text-center text-xs font-black text-indigo-600">{plan.userLimit} Slots</td>
                      <td className="px-8 py-5 text-right">
                         <button onClick={() => setEditingPlan(plan)} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline">Re-Configure</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Plan Configuration Modal */}
          {editingPlan && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-indigo-950/40 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 relative">
                <h3 className="text-2xl font-black text-indigo-900 tracking-tighter mb-8 uppercase">Modify Tier Configuration</h3>
                <form onSubmit={handleSavePlan} className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="md:col-span-2">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Tier Name</label>
                       <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Base Price (₹)</label>
                        <input type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-black text-indigo-600" value={editingPlan.price} onChange={e => setEditingPlan({...editingPlan, price: parseInt(e.target.value) || 0})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Default Validity (Days)</label>
                        <input type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-black" value={editingPlan.durationDays} onChange={e => setEditingPlan({...editingPlan, durationDays: parseInt(e.target.value) || 0})} />
                      </div>
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Workforce Slot Capacity</label>
                      <input type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-black" value={editingPlan.userLimit} onChange={e => setEditingPlan({...editingPlan, userLimit: parseInt(e.target.value) || 0})} />
                   </div>
                   <div className="flex space-x-3 pt-4">
                      <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl">Update System Tier</button>
                      <button type="button" onClick={() => setEditingPlan(null)} className="px-8 py-4 bg-gray-100 text-gray-400 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
                   </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* STANDARD ADMIN VIEW: Upgrade Options */}
      {!isSuper && user.role === UserRole.ADMIN && (
        <div className="space-y-12">
          {/* Active Status Display */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-[2.5rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden text-left">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full -mr-20 -mt-20"></div>
             <div className="relative z-10">
                <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Current Active Agreement</p>
                <h2 className="text-4xl font-black tracking-tighter mb-2">{state.subscriptionPlans.find(p => p.id === company?.subscriptionPlanId)?.name || 'Standard'}</h2>
                <p className="text-white/60 font-bold text-xs uppercase tracking-widest">Valid Until: {company?.subscriptionExpiry ? new Date(company.subscriptionExpiry).toLocaleDateString() : 'N/A'}</p>
             </div>
             <div className="bg-white/10 backdrop-blur-md px-8 py-6 rounded-3xl border border-white/10 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-200 mb-1">Personnel Utilization</p>
                <p className="text-2xl font-black">{state.users.filter(u => u.companyId === user.companyId).length} / {state.subscriptionPlans.find(p => p.id === company?.subscriptionPlanId)?.userLimit || 0}</p>
             </div>
          </div>

          {/* Strategic Options Pricing Grid */}
          <div>
            <div className="text-center mb-10">
               <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Enterprise Upgrade Pathways</h3>
               <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Scale your enterprise infrastructure capacity</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {state.subscriptionPlans.map((plan) => {
                const isActive = company?.subscriptionPlanId === plan.id;
                return (
                  <div key={plan.id} className={`bg-white p-10 rounded-[2.5rem] shadow-sm border transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden flex flex-col ${isActive ? 'border-blue-600 ring-4 ring-blue-50' : 'border-gray-100'}`}>
                    {isActive && (
                      <div className="absolute top-0 right-0 bg-blue-600 text-white px-6 py-2 rounded-bl-3xl text-[9px] font-black uppercase tracking-widest">Current Plan</div>
                    )}
                    <h4 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2">{plan.name}</h4>
                    <div className="flex items-baseline space-x-1 mb-8">
                      <span className="text-3xl font-black text-blue-900">₹{plan.price.toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">/ {plan.durationDays}d</span>
                    </div>
                    <ul className="space-y-4 mb-10 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center text-xs font-bold text-gray-500">
                          <svg className="w-4 h-4 text-green-500 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>
                          {f}
                        </li>
                      ))}
                      <li className="flex items-center text-xs font-black text-blue-900 pt-2 border-t border-gray-50 mt-4">
                         <svg className="w-4 h-4 text-blue-600 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                         {plan.userLimit} Workforce Limit
                      </li>
                    </ul>
                    <button 
                      disabled={isActive}
                      onClick={() => handlePurchase(plan.name)}
                      className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isActive ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'}`}
                    >
                      {isActive ? 'Active Plan' : (plan.price === 0 ? 'Initialize Free Tier' : 'Upgrade Account')}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionCenter;
