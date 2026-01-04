
import React, { useState, useMemo, useEffect } from 'react';
import { User, AppState, UserRole, UserStatus, SalaryType } from '../types';
// Fixed: Added Logo to the imported components from constants
import { Logo } from '../constants';

interface Props {
  user: User;
  state: AppState;
  addUser: (u: Omit<User, 'id'>) => Promise<User>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
}

const UserManagement: React.FC<Props> = ({ user, state, addUser, updateUser, removeUser }) => {
  const isSupervisor = user.role === UserRole.SUPERVISOR;
  const isAdmin = user.role === UserRole.ADMIN;
  const isSuper = user.role === UserRole.SUPER_ADMIN;

  const calculateOtRate = (amount: number, type: SalaryType): number => {
    if (amount <= 0) return 0;
    const rate = type === SalaryType.DAILY_WAGE 
      ? (amount / 8) 
      : ((amount / 30) / 8);
    return parseFloat(rate.toFixed(2));
  };

  const [newUser, setNewUser] = useState({ 
    name: '', 
    email: '', 
    mobile: '',
    password: 'PR-' + Math.floor(1000 + Math.random() * 9000), 
    role: UserRole.EMPLOYEE,
    supervisorId: '',
    salaryType: SalaryType.DAILY_WAGE,
    salaryAmount: 0,
    overtimeRate: 0,
    pin: Math.floor(1000 + Math.random() * 9000).toString(),
    pfEnabled: false,
    pfAmount: 0,
    medicalEnabled: false,
    medicalAmount: 0
  });

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [lastEnrolledUser, setLastEnrolledUser] = useState<User | null>(null);
  
  const companyUsers = useMemo(() => {
    if (isSuper) return state.users;
    return state.users.filter(u => u.companyId === user.companyId);
  }, [state.users, user.companyId, isSuper]);

  const companySupervisors = useMemo(() => companyUsers.filter(u => u.role === UserRole.SUPERVISOR), [companyUsers]);

  const visibleEmployees = useMemo(() => {
    if (isSuper || isAdmin) return companyUsers;
    if (isSupervisor) return companyUsers.filter(u => u.supervisorId === user.id);
    return [];
  }, [companyUsers, user.id, isAdmin, isSupervisor, isSuper]);

  const mobileConflict = useMemo(() => {
    const clean = newUser.mobile.replace(/\s+/g, '');
    if (!clean) return false;
    return state.users.some(u => u.mobile?.replace(/\s+/g, '') === clean);
  }, [newUser.mobile, state.users]);

  useEffect(() => {
    setNewUser(prev => ({ 
      ...prev, 
      overtimeRate: calculateOtRate(prev.salaryAmount, prev.salaryType) 
    }));
  }, [newUser.salaryAmount, newUser.salaryType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileConflict) {
      alert("ERROR: This mobile number is already assigned to another personnel ID.");
      return;
    }
    try {
      const result = await addUser({
        ...newUser,
        status: UserStatus.PENDING,
        email: newUser.email.replace(/\s+/g, '').toLowerCase(),
        mobile: newUser.mobile.replace(/\s+/g, ''),
        companyId: user.companyId
      });
      setLastEnrolledUser(result);
      setNewUser({ 
        name: '', email: '', mobile: '', 
        password: 'PR-' + Math.floor(1000 + Math.random() * 9000), 
        role: UserRole.EMPLOYEE, supervisorId: '', salaryType: SalaryType.DAILY_WAGE, salaryAmount: 0, overtimeRate: 0,
        pin: Math.floor(1000 + Math.random() * 9000).toString(),
        pfEnabled: false, pfAmount: 0, medicalEnabled: false, medicalAmount: 0
      });
      alert("Success: Personnel enrolled as PENDING.");
    } catch (error: any) { alert(error.message); }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await updateUser(editingUser.id, {
        ...editingUser,
        email: editingUser.email.replace(/\s+/g, '').toLowerCase(),
        mobile: editingUser.mobile?.replace(/\s+/g, ''),
      });
      setEditingUser(null);
      alert("Success: Personnel profile updated.");
    } catch (err: any) { alert(err.message); }
  };

  const handleQuickActivate = async (u: User) => {
    if (confirm(`ACTIVATE PERSONNEL: Do you want to approve ${u.name} for immediate field duty?`)) {
      await updateUser(u.id, { status: UserStatus.ACTIVE });
      alert(`${u.name} is now ACTIVE.`);
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (u.id === user.id) return alert("System Error: Cannot delete active session identity.");
    if (confirm(`CRITICAL ACTION: Are you sure you want to PERMANENTLY remove ${u.name}?`)) {
      await removeUser(u.id);
      alert(`${u.name} has been purged.`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
       {(isAdmin || isSuper) && (
         <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold mb-2 text-gray-800 uppercase tracking-tighter">Enroll Personnel</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Establish Chain of Command</p>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <input type="text" placeholder="Full Name" className="w-full px-4 py-3 bg-gray-50 rounded-xl border text-sm font-medium outline-none" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
              
              <div className="grid grid-cols-2 gap-4">
                 <input type="email" placeholder="Email ID" className="w-full px-4 py-3 bg-gray-50 rounded-xl border text-sm font-medium outline-none" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                 <div className="relative">
                   <input type="tel" placeholder="Mobile Number" className={`w-full px-4 py-3 bg-gray-50 rounded-xl border text-sm font-medium outline-none transition-all ${mobileConflict ? 'border-red-500 bg-red-50' : ''}`} value={newUser.mobile} onChange={e => setNewUser({ ...newUser, mobile: e.target.value })} required />
                   {mobileConflict && <p className="text-[8px] font-black text-red-600 uppercase mt-1 ml-1">Already in Registry</p>}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1.5 ml-1">Initial Password</label>
                  <input type="text" className="w-full px-4 py-3 bg-blue-50 border-blue-100 text-blue-900 rounded-xl border text-sm font-black" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1.5 ml-1">Field PIN</label>
                  <input type="text" maxLength={4} className="w-full px-4 py-3 bg-orange-50 border-orange-100 text-orange-900 rounded-xl border text-sm font-black text-center tracking-[0.2em]" value={newUser.pin} onChange={e => setNewUser({ ...newUser, pin: e.target.value })} required />
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

              {newUser.role === UserRole.EMPLOYEE && (
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Assign Supervisor</label>
                  <select className="w-full px-4 py-3 bg-gray-50 rounded-xl border text-sm font-bold" value={newUser.supervisorId} onChange={e => setNewUser({ ...newUser, supervisorId: e.target.value })}>
                    <option value="">No Supervisor (Direct Admin)</option>
                    {companySupervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Pay Cycle</label>
                  <select className="w-full px-4 py-3 bg-gray-50 rounded-xl border text-sm font-bold" value={newUser.salaryType} onChange={e => setNewUser({ ...newUser, salaryType: e.target.value as SalaryType })}>
                    <option value={SalaryType.DAILY_WAGE}>Daily Wage</option>
                    <option value={SalaryType.MONTHLY_FIXED}>Monthly Fixed</option>
                  </select>
                </div>
                <div>
                   <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Base Amount (₹)</label>
                   <input type="number" placeholder="Salary" className="w-full px-4 py-3 bg-gray-50 rounded-xl border text-sm font-black text-blue-900" value={newUser.salaryAmount || ''} onChange={e => setNewUser({ ...newUser, salaryAmount: parseInt(e.target.value) || 0 })} />
                </div>
              </div>

              <button type="submit" disabled={mobileConflict} className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 ${mobileConflict ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>Complete Enrollment</button>
            </form>
          </div>

          {/* Share Credentials Receipt */}
          {lastEnrolledUser && (
            <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-2xl animate-in zoom-in-95 duration-500 relative overflow-hidden border border-slate-800">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Logo iconClassName="w-16 h-12" showText={false} light={true} />
               </div>
               <h4 className="text-sm font-black uppercase tracking-widest text-blue-400 mb-6 flex items-center">
                 <span className="w-4 h-4 bg-blue-500 rounded-full mr-2"></span> Credentials Shared
               </h4>
               <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Login ID / Number</p>
                     <p className="text-xl font-black text-white tracking-tighter uppercase">{lastEnrolledUser.id}</p>
                     <p className="text-[7px] font-bold text-slate-500 uppercase mt-1">Or use Mobile: {lastEnrolledUser.mobile}</p>
                  </div>
                  <div className="bg-orange-600 p-4 rounded-2xl shadow-xl shadow-orange-900/20">
                     <p className="text-[8px] font-black text-orange-200 uppercase tracking-widest mb-1">Security PIN</p>
                     <p className="text-2xl font-black text-white tracking-[0.5em]">{lastEnrolledUser.pin}</p>
                  </div>
                  <button onClick={() => setLastEnrolledUser(null)} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Dismiss Receipt</button>
                  <p className="text-[7px] text-center text-slate-500 font-bold uppercase mt-2">Take screenshot to share with {lastEnrolledUser.name.split(' ')[0]}</p>
               </div>
            </div>
          )}
        </div>
       )}

      <div className={(isAdmin || isSuper) ? "lg:col-span-2" : "lg:col-span-3"}>
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
             <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">Personnel Registry</h4>
             <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{visibleEmployees.length} Units Active</span>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-8 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Personnel</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Credentials</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase text-center text-gray-400 tracking-widest">Verification</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase text-right text-gray-400 tracking-widest">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibleEmployees.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="font-bold text-gray-800 text-sm uppercase tracking-tight">{u.name}</div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{u.role} | {u.mobile || 'No Mobile'}</div>
                    <div className="text-[8px] font-black text-blue-600 uppercase mt-1 tracking-tighter">ID: {u.id}</div>
                  </td>
                  <td className="px-8 py-6">
                    {isAdmin || isSuper ? (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">PW:</span>
                          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-black">{u.password}</code>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest">PIN:</span>
                          <code className="bg-orange-50 px-1.5 py-0.5 rounded text-[10px] font-black text-orange-700 tracking-[0.1em]">{u.pin || 'None'}</code>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[9px] text-gray-300 italic">Encrypted</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className={`px-3 py-1 rounded-xl text-[8px] font-black uppercase border ${u.status === UserStatus.ACTIVE ? 'bg-green-50 text-green-700 border-green-100' : u.status === UserStatus.PENDING ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {u.status}
                      </span>
                      {(isAdmin || isSuper) && u.status === UserStatus.PENDING && (
                        <button onClick={() => handleQuickActivate(u)} className="text-[7px] font-black text-green-600 uppercase border border-green-200 px-2 py-1 rounded-lg hover:bg-green-600 hover:text-white transition-all">Approve & Activate</button>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <button onClick={() => setEditingUser(u)} className="text-blue-600 hover:text-blue-800 font-black text-[10px] uppercase tracking-widest transition-colors">Edit</button>
                      {(isSuper || isAdmin) && u.id !== user.id && (
                        <button onClick={() => handleDeleteUser(u)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl p-10 relative my-8">
            <button onClick={() => setEditingUser(null)} className="absolute top-8 right-8 text-gray-300 hover:text-red-500 transition-colors"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            <h3 className="text-2xl font-black text-blue-900 tracking-tighter uppercase mb-8">Update Personnel Profile</h3>
            
            <form onSubmit={handleUpdateUser} className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                    <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} required />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5 ml-1">Profile Status</label>
                    <select 
                      className="w-full px-4 py-3 bg-blue-50 border border-blue-100 text-blue-900 rounded-xl font-black text-xs" 
                      value={editingUser.status} 
                      onChange={e => setEditingUser({...editingUser, status: e.target.value as UserStatus})}
                    >
                      <option value={UserStatus.ACTIVE}>ACTIVE (Authorized Access)</option>
                      <option value={UserStatus.PENDING}>PENDING (Verification Required)</option>
                      <option value={UserStatus.BLOCKED}>BLOCKED (Security Restricted)</option>
                    </select>
                  </div>

                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Mobile</label>
                      <input type="tel" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={editingUser.mobile || ''} onChange={e => setEditingUser({...editingUser, mobile: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                      <input type="email" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
                    </div>
                  </div>
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
