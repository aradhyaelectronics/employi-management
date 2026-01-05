
import React, { useState, useMemo, useEffect } from 'react';
import { User, AppState, UserRole, WorkLog } from '../types';

interface Props {
  user: User;
  state: AppState;
  addWorkLog: (log: Omit<WorkLog, 'id'>) => Promise<void>;
}

const WorkTracking: React.FC<Props> = ({ user, state, addWorkLog }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const isSupervisor = user.role === UserRole.SUPERVISOR;

  const company = state.companies.find(c => c.id === user.companyId);
  const allowedWorkTypes = company?.customWorkTypes || ['General Maintenance'];

  const [logData, setLogData] = useState({
    userId: user.id,
    installationDate: new Date().toISOString().split('T')[0],
    siteId: '',
    workType: allowedWorkTypes[0],
    subCategory: 'Standard',
    meters: 0,
    description: 'General Progress',
    taskId: ''
  });

  const companySites = useMemo(() => state.sites.filter(s => s.companyId === user.companyId), [state.sites, user.companyId]);
  
  const selectablePersonnel = useMemo(() => {
    const users = state.users.filter(u => u.companyId === user.companyId);
    if (isAdmin) return users;
    if (isSupervisor) return users.filter(u => u.id === user.id || u.supervisorId === user.id);
    return [];
  }, [state.users, user, isAdmin, isSupervisor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logData.siteId) return alert('CRITICAL: Select Project Site.');
    if (logData.meters <= 0) return alert('Enter valid quantity.');
    
    try {
      await addWorkLog({
        userId: logData.userId, 
        companyId: user.companyId, 
        siteId: logData.siteId,
        date: new Date().toISOString().split('T')[0], 
        installationDate: logData.installationDate,
        workType: logData.workType, 
        subCategory: logData.subCategory,
        meters: logData.meters, 
        description: logData.description, 
        taskId: logData.taskId || undefined
      });
      alert("Telemetry Entry Committed.");
      setLogData({...logData, meters: 0, description: 'General Progress'});
    } catch (error: any) { alert(error.message); }
  };

  const filteredLogs = useMemo(() => {
    return state.workLogs.filter(log => {
      if (log.companyId !== user.companyId) return false;
      if (user.role === 'EMPLOYEE' && log.userId !== user.id) return false;
      
      const activityDate = log.installationDate || log.date;
      const isAfterStart = startDate ? activityDate >= startDate : true;
      const isBeforeEnd = endDate ? activityDate <= endDate : true;
      const isSearchMatch = searchQuery ? log.description.toLowerCase().includes(searchQuery.toLowerCase()) : true;

      return isAfterStart && isBeforeEnd && isSearchMatch;
    });
  }, [state.workLogs, user, startDate, endDate, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-4">
            <h3 className="text-lg font-black text-blue-900 uppercase tracking-tighter mb-6">Log Activity</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {(isAdmin || isSupervisor) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-600 uppercase ml-1">Reporting For</label>
                  <select className="w-full px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl outline-none font-black text-blue-900 text-xs" value={logData.userId} onChange={e => setLogData({ ...logData, userId: e.target.value })}>
                    {selectablePersonnel.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Work Type (Scope)</label>
                <select className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black uppercase" value={logData.workType} onChange={e => setLogData({ ...logData, workType: e.target.value })}>
                  {allowedWorkTypes.map(wt => <option key={wt} value={wt}>{wt}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Target Site</label>
                <select required className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-xs font-bold" value={logData.siteId} onChange={e => setLogData({ ...logData, siteId: e.target.value })}>
                  <option value="">Select Node...</option>
                  {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Quantity (Units)</label>
                <input type="number" className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl font-black text-blue-900" value={logData.meters || ''} onChange={e => setLogData({ ...logData, meters: parseInt(e.target.value) || 0 })} required />
              </div>
              
              <button type="submit" className="w-full bg-blue-700 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-4">Commit Entry</button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
           <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
                <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter">Field Telemetry</h3>
                <input type="text" placeholder="Search logs..." className="px-4 py-2 bg-white border rounded-xl text-xs font-bold outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-gray-50/50 text-[9px] font-black uppercase text-gray-400">
                    <tr><th className="px-8 py-5">Personnel</th><th className="px-8 py-5">Classification</th><th className="px-8 py-5 text-center">Progress</th><th className="px-8 py-5 text-right">Date</th></tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition-all">
                         <td className="px-8 py-6 text-xs font-black uppercase">{state.users.find(u => u.id === log.userId)?.name}</td>
                         <td className="px-8 py-6 text-xs font-black text-blue-600 uppercase">{log.workType}</td>
                         <td className="px-8 py-6 text-center font-black text-green-600 text-lg">{log.meters}m</td>
                         <td className="px-8 py-6 text-right text-[10px] font-black text-gray-400">{log.installationDate}</td>
                      </tr>
                    ))}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default WorkTracking;
