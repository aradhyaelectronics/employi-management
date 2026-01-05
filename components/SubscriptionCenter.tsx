
import React, { useState, useMemo } from 'react';
import { User, AppState, UserRole, SubscriptionPlan, Company, Invoice } from '../types';
import InvoiceModal from './InvoiceModal';
import { usePaymentGateway, TransactionOverlay } from './PaymentGateway';

interface Props {
  user: User;
  state: AppState;
  updatePlan: (plan: SubscriptionPlan) => void;
  purchasePlan: (companyId: string, planId: string, months?: number, txId?: string) => void;
  removeUser?: (id: string) => Promise<void>;
}

const SubscriptionCenter: React.FC<Props> = ({ user, state, purchasePlan }) => {
  const isSuper = user.role === UserRole.SUPER_ADMIN;
  const company = state.companies.find(c => c.id === user.companyId);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  
  const { processPayment } = usePaymentGateway(state.integrations);

  const companyInvoices = useMemo(() => {
    return state.invoices
      .filter(inv => inv.companyId === user.companyId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.invoices, user.companyId]);

  const handleUpgrade = (plan: SubscriptionPlan) => {
    setIsProcessing(true);
    processPayment({
      plan,
      user,
      onSuccess: (txId) => {
        purchasePlan(user.companyId, plan.id, 1, txId);
        setIsProcessing(false);
        alert(`SUCCESS: Infrastructure upgraded to ${plan.name}.`);
      },
      onFailure: (err) => {
        setIsProcessing(false);
        alert(`Gateway Alert: ${err}`);
      }
    });
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
      <TransactionOverlay loading={isProcessing} />

      <div className="bg-white rounded-[3.5rem] p-12 shadow-sm border border-gray-100 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 blur-3xl rounded-full"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="text-center md:text-left">
               <p className="text-blue-600 text-[11px] font-black uppercase tracking-[0.4em] mb-4">Current Deployment</p>
               <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 uppercase leading-none">
                 {activePlan.name}
               </h2>
               <div className="flex flex-wrap justify-center md:justify-start gap-4">
                  <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest">Cap: {activePlan.userLimit} Users</div>
                  <div className="px-4 py-2 bg-blue-50 rounded-xl text-[10px] font-black text-blue-600 uppercase tracking-widest">
                    Expiry: {company?.subscriptionExpiry ? new Date(company.subscriptionExpiry).toLocaleDateString() : 'Active (Standard)'}
                  </div>
               </div>
            </div>
            
            <div className="flex flex-col items-center justify-center p-10 bg-slate-900 rounded-[3rem] text-white shadow-2xl min-w-[240px]">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Node Lifecycle</p>
               <p className={`text-4xl font-black tracking-tighter mb-2 ${daysLeft > 0 ? 'text-green-400' : 'text-orange-500'}`}>
                  {daysLeft > 0 ? daysLeft : 'TRIAL'}
               </p>
               <p className="text-[10px] font-black text-white uppercase tracking-widest">Days Remaining</p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {state.subscriptionPlans.map((plan) => {
          const isCurrent = company?.subscriptionPlanId === plan.id;
          return (
            <div key={plan.id} className={`bg-white p-12 rounded-[3rem] shadow-sm border-2 transition-all hover:shadow-2xl flex flex-col relative group ${isCurrent ? 'border-blue-600' : 'border-gray-50'}`}>
              {isCurrent && (
                 <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Current Node</div>
              )}
              <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-2">{plan.name}</h4>
              <div className="flex items-baseline space-x-2 mb-10">
                <span className="text-4xl font-black text-blue-900">₹{plan.price.toLocaleString()}</span>
                <span className="text-xs font-bold text-gray-400 uppercase">/ cycle</span>
              </div>
              
              <ul className="space-y-4 mb-12 flex-1">
                {plan.features.map((f, i) => (
                   <li key={i} className="flex items-center text-xs font-bold text-slate-600 leading-tight">
                      <span className="w-5 h-5 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-[10px] font-black mr-3 shrink-0">✓</span>
                      {f}
                   </li>
                ))}
              </ul>

              <button 
                disabled={isCurrent || isProcessing}
                onClick={() => handleUpgrade(plan)}
                className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-xl ${isCurrent ? 'bg-slate-100 text-slate-400 cursor-default' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {isCurrent ? 'Active Tier' : 'Authorize Upgrade'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Invoice Registry */}
      {companyInvoices.length > 0 && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
           <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Transaction History</h3>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-slate-50/30">
                       <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Reference</th>
                       <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Plan</th>
                       <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Amount</th>
                       <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {companyInvoices.map(inv => (
                       <tr key={inv.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="px-8 py-5">
                             <p className="text-xs font-bold text-slate-900 uppercase">{inv.id}</p>
                             <p className="text-[8px] font-black text-slate-400 uppercase">{new Date(inv.date).toLocaleDateString()}</p>
                          </td>
                          <td className="px-8 py-5">
                             <span className="text-[10px] font-black text-blue-600 uppercase">{state.subscriptionPlans.find(p=>p.id===inv.planId)?.name}</span>
                          </td>
                          <td className="px-8 py-5 text-center font-black text-slate-900 text-sm">₹{inv.amount.toLocaleString()}</td>
                          <td className="px-8 py-5 text-right">
                             <button onClick={() => setViewInvoice(inv)} className="text-[9px] font-black text-blue-600 uppercase underline">View Invoice</button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}
      
      {viewInvoice && <InvoiceModal invoice={viewInvoice} state={state} onClose={() => setViewInvoice(null)} />}
    </div>
  );
};

export default SubscriptionCenter;
