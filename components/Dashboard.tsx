
import React, { useState, useMemo } from 'react';
import { User, AppState, UserRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GoogleGenAI } from "@google/genai";
// Fixed: Added Logo to the imported components from constants
import { ICONS, Logo } from '../constants';

interface Props {
  user: User;
  state: AppState;
  updatePassword?: (id: string, password: string) => Promise<void>;
  getAiSystemContext: (companyId?: string) => any;
}

const Dashboard: React.FC<Props> = ({ user, state, getAiSystemContext }) => {
  const isSuper = user.role === UserRole.SUPER_ADMIN;
  const isAdmin = user.role === UserRole.ADMIN;
  const isEmployee = user.role === UserRole.EMPLOYEE;
  
  const [aiReport, setAiReport] = useState<{ text: string, sources?: any[] } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const stats = useMemo(() => {
    if (isSuper) {
      return [
        { label: 'Enterprises', value: state.companies.length, color: 'text-blue-600' },
        { label: 'Total Personnel', value: state.users.length, color: 'text-green-600' },
        { label: 'Global Traffic', value: state.workLogs.length, color: 'text-orange-600' },
        { label: 'Blocked Nodes', value: state.companies.filter(c => c.status === 'BLOCKED').length, color: 'text-red-600' },
      ];
    }
    
    const companyUsers = state.users.filter(u => u.companyId === user.companyId);
    const companyWork = state.workLogs.filter(l => l.companyId === user.companyId);
    
    if (isAdmin) {
      return [
        { label: 'Workforce', value: companyUsers.length, color: 'text-blue-600' },
        { label: 'Monthly Output', value: companyWork.reduce((sum, l) => sum + l.meters, 0), color: 'text-green-600' },
        { label: 'Pending Approval', value: state.requests.filter(r => r.companyId === user.companyId && r.status === 'PENDING').length, color: 'text-orange-600' },
        { label: 'Active Sites', value: state.sites.filter(s => s.companyId === user.companyId).length, color: 'text-purple-600' },
      ];
    }

    if (isEmployee) {
      const myWork = state.workLogs.filter(l => l.userId === user.id);
      const myEarnings = state.salarySlips.filter(s => s.userId === user.id).reduce((sum, s) => sum + s.totalAmount, 0);
      return [
        { label: 'My Output (Mtr)', value: myWork.reduce((sum, l) => sum + l.meters, 0), color: 'text-blue-600' },
        { label: 'Total Earnings', value: `₹${myEarnings.toLocaleString()}`, color: 'text-green-600' },
        { label: 'Approved Advance', value: `₹${state.requests.filter(r => r.userId === user.id && r.status === 'APPROVED').reduce((sum, r) => sum + r.amount, 0)}`, color: 'text-orange-600' },
        { label: 'Pending Requests', value: state.requests.filter(r => r.userId === user.id && r.status === 'PENDING').length, color: 'text-purple-600' },
      ];
    }

    return [];
  }, [state, user, isSuper, isAdmin, isEmployee]);

  const runAiIntelligenceAudit = async () => {
    setIsAiLoading(true);
    try {
      const context = getAiSystemContext(isSuper ? undefined : user.companyId);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        System Context for ${isSuper ? 'Master Platform' : 'Enterprise Node'}:
        - Total Workforce: ${context.totalEmployees}
        - Production: ${context.totalProductionMeters} meters
        - Active Sites: ${context.activeSites}
        - Avg Shift: ${context.averageShiftHours.toFixed(2)}h
        - Recent Logs: ${context.recentActivity.join(', ')}

        Analyze the above system telemetry. Provide 3 high-impact strategic observations. 
        Also, use Google Search to suggest 1 relevant industry trend (e.g., modern splicing techniques or workforce safety standards) 
        that could benefit this specific enterprise's performance.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      setAiReport({
        text: response.text || "No insights generated at this time.",
        sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      });
    } catch (e) {
      setAiReport({ text: "AI Intelligence link offline. Check cloud authorization." });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white px-6 py-5 rounded-[2rem] shadow-sm border border-gray-100">
            <p className="text-gray-400 text-[8px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-[#0D47A1] to-[#1a237e] p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <Logo iconClassName="w-32 h-32" showText={false} light={true} />
           </div>
           <div className="relative z-10">
              <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.4em] mb-4">Node Identity: {user.id}</p>
              <h2 className="text-4xl font-black tracking-tighter mb-2">Hello, {user.name.split(' ')[0]}</h2>
              <p className="text-sm text-blue-100/70 font-bold max-w-xs leading-relaxed">
                {isEmployee ? "Your production cycle is synchronized. Site geofencing active." : 
                 isAdmin ? "Enterprise cluster status: OPTIMAL. All field telemetry is live." : 
                 "System Root Access authorized. All multi-tenant isolation protocols are verified."}
              </p>
              
              <div className="flex gap-3 mt-10">
                <button onClick={runAiIntelligenceAudit} disabled={isAiLoading} className="bg-white text-[#0D47A1] px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center space-x-3 active:scale-95 transition-all">
                  {isAiLoading ? (
                    <div className="w-4 h-4 border-2 border-[#0D47A1]/20 border-t-[#0D47A1] rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
                  )}
                  <span>{isAiLoading ? "Processing..." : "AI Intelligence Audit"}</span>
                </button>
              </div>
           </div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between">
           <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">Security Access</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master Cloud Sync Status</p>
           </div>
           
           <div className="flex items-center space-x-6 my-8">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center relative">
                 <div className="absolute inset-0 bg-blue-400 opacity-20 animate-ping rounded-2xl"></div>
                 <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div>
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">TLS 1.3 Encryption</p>
                 <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-widest">End-to-End Tunnel Verified</p>
              </div>
           </div>

           <button onClick={() => alert("Administrative PIN Update Locked.")} className="w-full bg-slate-50 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 border border-slate-100">Update Terminal PIN</button>
        </div>
      </div>

      {aiReport && (
        <div className="bg-slate-900 p-8 md:p-12 rounded-[3rem] text-white shadow-3xl animate-in zoom-in-95 duration-500 relative border border-slate-800">
           <div className="absolute top-0 right-0 p-8">
              <button onClick={() => setAiReport(null)} className="p-2 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-xl">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
           </div>
           <div className="flex items-center space-x-4 mb-8">
              <div className="p-3 bg-blue-600 rounded-2xl">
                 <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0012 18.75c-1.03 0-1.9-.4-2.593-.913l-.547-.547z" /></svg>
              </div>
              <h3 className="text-sm font-black uppercase tracking-[0.4em] text-blue-400">Master Cloud Insights</h3>
           </div>
           <div className="prose prose-invert max-w-none mb-10">
              <p className="text-base text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">{aiReport.text}</p>
           </div>
           {aiReport.sources && aiReport.sources.length > 0 && (
             <div className="pt-8 border-t border-slate-800 flex flex-wrap gap-4">
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest w-full mb-2">Grounding Sources (Google Search):</p>
               {aiReport.sources.map((chunk, i) => chunk.web && (
                 <a key={i} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-slate-800/50 hover:bg-blue-600/20 text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-700 transition-all truncate max-w-[200px]">
                    {chunk.web.title || 'Referenced Standard'}
                 </a>
               ))}
             </div>
           )}
        </div>
      )}

      {isAdmin && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
           <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-lg font-black text-blue-900 uppercase tracking-tighter">Production Velocity</h3>
              <div className="flex space-x-2">
                 <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                 <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Telemetry Live</span>
              </div>
           </div>
           <div className="h-64 p-8">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={state.workLogs.filter(l => l.companyId === user.companyId).slice(-15)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" fontSize={8} axisLine={false} tickLine={false} />
                    <YAxis fontSize={8} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="meters" fill="#0D47A1" radius={[6, 6, 0, 0]} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
