
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, UserStatus, User, RequestStatus, PaymentStatus, SalaryType } from './types';
import { useStore } from './store';
import { ICONS, COLORS, Logo } from './constants';
import Dashboard from './components/Dashboard';
import AttendancePanel from './components/AttendancePanel';
import WorkTracking from './components/WorkTracking';
import FinancialManagement from './components/FinancialManagement';
import UserManagement from './components/UserManagement';
import CompanyManagement from './components/CompanyManagement';
import LockScreen from './components/LockScreen';
import LeavePortal from './components/LeavePortal';
import ProjectConsole from './components/ProjectConsole';
import SubscriptionCenter from './components/SubscriptionCenter';
import BackendConsole from './components/BackendConsole';
import LegalCompliance from './components/LegalCompliance';

const SESSION_KEY = 'employeemanagement_session_prod';

const App: React.FC = () => {
  const { 
    state, 
    authenticate,
    resetSystem,
    addUser, 
    updateUser,
    removeUser,
    updateUserPin,
    updateUserPassword,
    addCompany, 
    addSite, 
    removeSite, 
    markAttendance,
    updateAttendance,
    addWorkLog, 
    addFinancialRequest, 
    updateRequestStatus, 
    generateMonthlySlips, 
    addManualSalarySlip,
    updateSalaryStatus,
    removeCompany,
    purchaseSubscription,
    addProject,
    addTask,
    updateTaskStatus,
    addLeaveRequest,
    updateLeaveStatus,
    updateSubscriptionPlanConfig
  } = useStore();
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    return savedSession ? JSON.parse(savedSession) : null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLogin, setIsLogin] = useState(state.users.length > 0);
  const [isSystemLogin, setIsSystemLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [formData, setFormData] = useState({ 
    identifier: '', 
    secret: '',     
    name: '',
    companyName: '' 
  });

  const [isLocked, setIsLocked] = useState(false);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [tempPin, setTempPin] = useState('');

  useEffect(() => {
    setActiveTab('dashboard');
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser?.pin) setIsLocked(true);
  }, []);

  useEffect(() => {
    if (currentUser) {
      const refreshedUser = state.users.find(u => u.id === currentUser.id);
      const userToSave = refreshedUser || currentUser;
      localStorage.setItem(SESSION_KEY, JSON.stringify(userToSave));
      if (!userToSave.pin && !isSettingPin) setIsSettingPin(true);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [currentUser, state.users]);

  const panelConfig = useMemo(() => {
    if (!currentUser) return { label: 'Guest', color: 'bg-blue-600', nav: [] };

    const commonNav = [
      { id: 'legal', label: 'Vision & Legal', icon: ICONS.Shield },
    ];

    switch (currentUser.role) {
      case UserRole.SUPER_ADMIN:
        return {
          label: 'System Root',
          color: 'bg-slate-950',
          nav: [
            { id: 'dashboard', label: 'Global Overview', icon: ICONS.Dashboard },
            { id: 'enterprise', label: 'Enterprise Registry', icon: ICONS.Users },
            { id: 'subscription', label: 'Plan Architect', icon: ICONS.Rocket },
            { id: 'backend', label: 'Backend Ops', icon: ICONS.Dashboard },
            { id: 'users', label: 'Identity Control', icon: ICONS.Shield },
            ...commonNav
          ]
        };
      case UserRole.ADMIN:
        return {
          label: 'Enterprise Command',
          color: 'bg-[#0D47A1]',
          nav: [
            { id: 'dashboard', label: 'Dashboard', icon: ICONS.Dashboard },
            { id: 'users', label: 'Team Control', icon: ICONS.Users },
            { id: 'financials', label: 'Payroll & Advances', icon: ICONS.Money },
            { id: 'attendance', label: 'Attendance Ledger', icon: ICONS.Time },
            { id: 'work', label: 'Work Progress', icon: ICONS.Work },
            { id: 'subscription', label: 'Enterprise Plan', icon: ICONS.Rocket },
            ...commonNav
          ]
        };
      case UserRole.SUPERVISOR:
        return {
          label: 'Supervisor Console',
          color: 'bg-teal-900',
          nav: [
            { id: 'dashboard', label: 'Field Status', icon: ICONS.Dashboard },
            { id: 'attendance', label: 'Team Attendance', icon: ICONS.Time },
            { id: 'work', label: 'Work Progress', icon: ICONS.Work },
            ...commonNav
          ]
        };
      default: // EMPLOYEE
        return {
          label: 'Employee Portal',
          color: 'bg-indigo-700',
          nav: [
            { id: 'dashboard', label: 'My Desk', icon: ICONS.Dashboard },
            { id: 'attendance', label: 'Punch In/Out', icon: ICONS.Time },
            { id: 'work', label: 'Daily Work Update', icon: ICONS.Work },
            { id: 'financials', label: 'Payment Request', icon: ICONS.Money },
            ...commonNav
          ]
        };
    }
  }, [currentUser]);

  const handleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsAuthenticating(true);
    setAuthError(null);

    // Fast feedback delay
    await new Promise(r => setTimeout(r, 100));

    const idInput = formData.identifier.trim();
    const secretInput = formData.secret.trim();

    if (!idInput || !secretInput) {
      setAuthError('ID and Secret are required.');
      setIsAuthenticating(false);
      return;
    }

    if (isLogin) {
      const user = authenticate(idInput, secretInput);

      if (user) {
        if (user.status === UserStatus.PENDING) {
          setAuthError('VERIFICATION PENDING: Admin approval required.');
          setIsAuthenticating(false);
          return;
        }
        if (user.status === UserStatus.BLOCKED) {
          setAuthError('ACCESS DENIED: Account suspended.');
          setIsAuthenticating(false);
          return;
        }
        setCurrentUser(user);
        setFormData({ identifier: '', secret: '', name: '', companyName: '' });
      } else { 
        setAuthError('AUTH FAILURE: Invalid Credentials or formatting error.'); 
      }
    } else {
      try {
        if (isSystemLogin) {
          const superAdmin = await addUser({ 
            name: formData.name.trim(), 
            email: idInput.toLowerCase(), 
            password: secretInput, 
            role: UserRole.SUPER_ADMIN, 
            companyId: 'SYSTEM',
            status: UserStatus.ACTIVE 
          });
          setCurrentUser(superAdmin);
        } else {
          const company = await addCompany(formData.companyName.trim());
          const admin = await addUser({ 
            name: formData.name.trim(), 
            email: idInput.toLowerCase(), 
            password: secretInput, 
            role: UserRole.ADMIN, 
            companyId: company.id,
            status: UserStatus.ACTIVE 
          });
          setCurrentUser(admin);
        }
      } catch (err: any) {
        setAuthError(err.message || 'REGISTRATION FAILED.');
      }
    }
    setIsAuthenticating(false);
  };

  const handleForceReset = () => {
    if (confirm("DANGER: This will delete ALL local data and restore the default Master Admin account. Proceed?")) {
      resetSystem();
    }
  };

  if (!currentUser) return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-all duration-700 ${isSystemLogin ? 'bg-slate-950' : 'bg-[#0D47A1]'}`}>
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 md:p-12 relative overflow-hidden flex flex-col items-center">
        <Logo iconClassName="w-20 h-16 mx-auto mb-2" showText={false} />
        <div className="text-center mb-8">
           <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">
             {isSystemLogin ? 'Root Access' : (isLogin ? 'Sign In' : 'Register')}
           </h2>
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">Mobile or Email Login Enabled</p>
        </div>
        {authError && <div className="mb-4 bg-red-50 p-3 rounded-xl border border-red-100 text-red-600 text-[10px] font-black uppercase text-center leading-tight animate-in shake duration-300 w-full">{authError}</div>}
        <form onSubmit={handleAuth} className="space-y-4 w-full">
          {!isLogin && (
            <div className="space-y-4">
              {!isSystemLogin && <input type="text" placeholder="Enterprise Name" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent font-bold outline-none focus:border-blue-200 transition-all" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} required />}
              <input type="text" placeholder="Full Name" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent font-bold outline-none focus:border-blue-200 transition-all" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
            </div>
          )}
          <input type="text" placeholder="Mobile or Email" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent font-bold outline-none focus:border-blue-200 transition-all" value={formData.identifier} onChange={e => setFormData({ ...formData, identifier: e.target.value })} required />
          <input type={showPassword ? "text" : "password"} placeholder="Password or PIN" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent font-bold outline-none text-center tracking-[0.5em] focus:border-blue-200 transition-all" value={formData.secret} onChange={e => setFormData({ ...formData, secret: e.target.value })} required />
          <div className="flex justify-end">
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[9px] font-black uppercase text-gray-400 hover:text-blue-600 transition-colors">
              {showPassword ? 'Hide Secret' : 'Show Secret'}
            </button>
          </div>
          <button type="submit" disabled={isAuthenticating} className={`w-full py-4 text-white rounded-[1.2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl ${isSystemLogin ? 'bg-slate-800' : 'bg-orange-600 hover:bg-orange-700'} transition-all active:scale-95`}>
            {isAuthenticating ? 'Verifying...' : (isLogin ? 'Access Console' : 'Enroll Enterprise')}
          </button>
        </form>
        <div className="mt-8 pt-6 border-t border-gray-50 flex flex-col gap-2 w-full">
           <button onClick={() => setIsLogin(!isLogin)} className="w-full text-gray-400 font-black text-[9px] uppercase tracking-widest hover:text-blue-900 transition-colors">{isLogin ? 'Create New Account' : 'Return to Login'}</button>
           <button onClick={() => { setIsSystemLogin(!isSystemLogin); setIsLogin(true); }} className="w-full text-gray-300 font-black text-[8px] uppercase tracking-[0.4em] hover:text-slate-900 transition-colors">Internal Ops Access</button>
           <button onClick={handleForceReset} className="w-full text-red-300 font-black text-[7px] uppercase tracking-[0.2em] hover:text-red-500 transition-colors mt-2">Corrupted Login? Force System Reset</button>
        </div>
        
        {/* Footer in Login View */}
        <div className="mt-8 text-center opacity-30">
          <p className="text-[7px] font-black uppercase tracking-[0.5em] text-gray-500">Developed by Pragati Enterprises</p>
        </div>
      </div>
    </div>
  );

  if (isSettingPin) return <div className="min-h-screen flex items-center justify-center bg-blue-900 p-6"><div className="bg-white rounded-[3rem] p-12 max-w-md w-full text-center"><h2 className="text-2xl font-black mb-8">Set Security PIN</h2><form onSubmit={async (e) => { e.preventDefault(); await updateUserPin(currentUser.id, tempPin); setIsSettingPin(false); }} className="space-y-6"><input type="password" maxLength={4} inputMode="numeric" className="w-full text-center text-4xl font-black py-6 border rounded-3xl" value={tempPin} onChange={e => setTempPin(e.target.value)} /><button type="submit" className="w-full bg-blue-700 text-white py-5 rounded-2xl font-black uppercase text-xs">Secure My Portal</button></form></div></div>;
  if (isLocked) return <LockScreen user={currentUser} onUnlock={() => setIsLocked(false)} onLogout={() => setCurrentUser(null)} />;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <aside className={`hidden md:flex w-72 ${panelConfig.color} flex-col p-8 sticky top-0 h-screen text-white transition-colors duration-500`}>
        <div className="flex items-center space-x-3 mb-10">
           <Logo iconClassName="w-12 h-10" showText={false} light={true} />
           <div className="overflow-hidden">
             <h2 className="text-[14px] font-black uppercase tracking-tight truncate">{panelConfig.label}</h2>
             <p className="text-[8px] font-black uppercase opacity-60 tracking-widest truncate">{currentUser.name}</p>
           </div>
        </div>
        <nav className="flex-1 space-y-1.5">
          {panelConfig.nav.map(i => (
            <button key={i.id} onClick={() => setActiveTab(i.id)} className={`w-full flex items-center space-x-4 px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all ${activeTab === i.id ? 'bg-white/10 shadow-xl' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
              <i.icon className="w-4 h-4" />
              <span>{i.label}</span>
            </button>
          ))}
        </nav>
        <div className="pt-6 border-t border-white/10">
          <button onClick={() => setCurrentUser(null)} className="w-full py-3 bg-red-600/20 text-red-100 hover:bg-red-600/40 rounded-xl font-black uppercase text-[9px] transition-colors">Terminate Session</button>
          
          {/* Sidebar Footer */}
          <div className="mt-6 text-center opacity-30">
            <p className="text-[7px] font-black uppercase tracking-[0.4em] text-white">Pragati Enterprises</p>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="sticky top-0 z-[60] bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {activeTab !== 'dashboard' && (
              <button 
                onClick={() => setActiveTab('dashboard')} 
                className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-[10px] font-black text-gray-600 uppercase transition-all"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span>Back</span>
              </button>
            )}
            <h1 className="text-lg font-black text-gray-900 uppercase tracking-tighter">{panelConfig.nav.find(i => i.id === activeTab)?.label || 'Overview'}</h1>
          </div>
          <div className="flex items-center space-x-4">
             <div className="text-right hidden sm:block">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{state.companies.find(c => c.id === currentUser.companyId)?.name || 'System Root'}</p>
                <p className="text-[11px] font-black text-blue-900 uppercase">{currentUser.name}</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center font-black text-xs text-blue-900">{currentUser.name.charAt(0)}</div>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-12 overflow-y-auto mb-20 md:mb-0">
          <div className="max-w-7xl mx-auto min-h-[70vh]">
            {activeTab === 'dashboard' && <Dashboard user={currentUser} state={state} updatePassword={updateUserPassword} />}
            {activeTab === 'projects' && <ProjectConsole user={currentUser} state={state} addProject={addProject} addTask={addTask} updateTaskStatus={updateTaskStatus} />}
            {activeTab === 'attendance' && <AttendancePanel user={currentUser} state={state} markAttendance={markAttendance} updateAttendance={updateAttendance} addSite={addSite} removeSite={removeSite} />}
            {activeTab === 'leaves' && <LeavePortal user={currentUser} state={state} addLeaveRequest={addLeaveRequest} updateLeaveStatus={updateLeaveStatus} />}
            {activeTab === 'work' && <WorkTracking user={currentUser} state={state} addWorkLog={addWorkLog} />}
            {activeTab === 'financials' && <FinancialManagement user={currentUser} state={state} addRequest={addFinancialRequest} updateStatus={updateRequestStatus} generateMonthlySlips={generateMonthlySlips} addManualSalarySlip={addManualSalarySlip} updateSalaryStatus={updateSalaryStatus} />}
            {activeTab === 'users' && <UserManagement user={currentUser} state={state} addUser={addUser} updateUser={updateUser} removeUser={removeUser} />}
            {activeTab === 'subscription' && <SubscriptionCenter user={currentUser} state={state} updatePlan={updateSubscriptionPlanConfig} purchasePlan={purchaseSubscription} removeUser={removeUser} />}
            {activeTab === 'enterprise' && <CompanyManagement state={state} removeCompany={removeCompany} purchaseSubscription={purchaseSubscription} />}
            {activeTab === 'backend' && <BackendConsole state={state} updateUser={updateUser} removeUser={removeUser} />}
            {activeTab === 'legal' && <LegalCompliance />}
          </div>
          
          {/* Global Content Footer */}
          <footer className="mt-16 py-8 border-t border-gray-100 text-center opacity-40">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.5em]">Developed by Pragati Enterprises</p>
            <p className="text-[7px] font-bold text-gray-300 uppercase tracking-widest mt-2">Enterprise Infrastructure Management System v4.0</p>
          </footer>
        </main>
      </div>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center px-4 py-3 z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {panelConfig.nav.map(i => (
          <button key={i.id} onClick={() => setActiveTab(i.id)} className={`flex flex-col items-center justify-center space-y-1 transition-all ${activeTab === i.id ? 'text-blue-700' : 'text-gray-300'}`}>
            <i.icon className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">{i.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
