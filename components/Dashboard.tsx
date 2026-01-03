
import React, { useState, useMemo, useEffect } from 'react';
import { User, AppState, UserRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { ICONS } from '../constants';

interface Props {
  user: User;
  state: AppState;
  updatePassword?: (id: string, password: string) => Promise<void>;
}

const Dashboard: React.FC<Props> = ({ user, state, updatePassword }) => {
  const isSuper = user.role === UserRole.SUPER_ADMIN;
  const company = state.companies.find(c => c.id === user.companyId);
  
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);
  const [showApkWarning, setShowApkWarning] = useState(false);

  const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });
  const [passChangeError, setPassChangeError] = useState('');
  
  const relevantWorkLogs = useMemo(() => isSuper ? state.workLogs : state.workLogs.filter(l => l.companyId === user.companyId), [state.workLogs, user.companyId, isSuper]);
  const relevantUsers = useMemo(() => isSuper ? state.users : state.users.filter(u => u.companyId === user.companyId), [state.users, user.companyId, isSuper]);
  const relevantRequests = useMemo(() => isSuper ? state.requests : state.requests.filter(r => r.companyId === user.companyId), [state.requests, user.companyId, isSuper]);
  
  const supervisors = useMemo(() => relevantUsers.filter(u => u.role === UserRole.SUPERVISOR), [relevantUsers]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passData.current !== user.password) return setPassChangeError('Current password incorrect.');
    if (passData.new.length < 6) return setPassChangeError('New password too short.');
    if (passData.new !== passData.confirm) return setPassChangeError('Passwords do not match.');
    if (updatePassword) {
      // Fix: Use the correct prop name 'updatePassword' instead of the non-existent 'updateUserPassword'
      await updatePassword(user.id, passData.new);
      setPassData({ current: '', new: '', confirm: '' });
      alert("Security credentials updated successfully.");
    }
  };

  const executeApkDownload = () => {
    setIsDownloading(true);
    setShowApkWarning(false);
    // Simulate a production build fetch
    setTimeout(() => {
      try {
        // NOTE: A real APK (15MB+) cannot be generated dynamically in a browser via JS.
        // It must be compiled in Android Studio (Capacitor/Cordova).
        // We provide a larger mock file to simulate the download path.
        const dummyData = new Uint8Array(1024 * 100); // 100KB Mock
        for(let i=0; i<dummyData.length; i++) dummyData[i] = Math.floor(Math.random() * 256);
        
        const blob = new Blob([dummyData], { type: 'application/vnd.android.package-archive' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'WorkManager_v3.4_Prototype.apk');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        setIsDownloading(false);
        setShowInstallGuide(true);
      } catch (err) {
        alert("Download blocked. Please check browser permissions.");
        setIsDownloading(false);
      }
    }, 2000);
  };

  const handlePwaInstall = () => {
    alert("BEST METHOD FOR WEB-DEPLOYMENT:\n\n1. Open Chrome Menu (⋮)\n2. Click 'Add to Home Screen' or 'Install App'\n\nThis creates a real app icon on your phone without the 'Parse Error' of small APK files.");
  };

  const workSummary = useMemo(() => {
    return relevantWorkLogs.reduce((acc: any, log) => {
      const existing = acc.find((a: any) => a.name === log.workType);
      if (existing) existing.value += log.meters;
      else acc.push({ name: log.workType, value: log.meters });
      return acc;
    }, []);
  }, [relevantWorkLogs]);

  const stats = [
    { label: isSuper ? 'Enterprises' : 'Workforce', value: isSuper ? state.companies.length : relevantUsers.length, color: 'text-blue-600' },
    { label: 'Work Volume', value: relevantWorkLogs.reduce((sum, l) => sum + l.meters, 0), color: 'text-green-600' },
    { label: 'Pending Auth', value: relevantRequests.filter(r => r.status === 'PENDING').length, color: 'text-orange-600' },
    { label: 'Supervisors', value: supervisors.length, color: 'text-purple-600' },
  ];

  const runAiAudit = async () => {
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Audit site productivity: ${company?.name}. Total workforce: ${relevantUsers.length}. Work logged: ${JSON.stringify(workSummary)}. Suggest 3 efficiency improvements.`
      });
      // Fix: Directly access the .text property of GenerateContentResponse
      setAiReport(response.text || "Audit report could not be generated.");
    } catch (e) {
      setAiReport("Audit currently unavailable.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white px-8 py-5 rounded-3xl shadow-sm border border-gray-100 min-w-[180px]">
            <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-2xl font-black tracking-tighter ${stat.color}`}>{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Profile */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
           <h3 className="text-lg font-black text-blue-900 uppercase tracking-tighter mb-8">Security Configuration</h3>
           <form onSubmit={handlePasswordChange} className="space-y-4">
              <input type="password" placeholder="Current Password" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={passData.current} onChange={e => setPassData({...passData, current: e.target.value})} required />
              <div className="grid grid-cols-2 gap-4">
                 <input type="password" placeholder="New" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={passData.new} onChange={e => setPassData({...passData, new: e.target.value})} required />
                 <input type="password" placeholder="Confirm" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm" value={passData.confirm} onChange={e => setPassData({...passData, confirm: e.target.value})} required />
              </div>
              {passChangeError && <p className="text-red-500 text-[10px] font-bold uppercase ml-1">{passChangeError}</p>}
              <button type="submit" className="w-full bg-blue-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-[0.98] transition-all">Update Credentials</button>
           </form>
        </div>

        {/* Android Deployment Card */}
        <div className="bg-gradient-to-br from-[#0D47A1] to-[#0a3a82] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[320px]">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[50px] rounded-full -mr-16 -mt-16"></div>
           <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                 <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                    <ICONS.Android className="w-8 h-8 text-white" />
                 </div>
                 <div className="text-right">
                    <p className="text-blue-200 text-[8px] font-black uppercase tracking-widest">Build Status</p>
                    <p className="text-green-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-end">
                       <span className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></span>
                       Cloud Ready
                    </p>
                 </div>
              </div>
              
              <div className="mb-6">
                 <h3 className="text-xl font-black text-white uppercase tracking-tight">Android Distribution</h3>
                 <p className="text-blue-100/60 text-[10px] font-bold uppercase tracking-widest mt-1">Version 3.4.0 • Build ID: WM-{Date.now().toString().slice(-6)}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                 <div className="space-y-3">
                    <button 
                       onClick={() => setShowApkWarning(true)}
                       disabled={isDownloading}
                       className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2"
                    >
                       {isDownloading ? (
                         <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                       ) : (
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                       )}
                       <span>{isDownloading ? 'Building...' : 'Download APK'}</span>
                    </button>
                    
                    <button 
                       onClick={handlePwaInstall}
                       className="w-full bg-white text-blue-900 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2"
                    >
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                       <span>Direct Home App</span>
                    </button>

                    <button 
                       onClick={() => setShowTroubleshooter(true)}
                       className="w-full text-blue-200 text-[9px] font-black uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center space-x-1"
                    >
                       <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                       <span>"Parse Error" or Install Fail?</span>
                    </button>
                 </div>
                 
                 <div className="hidden sm:flex flex-col items-center">
                    <div className="bg-white p-2 rounded-2xl shadow-xl rotate-3">
                       <div className="w-20 h-20 bg-gray-100 flex flex-wrap p-1">
                          {Array.from({ length: 49 }).map((_, i) => (
                             <div key={i} className={`w-[11.1px] h-[11.1px] ${Math.random() > 0.6 ? 'bg-black' : 'bg-transparent'}`}></div>
                          ))}
                       </div>
                    </div>
                    <p className="text-[7px] font-black text-center mt-2 text-blue-200 uppercase tracking-widest">Scan to Open Web Console</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Intelligence Audit Card */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-8 text-white">
               <h3 className="text-xl font-black uppercase tracking-tight">Intelligence Audit</h3>
               <button onClick={runAiAudit} disabled={isAiLoading} className="bg-purple-600 px-6 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:bg-purple-700 transition-all active:scale-95">{isAiLoading ? 'Analysing...' : 'Execute Audit'}</button>
            </div>
            {aiReport ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 animate-in fade-in duration-500"><p className="text-slate-300 text-xs font-medium leading-relaxed whitespace-pre-wrap">{aiReport}</p></div>
            ) : (
              <div className="border-2 border-dashed border-slate-700 rounded-2xl py-12 text-center text-slate-500 font-black text-[10px] uppercase tracking-widest">Awaiting Command...</div>
            )}
          </div>
      </div>

      {/* Analytics Chart */}
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 min-w-0">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-6 text-blue-900">Workforce Output Analysis</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workSummary}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} font-weight="bold" stroke="#94a3b8" />
                <YAxis fontSize={10} font-weight="bold" stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                   {workSummary.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
      </div>

      {/* Modal: APK Warning / Why 0.04MB fails */}
      {showApkWarning && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in zoom-in-95 duration-300">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg p-12 relative">
              <div className="text-center">
                 <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                   <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 </div>
                 <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Android APK Info</h3>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 mb-8">Please Read Carefully (हिन्दी & English)</p>
                 
                 <div className="space-y-4 text-left mb-10">
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                       <p className="text-xs font-black text-blue-900 uppercase">Binary Requirement</p>
                       <p className="text-[11px] text-blue-700 mt-1">Ek real Android APK (15MB+) ko local machine par 'Android Studio' se compile karna padta hai. Browser se sirf prototype download hota hai.</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                       <p className="text-xs font-black text-orange-900 uppercase">PWA is Recommended</p>
                       <p className="text-[11px] text-orange-700 mt-1">Bina 'Parse Error' ke app chalane ke liye <b>PWA (Add to Home)</b> button use karein. Ye 100% stable hai.</p>
                    </div>
                 </div>

                 <div className="flex flex-col gap-3">
                    <button onClick={executeApkDownload} className="w-full bg-blue-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest">Download Prototype APK</button>
                    <button onClick={() => { setShowApkWarning(false); handlePwaInstall(); }} className="w-full bg-green-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest">Use PWA Method (Better)</button>
                    <button onClick={() => setShowApkWarning(false)} className="w-full text-gray-400 py-3 font-black uppercase text-[9px]">Cancel</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Modal: Troubleshooter */}
      {showTroubleshooter && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in zoom-in-95 duration-300">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg p-12 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
              <button onClick={() => setShowTroubleshooter(false)} className="absolute top-8 right-8 text-gray-300 hover:text-red-500 transition-colors">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter mb-2">Installation Fixer</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-10">Solving 'Parse Error' & Small File Issues</p>

              <div className="space-y-6">
                 <div className="flex gap-4 p-5 bg-red-50 border border-red-100 rounded-3xl">
                    <div className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center font-black shrink-0">!</div>
                    <div>
                       <p className="text-xs font-black text-red-900 uppercase">Parse Error (Kyu Aata hai?)</p>
                       <p className="text-[11px] text-red-800 mt-1">Jab APK file incomplete ho (like 0.04mb), toh Android use nahi samajh paata. Ye tab hota hai jab aap browser mockup ko real app ki tarah treat karte hain.</p>
                    </div>
                 </div>

                 <div className="flex gap-4 p-5 bg-blue-50 border border-blue-100 rounded-3xl">
                    <div className="w-10 h-10 bg-blue-900 text-white rounded-xl flex items-center justify-center font-black shrink-0">1</div>
                    <div>
                       <p className="text-xs font-black text-blue-900 uppercase">Solution: PWA</p>
                       <p className="text-[11px] text-blue-800 mt-1">Phone ke Chrome browser me 3-dots pe jaake 'Add to Home Screen' karein. Ye bilkul App jaisa hi hai.</p>
                    </div>
                 </div>

                 <div className="flex gap-4 p-5 bg-orange-50 border border-orange-100 rounded-3xl">
                    <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center font-black shrink-0">2</div>
                    <div>
                       <p className="text-xs font-black text-orange-900 uppercase">Production APK</p>
                       <p className="text-[11px] text-orange-800 mt-1">Asli 15MB APK ke liye humein code ko 'Android Studio' me daal kar build karna hoga. Iske liye 'Backend Ops' ka guide padhein.</p>
                    </div>
                 </div>
              </div>

              <div className="mt-10">
                 <button onClick={() => setShowTroubleshooter(false)} className="w-full bg-blue-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Theek Hai, PWA Use Karte hain</button>
              </div>
           </div>
        </div>
      )}

      {/* Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 relative">
            <button onClick={() => setShowInstallGuide(false)} className="absolute top-6 right-6 text-gray-300 hover:text-red-500 transition-colors">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ICONS.Android className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Installation Help</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 mb-8">Steps for Mobile Testing</p>
              
              <div className="space-y-6 text-left">
                {[
                  { step: 1, title: 'Verify Source', desc: 'Enable "Install Unknown Apps" in your Android Settings for Chrome.' },
                  { step: 2, title: 'Check File Size', desc: 'A real APK should be >15MB. If you see <1MB, it is a prototype mock.' },
                  { step: 3, title: 'Use Home Screen', desc: 'For instant deployment, use "Add to Home Screen" instead of APK.' }
                ].map(s => (
                  <div key={s.step} className="flex space-x-4">
                    <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center font-black text-xs shrink-0">{s.step}</div>
                    <div>
                      <p className="text-sm font-black text-gray-800 uppercase leading-none">{s.title}</p>
                      <p className="text-xs text-gray-500 font-medium mt-1">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={() => setShowInstallGuide(false)}
                className="w-full bg-blue-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl mt-10"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
