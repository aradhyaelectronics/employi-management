
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
  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const isEmployee = user.role === UserRole.EMPLOYEE;

  const handlePayroll = () => {
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    if (confirm("Execute Auto-Payroll Engine? This calculates total earnings based on work hours, OT, and deducts approved advances.")) {
      generateMonthlySlips(user.companyId, month, year);
      alert("Payroll generation initiated in master cluster.");
    }
  };

  const myReqs = state.requests.filter(r => isEmployee ? r.userId === user.id : r.companyId === user.companyId);
  const mySlips = state.salarySlips.filter(s => isEmployee ? s.userId === user.id : s.companyId === user.companyId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-xl font-black uppercase text-blue-900 mb-8">Request Funds</h3>
          <form onSubmit={e => { e.preventDefault(); addRequest({...formData, userId: user.id, companyId: user.companyId, date: new Date().toISOString().split('T')[0] }); setFormData({amount:0, type:'ADVANCE', description:''}); }} className="space-y-4">
            <select className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-xs uppercase" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
              <option value="ADVANCE">Advance Request</option>
              <option value="SALARY">Salary Discrepancy</option>
            </select>
            <input type="number" placeholder="Amount ₹" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-blue-600" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: parseInt(e.target.value) || 0})} required />
            <input type="text" placeholder="Purpose" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-xs" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Send Request</button>
          </form>
        </div>

        {isAdmin && (
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter mb-4">Auto-Payroll Protocol</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">The payroll engine automatically computes base pay, overtime premiums, and subtracts historical advance disbursements.</p>
            </div>
            <button onClick={handlePayroll} className="w-full bg-blue-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40 mt-8">Generate Current Month Ledger</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden">
        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
          <h4 className="text-xs font-black uppercase text-slate-800">Financial History</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400">Personnel / Date</th>
                <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400">Amount / Type</th>
                <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400 text-center">Status</th>
                {isAdmin && <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {myReqs.map(r => {
                const emp = state.users.find(u => u.id === r.userId);
                return (
                  <tr key={r.id}>
                    <td className="px-8 py-5"><p className="text-xs font-black text-slate-800 uppercase">{emp?.name}</p><p className="text-[8px] font-bold text-slate-400">{r.date}</p></td>
                    <td className="px-8 py-5"><p className="text-xs font-black text-blue-600 uppercase">₹{r.amount}</p><p className="text-[8px] font-bold text-slate-400 uppercase">{r.type}</p></td>
                    <td className="px-8 py-5 text-center"><span className={`px-3 py-1 rounded-xl text-[8px] font-black uppercase border ${r.status === 'APPROVED' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>{r.status}</span></td>
                    {isAdmin && r.status === 'PENDING' && (
                      <td className="px-8 py-5 text-right"><button onClick={() => updateStatus(r.id, RequestStatus.APPROVED)} className="text-green-600 font-black text-[9px] uppercase">Approve</button></td>
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
