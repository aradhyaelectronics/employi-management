
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

  // Filter slips based on view (Admin sees all company slips, Employee sees only theirs)
  const filteredSlips = useMemo(() => {
    return state.salarySlips.filter(s => {
      const basicMatch = s.companyId === user.companyId && s.month === reportMonth && s.year === reportYear;
      if (isEmployee) return basicMatch && s.userId === user.id;
      return basicMatch;
    });
  }, [state.salarySlips, user.id, user.companyId, reportMonth, reportYear, isEmployee]);

  // Pending requests for Admin/Supervisor to approve
  const pendingRequests = useMemo(() => {
    return state.requests.filter(r => r.companyId === user.companyId && r.status === RequestStatus.PENDING);
  }, [state.requests, user.companyId]);

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
                {filteredSlips.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-gray-300 font-bold italic text-xs tracking-widest">No slips generated for this period. Click 'Execute' to begin.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Admin/Supervisor Control: Request Approvals */}
      {(isAdmin || user.role === UserRole.SUPERVISOR) && pendingRequests.length > 0 && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-orange-100 overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="p-8 border-b border-orange-50 bg-orange-50/30">
            <h3 className="text-xl font-black text-orange-800 uppercase tracking-tighter">Pending Financial Requests</h3>
            <p className="text-xs text-orange-400 font-bold uppercase tracking-widest mt-1">Authorized personnel only</p>
          </div>
          <table className="w-full text-left">
            <tbody className="divide-y divide-orange-50">
              {pendingRequests.map(req => {
                const emp = state.users.find(u => u.id === req.userId);
                return (
                  <tr key={req.id}>
                    <td className="px-8 py-6">
                      <div className="font-bold text-gray-800">{emp?.name}</div>
                      <div className="text-[9px] text-gray-400 uppercase font-black">{req.type} • {req.date}</div>
                    </td>
                    <td className="px-8 py-6 text-sm font-black text-gray-700">₹{req.amount.toLocaleString()}</td>
                    <td className="px-8 py-6 italic text-xs text-gray-400">"{req.description}"</td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => updateStatus(req.id, RequestStatus.APPROVED)} className="bg-green-600 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-green-100">Approve</button>
                        <button onClick={() => updateStatus(req.id, RequestStatus.REJECTED)} className="bg-red-50 text-red-600 px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-100">Reject</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Employee Self-Service: Salary History */}
      {isEmployee && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b bg-blue-50/30">
            <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter">Remuneration Ledger</h3>
            <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mt-1">Your verified monthly disbursements</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Period Cycle</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Net Compensation</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest text-center">Status</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSlips.map(slip => (
                  <tr key={slip.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-6 font-black text-gray-800 text-xs">
                      {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][slip.month]} {slip.year}
                    </td>
                    <td className="px-8 py-6 font-black text-blue-700 text-lg tracking-tighter">₹{slip.totalAmount.toLocaleString()}</td>
                    <td className="px-8 py-6 text-center">
                       <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${slip.status === PaymentStatus.PAID ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                          {slip.status}
                       </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button onClick={() => setSelectedSlip(slip)} className="bg-blue-900 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-blue-100 hover:bg-black transition-all">View Statement</button>
                    </td>
                  </tr>
                ))}
                {filteredSlips.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center text-gray-300 font-bold italic tracking-wide">No salary statements found for the selected period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Universal Portal: Disbursement Requests */}
      <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 max-w-2xl mx-auto">
        <h3 className="text-xl font-black mb-10 text-blue-900 uppercase tracking-tighter text-center">Disbursement Request Portal</h3>
        <form onSubmit={e => { e.preventDefault(); addRequest({ ...formData, userId: user.id, companyId: user.companyId, date: new Date().toISOString().split('T')[0] }); setFormData({ amount: 0, type: 'ADVANCE', description: '' }); alert("Request transmitted successfully."); }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Classification</label>
            <select className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/10" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}><option value="ADVANCE">Advance Pay (Immediate)</option><option value="SALARY">Regular Remuneration Inquiry</option></select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Requested Capital (₹)</label>
            <input type="number" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-blue-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/10" placeholder="0" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Operational Justification</label>
            <input type="text" placeholder="Explain the purpose of this request..." className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <button type="submit" className="md:col-span-2 bg-blue-700 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-blue-100 transform active:scale-[0.98] transition-all">Submit for Authorization</button>
        </form>
      </div>

      {/* Modal: Detailed Remuneration Statement */}
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
