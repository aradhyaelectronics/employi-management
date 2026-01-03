
import React, { useState } from 'react';
import { User, AppState, UserRole, LeaveType, RequestStatus } from '../types';

interface Props {
  user: User;
  state: AppState;
  addLeaveRequest: (req: any) => void;
  updateLeaveStatus: (id: string, status: RequestStatus) => void;
}

const LeavePortal: React.FC<Props> = ({ user, state, addLeaveRequest, updateLeaveStatus }) => {
  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const [formData, setFormData] = useState({ type: LeaveType.CASUAL, fromDate: '', toDate: '', reason: '' });

  const myLeaves = state.leaves.filter(l => l.userId === user.id);
  const pendingLeaves = state.leaves.filter(l => l.companyId === user.companyId && l.status === RequestStatus.PENDING);

  return (
    <div className="space-y-10">
      {/* Request Form */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 max-w-2xl mx-auto">
        <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter mb-8 text-center">Leave Application Portal</h3>
        <form onSubmit={e => { e.preventDefault(); addLeaveRequest({...formData, userId: user.id, companyId: user.companyId}); alert("Request sent."); }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="md:col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Leave Classification</label>
              <select className="w-full px-5 py-4 bg-gray-50 border rounded-2xl font-bold" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                {Object.values(LeaveType).map(t => <option key={t} value={t}>{t} LEAVE</option>)}
              </select>
           </div>
           <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">From Date</label>
              <input type="date" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl" value={formData.fromDate} onChange={e => setFormData({...formData, fromDate: e.target.value})} />
           </div>
           <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">To Date</label>
              <input type="date" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl" value={formData.toDate} onChange={e => setFormData({...formData, toDate: e.target.value})} />
           </div>
           <div className="md:col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason / Justification</label>
              <input type="text" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl" placeholder="Describe the reason for leave..." value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
           </div>
           <button type="submit" className="md:col-span-2 bg-blue-700 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Transmit Application</button>
        </form>
      </div>

      {/* Admin Review Queue */}
      {isAdmin && pendingLeaves.length > 0 && (
        <div className="bg-white rounded-[2rem] border border-orange-100 overflow-hidden">
           <div className="p-8 bg-orange-50/30 border-b border-orange-50">
              <h3 className="text-xl font-black text-orange-800 uppercase tracking-tighter">Review Queue</h3>
           </div>
           <table className="w-full text-left">
              <tbody className="divide-y divide-orange-50">
                {pendingLeaves.map(l => {
                  const emp = state.users.find(u => u.id === l.userId);
                  return (
                    <tr key={l.id}>
                      <td className="px-8 py-6">
                        <div className="font-black text-gray-800 uppercase text-xs">{emp?.name}</div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase">{l.type} • {l.fromDate} to {l.toDate}</div>
                      </td>
                      <td className="px-8 py-6 text-xs italic text-gray-400">"{l.reason}"</td>
                      <td className="px-8 py-6 text-right space-x-2">
                        <button onClick={() => updateLeaveStatus(l.id, RequestStatus.APPROVED)} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase">Approve</button>
                        <button onClick={() => updateLeaveStatus(l.id, RequestStatus.REJECTED)} className="bg-red-100 text-red-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase">Reject</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
           </table>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-[2rem] border overflow-hidden">
        <div className="p-8 bg-gray-50/50 border-b">
           <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter">Application History</h3>
        </div>
        <table className="w-full text-left">
           <thead className="bg-gray-50">
             <tr>
               <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Period</th>
               <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Classification</th>
               <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
             </tr>
           </thead>
           <tbody className="divide-y">
             {myLeaves.map(l => (
               <tr key={l.id}>
                 <td className="px-8 py-5 text-xs font-black text-gray-700">{l.fromDate} → {l.toDate}</td>
                 <td className="px-8 py-5 text-center text-[10px] font-black uppercase text-blue-600">{l.type}</td>
                 <td className="px-8 py-5 text-center">
                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase ${l.status === RequestStatus.APPROVED ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{l.status}</span>
                 </td>
               </tr>
             ))}
           </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeavePortal;
