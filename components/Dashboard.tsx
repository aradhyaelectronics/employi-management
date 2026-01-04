
import React, { useState, useMemo } from 'react';
import { User, AppState, UserRole, RequestStatus } from '../types';
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
  const isAdmin = user.role === UserRole.ADMIN;
  const isSupervisor = user.role === UserRole.SUPERVISOR;
  const isEmployee = user.role === UserRole.EMPLOYEE;
  
  const company = state.companies.find(c => c.id === user.companyId);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Stats calculation
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

  const runAiAudit = async () => {
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = isSuper ? "Analyze global enterprise trends and server health." : `Analyze output for ${company?.name}. Sugest 3 improvements for workforce productivity.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAiReport(response.text || "Audit data currently processing.");
    } catch (e) {
      setAiReport("Audit temporarily unavailable via cloud sync.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white px-6 py-5 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-center">
            <p className="text-gray-400 text-[8px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-br from-blue-900 to-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
           <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 blur-[60px] rounded-full -mb-10 -mr-10"></div>
           <div className="relative z-10">
              <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em] mb-4">Personnel Identity: {user.id}</p>
              <h2 className="text-4xl font-black tracking-tighter mb-2">Hello, {user.name.split(' ')[0]}</h2>
              <p className="text-sm text-slate-400 font-bold max-w-xs leading-relaxed">
                {isEmployee ? "Your current work cycle is active. Punch-in at designated site to log production." : 
                 isAdmin ? "Enterprise cluster is stable. Global productivity is at 88% capacity." : 
                 isSuper ? "Pragati Root Console is live. All tenant nodes are synchronized." : 
                 "Supervisor dashboard active. Review team status in the Presence tab."}
              </p>
              
              <div className="flex gap-3 mt-10">
                <button onClick={() => alert("APK Download Initialized...")} className="bg-orange-600 px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl flex items-center space-x-2">
                  <ICONS.Android className="w-4 h-4" />
                  <span>Update APK</span>
                </button>
                <button onClick={runAiAudit} className="bg-white/10 px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest border border-white/10">
                  {isAiLoading ? "Processing..." : "Run AI Audit"}
                </button>
              </div>
           </div>
        </div>

        {/* Security / PIN Card */}
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between">
           <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">Security Access</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update your 4-digit terminal PIN</p>
           </div>
           
           <div className="flex items-center space-x-4 my-8">
              <div className="flex space-x-2">
                {[1, 2, 3, 4].map(i => <div key={i} className="w-3 h-3 bg-blue-100 rounded-full"></div>)}
              </div>
              <p className="text-[9px] font-black text-blue-600 uppercase">PIN Protection Active</p>
           </div>

           <button onClick={() => alert("Please contact Administrator to reset PIN logic.")} className="w-full bg-slate-100 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-200 transition-all">Change Security PIN</button>
        </div>
      </div>

      {/* AI Audit View */}
      {aiReport && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">Cloud Intelligence Audit</h3>
              <button onClick={() => setAiReport(null)} className="text-slate-500 hover:text-white">Close</button>
           </div>
           <p className="text-sm font-medium leading-relaxed text-slate-300 italic">"{aiReport}"</p>
        </div>
      )}

      {/* Conditional Dashboard Views */}
      {isEmployee && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
           <h3 className="text-lg font-black text-blue-900 uppercase tracking-tighter mb-8">My Production Ledger</h3>
           <div className="space-y-4">
              {state.workLogs.filter(l => l.userId === user.id).slice(-5).reverse().map(log => (
                <div key={log.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border">
                   <div>
                      <p className="text-xs font-black text-slate-800 uppercase">{log.workType}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{log.date}</p>
                   </div>
                   <p className="text-lg font-black text-green-600">{log.meters} Mtr</p>
                </div>
              ))}
              {state.workLogs.filter(l => l.userId === user.id).length === 0 && (
                <p className="text-center py-10 text-gray-300 font-bold text-[10px] uppercase tracking-widest">No production logs recorded yet.</p>
              )}
           </div>
        </div>
      )}

      {isAdmin && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
           <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-lg font-black text-blue-900 uppercase tracking-tighter">Enterprise Velocity</h3>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-1 rounded-full uppercase">Real-Time</span>
           </div>
           <div className="h-64 p-8">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={state.workLogs.filter(l => l.companyId === user.companyId).slice(-10)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" fontSize={8} />
                    <YAxis fontSize={8} />
                    <Tooltip />
                    <Bar dataKey="meters" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
