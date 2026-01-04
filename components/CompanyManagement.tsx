
import React, { useState } from 'react';
import { AppState, Company } from '../types';

interface Props {
  state: AppState;
  removeCompany: (id: string) => void;
  purchaseSubscription: (companyId: string, planId: string, months?: number) => void;
}

const CompanyManagement: React.FC<Props> = ({ state, removeCompany, purchaseSubscription }) => {
  const [assigningTo, setAssigningTo] = useState<Company | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedMonths, setSelectedMonths] = useState(1);

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `pragati_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleAssign = () => {
    if (!assigningTo || !selectedPlan) return;
    purchaseSubscription(assigningTo.id, selectedPlan, selectedMonths);
    setAssigningTo(null);
    alert(`Subscription for ${assigningTo.name} updated to ${state.subscriptionPlans.find(p => p.id === selectedPlan)?.name} for ${selectedMonths} months.`);
  };

  const getDaysRemaining = (expiry: string | undefined) => {
    if (!expiry) return 0;
    const diff = new Date(expiry).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter">Enterprise Registry</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Global Managed Nodes: {state.companies.length}</p>
          </div>
          <button onClick={handleExport} className="px-5 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black text-white uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all">
            Export Master Backup
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Enterprise</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Agreement Status</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Nodes</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {state.companies.map((c) => {
                const daysLeft = getDaysRemaining(c.subscriptionExpiry);
                const plan = state.subscriptionPlans.find(p => p.id === c.subscriptionPlanId);
                return (
                  <tr key={c.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-8 py-6">
                      <div className="font-black text-gray-800 text-sm uppercase">{c.name}</div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">EST: {new Date(c.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-900 uppercase">{plan?.name || 'Standard'}</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${daysLeft > 10 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {daysLeft} Days Remaining
                          </span>
                          <button 
                            onClick={() => { setAssigningTo(c); setSelectedPlan(c.subscriptionPlanId || ''); }}
                            className="text-[8px] font-black text-blue-500 uppercase underline"
                          >
                            Assign/Renew
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center font-black text-gray-900 text-sm">
                      {state.users.filter(u => u.companyId === c.id).length}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button onClick={() => removeCompany(c.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {assigningTo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 relative">
            <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter mb-8">Assign Infrastructure Tier</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 leading-relaxed">
              Updating agreement for: <span className="text-blue-600 font-black">{assigningTo.name}</span>
            </p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Select Service Plan</label>
                <select 
                  className="w-full px-5 py-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none" 
                  value={selectedPlan} 
                  onChange={e => setSelectedPlan(e.target.value)}
                >
                  <option value="">Choose Tier...</option>
                  {state.subscriptionPlans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Time Limit (Months)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 6, 12].map(m => (
                    <button 
                      key={m}
                      onClick={() => setSelectedMonths(m)}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedMonths === m ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    >
                      {m}M
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Agreement Duration</p>
                <p className="text-xs font-bold text-blue-900">Total Validity: {selectedMonths * 30} Operational Days</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button onClick={handleAssign} className="flex-1 bg-blue-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl">Commit Agreement</button>
                <button onClick={() => setAssigningTo(null)} className="px-6 py-4 bg-gray-100 text-gray-400 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManagement;
