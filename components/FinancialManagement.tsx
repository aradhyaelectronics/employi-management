
import React, { useState, useMemo } from 'react';
import { User, AppState, FinancialRequest, RequestStatus, UserRole, PaymentStatus, MonthlySalarySlip } from '../types';

interface Props {
  user: User;
  state: AppState;
  addRequest: (req: Omit<FinancialRequest, 'id' | 'status'>) => void;
  updateStatus: (id: string, status: RequestStatus) => void;
  generateMonthlySlips: (companyId: string, month: number, year: number) => void;
  addManualSalarySlip: (slip: Omit<MonthlySalarySlip, 'id' | 'generatedDate'>) => Promise<void>;
  updateSalaryStatus: (slipId: string, status: PaymentStatus) => void;
}

const FinancialManagement: React.FC<Props> = ({ user, state, addRequest, updateStatus, generateMonthlySlips, updateSalaryStatus }) => {
  const [formData, setFormData] = useState({ amount: 0, type: 'ADVANCE' as any, description: '' });
  const [penaltyData, setPenaltyData] = useState({ userId: '', amount: 0, description: '' });
  
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

  const myReqs = state.requests.filter(r => isEmployee ? r.userId === user.id : r.companyId === user.companyId).sort((a,b) => b.date.localeCompare(a.date));
  const mySlips = state.salarySlips.filter(s => isEmployee ? s.userId === user.id : s.companyId === user.companyId).sort((a,b) => b.year !== a.year ? b.year - a.year : b.month - a.month);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
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
          <button onClick={handlePayroll} className="w-full md:w-auto px-10 bg-blue-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40">Launch Monthly Engine</button>
        </div>
      )}

      {/* Transaction History Ledger */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
          <h4 className="text-sm font-black uppercase text-slate-800 tracking-tighter">Enterprise Financial Ledger</h4>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Sync: Active</span>
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
    </div>
  );
};

export default FinancialManagement;
