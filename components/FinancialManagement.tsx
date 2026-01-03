
import React, { useState, useMemo } from 'react';
import { User, AppState, FinancialRequest, RequestStatus, UserRole, SalaryType, MonthlySalarySlip, PaymentStatus } from '../types';

interface Props {
  user: User;
  state: AppState;
  addRequest: (req: Omit<FinancialRequest, 'id' | 'status'>) => void;
  updateStatus: (id: string, status: RequestStatus) => void;
  generateMonthlySlips: (companyId: string, month: number, year: number) => void;
  updateSalaryStatus: (slipId: string, status: PaymentStatus) => void;
}

const FinancialManagement: React.FC<Props> = ({ user, state, addRequest, updateStatus, generateMonthlySlips, updateSalaryStatus }) => {
  const [formData, setFormData] = useState({ amount: 0, type: 'ADVANCE' as 'ADVANCE' | 'SALARY', description: '' });
  const [selectedSlip, setSelectedSlip] = useState<MonthlySalarySlip | null>(null);

  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const isSupervisor = user.role === UserRole.SUPERVISOR;
  const isEmployee = user.role === UserRole.EMPLOYEE;
  
  const now = new Date();
  const [reportMonth, setReportMonth] = useState(now.getMonth());
  const [reportYear, setReportYear] = useState(now.getFullYear());

  const handleGenerate = () => {
    if (confirm("System will now process attendance and advances for the selected period. Proceed?")) {
      generateMonthlySlips(user.companyId, reportMonth, reportYear);
      alert("Payroll calculation finalized.");
    }
  };

  // Requests history for the current user (if employee) or company (if admin)
  const allRequests = useMemo(() => {
    return state.requests.filter(r => {
      const isCompanyMatch = r.companyId === user.companyId;
      if (isAdmin || isSupervisor) return isCompanyMatch;
      return isCompanyMatch && r.userId === user.id;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.requests, user.id, user.companyId, isAdmin, isSupervisor]);

  const pendingRequests = useMemo(() => allRequests.filter(r => r.status === RequestStatus.PENDING), [allRequests]);

  const filteredSlips = useMemo(() => {
    return state.salarySlips.filter(s => {
      const basicMatch = s.companyId === user.companyId && s.month === reportMonth && s.year === reportYear;
      if (isEmployee) return basicMatch && s.userId === user.id;
      return basicMatch;
    });
  }, [state.salarySlips, user.id, user.companyId, reportMonth, reportYear, isEmployee]);

  return (
    <div className="space-y-12">
      {/* 1. Admin Control: Monthly Payroll Management */}
      {isAdmin && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b flex flex-col md:flex-row justify-between items-center gap-6 bg-gray-50/50">
            <div>
              <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter">Payroll Command Center</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Automatic deduction of approved advances included</p>
            </div>
            <div className="flex space-x-3">
              <select className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none" value={reportMonth} onChange={e => setReportMonth(parseInt(e.target.value))}>
                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <button onClick={handleGenerate} className="bg-blue-700 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-800 transition-all">Execute Payroll Run</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-100/30">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Recipient</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Earnings & Deductions</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest text-right">Net Payable</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest text-center">Status</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSlips.map(slip => {
                   const emp = state.users.find(u => u.id === slip.userId);
                   return (
                     <tr key={slip.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-6">
                           <div className="font-bold text-gray-800 text-sm uppercase tracking-tight">{emp?.name}</div>
                           <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">OT ACCRUED: {slip.overtimeHours} HRS</div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="text-[10px] font-black text-blue-700 uppercase">BASE: ₹{slip.baseAmount.toLocaleString()}</div>
                           <div className="text-[10px] font-black text-orange-600 uppercase">OT PAY: ₹{slip.overtimeAmount.toLocaleString()}</div>
                           {slip.advanceDeduction > 0 && (
                             <div className="text-[10px] font-black text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded-md inline-block mt-1">ADVANCE DEDUCT: -₹{slip.advanceDeduction.toLocaleString()}</div>
                           )}
                        </td>
                        <td className="px-8 py-6 text-right font-black text-gray-900 text-lg tracking-tighter">₹{slip.totalAmount.toLocaleString()}</td>
                        <td className="px-8 py-6 text-center">
                           <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${slip.status === PaymentStatus.PAID ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                              {slip.status}
                           </span>
                        </td>
                        <td className="px-8 py-6 text-center">
                           <div className="flex justify-center space-x-2">
                             {slip.status === PaymentStatus.UNPAID && (
                               <button onClick={() => updateSalaryStatus(slip.id, PaymentStatus.PAID)} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-sm hover:bg-green-700">Disburse</button>
                             )}
                             <button onClick={() => setSelectedSlip(slip)} className="bg-white text-gray-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase border border-gray-200 hover:bg-gray-50">Statement</button>
                           </div>
                        </td>
                     </tr>
                   );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Authorization Queue (Admin/Supervisor Only) */}
      {(isAdmin || isSupervisor) && pendingRequests.length > 0 && (
        <div className="bg-white rounded-[2.5rem] shadow-xl border-4 border-orange-500/20 overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="p-8 bg-orange-500 text-white flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter">Authorization Queue</h3>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mt-1">Pending Disbursement Decisions</p>
            </div>
            <div className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md">
              <span className="text-2xl font-black">{pendingRequests.length}</span>
              <span className="text-[10px] font-black uppercase ml-2 tracking-widest">Waiting</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <tbody className="divide-y divide-gray-100">
                {pendingRequests.map(req => {
                  const emp = state.users.find(u => u.id === req.userId);
                  return (
                    <tr key={req.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="font-black text-gray-900 text-sm uppercase">{emp?.name || 'Unknown User'}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded ${req.type === 'ADVANCE' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'} uppercase tracking-widest`}>{req.type}</span>
                          <span className="text-[10px] text-gray-400 font-bold">{req.date}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Requested Amount</p>
                        <p className="text-xl font-black text-gray-900 tracking-tighter">₹{req.amount.toLocaleString()}</p>
                      </td>
                      <td className="px-8 py-6 max-w-xs">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Reason/Justification</p>
                        <p className="text-xs text-gray-600 line-clamp-2 italic font-medium">"{req.description || 'No description provided'}"</p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end space-x-2">
                          <button 
                            onClick={() => {
                              if(confirm(`Approve payment of ₹${req.amount} for ${emp?.name}?`)) {
                                updateStatus(req.id, RequestStatus.APPROVED);
                              }
                            }} 
                            className="bg-green-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-100 hover:bg-green-700 transition-all active:scale-95"
                          >
                            Send Payment
                          </button>
                          <button 
                            onClick={() => {
                              if(confirm(`Reject this request from ${emp?.name}?`)) {
                                updateStatus(req.id, RequestStatus.REJECTED);
                              }
                            }} 
                            className="bg-white text-red-600 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100 hover:bg-red-50 transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Universal: Transaction & Request History */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b bg-gray-50/30 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Disbursement Ledger</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
              {isAdmin ? "Global Enterprise History" : "Personal Request History"}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Entry</th>
                {isAdmin && <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Personnel</th>}
                <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest text-center">Amount</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Justification</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allRequests.map(req => {
                const emp = state.users.find(u => u.id === req.userId);
                return (
                  <tr key={req.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-8 py-6">
                      <div className="text-[10px] font-black text-blue-900 uppercase tracking-tight">{req.type}</div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{req.date}</div>
                    </td>
                    {isAdmin && (
                      <td className="px-8 py-6 font-bold text-gray-700 text-xs uppercase">{emp?.name}</td>
                    )}
                    <td className="px-8 py-6 text-center font-black text-gray-900">₹{req.amount.toLocaleString()}</td>
                    <td className="px-8 py-6 text-xs text-gray-400 italic max-w-xs truncate">"{req.description}"</td>
                    <td className="px-8 py-6 text-right">
                      <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                        req.status === RequestStatus.APPROVED ? 'bg-green-50 text-green-700 border-green-100' : 
                        req.status === RequestStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-100' : 
                        'bg-orange-50 text-orange-700 border-orange-100'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {allRequests.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="px-8 py-16 text-center text-gray-300 font-bold italic tracking-wide">No disbursement history found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Request Submission Portal (Primarily for Employees) */}
      <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 max-w-2xl mx-auto">
        <h3 className="text-xl font-black mb-10 text-blue-900 uppercase tracking-tighter text-center">New Disbursement Request</h3>
        <form 
          onSubmit={e => { 
            e.preventDefault(); 
            if(formData.amount <= 0) return alert("Amount must be greater than zero.");
            addRequest({ ...formData, userId: user.id, companyId: user.companyId, date: new Date().toISOString().split('T')[0] }); 
            setFormData({ amount: 0, type: 'ADVANCE', description: '' }); 
            alert("Request transmitted for authorization."); 
          }} 
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Classification</label>
            <select className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/10" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}><option value="ADVANCE">Advance Pay (Immediate Need)</option><option value="SALARY">Regular Remuneration Inquiry</option></select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Requested Capital (₹)</label>
            <input type="number" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-blue-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/10" placeholder="0" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Operational Justification</label>
            <input type="text" placeholder="e.g. Site travel expenses, Tool procurement..." className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <button type="submit" className="md:col-span-2 bg-blue-700 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-blue-100 transform active:scale-[0.98] transition-all">Transmit for Authorization</button>
        </form>
      </div>

      {/* Modal: Detailed Remuneration Statement (Unchanged) */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-16 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-700"></div>
              <button onClick={() => setSelectedSlip(null)} className="absolute top-10 right-10 p-2 text-gray-300 hover:text-red-500 transition-colors"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
              
              <div className="border-b-2 border-gray-100 pb-12 mb-12 flex justify-between items-end">
                 <div>
                    <h1 className="text-4xl font-black text-blue-900 uppercase tracking-tighter leading-none">{state.companies.find(c => c.id === selectedSlip.companyId)?.name}</h1>
                    <p className="text-orange-600 font-black text-[10px] tracking-[0.4em] uppercase mt-3">Verified Payroll Document</p>
                 </div>
                 <div className="text-right">
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Pay Slip</h2>
                    <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase">ID: {selectedSlip.id.split('-').pop()}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-12">
                 <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Recipient Details</p>
                    <p className="text-2xl font-black text-blue-900">{state.users.find(u => u.id === selectedSlip.userId)?.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Personnel Record: {selectedSlip.userId.split('-').pop()}</p>
                 </div>
                 <div className="text-right p-8 flex flex-col justify-end">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Statement Period</p>
                    <p className="text-2xl font-black text-gray-800 uppercase tracking-tighter">{["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][selectedSlip.month]} {selectedSlip.year}</p>
                    <p className="text-[9px] font-bold text-gray-300 uppercase mt-1 tracking-widest">Generated: {new Date(selectedSlip.generatedDate).toLocaleDateString()}</p>
                 </div>
              </div>

              <div className="rounded-3xl border border-gray-100 overflow-hidden mb-12">
                 <table className="w-full">
                    <thead>
                       <tr className="bg-gray-50"><th className="px-8 py-5 text-left text-[9px] font-black uppercase tracking-widest text-gray-400">Ledger Classification</th><th className="px-8 py-5 text-right text-[9px] font-black uppercase tracking-widest text-gray-400">Amount (INR)</th></tr>
                    </thead>
                    <tbody>
                       <tr className="border-b border-gray-50"><td className="px-8 py-6 font-bold text-blue-900 text-sm">Contractual Base Pay</td><td className="px-8 py-6 text-right font-black text-sm">₹{selectedSlip.baseAmount.toLocaleString()}</td></tr>
                       <tr className="border-b border-gray-50"><td className="px-8 py-6 font-bold text-orange-600 text-sm">Post-Shift Overtime ({selectedSlip.overtimeHours} hrs)</td><td className="px-8 py-6 text-right font-black text-sm">₹{selectedSlip.overtimeAmount.toLocaleString()}</td></tr>
                       {selectedSlip.advanceDeduction > 0 && (
                         <tr className="border-b border-gray-50 bg-red-50/20"><td className="px-8 py-6 font-bold text-red-600 text-sm">Approved Advance Deductions</td><td className="px-8 py-6 text-right font-black text-sm">-₹{selectedSlip.advanceDeduction.toLocaleString()}</td></tr>
                       )}
                       <tr className="bg-blue-900 text-white"><td className="px-8 py-8 font-black uppercase text-[12px] tracking-widest">Net Consolidated Payable</td><td className="px-8 py-8 text-right text-4xl font-black tracking-tighter">₹{selectedSlip.totalAmount.toLocaleString()}</td></tr>
                    </tbody>
                 </table>
              </div>

              <div className="flex justify-between items-center pt-10 border-t border-dotted border-gray-200">
                 <div className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${selectedSlip.status === PaymentStatus.PAID ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    DISBURSEMENT {selectedSlip.status}
                 </div>
                 <div className="flex space-x-4">
                    <button onClick={() => window.print()} className="bg-gray-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all">Download Receipt</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FinancialManagement;
