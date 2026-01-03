
import React, { useState, useMemo, useEffect } from 'react';
import { User, AppState, UserRole, SalaryType } from '../types';

interface Props {
  user: User;
  state: AppState;
  addUser: (u: Omit<User, 'id'>) => Promise<User>;
  updateUserSalary: (id: string, salaryAmount: number, salaryType: SalaryType, overtimeRate: number) => Promise<void>;
}

const UserManagement: React.FC<Props> = ({ user, state, addUser, updateUserSalary }) => {
  const isSupervisor = user.role === UserRole.SUPERVISOR;
  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;

  const [newUser, setNewUser] = useState({ 
    name: '', 
    email: '', 
    mobile: '',
    password: 'PR-' + Math.floor(1000 + Math.random() * 9000), // Random default password
    role: UserRole.EMPLOYEE,
    supervisorId: '',
    salaryType: SalaryType.DAILY_WAGE,
    salaryAmount: 0,
    overtimeRate: 0
  });

  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const companyUsers = state.users.filter(u => u.companyId === user.companyId);
  const companyAdmins = useMemo(() => companyUsers.filter(u => u.role === UserRole.ADMIN), [companyUsers]);
  const companySupervisors = useMemo(() => companyUsers.filter(u => u.role === UserRole.SUPERVISOR), [companyUsers]);

  const visibleEmployees = useMemo(() => {
    if (isAdmin) return companyUsers;
    if (isSupervisor) return companyUsers.filter(u => u.supervisorId === user.id);
    return [];
  }, [companyUsers, user.id, isAdmin, isSupervisor]);

  useEffect(() => {
    let calculatedOt = 0;
    if (newUser.salaryAmount > 0) {
      if (newUser.salaryType === SalaryType.DAILY_WAGE) {
        calculatedOt = newUser.salaryAmount / 8;
      } else {
        calculatedOt = (newUser.salaryAmount / 30) / 8;
      }
    }
    setNewUser(prev => ({ ...prev, overtimeRate: parseFloat(calculatedOt.toFixed(2)) }));
  }, [newUser.salaryAmount, newUser.salaryType]);

  const updateEditingSalary = (amount: number, type: SalaryType) => {
    if (!editingUser) return;
    const ot = type === SalaryType.DAILY_WAGE ? (amount / 8) : ((amount / 30) / 8);
    setEditingUser({ 
      ...editingUser, 
      salaryAmount: amount, 
      salaryType: type, 
      overtimeRate: parseFloat(ot.toFixed(2)) 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addUser({
        ...newUser,
        email: newUser.email.toLowerCase().trim(),
        companyId: user.companyId
      });
      // Generate a new random password for next entry
      setNewUser({ 
        name: '', email: '', mobile: '', 
        password: 'PR-' + Math.floor(1000 + Math.random() * 9000), 
        role: UserRole.EMPLOYEE, supervisorId: '', salaryType: SalaryType.DAILY_WAGE, salaryAmount: 0, overtimeRate: 0 
      });
      alert("Success: Personnel enrolled. Please share credentials with them.");
    } catch (error: any) { alert(error.message); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
       {/* Enrollment Section - Admin Only */}
       {isAdmin && (
         <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold mb-2 text-gray-800 uppercase tracking-tighter">Enroll Personnel</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Establish Chain of Command</p>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <input type="text" placeholder="Full Name" className="w-full px-4 py-3 bg-gray-50 rounded-xl border text-sm outline-none" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
              
              <div className="grid grid-cols-2 gap-4">
                 <input type="email" placeholder="Email ID" className="w-full px-4 py-3 bg-gray-50 rounded-xl border text-sm outline-none" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                 <input type="tel" placeholder="Mobile Number" className="w-full px-4 py-3 bg-gray-50 rounded-xl border text-sm outline-none font-bold" value={newUser.mobile} onChange={e => setNewUser({ ...newUser, mobile: e.target.value })} required />
              </div>

              <div>
                <label className="block text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1.5 ml-1">Assigned Password (Share with User)</label>
                <input type="text" className="w-full px-4 py-3 bg-blue-50 border-blue-100 text-blue-900 rounded-xl border text-sm font-black" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Assigned Role</label>
                <select className="w-full px-4 py-3 bg-gray-50 rounded-xl border text-sm font-bold" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole, supervisorId: '' })}>
                  <option value={UserRole.EMPLOYEE}>Employee (Field Workforce)</option>
                  <option value={UserRole.SUPERVISOR}>Supervisor (Reporting Manager)</option>
                </select>
              </div>

              {newUser.role === UserRole.EMPLOYEE && (
                <div>
                  <label className="block text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1.5 ml-1">Reporting Manager (Supervisor)</label>
                  <select className="w-full px-4 py-3 bg-blue-50 border-blue-100 text-blue-900 rounded-xl border text-sm font-bold outline-none" value={newUser.supervisorId} onChange={e => setNewUser({ ...newUser, supervisorId: e.target.value })}>
                    <option value="">Directly to Admin</option>
                    {companySupervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {newUser.role === UserRole.SUPERVISOR && (
                <div>
                  <label className="block text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1.5 ml-1">Reports to Admin</label>
                  <select className="w-full px-4 py-3 bg-orange-50 border-orange-100 text-orange-900 rounded-xl border text-sm font-bold outline-none" value={newUser.supervisorId} onChange={e => setNewUser({ ...newUser, supervisorId: e.target.value })}>
                    <option value="">Primary System Admin</option>
                    {companyAdmins.map(a => <option key={a.id} value={a.id}>{a.name} (Admin)</option>)}
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

              <div className="p-4 bg-blue-900 text-white rounded-2xl shadow-lg shadow-blue-100/50">
                <p className="text-[8px] font-black text-blue-300 uppercase tracking-widest mb-1">Auto-Calculated OT Rate</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-xl font-black">₹{newUser.overtimeRate}</span>
                  <span className="text-[10px] text-blue-400 font-bold uppercase tracking-tighter">/ hr</span>
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95">Complete Enrollment</button>
            </form>
          </div>
        </div>
       )}

      <div className={isAdmin ? "lg:col-span-2" : "lg:col-span-3"}>
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
             <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">{isSupervisor ? 'Team Members Managed' : 'Global Organization Chart'}</h4>
             <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{visibleEmployees.length} Units</span>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-8 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Personnel</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Login Credentials</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase text-center text-gray-400 tracking-widest">Role</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase text-right text-gray-400 tracking-widest">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibleEmployees.map((u) => {
                const reportsTo = state.users.find(s => s.id === u.supervisorId);
                return (
                  <tr key={u.id} className="hover:bg-gray-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-bold text-gray-800 text-sm uppercase tracking-tight">{u.name}</div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{u.email}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-blue-900 uppercase">Mob: {u.mobile || '--'}</span>
                        <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Pass: {u.password || '******'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase border transition-colors ${u.role === UserRole.SUPERVISOR ? 'bg-orange-50 text-orange-600 border-orange-100 group-hover:bg-orange-600 group-hover:text-white' : 'bg-blue-50 text-blue-700 border-blue-100 group-hover:bg-blue-700 group-hover:text-white'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button onClick={() => setEditingUser(u)} className="text-blue-600 hover:text-blue-800 font-black text-[10px] uppercase tracking-widest transition-colors">Edit Ledger</button>
                    </td>
                  </tr>
                );
              })}
              {visibleEmployees.length === 0 && (
                <tr>
                   <td colSpan={4} className="px-8 py-20 text-center text-gray-300 font-bold italic text-xs tracking-widest">No reporting team found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Salary & Hierarchy Management Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
            <div className="flex justify-between items-center mb-8">
               <div>
                  <h3 className="text-2xl font-black text-blue-900 tracking-tighter uppercase leading-none">Manage Personnel</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{editingUser.name}</p>
               </div>
               <button onClick={() => setEditingUser(null)} className="text-gray-300 hover:text-red-500 transition-colors"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            <form onSubmit={async (e) => { e.preventDefault(); await updateUserSalary(editingUser.id, editingUser.salaryAmount || 0, editingUser.salaryType || SalaryType.MONTHLY_FIXED, editingUser.overtimeRate || 0); setEditingUser(null); alert("Personnel ledger updated."); }} className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Pay Cycle</label>
                    <select className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm outline-none" value={editingUser.salaryType} onChange={e => updateEditingSalary(editingUser.salaryAmount || 0, e.target.value as SalaryType)}>
                      <option value={SalaryType.DAILY_WAGE}>Daily Wage</option>
                      <option value={SalaryType.MONTHLY_FIXED}>Monthly Fixed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Salary Amount (₹)</label>
                    <input type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-black text-sm outline-none" value={editingUser.salaryAmount || ''} onChange={e => updateEditingSalary(parseInt(e.target.value) || 0, editingUser.salaryType || SalaryType.DAILY_WAGE)} />
                  </div>
               </div>
               <div className="p-6 bg-blue-900 text-white rounded-[2rem] shadow-xl shadow-blue-100/50">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest">Recalculated OT Rate</p>
                    <p className="text-[8px] font-bold text-blue-400 uppercase tracking-[0.2em]">Automated (Salary/8)</p>
                  </div>
                  <p className="text-3xl font-black">₹{editingUser.overtimeRate} <span className="text-xs text-blue-400 font-bold uppercase">/ Hour</span></p>
               </div>
               <div className="flex space-x-3 pt-4">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all">Apply Changes</button>
                  <button type="button" onClick={() => setEditingUser(null)} className="px-6 py-4 bg-gray-100 text-gray-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-colors">Discard</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
