
import React, { useState, useMemo } from 'react';
import { User, AppState, UserRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { GoogleGenAI } from "@google/genai";

interface Props {
  user: User;
  state: AppState;
  updatePassword?: (id: string, password: string) => Promise<void>;
}

const Dashboard: React.FC<Props> = ({ user, state, updatePassword }) => {
  const isSuper = user.role === UserRole.SUPER_ADMIN;
  const isAdmin = user.role === UserRole.ADMIN;
  const isSupervisor = user.role === UserRole.SUPERVISOR;
  const company = state.companies.find(c => c.id === user.companyId);
  
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Password change state
  const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });
  const [passChangeSuccess, setPassChangeSuccess] = useState(false);
  const [passChangeError, setPassChangeError] = useState('');
  
  const relevantWorkLogs = useMemo(() => isSuper ? state.workLogs : state.workLogs.filter(l => l.companyId === user.companyId), [state.workLogs, user.companyId, isSuper]);
  const relevantUsers = useMemo(() => isSuper ? state.users : state.users.filter(u => u.companyId === user.companyId), [state.users, user.companyId, isSuper]);
  const relevantRequests = useMemo(() => isSuper ? state.requests : state.requests.filter(r => r.companyId === user.companyId), [state.requests, user.companyId, isSuper]);
  
  const supervisors = useMemo(() => relevantUsers.filter(u => u.role === UserRole.SUPERVISOR), [relevantUsers]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeError('');
    setPassChangeSuccess(false);

    if (passData.current !== user.password) {
      setPassChangeError('The current password entered is incorrect.');
      return;
    }
    if (passData.new.length < 6) {
      setPassChangeError('New password must be at least 6 characters.');
      return;
    }
    if (passData.new !== passData.confirm) {
      setPassChangeError('New password and confirmation do not match.');
      return;
    }

    try {
      if (updatePassword) {
        await updatePassword(user.id, passData.new);
        setPassChangeSuccess(true);
        setPassData({ current: '', new: '', confirm: '' });
        alert("Security Credentials Updated Successfully!");
      }
    } catch (err) {
      setPassChangeError('System failed to update credentials.');
    }
  };

  const supervisorMetrics = useMemo(() => {
    return supervisors.map(sup => {
      const myTeam = relevantUsers.filter(u => u.supervisorId === sup.id);
      const teamLogs = relevantWorkLogs.filter(log => myTeam.some(tm => tm.id === log.userId));
      const totalMeters = teamLogs.reduce((sum, l) => sum + l.meters, 0);
      return {
        id: sup.id,
        name: sup.name,
        teamSize: myTeam.length,
        output: totalMeters
      };
    });
  }, [supervisors, relevantUsers, relevantWorkLogs]);

  const workSummary = relevantWorkLogs.reduce((acc: any, log) => {
    const existing = acc.find((a: any) => a.name === log.cableType);
    if (existing) existing.value += log.meters;
    else acc.push({ name: log.cableType, value: log.meters });
    return acc;
  }, []);

  const runAiAudit = async () => {
    if (isAiLoading) return;
    setIsAiLoading(true);
    setAiReport(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Act as the Smart Backend Auditor for Pragati Enterprises. 
      Analyze this system data:
      Enterprise: ${company?.name || 'Multi-Tenant System'}
      Total Workforce: ${relevantUsers.length}
      Supervisors Reporting to Admin: ${supervisors.length}
      Supervisor Metrics: ${JSON.stringify(supervisorMetrics)}
      
      Provide a concise 3-point report:
      1. Overall Productivity Score (0-100).
      2. Managerial Efficiency (Which supervisor's team is most active?)
      3. Project Risk (Are there bottlenecks in the hierarchy?)
      Keep it professional and data-driven.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      setAiReport(response.text || "Insight generation paused.");
    } catch (error) {
      console.error("AI Audit failed:", error);
      setAiReport("Audit engine unavailable.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const stats = [
    { label: isSuper ? 'Enterprises' : 'Workforce', value: isSuper ? state.companies.length : relevantUsers.length, color: 'text-blue-600' },
    { label: 'Cable Laid (m)', value: relevantWorkLogs.reduce((sum, l) => sum + l.meters, 0), color: 'text-green-600' },
    { label: 'Pending Auth', value: relevantRequests.filter(r => r.status === 'PENDING').length, color: 'text-orange-600' },
    { label: 'Supervisors', value: supervisors.length, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
        <div className="flex flex-wrap gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white px-8 py-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center min-w-[180px]">
              <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
              <p className={`text-2xl font-black tracking-tighter ${stat.color}`}>{stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Profile & Security Settings Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
           <div className="flex justify-between items-center mb-8">
              <div>
                 <h3 className="text-lg font-black text-blue-900 uppercase tracking-tighter">Security & Profile</h3>
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Manage Your Access Credentials</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
           </div>

           <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                 <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Current Password</label>
                 <input 
                  type="password" 
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/10" 
                  value={passData.current} 
                  onChange={e => setPassData({...passData, current: e.target.value})} 
                  required 
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">New Password</label>
                    <input 
                      type="password" 
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/10" 
                      value={passData.new} 
                      onChange={e => setPassData({...passData, new: e.target.value})} 
                      required 
                    />
                 </div>
                 <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Confirm New Password</label>
                    <input 
                      type="password" 
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/10" 
                      value={passData.confirm} 
                      onChange={e => setPassData({...passData, confirm: e.target.value})} 
                      required 
                    />
                 </div>
              </div>

              {passChangeError && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{passChangeError}</p>}
              {passChangeSuccess && <p className="text-[10px] text-green-600 font-bold uppercase tracking-tight">Password updated successfully.</p>}

              <button 
                type="submit" 
                className="w-full bg-blue-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100 hover:bg-black transition-all active:scale-[0.98]"
              >
                Update My Password
              </button>
           </form>

           <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-between">
              <div>
                 <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Logged in as</p>
                 <p className="text-sm font-black text-gray-800 uppercase leading-none mt-1">{user.name}</p>
                 <p className="text-[9px] font-bold text-blue-500 uppercase tracking-tight mt-1">{user.role}</p>
              </div>
              <div className="text-right">
                 <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">System Access</p>
                 <p className="text-sm font-black text-green-600 uppercase leading-none mt-1">Verified Device</p>
              </div>
           </div>
        </div>

        {/* Live Feed / Activity */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden min-w-0">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-6 text-blue-900">Live Operation Feed</h3>
          <div className="space-y-4">
            {relevantWorkLogs.slice(-5).reverse().map((log, idx) => {
              const u = state.users.find(u => u.id === log.userId);
              return (
                <div key={idx} className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-2xl transition group border-l-4 border-transparent hover:border-blue-500">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs uppercase">{u?.name.charAt(0)}</div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-black text-gray-800 truncate">{u?.name} deployed {log.meters}m</p>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{log.installationDate} • {log.cableType}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
             <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-black text-blue-900 uppercase tracking-tighter">Middle Management Performance</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Supervisors reporting to you</p>
                </div>
             </div>
             <div className="space-y-4">
                {supervisorMetrics.map(sup => (
                  <div key={sup.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <p className="text-xs font-black text-gray-800 uppercase">{sup.name}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Manages: {sup.teamSize} Personnel</p>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-black text-blue-600">{sup.output.toLocaleString()}m</p>
                       <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Team Total</p>
                    </div>
                  </div>
                ))}
                {supervisors.length === 0 && <p className="text-center py-6 text-gray-300 font-black uppercase text-[10px] italic">No Supervisors Enrolled</p>}
             </div>
          </div>
          
          <div className="bg-slate-900 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-black text-white uppercase tracking-tight">Intelligence Audit</h3>
                 <button onClick={runAiAudit} disabled={isAiLoading} className={`px-6 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${isAiLoading ? 'bg-slate-800 text-slate-500' : 'bg-purple-600 text-white hover:bg-purple-500 shadow-xl'}`}>{isAiLoading ? 'Analysing...' : 'Execute'}</button>
              </div>
              {aiReport ? (
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6"><p className="text-slate-300 text-xs font-medium leading-relaxed whitespace-pre-wrap">{aiReport}</p></div>
              ) : (
                <div className="border-2 border-dashed border-slate-700 rounded-2xl py-12 text-center"><p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Awaiting Command...</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 min-w-0">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-6 text-blue-900">Output Analysis</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <BarChart data={workSummary}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} fontWeight="bold" stroke="#94a3b8" />
                <YAxis fontSize={10} fontWeight="bold" stroke="#94a3b8" />
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
    </div>
  );
};

export default Dashboard;
