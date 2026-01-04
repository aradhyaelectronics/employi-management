
import React from 'react';
import { AppState, Invoice } from '../types';
import { Logo } from '../constants';

interface Props {
  invoice: Invoice;
  state: AppState;
  onClose: () => void;
}

const InvoiceModal: React.FC<Props> = ({ invoice, state, onClose }) => {
  const company = state.companies.find(c => c.id === invoice.companyId);
  const plan = state.subscriptionPlans.find(p => p.id === invoice.planId);
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 md:p-10 overflow-y-auto no-print-overlay">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl min-h-[90vh] flex flex-col no-print-container">
        {/* Modal Header */}
        <div className="p-6 border-b flex justify-between items-center print:hidden">
          <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter">Digital Tax Invoice</h3>
          <div className="flex space-x-3">
            <button onClick={handlePrint} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all">Print Invoice</button>
            <button onClick={onClose} className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-[10px] tracking-widest">Close</button>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="flex-1 p-12 print:p-0">
           <div className="max-w-[210mm] mx-auto bg-white border border-gray-100 p-12 shadow-inner print:shadow-none print:border-none print:w-full">
              {/* Header */}
              <div className="flex justify-between items-start mb-16 border-b-2 border-slate-900 pb-10">
                 <div>
                    <Logo iconClassName="w-20 h-16" showText={false} />
                    <h1 className="text-2xl font-black text-slate-900 uppercase mt-4">PRAGATI CLOUD SOLUTIONS</h1>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Infrastructure Hub | Cloud Division</p>
                    <p className="text-[10px] font-black text-slate-700 mt-4 uppercase">Support: +91 77093 84869</p>
                 </div>
                 <div className="text-right">
                    <h2 className="text-4xl font-black text-slate-200 uppercase tracking-widest mb-6">TAX INVOICE</h2>
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase">Invoice No: <span className="text-slate-900">{invoice.id}</span></p>
                       <p className="text-[10px] font-black text-slate-400 uppercase">Date: <span className="text-slate-900">{new Date(invoice.date).toLocaleDateString()}</span></p>
                       <p className="text-[10px] font-black text-slate-400 uppercase">TXN Reference: <span className="text-slate-900">{invoice.transactionId}</span></p>
                    </div>
                 </div>
              </div>

              {/* Billing Info */}
              <div className="grid grid-cols-2 gap-20 mb-16">
                 <div>
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 border-b border-blue-100 pb-2">Billed To</h3>
                    <p className="text-lg font-black text-slate-900 uppercase">{company?.name || 'Enterprise Client'}</p>
                    <p className="text-xs font-bold text-slate-500 uppercase mt-2 leading-relaxed">{company?.address || 'Registered Operational Site Node'}</p>
                    <p className="text-[10px] font-black text-slate-900 mt-2 uppercase">TENANT ID: {invoice.companyId}</p>
                 </div>
                 <div>
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 border-b border-blue-100 pb-2">Agreement Term</h3>
                    <div className="space-y-2">
                       <div className="flex justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Activation Date</span>
                          <span className="text-[10px] font-black text-slate-900">{new Date(invoice.date).toLocaleDateString()}</span>
                       </div>
                       <div className="flex justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Expiration Date</span>
                          <span className="text-[10px] font-black text-orange-600">{new Date(invoice.expiryDate).toLocaleDateString()}</span>
                       </div>
                       <div className="flex justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Payment Method</span>
                          <span className="text-[10px] font-black text-slate-900 uppercase">Razorpay / Digital Wallet</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Line Items */}
              <table className="w-full mb-16">
                 <thead className="bg-slate-900 text-white">
                    <tr>
                       <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Service Description</th>
                       <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest">Base Rate</th>
                       <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest">Tax (GST)</th>
                       <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">Subtotal</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 border-b">
                    <tr>
                       <td className="px-6 py-8">
                          <p className="text-sm font-black text-slate-900 uppercase">{plan?.name} License Activation</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 leading-relaxed">Infrastructure lease for {plan?.userLimit} workforce slots and real-time site telemetry.</p>
                       </td>
                       <td className="px-6 py-8 text-center text-sm font-black text-slate-900">₹{(invoice.amount * 0.82).toLocaleString()}</td>
                       <td className="px-6 py-8 text-center text-sm font-black text-slate-900">18%</td>
                       <td className="px-6 py-8 text-right text-sm font-black text-slate-900">₹{invoice.amount.toLocaleString()}</td>
                    </tr>
                 </tbody>
              </table>

              {/* Total Card */}
              <div className="flex justify-end mb-20">
                 <div className="w-72 bg-slate-50 p-8 rounded-2xl border border-slate-100">
                    <div className="space-y-4">
                       <div className="flex justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Amount Billed</span>
                          <span className="text-sm font-black text-slate-900">₹{invoice.amount.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between border-t border-slate-200 pt-4">
                          <span className="text-[10px] font-black text-slate-900 uppercase">Grand Total (Net)</span>
                          <span className="text-xl font-black text-blue-900">₹{invoice.amount.toLocaleString()}</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-20 border-t border-slate-100">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Electronic Authorization Successful</p>
                 <div className="flex items-center justify-center space-x-4">
                    <div className="h-0.5 w-12 bg-slate-100"></div>
                    <p className="text-[8px] font-bold text-slate-300 uppercase">End of Document</p>
                    <div className="h-0.5 w-12 bg-slate-100"></div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print-overlay { position: static !important; background: white !important; padding: 0 !important; }
          .no-print-container { box-shadow: none !important; width: 100% !important; max-width: none !important; }
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
          main { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default InvoiceModal;
