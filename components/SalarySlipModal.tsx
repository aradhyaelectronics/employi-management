
import React from 'react';
import { AppState, MonthlySalarySlip } from '../types';

interface Props {
  slips: MonthlySalarySlip[];
  state: AppState;
  onClose: () => void;
}

const SalarySlipModal: React.FC<Props> = ({ slips, state, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 md:p-10 overflow-y-auto no-print-overlay">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl min-h-[90vh] flex flex-col no-print-container">
        {/* Header (Hidden on print) */}
        <div className="p-6 border-b flex justify-between items-center print:hidden">
          <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter">Document Preview</h3>
          <div className="flex space-x-3">
            <button 
              onClick={handlePrint} 
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
            >
              Print Document(s)
            </button>
            <button 
              onClick={onClose} 
              className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-[10px] tracking-widest"
            >
              Close Preview
            </button>
          </div>
        </div>

        {/* Slips Area */}
        <div className="flex-1 p-4 md:p-12 space-y-20 bg-gray-50 print:bg-white print:p-0 print:space-y-0">
          {slips.map((slip, index) => {
            const personnel = state.users.find(u => u.id === slip.userId);
            const company = state.companies.find(c => c.id === slip.companyId);
            const admin = state.users.find(u => u.companyId === slip.companyId && u.role === 'ADMIN') || state.users.find(u => u.role === 'SUPER_ADMIN');

            return (
              <div 
                key={slip.id} 
                className="bg-white p-10 shadow-2xl rounded-xl border border-gray-100 max-w-[210mm] mx-auto print:shadow-none print:border-none print:rounded-none print:w-full print:min-h-screen print:flex print:flex-col print:justify-between print:page-break-after-always"
              >
                {/* Company Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
                  <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">{company?.name || 'PRAGATI ENTERPRISE'}</h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest max-w-xs">{company?.address || 'Operational Sector - Infrastructure Node'}</p>
                    <div className="mt-4 flex flex-col space-y-0.5">
                       <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Contact: {admin?.mobile || '7709384869'}</p>
                       <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Email: pragatienterprises569@gmail.com</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="bg-slate-900 text-white px-6 py-3 rounded-lg inline-block font-black text-sm uppercase tracking-widest mb-4">Payslip</div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document ID: {slip.id}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date: {new Date(slip.generatedDate).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Employee Details Grid */}
                <div className="grid grid-cols-2 gap-10 mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Personnel Name</span>
                      <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{personnel?.name || 'Staff Member'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Personnel ID</span>
                      <span className="text-sm font-black text-slate-900 uppercase">{personnel?.id || slip.userId}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Designation</span>
                      <span className="text-sm font-black text-slate-700 uppercase">{personnel?.role || 'Employee'}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Payment Cycle</span>
                      <span className="text-sm font-black text-slate-900 uppercase">{months[slip.month]} {slip.year}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Payment Method</span>
                      <span className="text-sm font-black text-slate-700 uppercase">Direct Bank Transfer</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Account Status</span>
                      <span className="text-sm font-black text-green-600 uppercase">Verified</span>
                    </div>
                  </div>
                </div>

                {/* Earnings & Deductions Table */}
                <div className="grid grid-cols-2 gap-10 mb-12">
                   <div>
                      <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest border-b-2 border-blue-900 pb-2 mb-4">Earnings / Credits</h4>
                      <div className="space-y-3">
                         <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-600 uppercase">Base Salary Earnings</span>
                            <span className="font-black text-slate-900">₹{slip.baseAmount.toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-600 uppercase">Overtime Allowance ({slip.overtimeHours.toFixed(1)}h)</span>
                            <span className="font-black text-slate-900">₹{slip.overtimeAmount.toLocaleString()}</span>
                         </div>
                         <div className="pt-3 border-t-2 border-dotted border-slate-200 flex justify-between items-center text-sm">
                            <span className="font-black text-slate-900 uppercase">Gross Total</span>
                            <span className="font-black text-slate-900">₹{(slip.baseAmount + slip.overtimeAmount).toLocaleString()}</span>
                         </div>
                      </div>
                   </div>
                   <div>
                      <h4 className="text-[10px] font-black text-red-900 uppercase tracking-widest border-b-2 border-red-900 pb-2 mb-4">Deductions / Recovery</h4>
                      <div className="space-y-3">
                         <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-600 uppercase tracking-tight">Approved Advance Recovery</span>
                            <span className="font-black text-red-600">₹{slip.advanceDeduction.toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-600 uppercase tracking-tight">Loss & Damage Penalty</span>
                            <span className="font-black text-red-600">₹{slip.penaltyDeduction.toLocaleString()}</span>
                         </div>
                         {slip.pfDeduction > 0 && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-600 uppercase tracking-tight">Statutory PF Contribution</span>
                              <span className="font-black text-red-600">₹{slip.pfDeduction.toLocaleString()}</span>
                            </div>
                         )}
                         <div className="pt-3 border-t-2 border-dotted border-slate-200 flex justify-between items-center text-sm">
                            <span className="font-black text-slate-900 uppercase">Total Deductions</span>
                            <span className="font-black text-red-600">₹{(slip.advanceDeduction + slip.penaltyDeduction + slip.pfDeduction + slip.medicalDeduction).toLocaleString()}</span>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Final Net Pay Calculation */}
                <div className="bg-slate-900 p-8 rounded-2xl flex items-center justify-between text-white shadow-2xl mb-12">
                   <div>
                      <p className="text-[10px] font-black text-blue-300 uppercase tracking-[0.4em] mb-1">Final Disbursement</p>
                      <h3 className="text-xl font-black uppercase">Net Monthly Earnings</h3>
                   </div>
                   <div className="text-right">
                      <p className="text-4xl font-black tracking-tighter">₹{slip.totalAmount.toLocaleString()}</p>
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1 italic">Electronically Approved Document</p>
                   </div>
                </div>

                {/* Signature Area */}
                <div className="mt-auto pt-16 grid grid-cols-2 gap-20">
                   <div className="text-center">
                      <div className="border-b border-slate-300 mb-2 h-12 flex items-end justify-center">
                         <span className="text-[9px] text-slate-300 italic">Signature of Employee</span>
                      </div>
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Employee Acknowledgment</p>
                   </div>
                   <div className="text-center">
                      <div className="border-b border-slate-300 mb-2 h-12 flex items-end justify-center">
                         <p className="text-[10px] font-black text-slate-900 uppercase italic opacity-20">PRAGATI_DIGITAL_AUTH</p>
                      </div>
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Authorized Signatory</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{company?.name}</p>
                   </div>
                </div>

                {/* Footer Disclaimer */}
                <div className="mt-12 pt-6 border-t border-slate-100 text-center">
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                     This is a computer generated document and does not require a physical signature. Any discrepancies should be reported to the enterprise admin within 48 hours of disbursement.
                   </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print-overlay {
            position: relative !important;
            background: white !important;
            padding: 0 !important;
            display: block !important;
            z-index: 1 !important;
          }
          .no-print-container {
            box-shadow: none !important;
            width: 100% !important;
            max-width: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .safe-top {
            padding-top: 0 !important;
          }
          header, nav, aside {
            display: none !important;
          }
          main {
            padding: 0 !important;
            background: white !important;
          }
          .page-break-after-always {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
};

export default SalarySlipModal;
