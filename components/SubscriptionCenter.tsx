
import React, { useState, useMemo } from 'react';
import { User, AppState, UserRole, SubscriptionPlan, Company, Invoice } from '../types';
import InvoiceModal from './InvoiceModal';

interface Props {
  user: User;
  state: AppState;
  updatePlan: (plan: SubscriptionPlan) => void;
  purchasePlan: (companyId: string, planId: string, months?: number, txId?: string) => void;
  removeUser?: (id: string) => Promise<void>;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const SubscriptionCenter: React.FC<Props> = ({ user, state, purchasePlan }) => {
  const isSuper = user.role === UserRole.SUPER_ADMIN;
  const company = state.companies.find(c => c.id === user.companyId);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  
  const [targetCompanyId, setTargetCompanyId] = useState('');
  const [targetPlanId, setTargetPlanId] = useState('');
  const [targetMonths, setTargetMonths] = useState(1);
  const [isActivating, setIsActivating] = useState(false);

  const companyInvoices = useMemo(() => {
    return state.invoices
      .filter(inv => inv.companyId === user.companyId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.invoices, user.companyId]);

  const handlePurchase = (plan: SubscriptionPlan) => {
    if (!state.integrations.razorpayEnabled) {
      return alert("GATEWAY ERROR: Remote payments are currently disabled by the Cloud Master.");
    }

    if (!state.integrations.razorpayKeyId) {
      return alert("CONFIGURATION ERROR: Razorpay Key ID is missing in Gateway settings.");
    }

    setIsProcessing(plan.id);

    // Development / Sandbox Mode Check
    if (state.integrations.isSandboxMode) {
      setTimeout(() => {
        if (confirm(`SANDBOX MODE ACTIVE\n\nLicense: ${plan.name}\nAmount: ₹${plan.price}\n\nThis is a simulation. No real money will be charged. Proceed with mock authorization?`)) {
          const mockTx = `SBX-${Date.now()}-${Math.floor(Math.random()*1000)}`;
          purchasePlan(user.companyId, plan.id, 1, mockTx);
          alert(`CLUSTER UPGRADED: ${plan.name} tier authorized for this tenant.`);
        }
        setIsProcessing(null);
      }, 1000);
      return;
    }

    // Live Razorpay Integration
    if (typeof window.Razorpay === 'undefined') {
      setIsProcessing(null);
      return alert("CRITICAL: Razorpay SDK not loaded. Please check your internet connection.");
    }

    try {
      const options = {
        key: state.integrations.razorpayKeyId,
        amount: Math.round(plan.price * 100),
        currency: "INR",
        name: "Pragati Cloud Workforce",
        description: `Deployment: ${plan.name} Tier`,
        image: "https://cdn-icons-png.flaticon.com/512/3063/3063822.png",
        handler: function (response: any) {
          if (response.razorpay_payment_id) {
            purchasePlan(user.companyId, plan.id, 1, response.razorpay_payment_id);
            alert(`SUCCESS: Infrastructure authorized. Transaction: ${response.razorpay_payment_id}`);
          }
          setIsProcessing(null);
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.mobile || ""
        },
        notes: {
          company_id: user.companyId,
          plan_id: plan.id
        },
        theme: {
          color: "#0D47A1"
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setIsProcessing(null);
        alert(`GATEWAY DECLINED: ${response.error.description}`);
      });
      rzp.open();
    } catch (err: any) {
      setIsProcessing(null);
      alert("PAYMENT INITIALIZATION FAILED: " + err.message);
    }
  };

  const handleDirectActivation = async () => {
    if (!targetCompanyId || !targetPlanId) return alert("Target Enterprise and Tier required.");
    setIsActivating(true);
    await new Promise(r => setTimeout(r, 800));
    purchasePlan(targetCompanyId, targetPlanId, targetMonths, `ROOT-${Date.now()}`);
    alert(`SUCCESS: Enterprise Node "${state.companies.find(c => c.id === targetCompanyId)?.name}" provisioned.`);
    setTargetCompanyId(''); setTargetPlanId('');
    setIsActivating(false);
  };

  const getDaysRemaining = (expiry: string | undefined) => {
    if (!expiry) return 0;
    const diff = new Date(expiry).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const activePlan = state.subscriptionPlans.find(p => p.id === company?.subscriptionPlanId) || state.subscriptionPlans[0];
  const daysLeft = getDaysRemaining(company?.subscriptionExpiry);

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-24">
      {isSuper && (
        <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden border border-slate-800">
           <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full"></div>
           <div className="relative z-10">
              <h3 className="text-3xl font-black uppercase tracking-tighter mb-10 flex items-center">
                 <span className="w-8 h-1 bg-blue-500 mr-4"></span> Command Center Activation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end bg-white/5 p-8 rounded-[2.5rem] border border-white/10">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Enterprise Node</label>
                    <select className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-4 text-xs font-bold outline-none" value={targetCompanyId} onChange={e => setTargetCompanyId(e.target.value)}>
                       <option value="">Choose Tenant...</option>
                       {state.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Service Tier</label>
                    <select className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-4 text-xs font-bold outline-none" value={targetPlanId} onChange={e => setTargetPlanId(e.target.value)}>
                       <option value="">Choose Plan...</option>
                       {state.subscriptionPlans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Agreement Term</label>
                    <select className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-4 text-xs font-bold outline-none" value={targetMonths} onChange={e => setTargetMonths(parseInt(e.target.value))}>
                       {[1, 3, 6, 12].map(m => <option key={m} value={m}>{m} Months</option>)}
                    </select>
                 </div>
                 <button onClick={handleDirectActivation} disabled={isActivating || !targetCompanyId || !targetPlanId} className="w-full py-4 rounded-xl font-black uppercase text-[11px] tracking-widest bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-xl shadow-blue-900/20 disabled:bg-slate-800 disabled:text-slate-600">
                    {isActivating ? 'Authorizing Node...' : 'Inject License'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {!isSuper && (
        <div className="space-y-12">
          <div className="bg-white rounded-[3.5rem] p-12 shadow-sm border border-gray-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 blur-3xl rounded-full"></div>
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="text-center md:text-left">
                   <p className="text-blue-600 text-[11px] font-black uppercase tracking-[0.4em] mb-4">Current Service Tier</p>
                   <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 uppercase leading-none">
                     {activePlan.name}
                   </h2>
                   <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest">Limit: {activePlan.userLimit} Users</div>
                      <div className="px-4 py-2 bg-blue-50 rounded-xl text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        Expiry: {company?.subscriptionExpiry ? new Date(company.subscriptionExpiry).toLocaleDateString() : 'Lifetime (Free)'}
                      </div>
                   </div>
                </div>
                
                <div className="flex flex-col items-center justify-center p-10 bg-slate-900 rounded-[3rem] text-white shadow-2xl min-w-[240px]">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Cluster Status</p>
                   <p className={`text-4xl font-black tracking-tighter mb-2 ${daysLeft > 0 ? 'text-green-400' : 'text-orange-500'}`}>
                      {daysLeft > 0 ? daysLeft : 'Trial'}
                   </p>
                   <p className="text-[10px] font-black text-white uppercase tracking-widest">Days Remaining</p>
                </div>
             </div>
          </div>

          <div className="space-y-6">
             <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter text-center">Available Upgrades</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {state.subscriptionPlans.map((plan) => {
                 const isCurrent = company?.subscriptionPlanId === plan.id;
                 return (
                   <div key={plan.id} className={`bg-white p-12 rounded-[3rem] shadow-sm border-2 transition-all hover:shadow-2xl flex flex-col relative group ${isCurrent ? 'border-blue-600' : 'border-gray-50'}`}>
                     {isCurrent && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Active Node</div>
                     )}
                     <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-2">{plan.name}</h4>
                     <div className="flex items-baseline space-x-2 mb-10">
                       <span className="text-4xl font-black text-blue-900">₹{plan.price.toLocaleString()}</span>
                       <span className="text-xs font-bold text-gray-400 uppercase">/ cycle</span>
                     </div>
                     
                     <div className="space-y-6 flex-1 mb-12">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Included Protocols</p>
                        <ul className="space-y-4">
                          {plan.features.map((f, i) => (
                             <li key={i} className="flex items-center text-xs font-bold text-slate-600 leading-tight">
                                <span className="w-5 h-5 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-[10px] font-black mr-3 shrink-0">✓</span>
                                {f}
                             </li>
                          ))}
                        </ul>
                     </div>

                     <button 
                       disabled={isCurrent || isProcessing === plan.id}
                       onClick={() => handlePurchase(plan)}
                       className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-xl ${isCurrent ? 'bg-slate-100 text-slate-400 cursor-default' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-900/10'}`}
                     >
                       {isProcessing === plan.id ? 'Connecting Gateway...' : isCurrent ? 'Current Tier' : 'Authorize Upgrade'}
                     </button>
                   </div>
                 );
               })}
             </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
                <h3 className="text-xl font-black uppercase text-blue-900 tracking-tighter">Agreement History</h3>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Electronic Invoices</span>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-slate-50/50">
                      <tr>
                         <th className="px-10 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Authorization Date</th>
                         <th className="px-10 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Service Tier</th>
                         <th className="px-10 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Amount</th>
                         <th className="px-10 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Receipt</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {companyInvoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-all">
                           <td className="px-10 py-6"><p className="text-xs font-black text-slate-700">{new Date(inv.date).toLocaleDateString()}</p></td>
                           <td className="px-10 py-6 text-xs font-black text-blue-600 uppercase">{state.subscriptionPlans.find(p => p.id === inv.planId)?.name}</td>
                           <td className="px-10 py-6 text-center text-sm font-black text-slate-900">₹{inv.amount.toLocaleString()}</td>
                           <td className="px-10 py-6 text-right">
                              <button onClick={() => setViewInvoice(inv)} className="text-blue-600 font-black text-[10px] uppercase hover:underline tracking-widest">View Master Invoice</button>
                           </td>
                        </tr>
                      ))}
                      {companyInvoices.length === 0 && (
                        <tr>
                           <td colSpan={4} className="py-20 text-center font-black text-[10px] text-gray-300 uppercase tracking-[0.4em]">No Paid Invoices in Registry</td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}
      
      {viewInvoice && <InvoiceModal invoice={viewInvoice} state={state} onClose={() => setViewInvoice(null)} />}
    </div>
  );
};

export default SubscriptionCenter;
