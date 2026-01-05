
import React, { useState } from 'react';
import { AppState, Company, UserStatus } from '../types';

interface Props {
  state: AppState;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  removeCompany: (id: string) => void;
}

const EnterprisesPage: React.FC<Props> = ({ state, updateCompany, removeCompany }) => {
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [newWorkType, setNewWorkType] = useState('');

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCompany) {
      updateCompany(editingCompany.id, editingCompany);
      setEditingCompany(null);
      alert("Enterprise Configuration Synchronized.");
    }
  };

  const addWorkType = () => {
    if (!newWorkType || !editingCompany) return;
    if (editingCompany.customWorkTypes.includes(newWorkType)) return;
    setEditingCompany({
      ...editingCompany,
      customWorkTypes: [...editingCompany.customWorkTypes, newWorkType]
    });
    setNewWorkType('');
  };

  const removeWorkType = (type: string) => {
    if (!editingCompany) return;
    setEditingCompany({
      ...editingCompany,
      customWorkTypes: editingCompany.customWorkTypes.filter(t => t !== type)
    });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
         <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Enterprise Registry</h2>
         <span className="bg-blue-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">{state.companies.length} Active Nodes</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         {state.companies.map(c => (
           <div key={c.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col relative group hover:shadow-xl transition-all">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{c.name}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {c.id}</p>
                 </div>
                 <span className={`px-3 py-1 rounded-xl text-[8px] font-black uppercase border ${c.status === UserStatus.ACTIVE ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{c.status}</span>
              </div>
              
              <div className="space-y-3 flex-1 mb-8">
                 <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Personnel</span>
                    <span className="text-sm font-black text-slate-900">{state.users.filter(u => u.companyId === c.id).length} Identity Nodes</span>
                 </div>
                 <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Sites</span>
                    <span className="text-sm font-black text-slate-900">{state.sites.filter(s => s.companyId === c.id).length} Site Locks</span>
                 </div>
              </div>

              <div className="flex gap-2">
                 <button onClick={() => setEditingCompany(c)} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">Configure Node</button>
                 <button onClick={() => confirm("Terminate Cloud Node?") && removeCompany(c.id)} className="bg-red-50 text-red-600 px-4 py-3 rounded-xl font-black">×</button>
              </div>
           </div>
         ))}
      </div>

      {editingCompany && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
           <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-2xl p-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <h3 className="text-2xl font-black text-slate-900 uppercase mb-8">Configure Enterprise Node</h3>
              <form onSubmit={handleUpdate} className="space-y-8">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Entity Name</label>
                       <input type="text" className="w-full bg-slate-50 px-5 py-4 rounded-2xl font-bold text-sm" value={editingCompany.name} onChange={e => setEditingCompany({...editingCompany, name: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Node Status</label>
                       <select className="w-full bg-slate-50 px-5 py-4 rounded-2xl font-black text-xs" value={editingCompany.status} onChange={e => setEditingCompany({...editingCompany, status: e.target.value as any})}>
                          <option value={UserStatus.ACTIVE}>ACTIVE</option>
                          <option value={UserStatus.BLOCKED}>BLOCKED</option>
                       </select>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Allowed Work Types (Operational Scope)</label>
                    <div className="flex gap-2">
                       <input type="text" placeholder="e.g. Splicing-B" className="flex-1 bg-slate-50 px-5 py-4 rounded-2xl font-bold text-sm" value={newWorkType} onChange={e => setNewWorkType(e.target.value)} />
                       <button type="button" onClick={addWorkType} className="bg-blue-600 text-white px-8 rounded-2xl font-black uppercase text-[10px]">Add Type</button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                       {editingCompany.customWorkTypes.map(type => (
                         <div key={type} className="bg-slate-100 px-4 py-2 rounded-xl flex items-center gap-3 border border-slate-200">
                            <span className="text-[10px] font-black text-slate-700 uppercase">{type}</span>
                            <button type="button" onClick={() => removeWorkType(type)} className="text-red-500 font-bold hover:text-red-700">×</button>
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="flex gap-3 pt-6">
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Commit Changes</button>
                    <button type="button" onClick={() => setEditingCompany(null)} className="px-10 py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest">Cancel</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default EnterprisesPage;
