
import React, { useState } from 'react';
import { User, AppState, UserRole, SubscriptionPlan } from '../types';

interface Props {
  user: User;
  state: AppState;
  updatePlan: (plan: SubscriptionPlan) => void;
  purchasePlan: (companyId: string, planId: string) => void;
}

const SubscriptionCenter: React.FC<Props> = ({ user, state, updatePlan, purchasePlan }) => {
  const isSuper = user.role === UserRole.SUPER_ADMIN;
  const company = state.companies.find(c => c.id === user.companyId);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlan) {
      updatePlan(editingPlan);
      setEditingPlan(null);
    }
  };

  const handlePurchase = (planId: string) => {
    if (confirm("Proceed to simulated secure payment for this plan?")) {
      purchasePlan(user.companyId, planId);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Super Admin Management Interface */}
      {isSuper && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black text-purple-900 uppercase tracking-tighter">System Revenue Model</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Configure global subscription tiers</p>
            </div>
            <button 
              onClick={() => setEditingPlan({ id: `plan-${Date.now()}`, name: 'New Plan', price: 999, durationDays: 30, userLimit: 10, features: [] })}
              className="bg-purple-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              Add New Tier
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan Name</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pricing</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">User Limit</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {state.subscriptionPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5 font-black text-gray-800 uppercase text-xs">{plan.name}</td>
                    <td className="px-8 py-5 text-sm font-black text-purple-600">₹{plan.price} / {plan.durationDays}d</td>
                    <td className="px-8 py-5 text-xs font-bold text-gray-500">{plan.userLimit} Slots</td>
                    <td className="px-8 py-5 text-right">
                       <button onClick={() => setEditingPlan(plan)} className="text-purple-600 font-black text-[10px] uppercase tracking-widest hover:underline">Edit Config</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {editingPlan && isSuper && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-purple-900/40 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10">
            <h3 className="text-2xl font-black text-purple-900 tracking-tighter mb-8">Configure Subscription Tier</h3>
            <form onSubmit={handleSavePlan} className="space-y-4">
               <div>
                 <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Plan Display Name</label>
                 <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Price (₹)</label>
                    <input type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" value={editingPlan.price} onChange={e => setEditingPlan({...editingPlan, price: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Duration (Days)</label>
                    <input type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" value={editingPlan.durationDays} onChange={e => setEditingPlan({...editingPlan, durationDays: parseInt(e.target.value) || 0})} />
                  </div>
               </div>
               <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Max Personnel Limit</label>
                  <input type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" value={editingPlan.userLimit} onChange={e => setEditingPlan({...editingPlan, userLimit: parseInt(e.target.value) || 0})} />
               </div>
               <div className="flex space-x-3 pt-4">
                  <button type="submit" className="flex-1 bg-purple-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest">Update System Config</button>
                  <button type="button" onClick={() => setEditingPlan(null)} className="px-8 py-4 bg-gray-100 text-gray-400 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Purchase UI */}
      {!isSuper && user.role === UserRole.ADMIN && (
        <div className="space-y-12">
          {/* Active Status */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-[2.5rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full -mr-20 -mt-20"></div>
             <div className="relative z-10">
                <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Current Active Agreement</p>
                <h2 className="text-4xl font-black tracking-tighter mb-2">{state.subscriptionPlans.find(p => p.id === company?.subscriptionPlanId)?.name || 'Standard'}</h2>
                <p className="text-white/60 font-bold text-xs uppercase tracking-widest">Valid Until: {company?.subscriptionExpiry ? new Date(company.subscriptionExpiry).toLocaleDateString() : 'N/A'}</p>
             </div>
             <div className="bg-white/10 backdrop-blur-md px-8 py-6 rounded-3xl border border-white/10">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-200 mb-1">Personnel Utilization</p>
                <p className="text-2xl font-black">{state.users.filter(u => u.companyId === user.companyId).length} / {state.subscriptionPlans.find(p => p.id === company?.subscriptionPlanId)?.userLimit || 0}</p>
             </div>
          </div>

          {/* Pricing Grid */}
          <div>
            <div className="text-center mb-10">
               <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Strategic Upgrade Options</h3>
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
                      <span className="text-3xl font-black text-blue-900">₹{plan.price}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">/ {plan.durationDays}d</span>
                    </div>
                    <ul className="space-y-4 mb-10 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center text-xs font-bold text-gray-500">
                          <svg className="w-4 h-4 text-green-500 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>
                          {f}
                        </li>
                      ))}
                      <li className="flex items-center text-xs font-black text-blue-900 pt-2">
                         <svg className="w-4 h-4 text-blue-600 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                         {plan.userLimit} Workforce Cap
                      </li>
                    </ul>
                    <button 
                      disabled={isActive}
                      onClick={() => handlePurchase(plan.id)}
                      className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isActive ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'}`}
                    >
                      {isActive ? 'Active Subscription' : (plan.price === 0 ? 'Activate Free Tier' : 'Upgrade Enterprise')}
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
