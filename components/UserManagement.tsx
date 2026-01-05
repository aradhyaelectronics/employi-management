
import React, { useState, useMemo, useEffect } from 'react';
import { User, AppState, UserRole, UserStatus, SalaryType } from '../types';
import { Logo, ICONS } from '../constants';

interface Props {
  user: User;
  state: AppState;
  addUser: (u: any) => Promise<User>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  onUpgradeClick?: () => void;
}

const UserManagement: React.FC<Props> = ({ user, state, addUser, updateUser, removeUser, onUpgradeClick }) => {
  const isSupervisor = user.role === UserRole.SUPERVISOR;
  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const isSuper = user.role === UserRole.SUPER_ADMIN;

  const [newPinRequest, setNewPinRequest] = useState<{ id: string, pin: string } | null>(null);

  // Subscription Details
  const company = state.companies.find(c => c.id === user.companyId);
  const plan = state.subscriptionPlans.find(p => p.id === (company?.subscriptionPlanId || 'p-free'));
  const currentUsersCount = state.users.filter(u => u.companyId === user.companyId).length;
  const isLimitReached = plan ? currentUsersCount >= plan.userLimit : false;

  const calculateOtRate = (amount: number, type: SalaryType): number => {
    if (amount <= 0) return 0;
    const rate = type === SalaryType.DAILY_WAGE 
      ? (amount / 8) 
      : ((amount / 30) / 8);
    return parseFloat(rate.toFixed(2));
  };

  const [newUser, setNewUser] = useState({ 
    name: '', email: '', mobile: '', 
    password: 'PR-' + Math.floor(1000 + Math.random() * 9000), 
    role: UserRole.EMPLOYEE, supervisorId: '', salaryType: SalaryType.DAILY_WAGE, 
    salaryAmount: 0, overtimeRate: 0, pin: Math.floor(100000 + Math.random() * 900000).toString(),
    pfEnabled: false, pfAmount: 0, medicalEnabled: false, medicalAmount: 0,
    address: '', company_name: ''
  });

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [lastEnrolledUser, setLastEnrolledUser] = useState<User | null>(null);
  
  const companyUsers = useMemo(() => {
    if (isSuper) return state.users;
    return state.users.filter(u => u.companyId === user.companyId);
  }, [state.users, user.companyId, isSuper]);

  const companySupervisors = useMemo(() => companyUsers.filter(u => u.role === UserRole.SUPERVISOR), [companyUsers]);

  // CORE REGISTRY: Filtered to show only ACTIVE users as per requirement
  const activeRegistry = useMemo(() => {
    let base = [];
    if (isSuper || isAdmin) base = companyUsers;
    else if (isSupervisor) base = companyUsers.filter(u => u.supervisorId === user.id);
    
    return base.filter(u => u.status === UserStatus.ACTIVE);
  }, [companyUsers, user.id, isAdmin, isSupervisor, isSuper]);

  // VERIFICATION QUEUE: For admins to approve new enrollments
  const pendingQueue = useMemo(() => {
    if (!isAdmin) return [];
    return companyUsers.filter(u => u.status === UserStatus.PENDING);
  }, [companyUsers, isAdmin]);

  const mobileConflict = useMemo(() => {
    const clean = newUser.mobile.replace(/\D/g, '');
    if (!clean) return false;
    return state.users.some(u => u.mobile?.replace(/\D/g, '') === clean);
  }, [newUser.mobile, state.users]);

  useEffect(() => {
    setNewUser(prev => ({ 
      ...prev, 
      overtimeRate: calculateOtRate(prev.salaryAmount, prev.salaryType) 
    }));
  }, [newUser.salaryAmount, newUser.salaryType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLimitReached) {
      if (confirm(`LIMIT REACHED: Your plan allows max ${plan?.userLimit} users. Would you like to upgrade now?`)) {
        onUpgradeClick?.();
      }
      return;
    }
    if (mobileConflict) {
      alert("ERROR: Mobile number already registered.");
      return;
    }
    try {
      const result = await addUser({
        ...newUser,
        status: UserStatus.PENDING,
        email: newUser.email.replace(/\s+/g, '').toLowerCase(),
        mobile: newUser.mobile.replace(/\D/g, ''),
        companyId: user.companyId,
        company_name: company?.name || 'Enterprise'
      });
      setLastEnrolledUser(result);
      setNewUser({ 
        name: '', email: '', mobile: '', address: '', company_name: '',
        password: 'PR-' + Math.floor(1000 + Math.random() * 9000), 
        role: UserRole.EMPLOYEE, supervisorId: '', salaryType: SalaryType.DAILY_WAGE, salaryAmount: 0, overtimeRate: 0,
        pin: Math.floor(100000 + Math.random() * 900000).toString(),
        pfEnabled: false, pfAmount: 0, medicalEnabled: false, medicalAmount: 0
      });
      alert("Success: Personnel enrolled as PENDING. Approval required.");
    } catch (error: any) { 
      if (error.message.includes("LIMIT REACHED") && confirm(error.message + "\n\nUpgrade now?")) {
        onUpgradeClick?.();
      } else {
        alert(error.message);
      }
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await updateUser(editingUser.id, editingUser);
      setEditingUser(null);
      alert("Personnel profile updated.");
    } catch (err: any) { alert(err.message); }
  };

  const handleResetPin = async () => {
    if (!newPinRequest) return;
    try {
      await updateUser(newPinRequest.id, { pin_hash: newPinRequest.pin });
      alert("PIN security updated.");
      setNewPinRequest(null);
    } catch (err: any) { alert(err.message); }
  };

  const handleActivate = async (u: User) => {
    if (confirm(`Authorize and activate ${u.name} into the active registry?`)) {
      await updateUser(u.id, { status: UserStatus.ACTIVE });
      alert("Personnel activated and synchronized.");
    }
  };

  return (
    <div className="space-y-6">
       {(isAdmin || isSuper) && (
          <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex items-center justify-between border border-slate-800 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[80px] rounded-full"></div>
             <div className="relative z-10">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Service Tier: {plan?.name}</p>
                <h3 className="text-xl font-black uppercase tracking-tighter">Capacity Index</h3>
                <div className="flex items-center space-x-4 mt-4">
                   <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${isLimitReached ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${(currentUsersCount / (plan?.userLimit || 1)) * 100}%` }}></div>
                   </div>
                   <span className="text-xs font-black">{currentUsersCount} / {plan?.userLimit} Used</span>
                </div>
             </div>
             {/* Fix: Access AndroidInterface by casting window to any to avoid TypeScript errors */}
             <button onClick={() => (window as any).AndroidInterface?.showToast("Download APK Link Copied")} className="relative z-10 px-6 py-3 bg-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl">Deploy Employee APK</button>
          </div>
       )}

       {/* Verification Queue Section for Admins */}
       {isAdmin && pendingQueue.length > 0 && (
          <div className="bg-white rounded-3xl border border-orange-100 overflow-hidden shadow-sm animate-in slide-in-from-top-4">
             <div className="p-6 border-b border-orange-50 bg-orange-50/20 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                   <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                   <h4 className="text-sm font-black text-orange-900 uppercase tracking-widest">Verification Queue</h4>
                </div>
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{pendingQueue.length} Awaiting Approval</span>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <tbody className="divide-y divide-orange-50">
                      {pendingQueue.map(u => (
                         <tr key={u.id} className="hover:bg-orange-50/30 transition-all">
                            <td className="px-8 py-5">
                               <p className="text-sm font-black text-slate-800 uppercase">{u.name}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{u.mobile} • {u.role}</p>
                            </td>
                            <td className="px-8 py-5 text-right">
                               <div className="flex items-center justify-end space-x-3">
                                  <button onClick={() => handleActivate(u)} className="px-4 py-2 bg-green-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-green-900/10 hover:bg-green-700 transition-all">Approve</button>
                                  <button onClick={() => confirm("Reject enrollment?") && removeUser(u.id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest">Reject</button>
                               </div>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
       )}

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {(isAdmin || isSuper) && (
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-2 text-gray-800 uppercase tracking-tighter">Enroll Personnel</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Establish Chain of Command</p>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  {isLimitReached && (
                    <button 
                      type="button"
                      onClick={onUpgradeClick}
                      className="w-full p-4 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase border border-red-100 mb-4 hover:bg-red-100 transition-colors flex items-center justify-center space-x-2 group"
                    >
                      <span>License Limit Hit. Upgrade Tier.</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </button>
                  )}
                  <input type="text" placeholder="Full Name" className="w-full px-4 py-3 bg-gray-50 rounded-xl border text-sm font-medium outline-none" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="email" placeholder="Email ID" className="w-full px-4 py-3 bg-gray-50 rounded-xl border text-sm font-medium outline-none" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                    <input type="tel" placeholder="Mobile Number" className={`w-full px-4 py-3 bg-gray-50 rounded-xl border text-sm font-medium outline-none ${mobileConflict ? 'border-red-300 bg-red-50' : ''}`} value={newUser.mobile} onChange={e => setNewUser({ ...newUser, mobile: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-blue-600 uppercase mb-1 ml-1">Initial Password</label>
                      <input type="text" className="w-full px-4 py-3 bg-blue-50 border-blue-100 text-blue-900 rounded-xl border text-sm font-black" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-orange-600 uppercase mb-1 ml-1">Field PIN (6-Digit)</label>
                      <input type="text" maxLength={6} className="w-full px-4 py-3 bg-orange-50 border-orange-100 text-orange-900 rounded-xl border text-sm font-black text-center tracking-[0.2em]" value={newUser.pin} onChange={e => setNewUser({ ...newUser, pin: e.target.value.replace(/\D/g, '') })} required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Assigned Role</label>
                    <select className="w-full px-4 py-3 bg-gray-50 rounded-xl border text-sm font-bold" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole, supervisorId: '' })}>
                      <option value={UserRole.EMPLOYEE}>Employee</option>
                      <option value={UserRole.SUPERVISOR}>Supervisor</option>
                      {isSuper && <option value={UserRole.ADMIN}>Admin</option>}
                    </select>
                  </div>
                  <button type="submit" disabled={isLimitReached || mobileConflict} className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all ${isLimitReached || mobileConflict ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>Complete Enrollment</button>
                </form>
              </div>

              {lastEnrolledUser && (
                <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-2xl animate-in zoom-in-95 relative border border-slate-800">
                  <h4 className="text-sm font-black uppercase tracking-widest text-blue-400 mb-6">Credentials Created</h4>
                  <div className="space-y-4">
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Login Mobile</p>
                        <p className="text-xl font-black text-white">{lastEnrolledUser.mobile}</p>
                      </div>
                      <button onClick={() => setLastEnrolledUser(null)} className="w-full py-3 bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest">Dismiss Receipt</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={(isAdmin || isSuper) ? "lg:col-span-2" : "lg:col-span-3"}>
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
                <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">Active Registry</h4>
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{activeRegistry.length} Verified Nodes</span>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-8 py-4 text-[10px] font-bold uppercase text-gray-400">Personnel</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase text-center text-gray-400">Node Lock</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase text-right text-gray-400">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeRegistry.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="font-bold text-gray-800 text-sm uppercase tracking-tight">{u.name}</div>
                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{u.role} | {u.mobile}</div>
                        <div className="text-[8px] font-black text-blue-600 uppercase mt-1">ID: {u.id}</div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="px-3 py-1 rounded-xl text-[8px] font-black uppercase border bg-green-50 text-green-700 border-green-100 flex items-center gap-1">
                             <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                             {u.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <button onClick={() => setEditingUser(u)} className="text-blue-600 font-black text-[10px] uppercase">Edit</button>
                          {(isSuper || isAdmin) && u.id !== user.id && (
                            <button onClick={() => confirm("Decommission this personnel node? This will block access immediately.") && removeUser(u.id)} className="p-2 text-gray-300 hover:text-red-500 transition-all">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeRegistry.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-8 py-20 text-center text-gray-300 font-black text-[10px] uppercase tracking-[0.4em]">
                        No Active Personnel in Registry
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
       </div>

      {newPinRequest && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
           <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm text-center shadow-2xl">
              <h4 className="text-xl font-black text-blue-900 uppercase tracking-tighter mb-4">Reset Terminal PIN</h4>
              <input type="password" maxLength={6} className="w-full text-center text-4xl font-black tracking-[0.5em] bg-slate-50 rounded-2xl py-6 mb-8" placeholder="******" value={newPinRequest.pin} onChange={e => setNewPinRequest({...newPinRequest, pin: e.target.value.replace(/\D/g, '')})} />
              <div className="flex space-x-3">
                 <button onClick={handleResetPin} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest">Confirm</button>
                 <button onClick={() => setNewPinRequest(null)} className="px-6 py-4 bg-gray-100 text-gray-400 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
              </div>
           </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl p-10 relative">
            <h3 className="text-2xl font-black text-blue-900 uppercase mb-8">Update Profile</h3>
            <form onSubmit={handleUpdateUser} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Personnel Name</label>
                   <input type="text" className="w-full px-4 py-3 bg-gray-50 border rounded-xl font-bold text-sm" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Access Status</label>
                   <select className="w-full px-4 py-3 bg-blue-50 border border-blue-100 text-blue-900 rounded-xl font-black text-xs" value={editingUser.status} onChange={e => setEditingUser({...editingUser, status: e.target.value as UserStatus})}>
                       <option value={UserStatus.ACTIVE}>ACTIVE</option>
                       <option value={UserStatus.PENDING}>PENDING</option>
                       <option value={UserStatus.BLOCKED}>BLOCKED</option>
                   </select>
                </div>
               <div className="flex space-x-3 pt-6">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-xl">Save Changes</button>
                  <button type="button" onClick={() => setEditingUser(null)} className="px-6 py-4 bg-gray-100 text-gray-400 rounded-xl font-black uppercase text-[11px] tracking-widest">Cancel</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
