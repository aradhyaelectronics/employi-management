
import React, { useState, useMemo } from 'react';
import { User, AppState, FinancialRequest, RequestStatus, UserRole, PaymentStatus, MonthlySalarySlip, SalaryType } from '../types';
import SalarySlipModal from './SalarySlipModal';

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
  const [formData, setFormData] = useState({ amount: 0, type: 'ADVANCE' as any, description: '' });
  const [penaltyData, setPenaltyData] = useState({ userId: '', amount: 0, description: '' });
  const [selectedSlipsToPrint, setSelectedSlipsToPrint] = useState<MonthlySalarySlip[] | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  
  const [manualSlip, setManualSlip] = useState({
    userId: '',
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    baseAmount: 0,
    overtimeAmount: 0,
    overtimeHours: 0,
    advanceDeduction: 0,
    penaltyDeduction: 0,
    pfDeduction: 0,
    medicalDeduction: 0,
    status: PaymentStatus.UNPAID
  });

  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const isEmployee = user.role === UserRole.EMPLOYEE;

  const companyPersonnel = useMemo(() => state.users.filter(u => u.companyId === user.companyId && u.role !== UserRole.SUPER_ADMIN), [state.users, user.companyId]);

  const handlePayroll = () => {
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    if (confirm("Execute Auto-Payroll Engine? This calculates total earnings based on work hours, OT, and deducts approved advances + damage penalties.")) {
      generateMonthlySlips(user.companyId, month, year);
      alert("Payroll generation initiated in master cluster.");
    }
  };

  const handlePenaltySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!penaltyData.userId || penaltyData.amount <= 0) return alert("Select personnel and enter valid recovery amount.");
    
    if (confirm(`IMPOSE PENALTY: Deduct ₹${penaltyData.amount} from ${state.users.find(u => u.id === penaltyData.userId)?.name} for: "${penaltyData.description}"?`)) {
      addRequest({
        userId: penaltyData.userId,
        companyId: user.companyId,
        amount: penaltyData.amount,
        type: 'PENALTY',
        date: new Date().toISOString().split('T')[0],
        description: penaltyData.description
      });
      setPenaltyData({ userId: '', amount: 0, description: '' });
      alert("Deduction record committed to ledger.");
    }
  };

  const handleManualSlipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSlip.userId) return alert("Please select personnel.");

    const total = (manualSlip.baseAmount + manualSlip.overtimeAmount) - 
                  (manualSlip.advanceDeduction + manualSlip.penaltyDeduction + manualSlip.pfDeduction + manualSlip.medicalDeduction);

    await addManualSalarySlip({
      ...manualSlip,
      companyId: user.companyId,
      totalAmount: Math.max(0, total)
    });

    setShowManualForm(false);
    alert("Manual Salary Slip Generated Successfully.");
  };

  const myReqs = state.requests.filter(r => isEmployee ? r.userId === user.id : r.companyId === user.companyId).sort((a,b) => b.date.localeCompare(a.date));
  const mySlips = useMemo(() => {
    return state.salarySlips
      .filter(s => isEmployee ? s.userId === user.id : s.companyId === user.companyId)
      .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
  }, [state.salarySlips, user, isEmployee]);

  const monthsList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* standard Request form */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-xl font-black uppercase text-blue-900 mb-8">Financial Request</h3>
          <form onSubmit={e => { e.preventDefault(); addRequest({...formData, userId: user.id, companyId: user.companyId, date: new Date().toISOString().split('T')[0] }); setFormData({amount:0, type:'ADVANCE', description:''}); }} className="space-y-4">
            <select className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-xs uppercase" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
              <option value="ADVANCE">Advance Request</option>
              <option value="SALARY">Salary Discrepancy</option>
            </select>
            <input type="number" placeholder="Amount ₹" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-blue-600" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: parseInt(e.target.value) || 0})} required />
            <input type="text" placeholder="Purpose" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-xs" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Transmit Request</button>
          </form>
        </div>

        {/* Admin Penalty / Loss Recovery Tool */}
        {isAdmin && (
           <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-red-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                 <svg className="w-16 h-16 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              </div>
              <h3 className="text-xl font-black uppercase text-red-900 mb-8">Loss & Damage Deduction</h3>
              <form onSubmit={handlePenaltySubmit} className="space-y-4">
                 <select required className="w-full p-4 bg-red-50/50 border border-red-100 rounded-2xl font-black text-xs uppercase" value={penaltyData.userId} onChange={e => setPenaltyData({...penaltyData, userId: e.target.value})}>
                    <option value="">Select Personnel for Deduction...</option>
                    {companyPersonnel.map(u => <option key={u.id} value={u.id}>{u.name} ({u.id})</option>)}
                 </select>
                 <input type="number" placeholder="Recovery Amount ₹" className="w-full p-4 bg-red-50/50 border border-red-100 rounded-2xl font-black text-red-600" value={penaltyData.amount || ''} onChange={e => setPenaltyData({...penaltyData, amount: parseInt(e.target.value) || 0})} required />
                 <input type="text" placeholder="Reason for Deduction (e.g. Cable Loss)" className="w-full p-4 bg-white border rounded-2xl font-bold text-xs" value={penaltyData.description} onChange={e => setPenaltyData({...penaltyData, description: e.target.value})} required />
                 <button type="submit" className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-900/10 active:scale-95 transition-all">Impose Deduction</button>
              </form>
           </div>
        )}
      </div>

      {isAdmin && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl text-center md:text-left">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Automated Payroll Protocol</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">System computes Base Pay + OT, then subtracts Advances and Damage Penalties. All data points are cross-verified with attendance telemetry.</p>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setShowManualForm(true)} className="px-6 bg-slate-800 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 transition-all border border-slate-700">Manual Slip</button>
             <button onClick={handlePayroll} className="px-8 bg-blue-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40">Launch Engine</button>
          </div>
        </div>
      )}

      {/* Salary Slips Registry */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b bg-blue-50/30 flex justify-between items-center">
          <h4 className="text-sm font-black uppercase text-blue-900 tracking-tighter">Generated Salary Slips</h4>
          {isAdmin && mySlips.length > 0 && (
            <button 
              onClick={() => setSelectedSlipsToPrint(mySlips)}
              className="px-6 py-2.5 bg-blue-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-blue-900/10"
            >
              Print All Slips
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Personnel</th>
                <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Cycle (M/Y)</th>
                <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Net Amount</th>
                <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {mySlips.map(s => {
                const emp = state.users.find(u => u.id === s.userId);
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-6">
                      <p className="text-xs font-black text-slate-800 uppercase">{emp?.name || s.userId}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">ID: {s.userId}</p>
                    </td>
                    <td className="px-8 py-6 text-center text-xs font-black text-slate-700">
                      {s.month + 1}/{s.year}
                    </td>
                    <td className="px-8 py-6 text-center">
                      <p className="text-sm font-black text-blue-900">₹{s.totalAmount.toLocaleString()}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-3 py-1 rounded-xl text-[8px] font-black uppercase border ${s.status === PaymentStatus.PAID ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right space-x-3">
                      <button 
                        onClick={() => setSelectedSlipsToPrint([s])}
                        className="text-blue-600 font-black text-[9px] uppercase hover:underline"
                      >
                        Print Slip
                      </button>
                      {isAdmin && s.status === PaymentStatus.UNPAID && (
                        <button 
                          onClick={() => updateSalaryStatus(s.id, PaymentStatus.PAID)}
                          className="text-green-600 font-black text-[9px] uppercase hover:underline"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {mySlips.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">No Salary Slips Generated Yet</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction History Ledger */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
          <h4 className="text-sm font-black uppercase text-slate-800 tracking-tighter">Advances & Adjustments Ledger</h4>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Audit Log</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Personnel / Date</th>
                <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Type / Memo</th>
                <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Amount</th>
                <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                {isAdmin && <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Registry</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {myReqs.map(r => {
                const emp = state.users.find(u => u.id === r.userId);
                const isPenalty = r.type === 'PENALTY';
                return (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-6"><p className="text-xs font-black text-slate-800 uppercase">{emp?.name}</p><p className="text-[8px] font-bold text-slate-400 tracking-widest">{r.date}</p></td>
                    <td className="px-8 py-6">
                       <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase mr-2 ${isPenalty ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{r.type}</span>
                       <span className="text-[10px] font-bold text-slate-500 uppercase italic">"{r.description}"</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <p className={`text-sm font-black ${isPenalty ? 'text-red-600' : 'text-blue-600'}`}>{isPenalty ? '-' : ''}₹{r.amount.toLocaleString()}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <span className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase border ${r.status === 'APPROVED' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                          {isPenalty ? 'IMPOSED' : r.status}
                       </span>
                    </td>
                    {isAdmin && (
                      <td className="px-8 py-6 text-right">
                         {r.status === RequestStatus.PENDING && (
                            <button onClick={() => updateStatus(r.id, RequestStatus.APPROVED)} className="text-green-600 font-black text-[9px] uppercase border border-green-600 px-3 py-1.5 rounded-lg hover:bg-green-600 hover:text-white transition-all">Approve</button>
                         )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Salary Slip Modal Form */}
      {showManualForm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
           <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-2xl p-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter mb-8">Create Manual Salary Slip</h3>
              <form onSubmit={handleManualSlipSubmit} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Personnel</label>
                       <select required className="w-full bg-slate-50 px-5 py-4 rounded-2xl font-bold text-sm" value={manualSlip.userId} onChange={e => setManualSlip({...manualSlip, userId: e.target.value})}>
                          <option value="">Select Personnel...</option>
                          {companyPersonnel.map(u => <option key={u.id} value={u.id}>{u.name} (ID: {u.id})</option>)}
                       </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Month</label>
                          <select className="w-full bg-slate-50 px-4 py-4 rounded-2xl font-black text-xs uppercase" value={manualSlip.month} onChange={e => setManualSlip({...manualSlip, month: parseInt(e.target.value)})}>
                             {monthsList.map((m, i) => <option key={m} value={i}>{m}</option>)}
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Year</label>
                          <input type="number" className="w-full bg-slate-50 px-4 py-4 rounded-2xl font-black text-xs" value={manualSlip.year} onChange={e => setManualSlip({...manualSlip, year: parseInt(e.target.value)})} />
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t border-slate-50">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-blue-600 uppercase ml-1">Base Salary (₹)</label>
                       <input type="number" className="w-full bg-slate-50 px-5 py-4 rounded-2xl font-black text-sm text-blue-900" value={manualSlip.baseAmount || ''} onChange={e => setManualSlip({...manualSlip, baseAmount: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-blue-600 uppercase ml-1">OT Amount (₹)</label>
                       <input type="number" className="w-full bg-slate-50 px-5 py-4 rounded-2xl font-black text-sm text-blue-900" value={manualSlip.overtimeAmount || ''} onChange={e => setManualSlip({...manualSlip, overtimeAmount: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-gray-400 uppercase ml-1">OT Hours</label>
                       <input type="number" step="0.5" className="w-full bg-slate-50 px-5 py-4 rounded-2xl font-black text-sm" value={manualSlip.overtimeHours || ''} onChange={e => setManualSlip({...manualSlip, overtimeHours: parseFloat(e.target.value) || 0})} />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-red-600 uppercase ml-1">Advance (₹)</label>
                       <input type="number" className="w-full bg-red-50/50 border border-red-100 px-4 py-4 rounded-2xl font-black text-sm text-red-900" value={manualSlip.advanceDeduction || ''} onChange={e => setManualSlip({...manualSlip, advanceDeduction: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-red-600 uppercase ml-1">Penalty (₹)</label>
                       <input type="number" className="w-full bg-red-50/50 border border-red-100 px-4 py-4 rounded-2xl font-black text-sm text-red-900" value={manualSlip.penaltyDeduction || ''} onChange={e => setManualSlip({...manualSlip, penaltyDeduction: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-red-600 uppercase ml-1">PF (₹)</label>
                       <input type="number" className="w-full bg-red-50/50 border border-red-100 px-4 py-4 rounded-2xl font-black text-sm text-red-900" value={manualSlip.pfDeduction || ''} onChange={e => setManualSlip({...manualSlip, pfDeduction: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-red-600 uppercase ml-1">Medical (₹)</label>
                       <input type="number" className="w-full bg-red-50/50 border border-red-100 px-4 py-4 rounded-2xl font-black text-sm text-red-900" value={manualSlip.medicalDeduction || ''} onChange={e => setManualSlip({...manualSlip, medicalDeduction: parseInt(e.target.value) || 0})} />
                    </div>
                 </div>

                 <div className="bg-blue-900 p-8 rounded-3xl text-white flex justify-between items-center shadow-xl">
                    <div>
                       <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Calculated Net Pay</p>
                       <p className="text-3xl font-black tracking-tighter">₹{((manualSlip.baseAmount + manualSlip.overtimeAmount) - (manualSlip.advanceDeduction + manualSlip.penaltyDeduction + manualSlip.pfDeduction + manualSlip.medicalDeduction)).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                       <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-2">Initial Status</label>
                       <select className="bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2 font-black text-[10px] uppercase" value={manualSlip.status} onChange={e => setManualSlip({...manualSlip, status: e.target.value as PaymentStatus})}>
                          <option value={PaymentStatus.UNPAID}>Unpaid</option>
                          <option value={PaymentStatus.PAID}>Paid</option>
                       </select>
                    </div>
                 </div>

                 <div className="flex gap-4 pt-6">
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-900/20 active:scale-95 transition-all">Generate Manual Slip</button>
                    <button type="button" onClick={() => setShowManualForm(false)} className="px-10 py-5 bg-slate-100 text-slate-400 rounded-[2rem] font-black uppercase text-xs tracking-widest">Cancel</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Salary Slip Print Modal */}
      {selectedSlipsToPrint && (
        <SalarySlipModal 
          slips={selectedSlipsToPrint} 
          state={state} 
          onClose={() => setSelectedSlipsToPrint(null)} 
        />
      )}
    </div>
  );
};

export default FinancialManagement;
