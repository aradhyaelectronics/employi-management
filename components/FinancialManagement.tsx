
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

  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const isEmployee = user.role === UserRole.EMPLOYEE;
  
  const now = new Date();
  const [reportMonth, setReportMonth] = useState(now.getMonth());
  const [reportYear, setReportYear] = useState(now.getFullYear());

  const handleGenerate = () => {
    if (confirm("Execute Auto-Calculated Payroll? This will compute earnings based on actual working hours logged in the system and apply configured deductions (PF/Medical).")) {
      generateMonthlySlips(user.companyId, reportMonth, reportYear);
    }
  };

  const filteredSlips = useMemo(() => {
    return state.salarySlips.filter(s => {
      const basicMatch = s.companyId === user.companyId && s.month === reportMonth && s.year === reportYear;
      if (isEmployee) return basicMatch && s.userId === user.id;
      return basicMatch;
    });
  }, [state.salarySlips, user.id, user.companyId, reportMonth, reportYear, isEmployee]);

  const slipDetails = useMemo(() => {
    if (!selectedSlip) return null;
    const slipUser = state.users.find(u => u.id === selectedSlip.userId);
    const company = state.companies.find(c => c.id === selectedSlip.companyId);
    const attendanceLogs = state.attendance.filter(a => {
      const d = new Date(a.date);
      return a.userId === selectedSlip.userId && d.getMonth() === selectedSlip.month && d.getFullYear() === selectedSlip.year;
    }).sort((a, b) => a.date.localeCompare(b.date));

    return { user: slipUser, company, attendanceLogs };
  }, [selectedSlip, state.users, state.companies, state.attendance]);

  return (
    <div className="space-y-12 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Finance & Payroll</h2>
        {isAdmin && (
           <div className="flex gap-2">
              <select className="bg-white border rounded-xl text-xs font-bold px-3 py-1" value={reportMonth} onChange={e => setReportMonth(parseInt(e.target.value))}>
                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <button onClick={handleGenerate} className="bg-blue-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">Execute Auto-Payroll</button>
           </div>
        )}
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 max-w-2xl mx-auto">
        <h3 className="text-lg font-black mb-8 text-blue-900 uppercase tracking-tighter text-center">New Disbursement Request</h3>
        <form onSubmit={e => { 
          e.preventDefault(); 
          addRequest({ ...formData, userId: user.id, companyId: user.companyId, date: new Date().toISOString().split('T')[0] }); 
          setFormData({ amount: 0, type: 'ADVANCE', description: '' }); 
          alert("Request sent for approval."); 
        }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <select className="w-full px-5 py-4 bg-gray-50 border rounded-2xl font-bold text-sm" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}><option value="ADVANCE">Advance Request</option><option value="SALARY">Salary Query</option></select>
            <input type="number" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl font-black text-blue-900" placeholder="Amount ₹" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })} />
          </div>
          <input type="text" placeholder="Purpose / Description" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl text-sm" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          <button type="submit" className="w-full bg-blue-700 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Transmit Request</button>
        </form>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b bg-gray-50/30 flex justify-between items-center">
          <h3 className="font-black text-blue-900 uppercase text-xs">Salary Statement Registry (Auto-Calculated)</h3>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filteredSlips.length} Statements Found</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Personnel</th>
                <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Net Payable</th>
                <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSlips.map(s => {
                const emp = state.users.find(u => u.id === s.userId);
                return (
                  <tr key={s.id} className="hover:bg-gray-50/20">
                    <td className="px-8 py-6 font-black text-xs uppercase text-gray-800">{emp?.name}</td>
                    <td className="px-8 py-6 text-right font-black text-gray-900">₹{s.totalAmount.toLocaleString()}</td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-3 py-1 rounded-xl text-[8px] font-black uppercase border ${s.status === PaymentStatus.PAID ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{s.status}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button onClick={() => setSelectedSlip(s)} className="bg-white border px-4 py-2 rounded-xl text-[9px] font-black uppercase text-blue-900 hover:bg-blue-50">View Statement</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSlip && slipDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-950/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 relative my-auto">
            <button onClick={() => setSelectedSlip(null)} className="absolute top-10 right-10 text-gray-300 hover:text-red-500 transition-colors">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="border-b-2 border-gray-100 pb-8 mb-8 text-center">
               <h1 className="text-3xl font-black text-blue-900 uppercase tracking-tighter leading-none">{slipDetails.company?.name || 'WorkManager Enterprise'}</h1>
               <p className="text-[10px] font-bold text-gray-400 uppercase mt-2 tracking-widest">{slipDetails.company?.address || 'Site Infrastructure Deployment Node'}</p>
               <div className="mt-4 flex justify-center gap-4">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100">Pro-Rata Hourly Computation</span>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-10">
               <div className="bg-gray-50 p-6 rounded-[2rem]">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Personnel Information</p>
                  <p className="text-xl font-black text-blue-900 uppercase">{slipDetails.user?.name}</p>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Cycle: {slipDetails.user?.salaryType}</p>
               </div>
               <div className="flex flex-col justify-center text-right pr-6">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Net Working Hours</p>
                  <p className="text-3xl font-black text-blue-950">{selectedSlip.overtimeHours}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">Calculated from Telemetry</p>
               </div>
            </div>

            <div className="mb-10 overflow-hidden rounded-[2rem] border border-gray-100">
               <div className="bg-gray-50 px-6 py-3 border-b flex justify-between items-center">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Time Logs (09:00 Reference)</span>
                  <span className="text-[8px] font-bold text-blue-600 uppercase">{slipDetails.attendanceLogs.length} Days Worked</span>
               </div>
               <div className="max-h-40 overflow-y-auto">
                 <table className="w-full text-left text-[10px]">
                    <thead className="bg-white sticky top-0">
                       <tr>
                          <th className="px-6 py-2 font-black text-gray-400 uppercase border-b">Date</th>
                          <th className="px-6 py-2 font-black text-gray-400 uppercase border-b">Check-In</th>
                          <th className="px-6 py-2 font-black text-gray-400 uppercase border-b text-right">Check-Out</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {slipDetails.attendanceLogs.map((log, i) => (
                         <tr key={i}>
                            <td className="px-6 py-2.5 font-bold text-gray-700">{log.date}</td>
                            <td className={`px-6 py-2.5 font-black ${log.checkIn > "09:00" ? 'text-red-500' : 'text-blue-600'}`}>{log.checkIn}</td>
                            <td className="px-6 py-2.5 text-right font-black text-orange-600">{log.checkOut || 'Active'}</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>

            <div className="bg-blue-900 rounded-[2rem] p-8 text-white shadow-2xl">
               <div className="space-y-3 mb-6 opacity-80">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                     <span>Calculated Base (Hourly)</span>
                     <span>₹{selectedSlip.baseAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                     <span>OT / Excess Adjustments</span>
                     <span>₹{selectedSlip.overtimeAmount.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-white/10 space-y-2">
                     {selectedSlip.advanceDeduction > 0 && (
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-red-300">
                           <span>Advance Repayment</span>
                           <span>-₹{selectedSlip.advanceDeduction.toLocaleString()}</span>
                        </div>
                     )}
                     {selectedSlip.pfDeduction > 0 && (
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-red-300">
                           <span>Provident Fund (PF)</span>
                           <span>-₹{selectedSlip.pfDeduction.toLocaleString()}</span>
                        </div>
                     )}
                     {selectedSlip.medicalDeduction > 0 && (
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-red-300">
                           <span>Medical Insurance</span>
                           <span>-₹{selectedSlip.medicalDeduction.toLocaleString()}</span>
                        </div>
                     )}
                  </div>
               </div>
               <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                  <div>
                    <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest mb-1">Final Net Disbursable</p>
                    <p className="text-4xl font-black tracking-tighter">₹{selectedSlip.totalAmount.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${selectedSlip.status === PaymentStatus.PAID ? 'bg-green-500' : 'bg-orange-500'}`}>{selectedSlip.status}</span>
                  </div>
               </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-[8px] font-bold text-gray-300 uppercase tracking-[0.2em]">Automatic Calculation Engine v3.6 - Verified Audit</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialManagement;
