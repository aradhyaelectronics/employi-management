
import React, { useState, useMemo, useEffect } from 'react';
import { User, AppState, WorkType, UserRole, WorkLog } from '../types';

interface Props {
  user: User;
  state: AppState;
  addWorkLog: (log: Omit<WorkLog, 'id'>) => Promise<void>;
}

const WorkTracking: React.FC<Props> = ({ user, state, addWorkLog }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterSupervisor, setFilterSupervisor] = useState('');
  const [filterWorkType, setFilterWorkType] = useState('');
  const [filterSite, setFilterSite] = useState('');
  
  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const isSuper = user.role === UserRole.SUPER_ADMIN;
  const isSupervisor = user.role === UserRole.SUPERVISOR;

  const [logData, setLogData] = useState({
    userId: user.id, // Defaults to current user
    installationDate: new Date().toISOString().split('T')[0],
    siteId: '',
    workType: WorkType.CABLE_LAYING as string,
    customWorkType: '',
    subCategory: '4 Pair',
    meters: 0,
    description: 'General Progress',
    taskId: ''
  });

  const companySites = useMemo(() => state.sites.filter(s => s.companyId === user.companyId), [state.sites, user.companyId]);
  
  const selectablePersonnel = useMemo(() => {
    const users = state.users.filter(u => u.companyId === user.companyId);
    if (isAdmin) return users;
    if (isSupervisor) return users.filter(u => u.id === user.id || u.supervisorId === user.id);
    return []; // Employees don't get to select
  }, [state.users, user, isAdmin, isSupervisor]);

  const companySupervisors = useMemo(() => state.users.filter(u => u.companyId === user.companyId && u.role === UserRole.SUPERVISOR), [state.users, user.companyId]);
  const companyEmployees = useMemo(() => state.users.filter(u => u.companyId === user.companyId), [state.users, user.companyId]);

  // Tasks based on selected userId in the form
  const relevantTasks = useMemo(() => {
    return state.tasks.filter(t => t.assignedTo === logData.userId && t.status !== 'DONE');
  }, [state.tasks, logData.userId]);

  // Auto-select site if only one exists
  useEffect(() => {
    if (companySites.length === 1 && !logData.siteId) {
      setLogData(prev => ({ ...prev, siteId: companySites[0].id }));
    }
  }, [companySites, logData.siteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logData.siteId) return alert('CRITICAL: Please select a Project Site (Node).');
    if (logData.meters <= 0) return alert('Quantity must be greater than zero.');
    
    try {
      await addWorkLog({
        userId: logData.userId, 
        companyId: user.companyId, 
        siteId: logData.siteId,
        date: new Date().toISOString().split('T')[0], 
        installationDate: logData.installationDate,
        workType: logData.workType === 'Other' ? logData.customWorkType : logData.workType, 
        subCategory: logData.subCategory.trim(),
        meters: logData.meters, 
        description: logData.description.trim(), 
        taskId: logData.taskId || undefined
      });
      
      setLogData(prev => ({ 
        ...prev,
        installationDate: new Date().toISOString().split('T')[0], 
        workType: WorkType.CABLE_LAYING, 
        customWorkType: '', 
        subCategory: '4 Pair',
        meters: 0, 
        description: 'General Progress', 
        taskId: ''
        // userId persists to allow batch logging for the same person
      }));
      
      alert("Telemetry entry committed successfully.");
    } catch (error: any) { 
      alert("System Error: Progress transmission failed."); 
    }
  };

  const filteredLogs = useMemo(() => {
    return state.workLogs.filter(log => {
      if (log.companyId !== user.companyId) return false;
      
      // Access Level Control
      if (user.role === UserRole.EMPLOYEE && log.userId !== user.id) return false;
      if (user.role === UserRole.SUPERVISOR) {
        const logUser = state.users.find(u => u.id === log.userId);
        if (log.userId !== user.id && logUser?.supervisorId !== user.id) return false;
      }

      // Date Range Verification
      const activityDate = log.installationDate || log.date;
      const isAfterStart = startDate ? activityDate >= startDate : true;
      const isBeforeEnd = endDate ? activityDate <= endDate : true;

      const isEmployeeMatch = filterEmployee ? log.userId === filterEmployee : true;
      const isWorkTypeMatch = filterWorkType ? log.workType === filterWorkType : true;
      const isSiteMatch = filterSite ? log.siteId === filterSite : true;
      
      const logUser = state.users.find(u => u.id === log.userId);
      const isSupervisorMatch = filterSupervisor ? logUser?.supervisorId === filterSupervisor : true;

      const isSearchMatch = searchQuery 
        ? (log.description?.toLowerCase().includes(searchQuery.toLowerCase()) || 
           log.workType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           logUser?.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;

      return isAfterStart && isBeforeEnd && isEmployeeMatch && isWorkTypeMatch && isSiteMatch && isSupervisorMatch && isSearchMatch;
    });
  }, [state.workLogs, user, startDate, endDate, filterEmployee, filterWorkType, filterSite, filterSupervisor, searchQuery, state.users]);

  const resetFilters = () => {
    setStartDate(''); setEndDate(''); setSearchQuery(''); setFilterEmployee(''); 
    setFilterSupervisor(''); setFilterWorkType(''); setFilterSite('');
  };

  const isAnyFilterActive = !!(startDate || endDate || searchQuery || filterEmployee || filterSupervisor || filterWorkType || filterSite);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Work Telemetry</h2>
        <div className="flex gap-2">
           <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-200 transition-colors">Sync Database</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Entry Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-4">
            <h3 className="text-lg font-black text-blue-900 uppercase tracking-tighter mb-6 flex items-center">
              <span className="w-6 h-1 bg-orange-500 mr-2"></span> Log Activity
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Personnel Selector for Leaders */}
              {(isAdmin || isSupervisor) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Reporting For</label>
                  <select 
                    required 
                    className="w-full px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl outline-none font-black text-blue-900 text-xs cursor-pointer"
                    value={logData.userId}
                    onChange={e => setLogData({ ...logData, userId: e.target.value, taskId: '' })}
                  >
                    {selectablePersonnel.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.id === user.id ? 'Self (Me)' : u.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Activity Date</label>
                <input type="date" required className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black uppercase" value={logData.installationDate} onChange={e => setLogData({ ...logData, installationDate: e.target.value })} />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest ml-1">Project Site (Node)</label>
                <select 
                  required 
                  className="w-full px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl outline-none font-black text-orange-900 text-xs cursor-pointer focus:ring-2 focus:ring-orange-200 transition-all" 
                  value={logData.siteId} 
                  onChange={e => setLogData({ ...logData, siteId: e.target.value })}
                >
                  <option value="">Choose Site Node...</option>
                  {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* TASK MILESTONE DROPDOWN */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Milestone Achievement</label>
                <select 
                  className="w-full px-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl outline-none font-black text-indigo-900 text-xs cursor-pointer" 
                  value={logData.taskId} 
                  onChange={e => setLogData({ ...logData, taskId: e.target.value })}
                >
                  <option value="">General Work (No Milestone)</option>
                  {relevantTasks.map(t => {
                    const project = state.projects.find(p => p.id === t.projectId);
                    return <option key={t.id} value={t.id}>{project ? `[${project.name}] ` : ''}{t.name}</option>;
                  })}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Classification</label>
                <select className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" value={logData.workType} onChange={e => setLogData({ ...logData, workType: e.target.value })}>
                  {Object.values(WorkType).map(wt => <option key={wt} value={wt}>{wt}</option>)}
                  <option value="Other">Custom Type...</option>
                </select>
              </div>
              
              {logData.workType === 'Other' && (
                <div className="space-y-2">
                  <input type="text" placeholder="Specify Work Type" className="w-full px-4 py-2.5 bg-blue-50 border rounded-xl outline-none text-xs font-bold" value={logData.customWorkType} onChange={e => setLogData({ ...logData, customWorkType: e.target.value })} />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantity (Units)</label>
                <input type="number" placeholder="0" required className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none font-black text-blue-900" value={logData.meters || ''} onChange={e => setLogData({ ...logData, meters: parseInt(e.target.value) || 0 })} />
              </div>
              
              <button type="submit" disabled={!logData.siteId} className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl mt-4 active:scale-95 transition-all ${!logData.siteId ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-700 text-white hover:bg-blue-800 shadow-blue-900/10'}`}>
                Commit Entry
              </button>
            </form>
          </div>
        </div>

        {/* Main: Work History Registry */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-8 border-b bg-gray-50/50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                   <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter">Operational Registry</h3>
                   <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{filteredLogs.length} Records Verified</span>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
                   <input 
                    type="text" 
                    placeholder="Search logs or personnel..." 
                    className="w-full sm:w-64 px-4 py-2.5 bg-white border rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all shadow-sm"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                   />
                   <div className="flex items-center gap-2">
                      <input type="date" className="px-3 py-2 bg-white border rounded-xl text-[10px] font-black uppercase" value={startDate} onChange={e => setStartDate(e.target.value)} />
                      <span className="text-gray-300">→</span>
                      <input type="date" className="px-3 py-2 bg-white border rounded-xl text-[10px] font-black uppercase" value={endDate} onChange={e => setEndDate(e.target.value)} />
                   </div>
                </div>
             </div>

             {/* Registry Filters */}
             <div className="px-8 py-4 bg-gray-50/30 border-b flex flex-wrap gap-8 items-center">
                <div className="flex flex-col min-w-[140px]">
                   <span className="text-[8px] font-black text-blue-600 uppercase mb-1">Target Site</span>
                   <select className="bg-transparent text-[10px] font-black uppercase outline-none text-slate-700" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
                      <option value="">All Sites</option>
                      {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>
                
                {(isAdmin || isSuper) && (
                   <div className="flex flex-col min-w-[140px]">
                      <span className="text-[8px] font-black text-indigo-600 uppercase mb-1">Team Lead</span>
                      <select className="bg-transparent text-[10px] font-black uppercase outline-none text-slate-700" value={filterSupervisor} onChange={e => setFilterSupervisor(e.target.value)}>
                         <option value="">All Leads</option>
                         {companySupervisors.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                   </div>
                )}

                {user.role !== UserRole.EMPLOYEE && (
                   <div className="flex flex-col min-w-[140px]">
                      <span className="text-[8px] font-black text-slate-400 uppercase mb-1">Field Staff</span>
                      <select className="bg-transparent text-[10px] font-black uppercase outline-none text-slate-500" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
                         <option value="">All Staff</option>
                         {companyEmployees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                   </div>
                )}

                {isAnyFilterActive && (
                  <button onClick={resetFilters} className="text-[8px] font-black text-red-500 uppercase tracking-widest hover:underline ml-auto">Reset All</button>
                )}
             </div>

             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-gray-50/50">
                   <tr>
                     <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Personnel / Site</th>
                     <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Classification</th>
                     <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Progress</th>
                     <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Date</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {filteredLogs.slice().sort((a,b) => b.installationDate.localeCompare(a.installationDate)).map((log) => {
                       const emp = state.users.find(u => u.id === log.userId);
                       const site = companySites.find(s => s.id === log.siteId);
                       const task = state.tasks.find(t => t.id === log.taskId);
                       return (
                         <tr key={log.id} className="hover:bg-gray-50/50 transition-all group">
                            <td className="px-8 py-6">
                               <p className="font-black text-xs uppercase text-gray-800">{emp?.name}</p>
                               <p className="text-[8px] font-black text-orange-600 uppercase mt-1">{site?.name || 'GEN-NODE'}</p>
                            </td>
                            <td className="px-8 py-6">
                               <p className="text-xs font-black text-blue-900 uppercase">{log.workType}</p>
                               {task && <p className="text-[7px] font-black text-blue-500 uppercase tracking-widest mt-0.5">M-STONE: {task.name}</p>}
                               <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5 line-clamp-1">{log.description}</p>
                            </td>
                            <td className="px-8 py-6 text-center">
                               <span className="font-black text-green-600 text-lg">{log.meters} <span className="text-[8px] text-gray-400 uppercase">Unit</span></span>
                            </td>
                            <td className="px-8 py-6 text-right font-black text-gray-400 text-[10px] uppercase">
                               {log.installationDate}
                            </td>
                         </tr>
                       )
                    })}
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
