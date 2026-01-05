
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, UserStatus, User, AppState, SubscriptionPlan } from './types';
import { useStore, hashPIN } from './store';
import { ICONS, Logo } from './constants';
import Dashboard from './components/Dashboard';
import AttendancePanel from './components/AttendancePanel';
import WorkTracking from './components/WorkTracking';
import FinancialManagement from './components/FinancialManagement';
import UserManagement from './components/UserManagement';
import SubscriptionCenter from './components/SubscriptionCenter';
import BackendConsole from './components/BackendConsole';
import LockScreen from './components/LockScreen';
import ProjectConsole from './components/ProjectConsole';
import LeavePortal from './components/LeavePortal';
import ReportingHub from './components/ReportingHub';

declare global {
  interface Window {
    AndroidInterface?: {
      showToast(message: string): void;
      vibrate(duration: number): void;
    };
  }
}

const SESSION_KEY = 'pragati_session_v5';
const TOKEN_KEY = 'pragati_token_v5';

/**
 * Robust JWT Decoder supporting Base64Url
 */
function getUserFromJWT(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("JWT Decode Error:", e);
    return null;
  }
}

const App: React.FC = () => {
  const { 
    state, authenticate, addUser, updateUser, removeUser, 
    addCompany, updateCompanyStatus, addSite, removeSite, markAttendance, 
    updateAttendance, removeAttendance, addWorkLog, addFinancialRequest, 
    updateRequestStatus, generateMonthlySlips, addManualSalarySlip, 
    updateSalaryStatus, removeCompany, purchaseSubscription, addLeaveRequest, updateLeaveStatus,
    updateSubscriptionPlanConfig, getAiSystemContext, updateTaskStatus, addProject, addTask,
    updateIntegrations, updateApkUrl
  } = useStore();
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(SESSION_KEY);
    if (savedToken && savedUser) {
      const decoded = getUserFromJWT(savedToken);
      // Ensure token is less than 24 hours old
      if (decoded && decoded.iat > (Date.now() / 1000) - 24 * 3600) {
        try {
          return JSON.parse(savedUser);
        } catch(e) { return null; }
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLogin, setIsLogin] = useState(true);
  const [authStep, setAuthStep] = useState<'IDENTIFY' | 'SIGNUP_DETAILS' | 'PIN_AUTHORIZE'>('IDENTIFY');
  const [formData, setFormData] = useState({ mobile: '', pin: '', name: '', companyName: '', address: '' });
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const notify = (msg: string) => {
    if (window.AndroidInterface) {
      window.AndroidInterface.showToast(msg);
      window.AndroidInterface.vibrate(50);
    } else { console.log("Pragati Notify:", msg); }
  };

  // Sync state to local storage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [currentUser]);

  const navItems = useMemo(() => {
    if (!currentUser) return [];

    // ROOT ACCESS
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return [
        { id: 'dashboard', label: 'Nodes', icon: ICONS.Dashboard, feature: 'Core' },
        { id: 'reports', label: 'Intelligence', icon: ICONS.Document, feature: 'Intelligence' },
        { id: 'backend', label: 'Master Sync', icon: ICONS.Shield, feature: 'Admin' },
        { id: 'subscription', label: 'Licenses', icon: ICONS.Rocket, feature: 'Admin' },
        { id: 'users', label: 'Identity', icon: ICONS.Users, feature: 'Admin' }
      ];
    }

    const company = state.companies.find(c => c.id === currentUser.companyId);
    const plan = state.subscriptionPlans.find(p => p.id === (company?.subscriptionPlanId || 'p-free'));
    const features = plan?.features || [];

    const allTabs = [
      { id: 'dashboard', label: 'Home', icon: ICONS.Dashboard, feature: 'Basic Attendance' },
      { id: 'attendance', label: 'Clock', icon: ICONS.Time, feature: 'Basic Attendance' },
      { id: 'projects', label: 'Projects', icon: ICONS.Work, feature: 'Task Management' },
      { id: 'work', label: 'Logs', icon: ICONS.Document, feature: 'Work Logs' },
      { id: 'reports', label: 'Reports', icon: ICONS.Document, feature: 'AI Audits' }, // Reporting hub for Pro+
      { id: 'leave', label: 'Leave', icon: ICONS.Shield, feature: 'Leave Portal' },
      { id: 'financials', label: 'Payroll', icon: ICONS.Money, feature: 'Manual Payroll' }
    ];

    // Filter based on features defined in the subscription plan
    const filtered = allTabs.filter(tab => {
      // Basic Attendance, Work Logs, Manual Payroll are standard/free
      if (['Core', 'Basic Attendance', 'Work Logs', 'Manual Payroll'].includes(tab.feature)) return true;
      return features.some(f => f.includes(tab.feature));
    });

    if (currentUser.role === UserRole.ADMIN) {
       filtered.push({ id: 'users', label: 'Personnel', icon: ICONS.Users, feature: 'Core' });
       filtered.push({ id: 'subscription', label: 'Plan', icon: ICONS.Rocket, feature: 'Core' });
    }

    return filtered;
  }, [currentUser, state.companies, state.subscriptionPlans]);

  // Ensure active tab is valid after plan changes or login
  useEffect(() => {
    if (currentUser && !navItems.some(n => n.id === activeTab)) {
      setActiveTab('dashboard');
    }
  }, [navItems, currentUser]);

  const handleLogout = () => {
    if(confirm("Terminate Secure Node Session?")) {
      setCurrentUser(null); 
      setIsLocked(false); 
      setAuthStep('IDENTIFY'); 
      setActiveTab('dashboard');
      notify("Authorization Revoked.");
    }
  };

  const handleIdentifySubmit = (e: React.FormEvent) => {
    e.preventDefault(); 
    const cleaned = formData.mobile.replace(/\D/g, '');
    if (cleaned.length < 10) return setAuthError("Valid 10-Digit Mobile Required");
    setAuthError(null);
    if (isLogin) setAuthStep('PIN_AUTHORIZE');
    else setAuthStep('SIGNUP_DETAILS');
  };

  const handleSignupDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.companyName || !formData.address) return setAuthError("All fields required");
    setAuthStep('PIN_AUTHORIZE');
  };

  const handleFinalAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(null); 
    if (!/^\d{6}$/.test(formData.pin)) return setAuthError("PIN must be exactly 6 digits.");
    
    setIsAuthenticating(true);
    try {
      const hashed = await hashPIN(formData.pin);
      if (isLogin) {
        const res = await authenticate(formData.mobile, hashed);
        if (res && res.user && res.token) { 
          localStorage.setItem(TOKEN_KEY, res.token); 
          setCurrentUser(res.user); 
          setIsLocked(false); 
          notify("Node Authorized."); 
        }
        else {
          setAuthError(res?.error || "Identity/PIN Mismatch.");
        }
      } else {
        const c = await addCompany(formData.companyName, formData.address);
        await addUser({ 
          name: formData.name, 
          email: formData.mobile.replace(/\D/g, '') + "@pragati.com", 
          mobile: formData.mobile, 
          pin_hash: hashed, 
          role: UserRole.ADMIN, 
          companyId: c.id, 
          company_name: formData.companyName,
          address: formData.address,
          status: UserStatus.ACTIVE 
        });
        
        const res = await authenticate(formData.mobile, hashed);
        if (res && res.user && res.token) {
          localStorage.setItem(TOKEN_KEY, res.token);
          setCurrentUser(res.user);
          setIsLocked(false);
          notify("Account Provisioned. Entry Allowed.");
        }
      }
    } catch (err: any) { 
      setAuthError(err.message); 
    } finally { 
      setIsAuthenticating(false); 
    }
  };

  if (!currentUser) return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-slate-900 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-black"></div>
      <div className="relative z-10 w-full max-w-md bg-white/95 rounded-[3.5rem] shadow-2xl p-12 text-center animate-in zoom-in-95">
        <Logo iconClassName="w-20 h-16 mx-auto mb-8" showText={false} />
        
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">
          {isLogin ? (authStep === 'IDENTIFY' ? 'Pragati Hub' : 'Authorize') : 'Cluster Setup'}
        </h2>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">
          {isLogin ? 'Personal Identification Portal' : 'Registering New Enterprise'}
        </p>

        {authError && <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">{authError}</div>}

        {authStep === 'IDENTIFY' && (
          <form onSubmit={handleIdentifySubmit} className="space-y-4">
            <input type="tel" placeholder="Mobile Number" className="w-full px-6 py-6 bg-slate-100 rounded-2xl font-black text-center tracking-[0.2em] text-lg outline-none" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} required />
            <button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Identify Node</button>
          </form>
        )}

        {authStep === 'SIGNUP_DETAILS' && (
          <form onSubmit={handleSignupDetailsSubmit} className="space-y-4 animate-in slide-in-from-right-4">
            <input type="text" placeholder="Full Name" className="w-full px-6 py-5 bg-slate-100 rounded-2xl font-bold uppercase text-xs outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            <input type="text" placeholder="Enterprise Name" className="w-full px-6 py-5 bg-slate-100 rounded-2xl font-black uppercase text-xs outline-none" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} required />
            <input type="text" placeholder="Physical Address" className="w-full px-6 py-5 bg-slate-100 rounded-2xl font-bold uppercase text-xs outline-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
            <button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Proceed to PIN Setup</button>
          </form>
        )}

        {authStep === 'PIN_AUTHORIZE' && (
          <form onSubmit={handleFinalAuth} className="space-y-4 animate-in zoom-in-95">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Enter 6-Digit Secret PIN</p>
            <input type="password" placeholder="******" className="w-full px-6 py-6 bg-slate-100 rounded-2xl font-black text-3xl text-center tracking-[0.5em] outline-none" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})} required maxLength={6} />
            <button type="submit" disabled={isAuthenticating} className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
              {isAuthenticating ? 'Authorizing...' : isLogin ? 'Authorize Cloud' : 'Provision Account'}
            </button>
            <button type="button" onClick={() => setAuthStep('IDENTIFY')} className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-4">Change Mobile</button>
          </form>
        )}

        <button onClick={() => { setIsLogin(!isLogin); setAuthStep('IDENTIFY'); setAuthError(null); }} className="mt-10 text-[10px] font-black text-blue-600 uppercase tracking-widest">
          {isLogin ? 'New Enterprise Registration' : 'Back to Login Identity'}
        </button>
      </div>
    </div>
  );

  if (isLocked) return <LockScreen user={currentUser} onUnlock={() => setIsLocked(false)} onLogout={handleLogout} />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b px-8 py-5 flex items-center justify-between sticky top-0 z-[60] safe-top shadow-sm">
        <div className="flex items-center space-x-3">
           <Logo iconClassName="w-8 h-6" showText={false} />
           <div className="h-4 w-[2px] bg-slate-200"></div>
           <span className="text-[11px] font-black uppercase text-slate-800 tracking-tighter">{navItems.find(n => n.id === activeTab)?.label}</span>
        </div>
        <div className="flex items-center space-x-3">
           <button onClick={() => setIsLocked(true)} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-blue-600 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
           </button>
           <button onClick={handleLogout} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013-3v1" /></svg>
           </button>
        </div>
      </header>

      <main className="p-6 flex-1 overflow-y-auto safe-bottom-padding">
        <div className="max-w-7xl mx-auto">
           {activeTab === 'dashboard' && <Dashboard user={currentUser} state={state} getAiSystemContext={getAiSystemContext} updateTaskStatus={updateTaskStatus} />}
           {activeTab === 'attendance' && <AttendancePanel user={currentUser} state={state} markAttendance={markAttendance} updateAttendance={updateAttendance} removeAttendance={removeAttendance} addSite={addSite} removeSite={removeSite} />}
           {activeTab === 'projects' && <ProjectConsole user={currentUser} state={state} addProject={addProject} addTask={addTask} updateTaskStatus={updateTaskStatus} />}
           {activeTab === 'work' && <WorkTracking user={currentUser} state={state} addWorkLog={addWorkLog} />}
           {activeTab === 'reports' && <ReportingHub user={currentUser} state={state} />}
           {activeTab === 'leave' && <LeavePortal user={currentUser} state={state} addLeaveRequest={addLeaveRequest} updateLeaveStatus={updateLeaveStatus} />}
           {activeTab === 'financials' && <FinancialManagement user={currentUser} state={state} addRequest={addFinancialRequest} updateStatus={updateRequestStatus} generateMonthlySlips={generateMonthlySlips} addManualSalarySlip={addManualSalarySlip} updateSalaryStatus={updateSalaryStatus} />}
           {activeTab === 'users' && <UserManagement user={currentUser} state={state} addUser={addUser} updateUser={updateUser} removeUser={removeUser} onUpgradeClick={() => setActiveTab('subscription')} />}
           {activeTab === 'subscription' && <SubscriptionCenter user={currentUser} state={state} updatePlan={()=>{}} purchasePlan={purchaseSubscription} removeUser={removeUser} />}
           {activeTab === 'backend' && <BackendConsole state={state} updateUser={updateUser} updateCompanyStatus={updateCompanyStatus} removeUser={removeUser} removeCompany={removeCompany} purchaseSubscription={purchaseSubscription} updateSubscriptionPlanConfig={updateSubscriptionPlanConfig} addSite={addSite} removeSite={removeSite} updateIntegrations={updateIntegrations} updateApkUrl={updateApkUrl} />}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex h-24 items-center justify-around z-[70] safe-bottom shadow-2xl rounded-t-[2.5rem]">
         {navItems.map(item => (
           <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center justify-center w-full transition-all active:scale-90 ${activeTab === item.id ? 'text-blue-600' : 'text-slate-300'}`}>
              <div className={`p-2 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-50' : ''}`}><item.icon className="w-6 h-6" /></div>
              <span className="text-[7px] font-black uppercase mt-1.5 tracking-widest">{item.label}</span>
           </button>
         ))}
      </nav>
    </div>
  );
};

export default App;
