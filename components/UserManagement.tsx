
import React, { useState, useMemo } from 'react';
import { User, AppState, UserRole, SalaryType } from '../types';

interface Props {
  user: User;
  state: AppState;
  addUser: (u: Omit<User, 'id'>) => Promise<User>;
}

const UserManagement: React.FC<Props> = ({ user, state, addUser }) => {
  const [newUser, setNewUser] = useState({ 
    name: '', 
    email: '', 
    password: 'password123', 
    role: UserRole.EMPLOYEE,
    supervisorId: '',
    salaryType: SalaryType.MONTHLY_FIXED,
    salaryAmount: 0,
    overtimeRate: 0
  });
  
  const companyUsers = state.users.filter(u => u.companyId === user.companyId);
  const companySupervisors = useMemo(() => companyUsers.filter(u => u.role === UserRole.SUPERVISOR), [companyUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addUser({
        name: newUser.name,
        email: newUser.email.toLowerCase().trim(),
        password: newUser.password,
        role: newUser.role,
        supervisorId: newUser.role === UserRole.EMPLOYEE ? newUser.supervisorId : undefined,
        companyId: user.companyId,
        salaryType: newUser.salaryType,
        salaryAmount: newUser.salaryAmount,
        overtimeRate: newUser.overtimeRate
      });
      setNewUser({ name: '', email: '', password: 'password123', role: UserRole.EMPLOYEE, supervisorId: '', salaryType: SalaryType.MONTHLY_FIXED, salaryAmount: 0, overtimeRate: 0 });
      alert("User added!");
    } catch (error: any) { alert(error.message); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
       <div className="lg:col-span-1">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold mb-8 text-gray-800">Enroll Personnel</h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <input type="text" placeholder="Full Name" className="w-full px-4 py-3 bg-gray-50 rounded-xl border" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
            <input type="email" placeholder="Email" className="w-full px-4 py-3 bg-gray-50 rounded-xl border" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
            
            <div className="grid grid-cols-2 gap-4">
              <select className="px-4 py-3 bg-gray-50 rounded-xl border" value={newUser.salaryType} onChange={e => setNewUser({ ...newUser, salaryType: e.target.value as SalaryType })}>
                <option value={SalaryType.MONTHLY_FIXED}>Monthly</option>
                <option value={SalaryType.DAILY_WAGE}>Daily Wage</option>
              </select>
              <input type="number" placeholder="Salary Amount" className="px-4 py-3 bg-gray-50 rounded-xl border" value={newUser.salaryAmount || ''} onChange={e => setNewUser({ ...newUser, salaryAmount: parseInt(e.target.value) || 0 })} />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Overtime Rate (₹/hr)</label>
              <input type="number" placeholder="OT Rate" className="w-full px-4 py-3 bg-gray-50 rounded-xl border" value={newUser.overtimeRate || ''} onChange={e => setNewUser({ ...newUser, overtimeRate: parseInt(e.target.value) || 0 })} />
            </div>

            <select className="w-full px-4 py-3 bg-gray-50 rounded-xl border" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}>
              <option value={UserRole.EMPLOYEE}>Employee</option>
              <option value={UserRole.SUPERVISOR}>Supervisor</option>
            </select>
            
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase">Register User</button>
          </form>
        </div>
      </div>
      <div className="lg:col-span-2">
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-bold uppercase">Personnel</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase text-center">Comp & OT</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase text-center">Role</th>
              </tr>
            </thead>
            <tbody>
              {companyUsers.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="px-8 py-6 font-bold">{u.name}</td>
                  <td className="px-8 py-6 text-center">
                    <div className="text-xs font-black">₹{u.salaryAmount} / {u.salaryType === SalaryType.MONTHLY_FIXED ? 'M' : 'D'}</div>
                    <div className="text-[9px] text-orange-500 font-bold">OT: ₹{u.overtimeRate}/hr</div>
                  </td>
                  <td className="px-8 py-6 text-center"><span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-xl text-[10px] uppercase font-black">{u.role}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
