
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, UserStatus, User, AppState } from './types';
import { useStore } from './store';
import { ICONS, Logo } from './constants';
import Dashboard from './components/Dashboard';
import AttendancePanel from './components/AttendancePanel';
import WorkTracking from './components/WorkTracking';
import FinancialManagement from './components/FinancialManagement';
import UserManagement from './components/UserManagement';
import SubscriptionCenter from './components/SubscriptionCenter';
import BackendConsole from './components/BackendConsole';
import LegalCompliance from './components/LegalCompliance';
import LockScreen from './components/LockScreen';
import ProjectConsole from './components/ProjectConsole';

const SESSION_KEY = 'employeemanagement_session_v4';

const App: React.FC = () => {
  const { 
    state, authenticate, resetSystem, addUser, updateUser, removeUser, 
    updateUserPin, updateUserPassword, addCompany, updateCompanyStatus, 
    addSite, removeSite, markAttendance, updateAttendance, removeAttendance, addWorkLog, 
    addFinancialRequest, updateRequestStatus, generateMonthlySlips, 
    addManualSalarySlip, updateSalaryStatus, removeCompany, purchaseSubscription,
    updateSubscriptionPlanConfig, getAiSystemContext, updateTaskStatus, addProject, addTask
  } = useStore();
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLogin, setIsLogin] = useState(true);
  const [isSystemLogin, setIsSystemLogin] = useState(false);
  const [formData, setFormData] = useState({ identifier: '', secret: '', name: '', companyName: '' });
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
      if (currentUser.pin && !isLocked) setIsLocked(true);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [currentUser]);

  const navItems = useMemo(() => {
    if (!currentUser) return [];
    const role = currentUser.role;
    if (role === UserRole.SUPER_ADMIN) {
      return [
        { id: 'dashboard', label: 'Master Root', icon: ICONS.Dashboard },
        { id: 'backend', label: 'Enterprise Control', icon: ICONS.Shield },
        { id: 'subscription', label: 'Plan Architect', icon: ICONS.Rocket },
        { id: 'users', label: 'Global Users', icon: ICONS.Users },
        { id: 'legal', label: 'Vision & Legal', icon: ICONS.Shield }
      ];
    }
    if (role === UserRole.ADMIN) {
      return [
        { id: 'dashboard', label: 'My Desk', icon: ICONS.Dashboard },
        { id: 'users', label: 'Workforce', icon: ICONS.Users },
        { id: 'attendance', label: 'Attendance', icon: ICONS.Time },
        { id: 'projects', label: 'Projects', icon: ICONS.Work },
        { id: 'work', label: 'Work Logs', icon: ICONS.Work },
        { id: 'financials', label: 'Payroll', icon: ICONS.Money },
        { id: 'subscription', label: 'Subscription', icon: ICONS.Rocket },
        { id: 'legal', label: 'Compliance', icon: ICONS.Shield }
      ];
    }
    if (role === UserRole.SUPERVISOR) {
      return [
        { id: 'dashboard', label: 'Field Status', icon: ICONS.Dashboard },
        { id: 'attendance', label: 'Presence', icon: ICONS.Time },
        { id: 'projects', label: 'Milestones', icon: ICONS.Work },
        { id: 'work', label: 'Verification', icon: ICONS.Work },
        { id: 'legal', label: 'Compliance', icon: ICONS.Shield }
      ];
    }
    return [
      { id: 'dashboard', label: 'My Desk', icon: ICONS.Dashboard },
      { id: 'attendance', label: 'Clock In/Out', icon: ICONS.Time },
      { id: 'projects', label: 'My Tasks', icon: ICONS.Work },
      { id: 'work', label: 'My Work', icon: ICONS.Work },
      { id: 'financials', label: 'Payments', icon: ICONS.Money },
      { id: 'legal', label: 'Vision', icon: ICONS.Shield }
    ];
  }, [currentUser]);

  const handleLogout = () => {
    if(confirm("Confirm security termination for this session?")) {
      setCurrentUser(null);
      setIsLocked(false);
      setActiveTab('dashboard');
      localStorage.removeItem(SESSION_KEY);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (isLogin) {
        const user = authenticate(formData.identifier, formData.secret);
        if (user) setCurrentUser(user);
        else setAuthError("Security Failure: ID/Number or PIN/Secret mismatch.");
      } else {
        if (isSystemLogin) {
          const u = await addUser({ name: formData.name, email: formData.identifier, password: formData.secret, role: UserRole.SUPER_ADMIN, companyId: 'SYSTEM', status: UserStatus.ACTIVE });
          setCurrentUser(u);
        } else {
          const c = await addCompany(formData.companyName);
          const u = await addUser({ name: formData.name, email: formData.identifier, password: formData.secret, role: UserRole.ADMIN, companyId: c.id, status: UserStatus.ACTIVE });
          setCurrentUser(u);
        }
      }
    } catch (err: any) { setAuthError(err.message); }
  };

  if (!currentUser) return (
    <div className="min-h-screen bg-[#0D47A1] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 text-center animate-in zoom-in-95 duration-500">
        <Logo iconClassName="w-20 h-16 mx-auto mb-6" showText={false} />
        <h2 className="text-2xl font-black uppercase mb-2 text-slate-800 tracking-tighter">{isLogin ? 'Personnel Login' : 'Launch Enterprise'}</h2>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">{isLogin ? 'Login with ID or Mobile Number' : 'Infrastructure Registration'}</p>
        
        {authError && <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black uppercase border border-red-100">{authError}</div>}
        
        <form onSubmit={handleAuth} className="space-y-4 w-full">
          {!isLogin && (
            <>
              {!isSystemLogin && <input type="text" placeholder="Enterprise Name" className="w-full px-6 py-5 bg-gray-50 rounded-2xl border outline-none font-bold text-sm" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} required />}
              <input type="text" placeholder="Full Name" className="w-full px-6 py-5 bg-gray-50 rounded-2xl border outline-none font-bold text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </>
          )}
          <div className="space-y-1">
            <label className="block text-[8px] font-black text-slate-400 uppercase text-left ml-2 tracking-widest">Login ID / Number</label>
            <input type="text" placeholder="e.g. PR-EMP-1234" className="w-full px-6 py-5 bg-gray-50 rounded-2xl border outline-none font-black text-sm text-center uppercase tracking-widest focus:ring-2 focus:ring-blue-100 transition-all" value={formData.identifier} onChange={e => setFormData({...formData, identifier: e.target.value})} required />
          </div>
          <div className="space-y-1">
            <label className="block text-[8px] font-black text-slate-400 uppercase text-left ml-2 tracking-widest">Security PIN / Password</label>
            <input type="password" placeholder="****" maxLength={isLogin ? 20 : 40} className="w-full px-6 py-5 bg-gray-50 rounded-2xl border outline-none font-black text-xl text-center tracking-[0.2em] focus:ring-2 focus:ring-blue-100 transition-all" value={formData.secret} onChange={e => setFormData({...formData, secret: e.target.value})} required />
          </div>
          <button type="submit" className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-900/20 active:scale-95">
            {isLogin ? 'Unlock Portal' : 'Create Cluster'}
          </button>
        </form>
        
        <div className="mt-8 flex flex-col gap-3">
          <button onClick={() => setIsLogin(!isLogin)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">{isLogin ? 'Register New Enterprise' : 'Back to Login'}</button>
          <button onClick={() => { setIsSystemLogin(!isSystemLogin); setIsLogin(true); }} className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">{isSystemLogin ? 'User Login' : 'Master Root Access'}</button>
          <button onClick={resetSystem} className="text-[7px] font-black text-red-300 uppercase mt-4">System Purge</button>
        </div>
      </div>
    </div>
  );

  if (isLocked) return <LockScreen user={currentUser} onUnlock={() => setIsLocked(false)} onLogout={handleLogout} />;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <aside className="hidden md:flex w-72 bg-slate-900 text-white flex-col p-8 sticky top-0 h-screen shadow-2xl">
        <div className="mb-12 flex items-center space-x-3">
          <Logo iconClassName="w-10 h-8" showText={false} light={true} />
          <div className="overflow-hidden">
            <h2 className="text-xs font-black uppercase tracking-widest text-blue-400 truncate">Pragati Cloud</h2>
            <p className="text-[8px] font-black uppercase text-slate-500 truncate">{currentUser.id}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button onClick={handleLogout} className="mt-8 w-full py-4 bg-red-600/10 text-red-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all border border-red-900/20">Sign Out</button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-[60] safe-top shadow-sm">
           <div className="flex items-center space-x-4">
              {activeTab !== 'dashboard' && (
                <button onClick={() => setActiveTab('dashboard')} className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all shadow-sm">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                </button>
              )}
              <h1 className="text-sm font-black uppercase tracking-tighter text-slate-800">
                {navItems.find(n => n.id === activeTab)?.label || 'Overview'}
              </h1>
           </div>
           
           <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{currentUser.name}</p>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{state.companies.find(c => c.id === currentUser.companyId)?.name || 'MASTER ROOT'}</p>
              </div>
              <button onClick={handleLogout} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013-3v1" /></svg>
              </button>
           </div>
        </header>

        <main className="p-4 md:p-10 flex-1 overflow-y-auto pb-32 md:pb-10 bg-slate-50/30">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
             {activeTab === 'dashboard' && <Dashboard user={currentUser} state={state} getAiSystemContext={getAiSystemContext} updatePassword={updateUserPassword} updateTaskStatus={updateTaskStatus} />}
             {activeTab === 'attendance' && <AttendancePanel user={currentUser} state={state} markAttendance={markAttendance} updateAttendance={updateAttendance} removeAttendance={removeAttendance} addSite={addSite} removeSite={removeSite} />}
             {activeTab === 'projects' && <ProjectConsole user={currentUser} state={state} addProject={addProject} addTask={addTask} updateTaskStatus={updateTaskStatus} />}
             {activeTab === 'work' && <WorkTracking user={currentUser} state={state} addWorkLog={addWorkLog} />}
             {activeTab === 'financials' && <FinancialManagement user={currentUser} state={state} addRequest={addFinancialRequest} updateStatus={updateRequestStatus} generateMonthlySlips={generateMonthlySlips} addManualSalarySlip={addManualSalarySlip} updateSalaryStatus={updateSalaryStatus} />}
             {activeTab === 'users' && <UserManagement user={currentUser} state={state} addUser={addUser} updateUser={updateUser} removeUser={removeUser} />}
             {activeTab === 'subscription' && <SubscriptionCenter user={currentUser} state={state} updatePlan={updateSubscriptionPlanConfig} purchasePlan={purchaseSubscription} removeUser={removeUser} />}
             {activeTab === 'backend' && <BackendConsole state={state} updateUser={updateUser} updateCompanyStatus={updateCompanyStatus} removeUser={removeUser} removeCompany={removeCompany} purchaseSubscription={purchaseSubscription} addSite={addSite} removeSite={removeSite} />}
             {activeTab === 'legal' && <LegalCompliance />}
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex md:hidden h-20 items-center justify-around px-4 z-[70] safe-bottom shadow-2xl">
           {navItems.slice(0, 5).map(item => (
             <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center justify-center space-y-1 w-full transition-all ${activeTab === item.id ? 'text-blue-600' : 'text-slate-400 opacity-60'}`}>
                <item.icon className="w-5 h-5" />
                <span className="text-[7px] font-black uppercase tracking-widest">{item.label.split(' ')[0]}</span>
                {activeTab === item.id && <div className="w-1 h-1 bg-blue-600 rounded-full mt-1"></div>}
             </button>
           ))}
        </nav>
      </div>
    </div>
  );
};

export default App;
