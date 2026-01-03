
import React, { useState, useMemo } from 'react';
import { User, AppState, FinancialRequest, RequestStatus, UserRole, SalaryType, MonthlySalarySlip, PaymentStatus } from '../types';
import { ICONS } from '../constants';

interface Props {
  user: User;
  state: AppState;
  addRequest: (req: Omit<FinancialRequest, 'id' | 'status'>) => void;
  updateStatus: (id: string, status: RequestStatus) => void;
  generateMonthlySlips: (companyId: string, month: number, year: number) => void;
  addManualSalarySlip: (slip: Omit<MonthlySalarySlip, 'id' | 'generatedDate'>) => Promise<void>;
  updateSalaryStatus: (slipId: string, status: PaymentStatus) => void;
}

const FinancialManagement: React.FC<Props> = ({ user, state, addRequest, updateStatus, generateMonthlySlips, addManualSalarySlip, updateSalaryStatus }) => {
  const [formData, setFormData] = useState({ amount: 0, type: 'ADVANCE' as 'ADVANCE' | 'SALARY', description: '' });
  const [selectedSlip, setSelectedSlip] = useState<MonthlySalarySlip | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);

  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const isSupervisor = user.role === UserRole.SUPERVISOR;
  const isEmployee = user.role === UserRole.EMPLOYEE;
  
  const now = new Date();
  const [reportMonth, setReportMonth] = useState(now.getMonth());
  const [reportYear, setReportYear] = useState(now.getFullYear());

  const [manualSlipData, setManualSlipData] = useState({
    userId: '',
    month: now.getMonth(),
    year: now.getFullYear(),
    baseAmount: 0,
    overtimeAmount: 0,
    overtimeHours: 0,
    advanceDeduction: 0,
    status: PaymentStatus.UNPAID
  });

  const handleGenerate = () => {
    if (confirm("System will now process attendance and advances for the selected period. Proceed?")) {
      generateMonthlySlips(user.companyId, reportMonth, reportYear);
      alert("Payroll calculation finalized.");
    }
  };

  const handleManualSlipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSlipData.userId) return alert("Select personnel.");
    
    const totalAmount = (manualSlipData.baseAmount + manualSlipData.overtimeAmount) - manualSlipData.advanceDeduction;
    
    try {
      await addManualSalarySlip({
        ...manualSlipData,
        companyId: user.companyId,
        totalAmount
      });
      alert("Manual Salary Slip Added to Registry.");
      setShowManualForm(false);
      setManualSlipData({
        userId: '',
        month: now.getMonth(),
        year: now.getFullYear(),
        baseAmount: 0,
        overtimeAmount: 0,
        overtimeHours: 0,
        advanceDeduction: 0,
        status: PaymentStatus.UNPAID
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

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

  const companyPersonnel = state.users.filter(u => u.companyId === user.companyId && u.role !== UserRole.SUPER_ADMIN);

  const mySlipArchive = useMemo(() => {
    return state.salarySlips.filter(s => s.userId === user.id)
      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));
  }, [state.salarySlips, user.id]);

  // Derived data for the expanded salary slip
  const slipAttendanceLog = useMemo(() => {
    if (!selectedSlip) return [];
    return state.attendance.filter(a => {
      const aDate = new Date(a.date);
      return a.userId === selectedSlip.userId && 
             aDate.getMonth() === selectedSlip.month && 
             aDate.getFullYear() === selectedSlip.year;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedSlip, state.attendance]);

  const companyInfo = useMemo(() => {
    if (!selectedSlip) return null;
    return state.companies.find(c => c.id === selectedSlip.companyId);
  }, [selectedSlip, state.companies]);

  return (
    <div className="space-y-12 pb-20">
      {isAdmin && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500">
          <div className="p-8 border-b flex flex-col md:flex-row justify-between items-center gap-6 bg-gray-50/50">
            <div>
              <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter">Payroll Command Center</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Enterprise-Wide Remuneration Orchestration</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none" value={reportMonth} onChange={e => setReportMonth(parseInt(e.target.value))}>
                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <button onClick={() => setShowManualForm(!showManualForm)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${showManualForm ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                {showManualForm ? 'Cancel Manual Slip' : 'Add Individual Slip'}
              </button>
              <button onClick={handleGenerate} className="bg-blue-700 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-800 transition-all">Execute Payroll Run</button>
            </div>
          </div>

          {showManualForm && (
            <div className="p-8 bg-orange-50/10 border-b border-orange-50 animate-in slide-in-from-top-4 duration-300">
              <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-6">Manual Salary Slip Entry</h4>
              <form onSubmit={handleManualSlipSubmit} className="space-y-6 max-w-4xl">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                       <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Recipient Personnel</label>
                       <select className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold" value={manualSlipData.userId} onChange={e => setManualSlipData({...manualSlipData, userId: e.target.value})} required>
                          <option value="">Select Personnel...</option>
                          {companyPersonnel.map(p => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Base Payment (₹)</label>
                       <input type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-black" value={manualSlipData.baseAmount || ''} onChange={e => setManualSlipData({...manualSlipData, baseAmount: parseInt(e.target.value) || 0})} required />
                    </div>
                    <div>
                       <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Advance Deduction (₹)</label>
                       <input type="number" className="w-full px-4 py-3 bg-red-50/50 border border-red-100 rounded-xl text-sm font-black text-red-600" value={manualSlipData.advanceDeduction || ''} onChange={e => setManualSlipData({...manualSlipData, advanceDeduction: parseInt(e.target.value) || 0})} />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="grid grid-cols-2 gap-2">
                       <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">OT Pay (₹)</label>
                          <input type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-black" value={manualSlipData.overtimeAmount || ''} onChange={e => setManualSlipData({...manualSlipData, overtimeAmount: parseInt(e.target.value) || 0})} />
                       </div>
                       <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">OT Hours</label>
                          <input type="number" step="0.5" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-black" value={manualSlipData.overtimeHours || ''} onChange={e => setManualSlipData({...manualSlipData, overtimeHours: parseFloat(e.target.value) || 0})} />
                       </div>
                    </div>
                    <div className="p-4 bg-blue-900 rounded-2xl text-white flex justify-between items-center shadow-lg">
                       <span className="text-[9px] font-black uppercase tracking-widest text-blue-300">Net Payable Preview</span>
                       <span className="text-xl font-black">₹{((manualSlipData.baseAmount + manualSlipData.overtimeAmount) - manualSlipData.advanceDeduction).toLocaleString()}</span>
                    </div>
                    <button type="submit" className="w-full bg-orange-600 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-orange-700">Add Slip Record</button>
                 </div>
              </form>
            </div>
          )}

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

      {isEmployee && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500">
           <div className="p-8 bg-blue-900 text-white flex justify-between items-center">
              <div>
                 <h3 className="text-xl font-black uppercase tracking-tighter">Pay Slip Archive</h3>
                 <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest mt-1">Chronological Remuneration Statements</p>
              </div>
              <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/10">
                 <ICONS.Document className="w-6 h-6" />
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
              {mySlipArchive.map(slip => (
                <div key={slip.id} className="p-6 bg-gray-50 border border-gray-100 rounded-3xl hover:shadow-xl transition-all cursor-pointer group" onClick={() => setSelectedSlip(slip)}>
                   <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-900 shadow-sm border border-gray-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                         <ICONS.Document className="w-5 h-5" />
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase border ${slip.status === PaymentStatus.PAID ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                         {slip.status}
                      </span>
                   </div>
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Period Statement</p>
                   <h4 className="text-lg font-black text-blue-950 uppercase tracking-tighter">
                      {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][slip.month]} {slip.year}
                   </h4>
                   <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-baseline">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Net Disbursed</p>
                      <p className="text-xl font-black text-blue-900">₹{slip.totalAmount.toLocaleString()}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

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
            <select className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}><option value="ADVANCE">Advance Pay (Immediate Need)</option><option value="SALARY">Regular Remuneration Inquiry</option></select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Requested Capital (₹)</label>
            <input type="number" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-blue-900 text-sm outline-none" placeholder="0" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Operational Justification</label>
            <input type="text" placeholder="e.g. Site travel expenses, Tool procurement..." className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <button type="submit" className="md:col-span-2 bg-blue-700 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl active:scale-[0.98] transition-all">Transmit for Authorization</button>
        </form>
      </div>

      {selectedSlip && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-950/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 md:p-12 relative overflow-y-auto max-h-[95vh] print:p-0 print:m-0 print:w-full print:rounded-none">
              <button onClick={() => setSelectedSlip(null)} className="absolute top-8 right-8 p-2 text-gray-300 hover:text-red-500 transition-colors print:hidden"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
              
              <div className="border-b-2 border-gray-100 pb-8 mb-8 flex justify-between items-end">
                 <div>
                    <h1 className="text-3xl font-black text-blue-900 uppercase tracking-tighter leading-none">{companyInfo?.name}</h1>
                    <p className="text-gray-400 font-bold text-[9px] uppercase mt-2 tracking-widest">{companyInfo?.address || 'Site Infrastructure Deployment Node'}</p>
                    <p className="text-orange-600 font-black text-[9px] tracking-[0.3em] uppercase mt-3">Verified Salary Statement</p>
                 </div>
                 <div className="text-right">
                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Pay Slip</h2>
                    <p className="text-[10px] font-mono text-gray-300 mt-1 uppercase">ID: {selectedSlip.id.split('-').pop()}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                 <div className="bg-gray-50/80 p-6 rounded-[2rem] border border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Personnel Profile</p>
                    <p className="text-xl font-black text-blue-900">{state.users.find(u => u.id === selectedSlip.userId)?.name}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Role: {state.users.find(u => u.id === selectedSlip.userId)?.role}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Registry: {selectedSlip.userId.split('-').pop()}</p>
                 </div>
                 <div className="text-right p-6">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Statement Tenure</p>
                    <p className="text-xl font-black text-gray-800 uppercase tracking-tighter">{["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][selectedSlip.month]} {selectedSlip.year}</p>
                    <p className="text-[9px] font-bold text-blue-600 uppercase mt-1 tracking-widest">Net Days Present: {slipAttendanceLog.length}</p>
                 </div>
              </div>

              {/* Attendance Log - REQUIRED: Detailed Time IN/OUT */}
              <div className="mb-8 overflow-hidden rounded-3xl border border-gray-100">
                 <div className="bg-blue-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                    <h4 className="text-[9px] font-black text-blue-800 uppercase tracking-widest">Time & Attendance Audit</h4>
                    <span className="text-[8px] font-bold text-blue-500 uppercase">{slipAttendanceLog.length} Records Detected</span>
                 </div>
                 <div className="max-h-48 overflow-y-auto">
                   <table className="w-full text-left text-[10px]">
                      <thead className="bg-gray-50 sticky top-0">
                         <tr>
                            <th className="px-6 py-2 font-black text-gray-400 uppercase">Date</th>
                            <th className="px-6 py-2 font-black text-gray-400 uppercase">Entry</th>
                            <th className="px-6 py-2 font-black text-gray-400 uppercase text-right">Exit</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                         {slipAttendanceLog.map((log, idx) => (
                           <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="px-6 py-2.5 font-bold text-gray-700">{log.date}</td>
                              <td className="px-6 py-2.5 font-black text-blue-600">{log.checkIn}</td>
                              <td className="px-6 py-2.5 text-right font-black text-orange-600">{log.checkOut || 'Active Session'}</td>
                           </tr>
                         ))}
                         {slipAttendanceLog.length === 0 && (
                           <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-300 italic">No direct logs found for this calculated period.</td></tr>
                         )}
                      </tbody>
                   </table>
                 </div>
              </div>

              <div className="rounded-3xl border border-gray-100 overflow-hidden mb-8">
                 <table className="w-full text-[11px]">
                    <tbody className="divide-y divide-gray-50">
                       <tr><td className="px-8 py-4 font-bold text-blue-900 uppercase">Base Contractual Pay</td><td className="px-8 py-4 text-right font-black">₹{selectedSlip.baseAmount.toLocaleString()}</td></tr>
                       <tr><td className="px-8 py-4 font-bold text-orange-600 uppercase">Overtime Accruals ({selectedSlip.overtimeHours} Hrs)</td><td className="px-8 py-4 text-right font-black">₹{selectedSlip.overtimeAmount.toLocaleString()}</td></tr>
                       {selectedSlip.advanceDeduction > 0 && (
                         <tr className="bg-red-50/30"><td className="px-8 py-4 font-bold text-red-600 uppercase italic">Authorized Advance Deductions</td><td className="px-8 py-4 text-right font-black">-₹{selectedSlip.advanceDeduction.toLocaleString()}</td></tr>
                       )}
                       <tr className="bg-blue-900 text-white"><td className="px-8 py-6 font-black uppercase tracking-widest">Net Final Disbursement</td><td className="px-8 py-6 text-right text-3xl font-black">₹{selectedSlip.totalAmount.toLocaleString()}</td></tr>
                    </tbody>
                 </table>
              </div>

              <div className="flex justify-between items-center pt-8 border-t border-gray-100 print:hidden">
                 <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${selectedSlip.status === PaymentStatus.PAID ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    DISBURSEMENT {selectedSlip.status}
                 </div>
                 <button onClick={() => window.print()} className="bg-gray-900 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all">Download Receipt</button>
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none -rotate-12">
                 <span className="text-[100px] font-black uppercase tracking-tighter text-blue-900">VERIFIED</span>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FinancialManagement;
