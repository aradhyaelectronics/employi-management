
import React from 'react';
import { AppState } from '../types';

interface Props {
  state: AppState;
  removeCompany: (id: string) => void;
  purchaseSubscription: (companyId: string, planId: string) => void;
}

const CompanyManagement: React.FC<Props> = ({ state, removeCompany, purchaseSubscription }) => {
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `pragati_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan Config</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Node Count</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {state.companies.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="font-black text-gray-800 text-sm uppercase">{c.name}</div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">EST: {new Date(c.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-8 py-6">
                    <select 
                      value={c.subscriptionPlanId} 
                      onChange={(e) => purchaseSubscription(c.id, e.target.value)}
                      className="bg-blue-50 text-blue-700 text-[10px] font-black uppercase px-3 py-2 rounded-xl border border-blue-100 outline-none"
                    >
                      {state.subscriptionPlans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CompanyManagement;
