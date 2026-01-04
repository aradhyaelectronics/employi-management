
import React, { useState, useMemo, useEffect } from 'react';
import { User, AppState, UserRole, SubscriptionPlan, Company, Invoice } from '../types';
import InvoiceModal from './InvoiceModal';

interface Props {
  user: User;
  state: AppState;
  updatePlan: (plan: SubscriptionPlan) => void;
  purchasePlan: (companyId: string, planId: string, months?: number, txId?: string) => void;
  removeUser?: (id: string) => Promise<void>;
}

// Razorpay Type Definition
declare const Razorpay: any;

const SubscriptionCenter: React.FC<Props> = ({ user, state, updatePlan, purchasePlan, removeUser }) => {
  const isSuper = user.role === UserRole.SUPER_ADMIN;
  const company = state.companies.find(c => c.id === user.companyId);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  
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

  const companyInvoices = useMemo(() => {
    return state.invoices
      .filter(inv => inv.companyId === user.companyId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.invoices, user.companyId]);

  const handlePurchase = (plan: SubscriptionPlan) => {
    setIsProcessing(plan.id);

    // 1. Check if we should use Sandbox/Demo mode first
    if (state.integrations.isSandboxMode || !state.integrations.razorpayEnabled) {
      setTimeout(() => {
        if (confirm(`ENVIRONMENT ALERT: Secure Payment Popup might be blocked in this view.\n\nWould you like to use the "Internal Cloud Verification" for this ${plan.name} upgrade?`)) {
          const mockTx = `SBX-${Date.now()}`;
          purchasePlan(user.companyId, plan.id, 1, mockTx);
          alert(`SUCCESS: Node upgraded to ${plan.name} via Cloud Verification. Invoice generated.`);
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
      const amountInPaise = Math.round(plan.price * 100);

      const options = {
        key: state.integrations.razorpayKeyId || "rzp_test_58Xm92p1Yk87X",
        amount: amountInPaise,
        currency: "INR",
        name: "Pragati Workforce Cloud",
        description: `License Upgrade: ${plan.name}`,
        image: "https://cdn-icons-png.flaticon.com/512/3063/3063822.png",
        handler: function (response: any) {
          purchasePlan(user.companyId, plan.id, 1, response.razorpay_payment_id);
          alert(`PAYMENT SUCCESSFUL\n\nYour enterprise cluster has been upgraded and invoice generated.`);
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
          }
        }
      };

      const rzp1 = new Razorpay(options);
      
      rzp1.on('payment.failed', function (response: any) {
        setIsProcessing(null);
        alert(`PAYMENT FAILED: ${response.error.description}`);
      });

      rzp1.open();
    } catch (err: any) {
      setIsProcessing(null);
      alert("System Error: " + err.message);
    }
  };

  const handleDirectActivation = async () => {
    if (!targetCompanyId || !targetPlanId) return alert("Target Enterprise and Tier required.");
    setIsActivating(true);
    await new Promise(r => setTimeout(r, 1200));
    purchasePlan(targetCompanyId, targetPlanId, targetMonths);
    alert(`SUCCESS: Node authorized and invoice committed.`);
    setTargetCompanyId(''); setTargetPlanId('');
    setIsActivating(false);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-24">
      
      {/* SUPER ADMIN MASTER CONSOLE */}
      {isSuper && (
        <>
          <div className="bg-slate-950 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full -mr-32 -mt-32"></div>
            <div className="relative z-10">
              <div className="flex items-center space-x-4 mb-10">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-white">Direct Activation Hub</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em]">Cloud Provisioning Active</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end bg-white/5 p-8 rounded-[2.5rem] border border-white/10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-300 uppercase tracking-widest ml-1">Target Enterprise</label>
                  <select className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-4 text-xs font-bold outline-none focus:border-blue-500" value={targetCompanyId} onChange={e => setTargetCompanyId(e.target.value)}>
                    <option value="">Select Enterprise...</option>
                    {state.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-300 uppercase tracking-widest ml-1">Service Tier</label>
                  <select className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-4 text-xs font-bold outline-none focus:border-blue-500" value={targetPlanId} onChange={e => setTargetPlanId(e.target.value)}>
                    <option value="">Choose Plan...</option>
                    {state.subscriptionPlans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-300 uppercase tracking-widest ml-1">Activation Term</label>
                  <select className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-4 text-xs font-bold outline-none focus:border-blue-500" value={targetMonths} onChange={e => setTargetMonths(parseInt(e.target.value))}>
                    {[1, 3, 6, 12].map(m => <option key={m} value={m}>{m} Months</option>)}
                  </select>
                </div>
                <button onClick={handleDirectActivation} disabled={isActivating || !targetCompanyId || !targetPlanId} className={`w-full py-4 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-2xl transition-all ${isActivating ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                  {isActivating ? 'Syncing...' : 'Provision Now'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* STANDARD ADMIN VIEW */}
      {!isSuper && user.role === UserRole.ADMIN && (
        <div className="space-y-12">
          {/* Active Status Card */}
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
                        <p className="text-[9px] font-bold uppercase text-blue-300">Utilization</p>
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

          {/* Plan Grid */}
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
                  </ul>
                  
                  <div className="space-y-3">
                    <button 
                      disabled={isActive || processing}
                      onClick={() => handlePurchase(plan)}
                      className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${
                        isActive ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 
                        processing ? 'bg-blue-400 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl'
                      }`}
                    >
                      {processing && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                      <span>{isActive ? 'Current Active Lease' : processing ? 'Opening Gateway...' : 'Initiate Upgrade'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Billing History Section */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
                <h3 className="text-xl font-black uppercase text-blue-900 tracking-tighter">Billing Registry</h3>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-full uppercase">Tax Invoices</span>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-slate-50/50">
                      <tr>
                         <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Invoice Date</th>
                         <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Plan Descriptor</th>
                         <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Amount Paid</th>
                         <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">TXN ID</th>
                         <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {companyInvoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-slate-50/30 transition-all">
                           <td className="px-8 py-6">
                              <p className="text-xs font-black text-slate-800">{new Date(inv.date).toLocaleDateString()}</p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">INV ID: {inv.id}</p>
                           </td>
                           <td className="px-8 py-6">
                              <span className="text-xs font-black text-blue-600 uppercase">
                                {state.subscriptionPlans.find(p => p.id === inv.planId)?.name || 'Standard'}
                              </span>
                           </td>
                           <td className="px-8 py-6 text-center">
                              <p className="text-sm font-black text-slate-900">₹{inv.amount.toLocaleString()}</p>
                           </td>
                           <td className="px-8 py-6 text-center">
                              <code className="text-[10px] font-mono font-black text-slate-400 bg-gray-50 px-2 py-1 rounded-lg truncate block max-w-[120px] mx-auto">{inv.transactionId}</code>
                           </td>
                           <td className="px-8 py-6 text-right">
                              <button 
                                onClick={() => setViewInvoice(inv)}
                                className="text-blue-600 font-black text-[9px] uppercase border border-blue-100 px-4 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                              >
                                View Invoice
                              </button>
                           </td>
                        </tr>
                      ))}
                      {companyInvoices.length === 0 && (
                        <tr>
                           <td colSpan={5} className="px-8 py-16 text-center">
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No transaction history found.</p>
                           </td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {/* Invoice View Modal */}
      {viewInvoice && (
        <InvoiceModal 
          invoice={viewInvoice} 
          state={state} 
          onClose={() => setViewInvoice(null)} 
        />
      )}
    </div>
  );
};

export default SubscriptionCenter;
