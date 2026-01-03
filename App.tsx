
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
import LegalCompliance from './components/LegalCompliance';
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
    addWorkLog, 
    addFinancialRequest, 
    updateRequestStatus, 
    generateMonthlySlips, 
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
    name: '', 
    email: '', 
    password: '', 
    companyName: '' 
  });

  const [isLocked, setIsLocked] = useState(false);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [tempPin, setTempPin] = useState('');

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

  const handleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsAuthenticating(true);
    setAuthError(null);

    // Artificial delay for high-end UX feel
    await new Promise(r => setTimeout(r, 800));

    const inputIdentifier = formData.email.trim().toLowerCase();
    const pass = formData.password.trim();

    if (isLogin) {
      if (state.users.length === 0) {
        setAuthError('DATABASE EMPTY: This deployment has no users. Click "Enroll New Enterprise" to start.');
        setIsAuthenticating(false);
        return;
      }

      const user = state.users.find(u => {
        const storedEmail = (u.email || '').trim().toLowerCase();
        const storedMobile = (u.mobile || '').trim();
        return (storedEmail === inputIdentifier || storedMobile === inputIdentifier) && u.password === pass;
      });

      if (user) {
        if (user.status === UserStatus.PENDING) {
          setAuthError('VERIFICATION PENDING: Your account is awaiting Admin approval.');
          setIsAuthenticating(false);
          return;
        }
        if (user.status === UserStatus.BLOCKED) {
          setAuthError('ACCESS DENIED: Your account has been suspended.');
          setIsAuthenticating(false);
          return;
        }
        if (isSystemLogin && user.role !== UserRole.SUPER_ADMIN) { 
          setAuthError('ROOT RESTRICTION: Only System Super-Admins can use Root Portal.'); 
          setIsAuthenticating(false);
          return; 
        }
        setCurrentUser(user);
        setFormData({ name: '', email: '', password: '', companyName: '' });
      } else { 
        setAuthError('AUTH FAILURE: Invalid Email/Mobile or Password. Check your Cloud database.'); 
      }
    } else {
      try {
        if (isSystemLogin) {
          const superAdmin = await addUser({ 
            name: formData.name.trim(), 
            email: formData.email.trim().toLowerCase(), 
            password: pass, 
            role: UserRole.SUPER_ADMIN, 
            companyId: 'SYSTEM',
            status: UserStatus.ACTIVE 
          });
          setCurrentUser(superAdmin);
        } else {
          const company = await addCompany(formData.companyName.trim());
          const admin = await addUser({ 
            name: formData.name.trim(), 
            email: formData.email.trim().toLowerCase(), 
            password: pass, 
            role: UserRole.ADMIN, 
            companyId: company.id,
            status: UserStatus.ACTIVE 
          });
          setCurrentUser(admin);
        }
      } catch (err) {
        setAuthError('REGISTRATION FAILED: Error creating enterprise profile.');
      }
    }
    setIsAuthenticating(false);
  };

  const setupDemo = async () => {
    setIsAuthenticating(true);
    const demoEmail = 'admin@cloud.com';
    const demoPass = 'cloud123';
    
    let user = state.users.find(u => u.email === demoEmail);
    
    if (!user) {
      const company = await addCompany("Cloud Managed Site");
      user = await addUser({
        name: "System Admin",
        email: demoEmail,
        password: demoPass,
        role: UserRole.ADMIN,
        companyId: company.id,
        status: UserStatus.ACTIVE,
        salaryAmount: 75000,
        salaryType: SalaryType.MONTHLY_FIXED
      });
    }

    setFormData({ ...formData, email: demoEmail, password: demoPass });
    setIsLogin(true);
    
    setTimeout(() => {
      handleAuth();
    }, 500);
  };

  const navItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: ICONS.Dashboard, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.EMPLOYEE] },
    { id: 'projects', label: 'Projects', icon: ICONS.Rocket, roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.EMPLOYEE] },
    { id: 'attendance', label: 'Attendance', icon: ICONS.Time, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.EMPLOYEE] },
    { id: 'leaves', label: 'Leaves', icon: ICONS.Shield, roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.EMPLOYEE] },
    { id: 'work', label: 'Work Logs', icon: ICONS.Work, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.EMPLOYEE] },
    { id: 'financials', label: 'Financials', icon: ICONS.Money, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.EMPLOYEE] },
    { id: 'users', label: 'Team', icon: ICONS.Users, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR] },
    { id: 'subscription', label: 'Subscription', icon: ICONS.Rocket, roles: [UserRole.ADMIN] },
    { id: 'enterprise', label: 'Enterprises', icon: ICONS.Users, roles: [UserRole.SUPER_ADMIN] },
    { id: 'backend', label: 'Backend Console', icon: ICONS.Dashboard, roles: [UserRole.SUPER_ADMIN] },
  ], []);

  const visibleNavItems = useMemo(() => 
    navItems.filter(i => i.roles.includes(currentUser?.role || UserRole.EMPLOYEE)),
    [navItems, currentUser]
  );

  const cycleTab = (direction: 'next' | 'prev') => {
    const currentIndex = visibleNavItems.findIndex(item => item.id === activeTab);
    if (currentIndex === -1) return;
    if (direction === 'next') {
      const nextIndex = (currentIndex + 1) % visibleNavItems.length;
      setActiveTab(visibleNavItems[nextIndex].id);
    } else {
      const prevIndex = (currentIndex - 1 + visibleNavItems.length) % visibleNavItems.length;
      setActiveTab(visibleNavItems[prevIndex].id);
    }
  };

  if (!currentUser) return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-all duration-700 ${isSystemLogin ? 'bg-slate-950' : 'bg-[#0D47A1]'}`}>
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 md:p-12 relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-2 transition-colors ${isSystemLogin ? 'bg-slate-700' : 'bg-orange-500'}`}></div>
        
        <Logo iconClassName="w-20 h-16 mx-auto mb-2" showText={false} />
        <div className="text-center mb-8">
           <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">
             {isSystemLogin ? 'Root Access' : (isLogin ? 'Cloud Login' : 'New Enrollment')}
           </h2>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">
             WorkManager Deployment Console
           </p>
        </div>

        {authError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl animate-in shake duration-300">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest text-center">{authError}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="space-y-4 animate-in fade-in duration-500">
              {!isSystemLogin && (
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black text-[10px] uppercase">CO.</span>
                  <input type="text" placeholder="Enterprise Name" className="w-full pl-12 pr-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500/20 font-bold outline-none transition-all" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} required />
                </div>
              )}
              <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black text-[10px] uppercase">NM.</span>
                 <input type="text" placeholder="Full Name" className="w-full pl-12 pr-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500/20 font-bold outline-none transition-all" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
            </div>
          )}
          
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black text-[10px] uppercase">ID.</span>
            <input 
              type="text" 
              placeholder="Email or Mobile" 
              className="w-full pl-12 pr-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500/20 font-bold outline-none transition-all" 
              value={formData.email} 
              onChange={e => {
                setFormData({ ...formData, email: e.target.value });
                setAuthError(null);
              }} 
              required
            />
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black text-[10px] uppercase">PW.</span>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              className="w-full pl-12 pr-14 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500/20 font-bold outline-none transition-all" 
              value={formData.password} 
              onChange={e => {
                setFormData({ ...formData, password: e.target.value });
                setAuthError(null);
              }} 
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.956 9.956 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
            </button>
          </div>

          <button 
            type="submit" 
            disabled={isAuthenticating}
            className={`w-full py-4 text-white rounded-[1.2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2 ${isSystemLogin ? 'bg-slate-800' : 'bg-orange-600 hover:bg-orange-700'}`}
          >
            {isAuthenticating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                <span>Securing Environment...</span>
              </>
            ) : (
              <span>{isLogin ? 'Initialize Workspace' : 'Create Admin Profile'}</span>
            )}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center space-y-4">
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setAuthError(null);
            }} 
            className="text-gray-400 font-black text-[9px] uppercase tracking-widest hover:text-blue-600 transition-colors"
          >
            {isLogin ? 'Enroll New Enterprise' : 'Return to Login'}
          </button>
          
          {isLogin && state.users.length === 0 && (
            <button 
              onClick={setupDemo}
              className="px-6 py-2 bg-blue-50 text-blue-600 rounded-full font-black text-[8px] uppercase tracking-widest hover:bg-blue-100 transition-colors animate-pulse"
            >
              Fresh Install? Setup Cloud Admin
            </button>
          )}

          <div className="pt-4 border-t border-gray-50 w-full flex justify-center">
            <button 
              onClick={() => {
                setIsSystemLogin(!isSystemLogin);
                setIsLogin(true);
                setAuthError(null);
              }} 
              className={`font-black text-[8px] uppercase tracking-[0.3em] transition-colors ${isSystemLogin ? 'text-blue-600' : 'text-gray-300'}`}
            >
              {isSystemLogin ? 'Return to Enterprise Portal' : 'Root Access Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isSettingPin) return <div className="min-h-screen flex items-center justify-center bg-blue-900 p-6"><div className="bg-white rounded-[3rem] p-12 max-w-md w-full text-center"><h2 className="text-2xl font-black mb-8">Set Security PIN</h2><form onSubmit={async (e) => { e.preventDefault(); await updateUserPin(currentUser.id, tempPin); setIsSettingPin(false); }} className="space-y-6"><input type="password" maxLength={4} inputMode="numeric" className="w-full text-center text-4xl font-black py-6 border rounded-3xl" value={tempPin} onChange={e => setTempPin(e.target.value)} /><button type="submit" className="w-full bg-blue-700 text-white py-5 rounded-2xl font-black uppercase text-xs">Secure My Portal</button></form></div></div>;
  if (isLocked) return <LockScreen user={currentUser} onUnlock={() => setIsLocked(false)} onLogout={() => setCurrentUser(null)} />;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <aside className="hidden md:flex w-72 bg-white border-r flex-col p-8 sticky top-0 h-screen">
        <Logo iconClassName="w-16 h-12" showText={false} />
        <nav className="flex-1 mt-10 space-y-1.5">
          {visibleNavItems.map(i => (
            <button key={i.id} onClick={() => setActiveTab(i.id)} className={`w-full flex items-center space-x-4 px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all ${activeTab === i.id ? 'bg-[#0D47A1] text-white shadow-xl' : 'text-gray-400 hover:text-blue-900'}`}><i.icon className="w-4 h-4" /><span>{i.label}</span></button>
          ))}
        </nav>
        <button onClick={() => setCurrentUser(null)} className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-black uppercase text-[9px]">Logout</button>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="sticky top-0 z-[60] bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {activeTab !== 'dashboard' ? (
              <button 
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl transition-all active:scale-90"
              ) : (
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                   <Logo iconClassName="w-6 h-5" showText={false} />
                </div>
              )}
              <h1 className="text-lg font-black text-gray-900 uppercase tracking-tighter">
                {visibleNavItems.find(i => i.id === activeTab)?.label}
              </h1>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={() => cycleTab('prev')}
              className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 hover:text-blue-600 transition-all active:scale-90"
              title="Previous Page"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button 
              onClick={() => cycleTab('next')}
              className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 hover:text-blue-600 transition-all active:scale-90"
              title="Next Page"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-12 overflow-y-auto mb-20 md:mb-0">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <Dashboard user={currentUser} state={state} updatePassword={updateUserPassword} />}
            {activeTab === 'projects' && <ProjectConsole user={currentUser} state={state} addProject={addProject} addTask={addTask} updateTaskStatus={updateTaskStatus} />}
            {activeTab === 'attendance' && <AttendancePanel user={currentUser} state={state} markAttendance={markAttendance} addSite={addSite} removeSite={removeSite} />}
            {activeTab === 'leaves' && <LeavePortal user={currentUser} state={state} addLeaveRequest={addLeaveRequest} updateLeaveStatus={updateLeaveStatus} />}
            {activeTab === 'work' && <WorkTracking user={currentUser} state={state} addWorkLog={addWorkLog} />}
            {activeTab === 'financials' && <FinancialManagement user={currentUser} state={state} addRequest={addFinancialRequest} updateStatus={updateRequestStatus} generateMonthlySlips={generateMonthlySlips} updateSalaryStatus={updateSalaryStatus} />}
            {activeTab === 'users' && <UserManagement user={currentUser} state={state} addUser={addUser} updateUser={updateUser} removeUser={removeUser} />}
            {activeTab === 'subscription' && <SubscriptionCenter user={currentUser} state={state} updatePlan={updateSubscriptionPlanConfig} purchasePlan={purchaseSubscription} />}
            {activeTab === 'enterprise' && <CompanyManagement state={state} removeCompany={removeCompany} purchaseSubscription={purchaseSubscription} />}
            {activeTab === 'backend' && <BackendConsole state={state} />}
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center px-4 py-3 z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {visibleNavItems.slice(0, 5).map(i => (
          <button key={i.id} onClick={() => setActiveTab(i.id)} className={`flex flex-col items-center justify-center space-y-1 transition-all ${activeTab === i.id ? 'text-blue-700 scale-110' : 'text-gray-300'}`}>
            <i.icon className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">{i.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
