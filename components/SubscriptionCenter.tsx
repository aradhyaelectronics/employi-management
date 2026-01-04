
import React, { useState, useMemo, useEffect } from 'react';
import { User, AppState, UserRole, SubscriptionPlan, Company } from '../types';

interface Props {
  user: User;
  state: AppState;
  updatePlan: (plan: SubscriptionPlan) => void;
  purchasePlan: (companyId: string, planId: string, months?: number) => void;
  removeUser?: (id: string) => Promise<void>;
}

// Razorpay Type Definition
declare const Razorpay: any;

const SubscriptionCenter: React.FC<Props> = ({ user, state, updatePlan, purchasePlan, removeUser }) => {
  const isSuper = user.role === UserRole.SUPER_ADMIN;
  const company = state.companies.find(c => c.id === user.companyId);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  // States for Direct Activation Hub
  const [targetCompanyId, setTargetCompanyId] = useState('');
  const [targetPlanId, setTargetPlanId] = useState('');
  const [targetMonths, setTargetMonths] = useState(1);
  const [isActivating, setIsActivating] = useState(false);

  const [userSearch, setUserSearch] = useState('');

  const globalPersonnel = useMemo(() => {
    return state.users
      .filter(u => 
        u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
        (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.mobile && u.mobile.includes(userSearch))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.users, userSearch]);

  const handlePurchase = (plan: SubscriptionPlan) => {
    setIsProcessing(plan.id);

    // 1. Check if we should use Sandbox/Demo mode first
    if (state.integrations.isSandboxMode || !state.integrations.razorpayEnabled) {
      setTimeout(() => {
        if (confirm(`ENVIRONMENT ALERT: Secure Payment Popup might be blocked in this view.\n\nWould you like to use the "Internal Cloud Verification" for this ${plan.name} upgrade?`)) {
          purchasePlan(user.companyId, plan.id, 1);
          alert(`SUCCESS: Node upgraded to ${plan.name} via Cloud Verification.`);
        }
        setIsProcessing(null);
      }, 800);
      return;
    }

    // 2. Validate Razorpay SDK Presence
    if (typeof Razorpay === 'undefined') {
      setIsProcessing(null);
      return alert("CRITICAL: Razorpay Engine is not responding. Please check your internet connection or turn on 'Sandbox Mode' in the Backend Console.");
    }

    try {
      // Ensure amount is an absolute integer (Razorpay requirement)
      const amountInPaise = Math.round(plan.price * 100);

      const options = {
        key: state.integrations.razorpayKeyId || "rzp_test_58Xm92p1Yk87X",
        amount: amountInPaise,
        currency: "INR",
        name: "Pragati Workforce Cloud",
        description: `License Upgrade: ${plan.name}`,
        image: "https://cdn-icons-png.flaticon.com/512/3063/3063822.png",
        handler: function (response: any) {
          purchasePlan(user.companyId, plan.id, 1);
          alert(`PAYMENT SUCCESSFUL\n\nReference: ${response.razorpay_payment_id}\n\nYour enterprise cluster has been upgraded.`);
          setIsProcessing(null);
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.mobile || ""
        },
        notes: {
          enterprise_id: user.companyId,
          plan_id: plan.id,
          platform: "Pragati_Cloud_V4"
        },
        theme: {
          color: "#0D47A1"
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(null);
            console.log('Payment window closed by user.');
          }
        }
      };

      const rzp1 = new Razorpay(options);
      
      rzp1.on('payment.failed', function (response: any) {
        setIsProcessing(null);
        alert(`PAYMENT FAILED: ${response.error.description}\n\nReason: ${response.error.reason}\n\nIf using a test key, ensure you are in the correct environment.`);
      });

      rzp1.open();
    } catch (err: any) {
      setIsProcessing(null);
      alert("System Error during payment initialization: " + err.message);
    }
  };

  const handleDirectActivation = async () => {
    if (!targetCompanyId || !targetPlanId) {
      alert("CRITICAL: Please select both a Target Enterprise and a Tier.");
      return;
    }
    const selectedCompany = state.companies.find(c => c.id === targetCompanyId);
    const selectedPlan = state.subscriptionPlans.find(p => p.id === targetPlanId);
    if (!selectedCompany || !selectedPlan) return;

    setIsActivating(true);
    await new Promise(r => setTimeout(r, 1200));
    purchasePlan(selectedCompany.id, selectedPlan.id, targetMonths);
    alert(`SUCCESS: Authorization Propagated\n\nEnterprise: ${selectedCompany.name}\nAuthorized Tier: ${selectedPlan.name}`);
    setTargetCompanyId('');
    setTargetPlanId('');
    setIsActivating(false);
  };

  const handlePurgeAccount = async (u: User) => {
    if (u.id === user.id) return alert("SECURITY ALERT: Cannot purge active master session.");
    if (confirm(`PERMANENT PURGE: ${u.name}?\n\nThis will erase all historical telemetry.`)) {
      if (removeUser) await removeUser(u.id);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">
      
      {/* SUPER ADMIN MASTER CONSOLE */}
      {isSuper && (
        <>
          <div className="bg-slate-950 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full -mr-32 -mt-32"></div>
            <div className="relative z-10">
              <div className="flex items-center space-x-4 mb-10">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-white">Direct Activation Hub</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em]">Cloud Provisioning Active</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end bg-white/5 p-8 rounded-[2.5rem] border border-white/10 shadow-inner">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-300 uppercase tracking-widest ml-1">Target Enterprise</label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-4 text-xs font-bold outline-none focus:border-blue-500 transition-all cursor-pointer"
                    value={targetCompanyId}
                    onChange={e => setTargetCompanyId(e.target.value)}
                  >
                    <option value="">Select Registered Enterprise...</option>
                    {state.companies.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Plan: {state.subscriptionPlans.find(p => p.id === c.subscriptionPlanId)?.name || 'None'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-300 uppercase tracking-widest ml-1">Service Tier</label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-4 text-xs font-bold outline-none focus:border-blue-500 transition-all cursor-pointer"
                    value={targetPlanId}
                    onChange={e => setTargetPlanId(e.target.value)}
                  >
                    <option value="">Choose Provisioning Plan...</option>
                    {state.subscriptionPlans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - ₹{p.price}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-300 uppercase tracking-widest ml-1">Activation Term</label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-4 text-xs font-bold outline-none focus:border-blue-500 transition-all cursor-pointer"
                    value={targetMonths}
                    onChange={e => setTargetMonths(parseInt(e.target.value))}
                  >
                    {[1, 3, 6, 12, 24, 36].map(m => <option key={m} value={m}>{m} Months Validity</option>)}
                  </select>
                </div>

                <button 
                  onClick={handleDirectActivation}
                  disabled={isActivating || !targetCompanyId || !targetPlanId}
                  className={`w-full py-4 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-2xl transition-all active:scale-95 flex items-center justify-center space-x-2 ${
                    isActivating ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'
                  }`}
                >
                  {isActivating && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                  <span>{isActivating ? 'Syncing...' : 'Provision Now'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden mt-8">
            <div className="p-10 border-b border-gray-50 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Global Personnel Cloud</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Cross-Tenant Identity Management • {state.users.length} Active IDs</p>
              </div>
              <div className="relative w-full md:w-96 group">
                <input 
                  type="text" 
                  placeholder="Search Global Personnel Database..." 
                  className="w-full pl-12 pr-6 py-5 bg-white border border-gray-200 rounded-3xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
                <svg className="w-5 h-5 absolute left-4 top-4.5 text-gray-300 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">Personnel Identity</th>
                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">Enterprise Hub</th>
                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">Access Credentials</th>
                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b text-right">System Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {globalPersonnel.map((u) => {
                    const userComp = state.companies.find(c => c.id === u.companyId);
                    return (
                      <tr key={u.id} className="hover:bg-blue-50/20 transition-all group">
                        <td className="px-10 py-8">
                           <div className="flex items-center space-x-4">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${u.role === UserRole.SUPER_ADMIN ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                 {u.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-black text-gray-900 uppercase text-sm tracking-tight">{u.name}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5 tracking-widest">
                                  {u.role} • {u.mobile || 'NO-SIM-LINK'}
                                </p>
                              </div>
                           </div>
                        </td>
                        <td className="px-10 py-8">
                           <div className="flex flex-col">
                             <span className="text-[11px] font-black text-blue-600 uppercase tracking-tight">
                               {userComp?.name || 'CLOUD_ROOT'}
                             </span>
                             <span className="text-[8px] font-bold text-gray-300 uppercase tracking-[0.2em] mt-1">NODE: {u.companyId.slice(-8)}</span>
                           </div>
                        </td>
                        <td className="px-10 py-8">
                           <div className="flex flex-col space-y-1.5">
                              <div className="flex items-center space-x-3">
                                 <span className="text-[9px] font-black text-gray-300 uppercase w-8">PASS:</span>
                                 <code className="text-[10px] font-mono font-black text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">{u.password}</code>
                              </div>
                              <div className="flex items-center space-x-3">
                                 <span className="text-[9px] font-black text-gray-300 uppercase w-8">PIN:</span>
                                 <code className="text-[10px] font-mono font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg tracking-widest">{u.pin || '####'}</code>
                              </div>
                           </div>
                        </td>
                        <td className="px-10 py-8 text-right">
                           <button 
                             onClick={() => handlePurgeAccount(u)}
                             className="opacity-0 group-hover:opacity-100 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-red-100 ml-auto shadow-sm"
                           >
                              Purge ID
                           </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* STANDARD ADMIN UPGRADE PATHS */}
      {!isSuper && user.role === UserRole.ADMIN && (
        <div className="space-y-12">
          <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 blur-[100px] rounded-full"></div>
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                <div>
                   <p className="text-blue-400 text-[11px] font-black uppercase tracking-[0.4em] mb-4">Current Infrastructure Lease</p>
                   <h2 className="text-5xl font-black tracking-tighter mb-4">
                     {state.subscriptionPlans.find(p => p.id === company?.subscriptionPlanId)?.name || 'Basic Cluster'}
                   </h2>
                   <div className="flex items-center space-x-4">
                      <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/10">
                        <p className="text-[9px] font-bold uppercase text-blue-300">Valid Until</p>
                        <p className="text-sm font-black">{company?.subscriptionExpiry ? new Date(company.subscriptionExpiry).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/10">
                        <p className="text-[9px] font-bold uppercase text-blue-300">Workforce Status</p>
                        <p className="text-sm font-black">{state.users.filter(u => u.companyId === user.companyId).length} / {state.subscriptionPlans.find(p => p.id === company?.subscriptionPlanId)?.userLimit || 0} Slots</p>
                      </div>
                   </div>
                </div>
                <div className="bg-blue-600 px-10 py-8 rounded-[2.5rem] shadow-3xl text-center border-4 border-blue-500/50">
                   <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1">Status Code</p>
                   <p className="text-3xl font-black uppercase">Active</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {state.subscriptionPlans.map((plan) => {
              const isActive = company?.subscriptionPlanId === plan.id;
              const processing = isProcessing === plan.id;
              return (
                <div key={plan.id} className={`bg-white p-12 rounded-[3rem] shadow-sm border-2 transition-all hover:shadow-2xl hover:-translate-y-2 relative overflow-hidden flex flex-col ${isActive ? 'border-blue-600 ring-8 ring-blue-50' : 'border-gray-50'}`}>
                  {isActive && <div className="absolute top-0 right-0 bg-blue-600 text-white px-8 py-3 rounded-bl-[2rem] text-[10px] font-black uppercase tracking-widest">Active Plan</div>}
                  <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-2">{plan.name}</h4>
                  <div className="flex items-baseline space-x-2 mb-10">
                    <span className="text-4xl font-black text-blue-900">₹{plan.price.toLocaleString()}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase">/ {plan.durationDays}d</span>
                  </div>
                  <ul className="space-y-5 mb-12 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center text-sm font-bold text-gray-600">
                        <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3 shrink-0"><svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg></div>
                        {f}
                      </li>
                    ))}
                    <li className="flex items-center text-sm font-black text-blue-900 pt-4 border-t border-gray-100">
                       <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mr-3 shrink-0"><svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
                       {plan.userLimit} Team Slot Capacity
                    </li>
                  </ul>
                  
                  <div className="space-y-3">
                    <button 
                      disabled={isActive || processing}
                      onClick={() => handlePurchase(plan)}
                      className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${
                        isActive ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 
                        processing ? 'bg-blue-400 text-white cursor-wait' :
                        'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-100'
                      }`}
                    >
                      {processing && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                      <span>{isActive ? 'Current Active Lease' : processing ? 'Opening Gateway...' : 'Initiate Upgrade'}</span>
                    </button>
                    
                    {(state.integrations.isSandboxMode || !state.integrations.razorpayEnabled) && !isActive && (
                      <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex items-center justify-between">
                         <span className="text-[8px] font-black text-orange-600 uppercase tracking-widest">Demo Mode Active</span>
                         <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-center space-x-2">
                     <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                     <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Secure 256-bit Link</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionCenter;
