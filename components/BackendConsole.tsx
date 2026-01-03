
import React, { useState } from 'react';
import { AppState } from '../types';

interface Props {
  state: AppState;
}

const BackendConsole: React.FC<Props> = ({ state }) => {
  const [activeView, setActiveView] = useState<'status' | 'json' | 'sql' | 'apk'>('status');

  const SQL_SCHEMA = `
-- PRAGATI CLOUD INFRASTRUCTURE SCHEMA
-- Generated for multi-tenant deployment

CREATE TABLE enterprises (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  subscription_id VARCHAR(50),
  expiry TIMESTAMP
);

CREATE TABLE telemetry_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  event_type VARCHAR(20),
  ts TIMESTAMP DEFAULT NOW()
);`;

  const APK_GUIDE = `
# PRODUCTION APK BUILD PIPELINE
1. npm run build
2. npx cap sync android
3. Open Android Studio
4. Generate Signed Bundle / APK
5. Upload to Pragati Distribution Center
  `;

  const stats = [
    { label: 'Enterprises', count: state.companies.length, color: 'text-blue-500' },
    { label: 'Workforce', count: state.users.length, color: 'text-green-500' },
    { label: 'Telemetry Nodes', count: state.attendance.length, color: 'text-orange-500' },
    { label: 'Project Assets', count: state.projects.length, color: 'text-purple-500' },
  ];

  return (
    <div className="bg-slate-950 min-h-[80vh] rounded-[3rem] overflow-hidden shadow-2xl border border-slate-800">
      {/* Sidebar / Header */}
      <div className="flex flex-col md:flex-row h-full">
        <aside className="w-full md:w-64 bg-slate-900/50 p-8 border-r border-slate-800/50">
          <div className="mb-10">
            <h2 className="text-white font-black uppercase tracking-tighter text-xl">Backend Ops</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Infrastructure Console v{state.version}</p>
          </div>
          <nav className="space-y-2">
            {[
              { id: 'status', label: 'System Status' },
              { id: 'json', label: 'Raw Data Explorer' },
              { id: 'sql', label: 'SQL Migrations' },
              { id: 'apk', label: 'Build Pipeline' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={`w-full text-left px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeView === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-10 overflow-y-auto max-h-[80vh]">
          {activeView === 'status' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map(s => (
                  <div key={s.label} className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2">{s.label}</p>
                    <p className={`text-3xl font-black tracking-tighter ${s.color}`}>{s.count}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800">
                <h3 className="text-white font-black uppercase tracking-tight mb-6">Environment Health</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Database Engine', status: 'Optimal', val: 'IndexedDB / LocalStorage' },
                    { label: 'Multi-Tenancy', status: 'Secured', val: 'UID Segmentation Active' },
                    { label: 'Geofencing Service', status: 'Operational', val: 'Native GPS API' },
                    { label: 'Payroll Engine', status: 'Idle', val: 'Automated 30-Day Cycle' }
                  ].map(h => (
                    <div key={h.label} className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800/50">
                      <div>
                        <p className="text-white text-xs font-black uppercase tracking-tight">{h.label}</p>
                        <p className="text-[9px] text-slate-500 uppercase font-bold mt-1">{h.val}</p>
                      </div>
                      <span className="px-3 py-1 bg-green-900/20 text-green-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-green-900/30">{h.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeView === 'json' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-black uppercase tracking-tight">System State Dump</h3>
                <button 
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(state, null, 2))}
                  className="px-4 py-2 bg-slate-800 text-slate-400 rounded-lg text-[9px] font-black uppercase hover:text-white"
                >
                  Copy JSON
                </button>
              </div>
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 overflow-x-auto">
                <pre className="text-[11px] font-mono text-blue-400 leading-relaxed">
                  {JSON.stringify(state, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {activeView === 'sql' && (
            <div className="animate-in fade-in duration-500">
               <h3 className="text-white font-black uppercase tracking-tight mb-6">Data Migration Hub</h3>
               <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800">
                 <pre className="text-xs font-mono text-slate-400 whitespace-pre-wrap">{SQL_SCHEMA}</pre>
               </div>
            </div>
          )}

          {activeView === 'apk' && (
            <div className="animate-in fade-in duration-500">
               <h3 className="text-white font-black uppercase tracking-tight mb-6">APK Compilation Registry</h3>
               <div className="bg-slate-900 p-8 rounded-2xl border border-orange-900/20">
                 <pre className="text-xs font-mono text-orange-200 whitespace-pre-wrap">{APK_GUIDE}</pre>
               </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default BackendConsole;
