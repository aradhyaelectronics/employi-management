
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
import EnterprisesPage from './components/EnterprisesPage';
import LockScreen from './components/LockScreen';
import ProjectConsole from './components/ProjectConsole';
import LeavePortal from './components/LeavePortal';
import ReportingHub from './components/ReportingHub';
import LegalCompliance from './components/LegalCompliance';
import MaterialRegistry from './components/MaterialRegistry';
import NodeTelemetry from './components/NodeTelemetry';

const SESSION_KEY = 'pragati_session_v120';
const TOKEN_KEY = 'pragati_token_v120';

const App: React.FC = () => {
  const { 
    state, authenticate, addUser, updateUser, removeUser, 
    addCompany, updateCompany, updateCompanyStatus, addSite, removeSite, markAttendance, 
    updateAttendance, removeAttendance, addWorkLog, addFinancialRequest, 
    updateRequestStatus, generateMonthlySlips, addManualSalarySlip, 
    updateSalaryStatus, removeCompany: removeCompanyStore, purchaseSubscription, addLeaveRequest, updateLeaveStatus,
    updateSubscriptionPlanConfig, getAiSystemContext, updateTaskStatus, addProject, addTask,
    updateIntegrations, updateApkUrl,
    addOffer, updateOffer, removeOffer,
    addAd, updateAd, removeAd, updateAnnouncement,
    addMaterial, updateMaterial, removeMaterial
  } = useStore();
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(SESSION_KEY);
    if (savedToken && savedUser) {
      try { return JSON.parse(savedUser); } catch(e) { return null; }
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
  const [showPublicLegal, setShowPublicLegal] = useState(false);

  const navItems = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return [
        { id: 'dashboard', label: 'Overview', icon: ICONS.Dashboard },
        { id: 'enterprises', label: 'Nodes', icon: ICONS.Shield },
        { id: 'reports', label: 'Analytics', icon: ICONS.Document },
        { id: 'backend', label: 'Master', icon: ICONS.Work },
      ];
    }
    const company = state.companies.find(c => c.id === currentUser.companyId);
    const plan = state.subscriptionPlans.find(p => p.id === (company?.subscriptionPlanId || 'p-free'));
    const features = plan?.features || [];
    
    // Core navigation items
    const allTabs = [
      { id: 'dashboard', label: 'Home', icon: ICONS.Dashboard, feature: 'Basic Attendance' },
      { id: 'attendance', label: 'Clock', icon: ICONS.Time, feature: 'Basic Attendance' },
      { id: 'telemetry', label: 'Telemetry', icon: ICONS.Rocket, feature: 'Work Logs' },
      { id: 'materials', label: 'Materials', icon: ICONS.Shield, feature: 'Work Logs' },
      { id: 'work', label: 'Logs', icon: ICONS.Document, feature: 'Work Logs' },
      { id: 'financials', label: 'Payroll', icon: ICONS.Money, feature: 'Manual Payroll' }
    ];

    const filtered = allTabs.filter(tab => 
      features.some(f => f.toLowerCase().includes(tab.feature.toLowerCase())) || 
      ['Basic Attendance', 'Work Logs', 'Manual Payroll'].includes(tab.feature)
    );

    if (currentUser.role === UserRole.ADMIN) {
       filtered.push({ id: 'users', label: 'Staff', icon: ICONS.Users, feature: 'Core' });
       filtered.push({ id: 'subscription', label: 'Plan', icon: ICONS.Rocket, feature: 'Core' });
    }
    return filtered;
  }, [currentUser, state.companies, state.subscriptionPlans]);

  const handleLogout = () => { 
    if(confirm("Confirm Logout? Session will be terminated and node access will require PIN verification.")) { 
      setCurrentUser(null); 
      setIsLocked(false); 
      setActiveTab('dashboard');
      setAuthStep('IDENTIFY'); 
      localStorage.removeItem(SESSION_KEY); 
      localStorage.removeItem(TOKEN_KEY); 
    } 
  };

  if (!currentUser) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full"></div>
      <div className="w-full max-w-md bg-white/95 rounded-[3.5rem] shadow-2xl p-12 text-center animate-in zoom-in-95 relative z-10">
        <Logo iconClassName="w-20 h-16 mx-auto mb-8" showText={false} />
        {showPublicLegal ? (
          <div className="animate-in slide-in-from-right-4">
             <div className="flex justify-between items-center mb-6">
                <button onClick={() => setShowPublicLegal(false)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">← Back</button>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Legal Hub</h2>
             </div>
             <div className="max-h-[60vh] overflow-y-auto custom-scrollbar text-left pr-2"><LegalCompliance /></div>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">{isLogin ? 'Pragati Portal' : 'Cluster Setup'}</h2>
            {authError && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100">{authError}</div>}
            {authStep === 'IDENTIFY' && (
              <form onSubmit={e => { e.preventDefault(); setAuthStep(isLogin ? 'PIN_AUTHORIZE' : 'SIGNUP_DETAILS'); }} className="space-y-4">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                   <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Mobile ID</label>
                   <input type="tel" placeholder="10 Digit Mobile" className="w-full bg-transparent font-black text-center tracking-[0.2em] text-2xl outline-none" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value.replace(/\D/g, '')})} required />
                </div>
                <button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Identify Node</button>
              </form>
            )}
            {authStep === 'SIGNUP_DETAILS' && (
              <form onSubmit={e => { e.preventDefault(); setAuthStep('PIN_AUTHORIZE'); }} className="space-y-4 animate-in slide-in-from-right-4">
                <input type="text" placeholder="Full Name" className="w-full px-6 py-5 bg-slate-100 rounded-2xl font-bold uppercase text-xs" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                <input type="text" placeholder="Enterprise Name" className="w-full px-6 py-5 bg-slate-100 rounded-2xl font-black uppercase text-xs" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} required />
                <button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Proceed to PIN</button>
              </form>
            )}
            {authStep === 'PIN_AUTHORIZE' && (
              <form onSubmit={async e => {
                e.preventDefault(); setIsAuthenticating(true);
                try {
                  const hashed = await hashPIN(formData.pin);
                  if (isLogin) {
                    const res = await authenticate(formData.mobile, hashed);
                    if (res?.user) { 
                      localStorage.setItem(TOKEN_KEY, res.token!); 
                      localStorage.setItem(SESSION_KEY, JSON.stringify(res.user)); 
                      setCurrentUser(res.user); 
                    }
                    else { setAuthError(res?.error || "Incorrect credentials."); setAuthStep('IDENTIFY'); }
                  } else {
                    const c = await addCompany(formData.companyName, formData.address);
                    await addUser({ name: formData.name, email: formData.mobile + "@node.co", mobile: formData.mobile, pin_hash: hashed, role: UserRole.ADMIN, companyId: c.id, status: UserStatus.ACTIVE });
                    const res = await authenticate(formData.mobile, hashed);
                    if (res?.user) { 
                      localStorage.setItem(TOKEN_KEY, res.token!); 
                      localStorage.setItem(SESSION_KEY, JSON.stringify(res.user)); 
                      setCurrentUser(res.user); 
                    }
                  }
                } catch (err) { setAuthError("Connection Lost."); } finally { setIsAuthenticating(false); }
              }} className="space-y-6">
                <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
                   <label className="block text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">Security PIN</label>
                   <input type="password" placeholder="••••••" className="w-full bg-transparent font-black text-4xl text-center tracking-[0.4em] outline-none" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})} required maxLength={6} autoFocus />
                </div>
                <button type="submit" disabled={isAuthenticating} className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">{isAuthenticating ? 'Authorizing...' : 'Authorize Access'}</button>
              </form>
            )}
            <button onClick={() => { setIsLogin(!isLogin); setAuthStep('IDENTIFY'); setAuthError(null); }} className="mt-8 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">
              {isLogin ? 'Establish New Enterprise' : 'Return to Login'}
            </button>
            <div className="mt-12 flex justify-center gap-6 border-t border-slate-50 pt-8">
               <button onClick={() => setShowPublicLegal(true)} className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Privacy & Terms</button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (isLocked) return <LockScreen user={currentUser} onUnlock={() => setIsLocked(false)} onLogout={handleLogout} />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-[60] safe-top shadow-md">
        <div className="flex items-center gap-4">
          <Logo iconClassName="w-10 h-8" showText={false} />
          {activeTab !== 'dashboard' && (
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M15 19l-7-7 7-7" /></svg>
              Dashboard
            </button>
          )}
        </div>
        
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className="text-[12px] font-black uppercase text-slate-900 tracking-tighter leading-none">
            {navItems.find(n => n.id === activeTab)?.label || 'Dashboard'}
          </span>
          <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.3em] mt-1">Global Node</span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsLocked(true)} 
            className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-blue-600 transition-all border border-slate-100 shadow-sm"
            title="Lock Terminal"
          >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </button>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-100 shadow-sm font-black text-[9px] uppercase tracking-widest"
            title="Logout"
          >
             <span className="hidden sm:inline">Logout</span>
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </header>

      {/* Mobile Back Button (Floating on non-dashboard tabs) */}
      {activeTab !== 'dashboard' && (
        <button 
          onClick={() => setActiveTab('dashboard')}
          className="md:hidden fixed bottom-28 right-6 z-[80] w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all border-4 border-white"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}

      <main className="p-6 flex-1 overflow-y-auto safe-bottom-padding">
        <div className="max-w-7xl mx-auto">
           {activeTab === 'dashboard' && <Dashboard user={currentUser} state={state} getAiSystemContext={getAiSystemContext} onNavigate={setActiveTab} />}
           {activeTab === 'attendance' && <AttendancePanel user={currentUser} state={state} markAttendance={markAttendance} updateAttendance={updateAttendance} addSite={addSite} removeSite={removeSite} />}
           {activeTab === 'work' && <WorkTracking user={currentUser} state={state} addWorkLog={addWorkLog} />}
           {activeTab === 'materials' && <MaterialRegistry user={currentUser} state={state} addMaterial={addMaterial} updateMaterial={updateMaterial} removeMaterial={removeMaterial} />}
           {activeTab === 'telemetry' && <NodeTelemetry user={currentUser} state={state} />}
           {activeTab === 'projects' && <ProjectConsole user={currentUser} state={state} addProject={addProject} addTask={addTask} updateTaskStatus={updateTaskStatus} />}
           {activeTab === 'financials' && <FinancialManagement user={currentUser} state={state} addRequest={addFinancialRequest} updateStatus={updateRequestStatus} generateMonthlySlips={generateMonthlySlips} addManualSalarySlip={addManualSalarySlip} updateSalaryStatus={updateSalaryStatus} />}
           {activeTab === 'users' && <UserManagement user={currentUser} state={state} addUser={addUser} updateUser={updateUser} removeUser={removeUser} onUpgradeClick={() => setActiveTab('subscription')} />}
           {activeTab === 'subscription' && <SubscriptionCenter user={currentUser} state={state} updatePlan={()=>{}} purchasePlan={purchaseSubscription} />}
           {activeTab === 'enterprises' && <EnterprisesPage state={state} updateCompany={updateCompany} removeCompany={removeCompanyStore} />}
           {activeTab === 'reports' && <ReportingHub user={currentUser} state={state} />}
           {activeTab === 'backend' && <BackendConsole state={state} updateUser={updateUser} updateCompanyStatus={updateCompanyStatus} removeUser={removeUser} removeCompany={removeCompanyStore} purchaseSubscription={purchaseSubscription} updateSubscriptionPlanConfig={updateSubscriptionPlanConfig} addSite={addSite} removeSite={removeSite} updateIntegrations={updateIntegrations} updateApkUrl={updateApkUrl} addOffer={addOffer} updateOffer={updateOffer} removeOffer={removeOffer} addAd={addAd} updateAd={updateAd} removeAd={removeAd} updateAnnouncement={updateAnnouncement} />}
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
