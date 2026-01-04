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

// Native Android Interface Declaration
declare global {
  interface Window {
    AndroidInterface?: {
      showToast: (msg: string) => void;
      vibrate: (duration: number) => void;
      getAppVersion: () => string;
      exitApp: () => void;
      shareApp: (url: string) => void;
    };
  }
}

const App: React.FC = () => {
  const { 
    state, authenticate, resetSystem, addUser, updateUser, removeUser, 
    updateUserPin, updateUserPassword, addCompany, updateCompanyStatus, 
    addSite, removeSite, markAttendance, updateAttendance, removeAttendance, addWorkLog, 
    addFinancialRequest, updateRequestStatus, generateMonthlySlips, 
    addManualSalarySlip, updateSalaryStatus, removeCompany, purchaseSubscription,
    updateSubscriptionPlanConfig, getAiSystemContext, updateTaskStatus, addProject, addTask,
    updateIntegrations, updateApkUrl
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

  // Native Utility
  const notify = (msg: string) => {
    if (window.AndroidInterface) {
      window.AndroidInterface.showToast(msg);
      window.AndroidInterface.vibrate(50);
    } else {
      alert(msg);
    }
  };

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
        { id: 'backend', label: 'Control', icon: ICONS.Shield },
        { id: 'subscription', label: 'Billing', icon: ICONS.Rocket },
        { id: 'users', label: 'Identities', icon: ICONS.Users },
        { id: 'legal', label: 'Legal', icon: ICONS.Document }
      ];
    }
    if (role === UserRole.ADMIN) {
      return [
        { id: 'dashboard', label: 'Desk', icon: ICONS.Dashboard },
        { id: 'attendance', label: 'Attendance', icon: ICONS.Time },
        { id: 'projects', label: 'Projects', icon: ICONS.Work },
        { id: 'work', label: 'Work Logs', icon: ICONS.Document },
        { id: 'financials', label: 'Payroll', icon: ICONS.Money }
      ];
    }
    if (role === UserRole.SUPERVISOR) {
      return [
        { id: 'dashboard', label: 'Field', icon: ICONS.Dashboard },
        { id: 'attendance', label: 'Attendance', icon: ICONS.Time },
        { id: 'projects', label: 'Milestones', icon: ICONS.Work },
        { id: 'work', label: 'Verification', icon: ICONS.Document },
        { id: 'financials', label: 'Payments', icon: ICONS.Money }
      ];
    }
    return [
      { id: 'dashboard', label: 'Desk', icon: ICONS.Dashboard },
      { id: 'attendance', label: 'Clock', icon: ICONS.Time },
      { id: 'projects', label: 'Tasks', icon: ICONS.Work },
      { id: 'work', label: 'Meters', icon: ICONS.Document },
      { id: 'financials', label: 'Earnings', icon: ICONS.Money }
    ];
  }, [currentUser]);

  const handleLogout = () => {
    if(confirm("Confirm security termination?")) {
      setCurrentUser(null);
      setIsLocked(false);
      setActiveTab('dashboard');
      localStorage.removeItem(SESSION_KEY);
      notify("Session Terminated Safely");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (isLogin) {
        const user = authenticate(formData.identifier, formData.secret);
        if (user) {
          setCurrentUser(user);
          notify(`Welcome ${user.name}`);
        }
        else setAuthError("Security Failure: ID or PIN mismatch.");
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
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 text-center animate-in zoom-in-95 duration-500">
        <Logo iconClassName="w-20 h-16 mx-auto mb-6" showText={false} />
        <h2 className="text-2xl font-black uppercase mb-1 text-slate-800 tracking-tighter">{isLogin ? 'Personnel Login' : 'Launch Enterprise'}</h2>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">{isLogin ? 'Enter Field ID or Mobile' : 'Infrastructure Registration'}</p>
        
        {authError && <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black uppercase border border-red-100">{authError}</div>}
        
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <>
              {!isSystemLogin && <input type="text" placeholder="Enterprise Name" className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} required />}
              <input type="text" placeholder="Full Name" className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </>
          )}
          <input type="text" placeholder="Login ID / Number" className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none font-black text-sm text-center uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-100" value={formData.identifier} onChange={e => setFormData({...formData, identifier: e.target.value})} required />
          <input type="password" placeholder="PIN / Password" className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none font-black text-xl text-center tracking-[0.3em] outline-none focus:ring-2 focus:ring-blue-100" value={formData.secret} onChange={e => setFormData({...formData, secret: e.target.value})} required />
          <button type="submit" className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.1em] shadow-xl hover:bg-orange-700 active:scale-95 transition-all">
            {isLogin ? 'Unlock Portal' : 'Create Cluster'}
          </button>
        </form>
        
        <div className="mt-8 flex flex-col gap-3">
          <button onClick={() => setIsLogin(!isLogin)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{isLogin ? 'Register New Enterprise' : 'Back to Login'}</button>
          <button onClick={() => { setIsSystemLogin(!isSystemLogin); setIsLogin(true); }} className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">{isSystemLogin ? 'User Login' : 'Master Root Access'}</button>
        </div>
      </div>
    </div>
  );

  if (isLocked) return <LockScreen user={currentUser} onUnlock={() => { setIsLocked(false); notify("System Unlocked"); }} onLogout={handleLogout} />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-[60] safe-top shadow-sm">
           <div className="flex items-center space-x-3">
              <Logo iconClassName="w-8 h-6" showText={false} />
              <h1 className="text-xs font-black uppercase tracking-tighter text-slate-800">
                {navItems.find(n => n.id === activeTab)?.label || 'Pragati Cloud'}
              </h1>
           </div>
           
           <div className="flex items-center space-x-3">
              <div className="text-right hidden xs:block">
                <p className="text-[8px] font-black text-blue-600 uppercase">{currentUser.name.split(' ')[0]}</p>
              </div>
              <button onClick={handleLogout} className="p-2 bg-red-50 text-red-500 rounded-xl active:bg-red-500 active:text-white transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013-3v1" /></svg>
              </button>
           </div>
        </header>

        <main className="p-4 flex-1 overflow-y-auto safe-bottom-padding bg-slate-50/30">
          <div className="max-w-7xl mx-auto">
             {activeTab === 'dashboard' && <Dashboard user={currentUser} state={state} getAiSystemContext={getAiSystemContext} updatePassword={updateUserPassword} updateTaskStatus={updateTaskStatus} />}
             {activeTab === 'attendance' && <AttendancePanel user={currentUser} state={state} markAttendance={markAttendance} updateAttendance={updateAttendance} removeAttendance={removeAttendance} addSite={addSite} removeSite={removeSite} />}
             {activeTab === 'projects' && <ProjectConsole user={currentUser} state={state} addProject={addProject} addTask={addTask} updateTaskStatus={updateTaskStatus} />}
             {activeTab === 'work' && <WorkTracking user={currentUser} state={state} addWorkLog={addWorkLog} />}
             {activeTab === 'financials' && <FinancialManagement user={currentUser} state={state} addRequest={addFinancialRequest} updateStatus={updateRequestStatus} generateMonthlySlips={generateMonthlySlips} addManualSalarySlip={addManualSalarySlip} updateSalaryStatus={updateSalaryStatus} />}
             {activeTab === 'users' && <UserManagement user={currentUser} state={state} addUser={addUser} updateUser={updateUser} removeUser={removeUser} />}
             {activeTab === 'subscription' && <SubscriptionCenter user={currentUser} state={state} updatePlan={updateSubscriptionPlanConfig} purchasePlan={purchaseSubscription} removeUser={removeUser} />}
             {activeTab === 'backend' && <BackendConsole state={state} updateUser={updateUser} updateCompanyStatus={updateCompanyStatus} removeUser={removeUser} removeCompany={removeCompany} purchaseSubscription={purchaseSubscription} addSite={addSite} removeSite={removeSite} updateIntegrations={updateIntegrations} updateApkUrl={updateApkUrl} />}
             {activeTab === 'legal' && <LegalCompliance />}
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex h-20 items-center justify-around px-2 z-[70] safe-bottom shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.1)]">
           {navItems.slice(0, 5).map(item => (
             <button key={item.id} onClick={() => { setActiveTab(item.id); if(window.AndroidInterface) window.AndroidInterface.vibrate(10); }} className={`flex flex-col items-center justify-center space-y-1 w-full transition-all active:scale-90 ${activeTab === item.id ? 'text-blue-600' : 'text-slate-400 opacity-60'}`}>
                <item.icon className="w-6 h-6" />
                <span className="text-[7px] font-black uppercase tracking-widest">{item.label.split(' ')[0]}</span>
                {activeTab === item.id && <div className="w-1 h-1 bg-blue-600 rounded-full mt-0.5"></div>}
             </button>
           ))}
        </nav>
      </div>
    </div>
  );
};

export default App;