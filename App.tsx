
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

const SESSION_KEY = 'workmanager_session_prod';

const App: React.FC = () => {
  const { 
    state, 
    addUser, 
    updateUser,
    removeUser,
    updateUserPin,
    updateUserPassword,
    updateUserSalary,
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
    identifier: '', // Can be Email or Mobile
    secret: '',     // Can be Password or PIN
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

    switch (currentUser.role) {
      case UserRole.SUPER_ADMIN:
        return {
          label: 'System Root',
          color: 'bg-slate-950',
          nav: [
            { id: 'dashboard', label: 'Global Overview', icon: ICONS.Dashboard },
            { id: 'enterprise', label: 'Enterprise Registry', icon: ICONS.Users },
            { id: 'backend', label: 'Backend Ops', icon: ICONS.Dashboard },
            { id: 'users', label: 'Identity Control', icon: ICONS.Shield },
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
            { id: 'subscription', label: 'Enterprise Plan', icon: ICONS.Rocket },
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
            { id: 'projects', label: 'Assigned Projects', icon: ICONS.Rocket },
            { id: 'users', label: 'My Personnel', icon: ICONS.Users },
          ]
        };
      default: // EMPLOYEE
        return {
          label: 'Employee Portal',
          color: 'bg-indigo-700',
          nav: [
            { id: 'dashboard', label: 'My Desk', icon: ICONS.Dashboard },
            { id: 'attendance', label: 'Punch In/Out', icon: ICONS.Time },
            { id: 'work', label: 'Submit Logs', icon: ICONS.Work },
            { id: 'leaves', label: 'Apply Leave', icon: ICONS.Shield },
            { id: 'financials', label: 'My Finances', icon: ICONS.Money },
          ]
        };
    }
  }, [currentUser]);

  const handleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsAuthenticating(true);
    setAuthError(null);

    await new Promise(r => setTimeout(r, 800));

    const inputIdentifier = formData.identifier.trim().toLowerCase();
    const secret = formData.secret.trim();

    if (isLogin) {
      const user = state.users.find(u => {
        const storedEmail = (u.email || '').trim().toLowerCase();
        const storedMobile = (u.mobile || '').trim();
        // Allow login via Mobile + PIN or Email + Password
        const idMatch = storedEmail === inputIdentifier || storedMobile === inputIdentifier;
        const secretMatch = u.password === secret || u.pin === secret;
        return idMatch && secretMatch;
      });

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
        setAuthError('AUTH FAILURE: Invalid Credentials.'); 
      }
    } else {
      try {
        if (isSystemLogin) {
          const superAdmin = await addUser({ 
            name: formData.name.trim(), 
            email: formData.identifier.trim().toLowerCase(), 
            password: secret, 
            role: UserRole.SUPER_ADMIN, 
            companyId: 'SYSTEM',
            status: UserStatus.ACTIVE 
          });
          setCurrentUser(superAdmin);
        } else {
          const company = await addCompany(formData.companyName.trim());
          const admin = await addUser({ 
            name: formData.name.trim(), 
            email: formData.identifier.trim().toLowerCase(), 
            password: secret, 
            role: UserRole.ADMIN, 
            companyId: company.id,
            status: UserStatus.ACTIVE 
          });
          setCurrentUser(admin);
        }
      } catch (err) {
        setAuthError('REGISTRATION FAILED.');
      }
    }
    setIsAuthenticating(false);
  };

  if (!currentUser) return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-all duration-700 ${isSystemLogin ? 'bg-slate-950' : 'bg-[#0D47A1]'}`}>
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 md:p-12 relative overflow-hidden">
        <Logo iconClassName="w-20 h-16 mx-auto mb-2" showText={false} />
        <div className="text-center mb-8">
           <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">
             {isSystemLogin ? 'Root Access' : (isLogin ? 'Sign In' : 'Register')}
           </h2>
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">Mobile or Email Login Enabled</p>
        </div>
        {authError && <p className="mb-4 text-red-500 text-[10px] font-black uppercase text-center">{authError}</p>}
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="space-y-4">
              {!isSystemLogin && <input type="text" placeholder="Enterprise Name" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent font-bold outline-none" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} required />}
              <input type="text" placeholder="Full Name" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent font-bold outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
            </div>
          )}
          <input type="text" placeholder="Mobile or Email" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent font-bold outline-none" value={formData.identifier} onChange={e => setFormData({ ...formData, identifier: e.target.value })} required />
          <input type={showPassword ? "text" : "password"} placeholder="Password or PIN" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent font-bold outline-none text-center tracking-[0.5em]" value={formData.secret} onChange={e => setFormData({ ...formData, secret: e.target.value })} required />
          <div className="flex justify-end">
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[9px] font-black uppercase text-gray-400 hover:text-blue-600 transition-colors">
              {showPassword ? 'Hide Secret' : 'Show Secret'}
            </button>
          </div>
          <button type="submit" disabled={isAuthenticating} className={`w-full py-4 text-white rounded-[1.2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl ${isSystemLogin ? 'bg-slate-800' : 'bg-orange-600 hover:bg-orange-700'}`}>
            {isAuthenticating ? 'Authenticating...' : (isLogin ? 'Access Console' : 'Enroll Enterprise')}
          </button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-6 text-gray-400 font-black text-[9px] uppercase tracking-widest">{isLogin ? 'Create New Account' : 'Return to Login'}</button>
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
        </div>
      </aside>
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="sticky top-0 z-[60] bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4"><h1 className="text-lg font-black text-gray-900 uppercase tracking-tighter">{panelConfig.nav.find(i => i.id === activeTab)?.label || 'Overview'}</h1></div>
          <div className="flex items-center space-x-4">
             <div className="text-right hidden sm:block">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{state.companies.find(c => c.id === currentUser.companyId)?.name || 'System Root'}</p>
                <p className="text-[11px] font-black text-blue-900 uppercase">{currentUser.name}</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center font-black text-xs text-blue-900">{currentUser.name.charAt(0)}</div>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-12 overflow-y-auto mb-20 md:mb-0">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <Dashboard user={currentUser} state={state} updatePassword={updateUserPassword} />}
            {activeTab === 'projects' && <ProjectConsole user={currentUser} state={state} addProject={addProject} addTask={addTask} updateTaskStatus={updateTaskStatus} />}
            {activeTab === 'attendance' && <AttendancePanel user={currentUser} state={state} markAttendance={markAttendance} updateAttendance={updateAttendance} addSite={addSite} removeSite={removeSite} />}
            {activeTab === 'leaves' && <LeavePortal user={currentUser} state={state} addLeaveRequest={addLeaveRequest} updateLeaveStatus={updateLeaveStatus} />}
            {activeTab === 'work' && <WorkTracking user={currentUser} state={state} addWorkLog={addWorkLog} />}
            {activeTab === 'financials' && <FinancialManagement user={currentUser} state={state} addRequest={addFinancialRequest} updateStatus={updateRequestStatus} generateMonthlySlips={generateMonthlySlips} addManualSalarySlip={addManualSalarySlip} updateSalaryStatus={updateSalaryStatus} />}
            {activeTab === 'users' && <UserManagement user={currentUser} state={state} addUser={addUser} updateUser={updateUser} removeUser={removeUser} />}
            {activeTab === 'subscription' && <SubscriptionCenter user={currentUser} state={state} updatePlan={updateSubscriptionPlanConfig} purchasePlan={purchaseSubscription} />}
            {activeTab === 'enterprise' && <CompanyManagement state={state} removeCompany={removeCompany} purchaseSubscription={purchaseSubscription} />}
            {activeTab === 'backend' && <BackendConsole state={state} />}
          </div>
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
