
import React, { useState, useMemo } from 'react';
import { User, AppState, Material, UserRole } from '../types';
// Import ICONS from constants to fix the missing name error
import { ICONS } from '../constants';

interface Props {
  user: User;
  state: AppState;
  addMaterial: (m: any) => Promise<void>;
  updateMaterial: (id: string, u: Partial<Material>) => Promise<void>;
  removeMaterial: (id: string) => Promise<void>;
}

const MaterialRegistry: React.FC<Props> = ({ user, state, addMaterial, updateMaterial, removeMaterial }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', unit: 'Meters', totalStock: 0 });
  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;

  const materials = useMemo(() => state.materials.filter(m => m.companyId === user.companyId), [state.materials, user.companyId]);

  return (
    <div className="space-y-8 animate-in fade-in pb-24">
      <div className="flex justify-between items-center bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
         <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">Asset Ledger</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Infrastructure Inventory Repository</p>
         </div>
         {isAdmin && (
           <button onClick={() => setShowAdd(!showAdd)} className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/10 active:scale-95 transition-all">
             {showAdd ? 'Cancel Initialization' : 'Enroll Asset Node'}
           </button>
         )}
      </div>

      {showAdd && (
        <form onSubmit={e => { e.preventDefault(); addMaterial({...form, companyId: user.companyId, allocated: 0}); setShowAdd(false); setForm({name:'', unit:'Meters', totalStock:0}); }} className="bg-slate-900 p-10 rounded-[3rem] border border-slate-800 shadow-2xl grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-6">
           <div className="md:col-span-3 mb-4">
              <h3 className="text-white font-black uppercase tracking-widest text-sm">New Infrastructure Resource</h3>
           </div>
           <div>
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1 block mb-2">Resource Name</label>
              <input type="text" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-blue-500" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. OFC-Cable-12F" required />
           </div>
           <div>
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1 block mb-2">Unit of Measure</label>
              <input type="text" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-blue-500" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} placeholder="Meters / Units" required />
           </div>
           <div>
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1 block mb-2">Opening Stock</label>
              <input type="number" className="w-full bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-blue-500" value={form.totalStock} onChange={e => setForm({...form, totalStock: parseInt(e.target.value) || 0})} required />
           </div>
           <button type="submit" className="md:col-span-3 bg-white text-slate-950 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-4">Commit Resource to Cluster</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         {materials.map(m => {
           const available = m.totalStock - m.allocated;
           const healthPercent = Math.min(100, Math.max(0, (available / (m.totalStock || 1)) * 100));
           const isCritical = healthPercent < 20;

           return (
             <div key={m.id} className={`bg-white p-10 rounded-[3rem] border-2 transition-all hover:shadow-2xl flex flex-col group ${isCritical ? 'border-orange-200' : 'border-slate-50'}`}>
                <div className="flex justify-between items-start mb-8">
                   <div className="flex-1 min-w-0 pr-4">
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight truncate mb-1">{m.name}</h3>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{m.unit}</span>
                   </div>
                   {isCritical && (
                     <span className="bg-orange-500 text-white px-3 py-1 rounded-xl text-[8px] font-black uppercase animate-pulse shrink-0">Low Stock</span>
                   )}
                </div>

                <div className="flex items-end justify-between mb-2">
                   <p className="text-[10px] font-black text-slate-400 uppercase">Availability Profile</p>
                   <p className="text-3xl font-black text-blue-900 tracking-tighter">{available.toLocaleString()}</p>
                </div>
                
                <div className="w-full h-2 bg-slate-100 rounded-full mb-8 overflow-hidden flex">
                   <div 
                      className={`h-full transition-all duration-1000 ${isCritical ? 'bg-orange-500' : 'bg-blue-600'}`} 
                      style={{ width: `${healthPercent}%` }}
                   ></div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-10 pt-4 border-t border-slate-50">
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Deployed Units</p>
                      <p className="text-lg font-black text-slate-800">{m.allocated.toLocaleString()}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Registry Cap</p>
                      <p className="text-lg font-black text-slate-800">{m.totalStock.toLocaleString()}</p>
                   </div>
                </div>

                {isAdmin && (
                  <div className="flex gap-3 mt-auto">
                     <button 
                        onClick={() => { const q = prompt(`Asset Adjustment for ${m.name}\nEnter Quantity to Add/Subtract (+/-):`); if(q && !isNaN(parseInt(q))) updateMaterial(m.id, { totalStock: m.totalStock + parseInt(q) }); }} 
                        className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-black/10 active:scale-95 transition-all"
                     >
                        Sync Inventory
                     </button>
                     <button onClick={() => confirm("Execute Node Removal Protocol?") && removeMaterial(m.id)} className="px-6 bg-red-50 text-red-500 rounded-2xl font-black text-xl hover:bg-red-600 hover:text-white transition-all">×</button>
                  </div>
                )}
             </div>
           );
         })}
         {materials.length === 0 && (
            <div className="col-span-full py-40 bg-white border-2 border-dashed border-slate-100 rounded-[4rem] flex flex-col items-center justify-center">
               <ICONS.Work className="w-16 h-16 text-slate-200 mb-6" />
               <p className="font-black text-[11px] text-slate-300 uppercase tracking-[0.5em]">No Resource Entities Registered</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default MaterialRegistry;
