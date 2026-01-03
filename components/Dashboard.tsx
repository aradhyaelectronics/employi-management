
import React, { useState } from 'react';
import { User, AppState, UserRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { GoogleGenAI } from "@google/genai";

interface Props {
  user: User;
  state: AppState;
}

const Dashboard: React.FC<Props> = ({ user, state }) => {
  const isSuper = user.role === UserRole.SUPER_ADMIN;
  const isAdmin = user.role === UserRole.ADMIN;
  const company = state.companies.find(c => c.id === user.companyId);
  const activePlan = state.subscriptionPlans.find(p => p.id === company?.subscriptionPlanId);
  
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const relevantWorkLogs = isSuper ? state.workLogs : state.workLogs.filter(l => l.companyId === user.companyId);
  const relevantUsers = isSuper ? state.users : state.users.filter(u => u.companyId === user.companyId);
  const relevantRequests = isSuper ? state.requests : state.requests.filter(r => r.companyId === user.companyId);
  
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
      Recent Logs: ${JSON.stringify(relevantWorkLogs.slice(-10))}
      
      Provide a concise 3-point report:
      1. Productivity Score (0-100) based on cable logs vs workforce size.
      2. Operational Flag (Is someone punching in without GPS?)
      3. Project Risk (Are there tasks nearing deadline with 0 progress?)
      Keep it professional, data-driven, and brief.`;

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
    { 
      label: isSuper ? 'Total Enterprises' : 'Total Workforce', 
      value: isSuper ? state.companies.length : relevantUsers.length, 
      color: isSuper ? 'text-purple-600' : 'text-blue-600' 
    },
    { 
      label: isSuper ? 'Global Cable (m)' : 'Cable Laid (m)', 
      value: relevantWorkLogs.reduce((sum, l) => sum + l.meters, 0), 
      color: 'text-green-600' 
    },
    { 
      label: 'Pending Requests', 
      value: relevantRequests.filter(r => r.status === 'PENDING').length, 
      color: 'text-orange-600' 
    },
    { 
      label: isSuper ? 'Global Logs' : 'Work Logs', 
      value: relevantWorkLogs.length, 
      color: 'text-purple-600' 
    },
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
        {!isSuper && activePlan && (
           <div className="bg-blue-600 text-white px-6 py-4 rounded-3xl shadow-xl shadow-blue-100 flex items-center space-x-4">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41m5.96 5.96a14.926 14.926 0 01-5.84 1.2l-3.1-3.1a14.926 14.926 0 011.2-5.84m5.74 7.74l3.5 3.5m-7.24-7.24L5.5 5.5" /></svg>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Active Tier</p>
                <p className="text-xs font-black uppercase tracking-tighter">{activePlan.name}</p>
              </div>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
               <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Intelligence Audit</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">AI Data Correlation Engine</p>
               </div>
               <button 
                onClick={runAiAudit}
                disabled={isAiLoading}
                className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center space-x-2 ${isAiLoading ? 'bg-slate-800 text-slate-500' : 'bg-purple-600 text-white hover:bg-purple-500 shadow-xl'}`}
               >
                 {isAiLoading ? 'Analyzing...' : 'Execute Audit'}
               </button>
            </div>

            {aiReport ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 animate-in fade-in duration-500">
                <p className="text-slate-300 text-sm font-medium leading-relaxed whitespace-pre-wrap">{aiReport}</p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-700 rounded-2xl py-12 text-center">
                 <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Awaiting Command...</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
           <h3 className="text-lg font-black text-blue-900 uppercase tracking-tighter mb-6">System Health</h3>
           <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                 <p className="text-[10px] font-black uppercase text-gray-400">Geofence Nodes</p>
                 <span className={`text-[10px] font-black uppercase ${state.sites.filter(s => s.companyId === user.companyId).length > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {state.sites.filter(s => s.companyId === user.companyId).length > 0 ? 'ACTIVE' : 'DISABLED'}
                 </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                 <p className="text-[10px] font-black uppercase text-gray-400">Payroll Run</p>
                 <span className="text-[10px] font-black uppercase text-blue-600">MONTHLY</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                 <p className="text-[10px] font-black uppercase text-gray-400">Database Engine</p>
                 <span className="text-[10px] font-black uppercase text-gray-800">SYNCED</span>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 min-w-0">
          <h3 className={`text-lg font-black uppercase tracking-tighter mb-6 ${isSuper ? 'text-purple-900' : 'text-blue-900'}`}>
            Progress Analysis
          </h3>
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

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden min-w-0">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-6 text-blue-900">Live Operation Feed</h3>
          <div className="space-y-4">
            {relevantWorkLogs.slice(-5).reverse().map((log, idx) => {
              const u = state.users.find(u => u.id === log.userId);
              return (
                <div key={idx} className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-2xl transition group">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">
                    {u?.name.charAt(0)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-black text-gray-800 truncate">{u?.name} deployed {log.meters}m</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{log.installationDate}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
