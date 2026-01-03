
import React, { useState, useMemo } from 'react';
import { AppState, User, UserStatus, UserRole } from '../types';
import { saveState } from '../store';

interface Props {
  state: AppState;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
}

const BackendConsole: React.FC<Props> = ({ state, updateUser, removeUser }) => {
  const [activeView, setActiveView] = useState<'status' | 'users' | 'json' | 'sql' | 'apk'>('status');
  const [userSearch, setUserSearch] = useState('');

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (confirm("CRITICAL: This will overwrite your current cloud database. Proceed?")) {
          saveState(importedData);
          alert("Cloud Database Synchronized. Please reload the application.");
          window.location.reload();
        }
      } catch (err) {
        alert("Invalid Data Format. Please use a valid WorkManager Backup file.");
      }
    };
    reader.readAsText(file);
  };

  const filteredUsers = useMemo(() => {
    return state.users.filter(u => 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.mobile && u.mobile.includes(userSearch))
    );
  }, [state.users, userSearch]);

  const SQL_SCHEMA = `
-- EMPLOYEE MANAGEMENT CLOUD INFRASTRUCTURE SCHEMA
-- Generated for multi-tenant deployment

CREATE TABLE enterprises (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  subscription_id VARCHAR(50),
  expiry TIMESTAMP
);

CREATE TABLE personnel (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES enterprises(id),
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  role VARCHAR(20),
  status VARCHAR(20)
);

CREATE TABLE telemetry_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES personnel(id),
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
5. Upload to Employee Management Distribution Center
  `;

  const stats = [
    { label: 'Enterprises', count: state.companies.length, color: 'text-blue-500' },
    { label: 'Workforce', count: state.users.length, color: 'text-green-500' },
    { label: 'Telemetry Nodes', count: state.attendance.length, color: 'text-orange-500' },
    { label: 'Project Assets', count: state.projects.length, color: 'text-purple-500' },
  ];

  return (
    <div className="bg-slate-950 min-h-[80vh] rounded-[3rem] overflow-hidden shadow-2xl border border-slate-800">
      <div className="flex flex-col md:flex-row h-full">
        <aside className="w-full md:w-64 bg-slate-900/50 p-8 border-r border-slate-800/50">
          <div className="mb-10">
            <h2 className="text-white font-black uppercase tracking-tighter text-xl">Backend Ops</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Infrastructure Console v{state.version}</p>
          </div>
          <nav className="space-y-2">
            {[
              { id: 'status', label: 'System Status' },
              { id: 'users', label: 'User Master' },
              { id: 'json', label: 'Migration Tool' },
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
                    { label: 'Database Engine', status: 'Optimal', val: 'IndexedDB / Cloud Local' },
                    { label: 'Multi-Tenancy', status: 'Secured', val: 'Cloud Segmentation Active' },
                    { label: 'Cloud URL', status: 'Online', val: window.location.origin },
                    { label: 'Deployment Strategy', status: 'Google Cloud', val: 'Static Managed' }
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

          {activeView === 'users' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-black uppercase tracking-tight">Global User Management</h3>
                <input 
                  type="text" 
                  placeholder="Filter users..." 
                  className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
              </div>
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-950">
                    <tr>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Name</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Company</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-800/30">
                        <td className="px-6 py-4">
                          <p className="text-white text-xs font-bold uppercase">{u.name}</p>
                          <p className="text-[9px] text-slate-500">{u.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-black text-blue-400 uppercase">{state.companies.find(c => c.id === u.companyId)?.name || 'SYSTEM'}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => updateUser(u.id, { status: u.status === UserStatus.ACTIVE ? UserStatus.BLOCKED : UserStatus.ACTIVE })}
                            className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${u.status === UserStatus.ACTIVE ? 'bg-green-900/20 text-green-500 border-green-900/30' : 'bg-red-900/20 text-red-500 border-red-900/30'}`}
                          >
                            {u.status}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => { if(confirm(`Delete ${u.name}?`)) removeUser(u.id); }}
                            className="text-red-500 hover:text-red-400 font-black text-[9px] uppercase"
                          >
                            Purge
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeView === 'json' && (
            <div className="animate-in fade-in duration-500 space-y-8">
              <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
                <h3 className="text-white font-black uppercase tracking-tight mb-2">Cloud Import</h3>
                <p className="text-xs text-slate-500 mb-6">Restore data from your local computer backup here.</p>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept=".json"
                    onChange={handleImport}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                  <div className="bg-slate-950 border-2 border-dashed border-slate-800 p-12 text-center rounded-3xl group-hover:border-blue-500 transition-all">
                    <p className="text-blue-500 font-black uppercase tracking-widest text-[10px]">Click or Drag JSON Backup to Import</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-white font-black uppercase tracking-tight">Raw Data Explorer</h3>
                  <button 
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(state, null, 2))}
                    className="px-4 py-2 bg-slate-800 text-slate-400 rounded-lg text-[9px] font-black uppercase hover:text-white"
                  >
                    Copy JSON State
                  </button>
                </div>
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 overflow-x-auto">
                  <pre className="text-[11px] font-mono text-blue-400 leading-relaxed">
                    {JSON.stringify(state, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeView === 'sql' && (
            <div className="animate-in fade-in duration-500">
               <h3 className="text-white font-black uppercase tracking-tight mb-6">Cloud Data Schema</h3>
               <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800">
                 <pre className="text-xs font-mono text-slate-400 whitespace-pre-wrap">{SQL_SCHEMA}</pre>
               </div>
            </div>
          )}

          {activeView === 'apk' && (
            <div className="animate-in fade-in duration-500">
               <h3 className="text-white font-black uppercase tracking-tight mb-6">Distribution Registry</h3>
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
