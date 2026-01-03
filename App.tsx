
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, User, RequestStatus, CableType, PaymentStatus } from './types';
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

const SESSION_KEY = 'pragati_session_prod';

const App: React.FC = () => {
  const { 
    state, 
    addUser, 
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
  const [isLogin, setIsLogin] = useState(true);
  const [isSystemLogin, setIsSystemLogin] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', companyName: '' });
  const [isLocked, setIsLocked] = useState(false);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [tempPin, setTempPin] = useState('');

  useEffect(() => {
    if (currentUser?.pin) setIsLocked(true);
  }, []);

  useEffect(() => {
    if (currentUser) {
      const refreshedUser = state.users.find(u => u.id === currentUser.id);
      localStorage.setItem(SESSION_KEY, JSON.stringify(refreshedUser || currentUser));
      if (!(refreshedUser || currentUser).pin && !isSettingPin) setIsSettingPin(true);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [currentUser, state.users]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      const user = state.users.find(u => u.email.toLowerCase() === formData.email.toLowerCase().trim() && u.password === formData.password);
      if (user) {
        if (isSystemLogin && user.role !== UserRole.SUPER_ADMIN) { alert('Not a System Admin account.'); return; }
        setCurrentUser(user);
        setFormData({ name: '', email: '', password: '', companyName: '' });
      } else { alert('Invalid credentials.'); }
    } else {
      if (isSystemLogin) {
        const superAdmin = await addUser({ name: formData.name, email: formData.email, password: formData.password, role: UserRole.SUPER_ADMIN, companyId: 'SYSTEM' });
        setCurrentUser(superAdmin);
      } else {
        const company = await addCompany(formData.companyName);
        const admin = await addUser({ name: formData.name, email: formData.email, password: formData.password, role: UserRole.ADMIN, companyId: company.id });
        setCurrentUser(admin);
      }
    }
  };

  const navItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: ICONS.Dashboard, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.EMPLOYEE] },
    { id: 'projects', label: 'Projects', icon: ICONS.Rocket, roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.EMPLOYEE] },
    { id: 'attendance', label: 'Attendance', icon: ICONS.Time, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.EMPLOYEE] },
    { id: 'leaves', label: 'Leaves', icon: ICONS.Shield, roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.EMPLOYEE] },
    { id: 'work', label: 'Work Logs', icon: ICONS.Work, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.EMPLOYEE] },
    { id: 'financials', label: 'Financials', icon: ICONS.Money, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.EMPLOYEE] },
    { id: 'users', label: 'Team', icon: ICONS.Users, roles: [UserRole.ADMIN, UserRole.SUPERVISOR] },
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
    if (direction === 'next') {
      const nextIndex = (currentIndex + 1) % visibleNavItems.length;
      setActiveTab(visibleNavItems[nextIndex].id);
    } else {
      const prevIndex = (currentIndex - 1 + visibleNavItems.length) % visibleNavItems.length;
      setActiveTab(visibleNavItems[prevIndex].id);
    }
  };

  if (!currentUser) return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-700 ${isSystemLogin ? 'bg-slate-950' : 'bg-blue-900'}`}>
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-10">
        <Logo iconClassName="w-24 h-20 mx-auto" showText={false} />
        <form onSubmit={handleAuth} className="space-y-3 mt-8">
          {!isLogin && (
            <>
              {!isSystemLogin && <input type="text" placeholder="Enterprise Name" className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} />}
              <input type="text" placeholder="Full Name" className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </>
          )}
          <input type="email" placeholder="Email" className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          <input type="password" placeholder="Password" className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
          <button type="submit" className={`w-full py-4 text-white rounded-[1.2rem] font-black uppercase text-[10px] ${isSystemLogin ? 'bg-slate-800' : 'bg-orange-600'}`}>
            {isLogin ? 'Enter Workspace' : 'Initialize Profile'}
          </button>
        </form>
        <div className="mt-6 flex flex-col items-center space-y-3">
          <button onClick={() => setIsLogin(!isLogin)} className="text-gray-400 font-bold text-[9px] uppercase tracking-widest">{isLogin ? 'Enroll New Enterprise' : 'Switch to Login'}</button>
          <button onClick={() => setIsSystemLogin(!isSystemLogin)} className="font-black text-[8px] uppercase tracking-[0.2em] text-gray-400">{isSystemLogin ? 'Enterprise Access' : 'System Root Access'}</button>
        </div>
      </div>
    </div>
  );

  if (isSettingPin) return <div className="min-h-screen flex items-center justify-center bg-blue-900 p-6"><div className="bg-white rounded-[3rem] p-12 max-w-md w-full text-center"><h2 className="text-2xl font-black mb-8">Set Security PIN</h2><form onSubmit={async (e) => { e.preventDefault(); await updateUserPin(currentUser.id, tempPin); setIsSettingPin(false); }} className="space-y-6"><input type="password" maxLength={4} className="w-full text-center text-4xl font-black py-6 border rounded-3xl" value={tempPin} onChange={e => setTempPin(e.target.value)} /><button type="submit" className="w-full bg-blue-700 text-white py-5 rounded-2xl font-black uppercase text-xs">Secure Env</button></form></div></div>;
  if (isLocked) return <LockScreen user={currentUser} onUnlock={() => setIsLocked(false)} onLogout={() => setCurrentUser(null)} />;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-white border-r flex-col p-8 sticky top-0 h-screen">
        <Logo iconClassName="w-16 h-12" showText={false} />
        <nav className="flex-1 mt-10 space-y-1.5">
          {visibleNavItems.map(i => (
            <button key={i.id} onClick={() => setActiveTab(i.id)} className={`w-full flex items-center space-x-4 px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all ${activeTab === i.id ? 'bg-[#0D47A1] text-white shadow-xl' : 'text-gray-400 hover:text-blue-900'}`}><i.icon className="w-4 h-4" /><span>{i.label}</span></button>
          ))}
        </nav>
        <button onClick={() => setCurrentUser(null)} className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-black uppercase text-[9px]">Logout</button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Universal Top Header with Left/Right/Back */}
        <header className="sticky top-0 z-[60] bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {activeTab !== 'dashboard' ? (
              <button 
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl transition-all active:scale-90"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
              </button>
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
            {activeTab === 'users' && <UserManagement user={currentUser} state={state} addUser={addUser} updateUserSalary={updateUserSalary} />}
            {activeTab === 'subscription' && <SubscriptionCenter user={currentUser} state={state} updatePlan={updateSubscriptionPlanConfig} purchasePlan={purchaseSubscription} />}
            {activeTab === 'enterprise' && <CompanyManagement state={state} removeCompany={removeCompany} purchaseSubscription={purchaseSubscription} />}
            {activeTab === 'backend' && <BackendConsole state={state} />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
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
