
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, AppState, WorkType, WorkLog, UserRole } from '../types';

interface Props {
  user: User;
  state: AppState;
  addWorkLog: (log: Omit<WorkLog, 'id'>) => Promise<void>;
}

const subCategoryOptions = ['4 Pair', '8 Pair', '12 Pair', '24 Core', 'Custom Specification'];
const workOptions = [
  'General Progress',
  'Installation Panel',
  'Panel Stand',
  'Testing & Commissioning',
  'Maintenance & Repair',
  'Other Detail'
];
const MAX_DESC_LIMIT = 200;

const WorkTracking: React.FC<Props> = ({ user, state, addWorkLog }) => {
  const customSubRef = useRef<HTMLInputElement>(null);
  const customDescRef = useRef<HTMLTextAreaElement>(null);
  const customWorkTypeRef = useRef<HTMLInputElement>(null);
  
  const [subOption, setSubOption] = useState('4 Pair');
  const [descriptionType, setDescriptionType] = useState('General Progress');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterSupervisor, setFilterSupervisor] = useState('');
  const [filterWorkType, setFilterWorkType] = useState('');
  const [filterSite, setFilterSite] = useState('');
  
  const [logData, setLogData] = useState({
    installationDate: new Date().toISOString().split('T')[0],
    siteId: '',
    workType: WorkType.CABLE_LAYING as string,
    customWorkType: '',
    subCategory: '4 Pair',
    meters: 0,
    description: 'General Progress',
    taskId: ''
  });

  // Get sites for the current company
  const companySites = useMemo(() => state.sites.filter(s => s.companyId === user.companyId), [state.sites, user.companyId]);
  
  // Filter tasks relevant to the user's projects
  const relevantTasks = useMemo(() => {
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    
    if (isAdmin) {
      return state.tasks.filter(t => {
        const proj = state.projects.find(p => p.id === t.projectId);
        return proj?.companyId === user.companyId;
      });
    }

    const userInvolvedProjectIds = Array.from(new Set(
      state.tasks
        .filter(t => t.assignedTo === user.id)
        .map(t => t.projectId)
    ));

    return state.tasks.filter(t => userInvolvedProjectIds.includes(t.projectId));
  }, [state.tasks, state.projects, user.id, user.role, user.companyId]);

  useEffect(() => {
    if (subOption === 'Custom Specification' && customSubRef.current) {
      customSubRef.current.focus();
    }
  }, [subOption]);

  useEffect(() => {
    if (logData.workType === 'Other' && customWorkTypeRef.current) {
      customWorkTypeRef.current.focus();
    }
  }, [logData.workType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!logData.siteId) return alert('Please select a Work Site.');
    if (logData.meters <= 0) return alert('Quantity/Meters must be greater than 0');
    
    const finalWorkType = logData.workType === 'Other' ? logData.customWorkType : logData.workType;
    if (!finalWorkType || !finalWorkType.trim()) return alert('Please specify the Work Type');

    const finalDescription = descriptionType === 'Other Detail' ? logData.description : descriptionType;
    
    try {
      await addWorkLog({
        userId: user.id,
        companyId: user.companyId,
        siteId: logData.siteId,
        date: new Date().toISOString().split('T')[0],
        installationDate: logData.installationDate,
        workType: finalWorkType.trim(),
        subCategory: logData.subCategory.trim(),
        meters: logData.meters,
        description: finalDescription.trim(),
        taskId: logData.taskId || undefined
      });
      
      setLogData({ 
        installationDate: new Date().toISOString().split('T')[0],
        siteId: '',
        workType: WorkType.CABLE_LAYING,
        customWorkType: '',
        subCategory: '4 Pair',
        meters: 0, 
        description: 'General Progress',
        taskId: ''
      });
      setSubOption('4 Pair');
      setDescriptionType('General Progress');
      alert("Operational progress recorded.");
    } catch (error: any) {
      alert(error.message || "Progress transmission failed.");
    }
  };

  const handleSubDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setSubOption(selected);
    if (selected !== 'Custom Specification') {
      setLogData(prev => ({ ...prev, subCategory: selected }));
    } else {
      setLogData(prev => ({ ...prev, subCategory: '' }));
    }
  };

  const companyEmployees = useMemo(() => state.users.filter(u => u.companyId === user.companyId), [state.users, user.companyId]);
  const companySupervisors = useMemo(() => companyEmployees.filter(u => u.role === UserRole.SUPERVISOR), [companyEmployees]);
  
  // ROLE-BASED AUTHENTICATED LOGIC: Filter dropdown based on permissions
  const filterablePersonnel = useMemo(() => {
    let members = companyEmployees.filter(u => u.role === UserRole.EMPLOYEE || u.role === UserRole.SUPERVISOR);
    
    // If authenticated as a supervisor, only show self and people reporting to me
    if (user.role === UserRole.SUPERVISOR) {
      members = members.filter(m => m.id === user.id || m.supervisorId === user.id);
    }
    
    return members.sort((a, b) => a.name.localeCompare(b.name));
  }, [companyEmployees, user.id, user.role]);
  
  const filteredLogs = useMemo(() => {
    return state.workLogs.filter(log => {
      const isCompanyMatch = log.companyId === user.companyId;
      if (!isCompanyMatch) return false;

      // Basic Authentication logic for employees: Can only see their own logs
      if (user.role === UserRole.EMPLOYEE && log.userId !== user.id) return false;

      // Supervisors can only see logs for people who report to them or themselves
      if (user.role === UserRole.SUPERVISOR) {
        const logUser = state.users.find(u => u.id === log.userId);
        const isSelf = log.userId === user.id;
        const reportsToMe = logUser?.supervisorId === user.id;
        if (!isSelf && !reportsToMe) return false;
      }

      // DATE FILTERING LOGIC
      const activityDate = log.installationDate || log.date;
      const isAfterStart = startDate ? activityDate >= startDate : true;
      const isBeforeEnd = endDate ? activityDate <= endDate : true;

      const logUser = state.users.find(u => u.id === log.userId);
      const isSupervisorMatch = filterSupervisor ? (
        log.userId === filterSupervisor || 
        logUser?.supervisorId === filterSupervisor
      ) : true;

      const isEmployeeMatch = filterEmployee ? log.userId === filterEmployee : true;
      const isWorkTypeMatch = filterWorkType ? log.workType === filterWorkType : true;
      const isSiteMatch = filterSite ? log.siteId === filterSite : true;

      const searchLower = searchQuery.toLowerCase();
      const empName = logUser?.name.toLowerCase() || '';
      const siteObj = companySites.find(s => s.id === log.siteId);
      const siteName = siteObj?.name.toLowerCase() || '';
      
      const isSearchMatch = searchQuery 
        ? (log.description.toLowerCase().includes(searchLower) || 
           empName.includes(searchLower) || 
           siteName.includes(searchLower) ||
           log.workType.toLowerCase().includes(searchLower) ||
           log.subCategory.toLowerCase().includes(searchLower))
        : true;

      return isAfterStart && isBeforeEnd && isSupervisorMatch && isEmployeeMatch && isWorkTypeMatch && isSiteMatch && isSearchMatch;
    });
  }, [state.workLogs, user, startDate, endDate, filterSupervisor, filterEmployee, filterWorkType, filterSite, searchQuery, state.users, companySites]);

  const totalMeters = useMemo(() => filteredLogs.reduce((sum, l) => sum + l.meters, 0), [filteredLogs]);

  const hasActiveFilters = useMemo(() => {
    return !!(startDate || endDate || searchQuery || filterEmployee || filterSupervisor || filterWorkType || filterSite);
  }, [startDate, endDate, searchQuery, filterEmployee, filterSupervisor, filterWorkType, filterSite]);

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setFilterEmployee('');
    setFilterSupervisor('');
    setFilterWorkType('');
    setFilterSite('');
  };

  const applyQuickRange = (range: 'today' | 'week' | 'month' | 'lastMonth') => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start = '';

    if (range === 'today') {
      start = end;
    } else if (range === 'week') {
      start = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    } else if (range === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else if (range === 'lastMonth') {
      const firstOfLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastOfLast = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(firstOfLast.toISOString().split('T')[0]);
      setEndDate(lastOfLast.toISOString().split('T')[0]);
      return;
    }
    
    setStartDate(start);
    setEndDate(end);
  };

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return alert('No data to export');
    const headers = ['Entry Date', 'Activity Date', 'Site', 'Employee', 'Work Classification', 'Sub-Category', 'Quantity', 'Description'];
    const rows = filteredLogs.map(log => {
      const emp = state.users.find(u => u.id === log.userId);
      const site = companySites.find(s => s.id === log.siteId);
      return [log.date, log.installationDate || log.date, site?.name || '--', emp?.name || 'Unknown', log.workType, log.subCategory, log.meters, `"${log.description.replace(/"/g, '""')}"`];
    });
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `work_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const remainingChars = MAX_DESC_LIMIT - logData.description.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar: Logging Form */}
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-4">
          <h3 className="text-lg font-black text-blue-900 uppercase tracking-tighter mb-6 flex items-center">
            <span className="w-6 h-1 bg-orange-500 mr-2"></span>
            Log Activity
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Activity Date</label>
              <input type="date" required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-700" value={logData.installationDate} onChange={e => setLogData({ ...logData, installationDate: e.target.value })} />
            </div>

            <div>
              <label className="block text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1.5 ml-1">Work Site</label>
              <select required className="w-full px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl outline-none font-black text-orange-900" value={logData.siteId} onChange={e => setLogData({ ...logData, siteId: e.target.value })}>
                <option value="">Choose Site Location...</option>
                {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {relevantTasks.length > 0 && (
              <div>
                <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5 ml-1">Task Milestone (Optional)</label>
                <select 
                  className="w-full px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl outline-none font-bold text-blue-900 truncate" 
                  value={logData.taskId} 
                  onChange={e => setLogData({ ...logData, taskId: e.target.value })}
                >
                  <option value="">No Specific Milestone</option>
                  {relevantTasks.map(t => {
                    const project = state.projects.find(p => p.id === t.projectId);
                    return <option key={t.id} value={t.id}>{project ? `[${project.name}] ` : ''}{t.name}</option>;
                  })}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Work Classification</label>
              <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-700" value={logData.workType} onChange={e => setLogData({ ...logData, workType: e.target.value })}>
                {Object.values(WorkType).map(wt => <option key={wt} value={wt}>{wt}</option>)}
                <option value="Other">Custom / Write My Own...</option>
              </select>
            </div>

            {logData.workType === 'Other' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5 ml-1">Specific Work Type</label>
                <input 
                  ref={customWorkTypeRef}
                  type="text" 
                  placeholder="e.g. Pole Erection, Survey" 
                  required 
                  className="w-full px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl outline-none font-black text-blue-900" 
                  value={logData.customWorkType} 
                  onChange={e => setLogData({ ...logData, customWorkType: e.target.value })} 
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Sub-Category / Size</label>
              <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-700" value={subOption} onChange={handleSubDropdownChange}>
                {subCategoryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            {subOption === 'Custom Specification' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Detail Specification</label>
                <input ref={customSubRef} type="text" placeholder="e.g. 16mm, Grade A" required className="w-full px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl outline-none font-bold text-orange-900" value={logData.subCategory} onChange={e => setLogData({ ...logData, subCategory: e.target.value })} />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Task Category</label>
              <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-700" value={descriptionType} onChange={e => setDescriptionType(e.target.value)}>
                {workOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            {descriptionType === 'Other Detail' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-center mb-1.5 ml-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Detail Progress Note</label>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${remainingChars < 20 ? 'text-red-500' : 'text-gray-300'}`}>{remainingChars} Left</span>
                </div>
                <textarea ref={customDescRef} maxLength={MAX_DESC_LIMIT} className="w-full px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl outline-none h-24 resize-none transition-all text-sm font-medium" placeholder="Additional details..." value={logData.description} onChange={e => setLogData({ ...logData, description: e.target.value.slice(0, MAX_DESC_LIMIT) })}></textarea>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Quantity Achieved (Mtrs/Units)</label>
              <input type="number" placeholder="0" required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-black text-blue-900" value={logData.meters || ''} onChange={e => setLogData({ ...logData, meters: parseInt(e.target.value) || 0 })} />
            </div>
            <button type="submit" className="w-full bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-blue-800 transition-all mt-4">Commit Log Entry</button>
          </form>
        </div>
      </div>

      {/* Main: Work History & Filters */}
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex flex-col space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </span>
                <input type="text" placeholder="Search work types, staff, or sites..." className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-blue-500 outline-none transition-all font-bold text-blue-900" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                 {hasActiveFilters && (
                    <button onClick={clearFilters} className="px-5 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100">Reset Filters</button>
                 )}
                 <button onClick={exportToCSV} className="px-5 py-2.5 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-100 transition-all border border-orange-100">Export CSV</button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quick Temporal Filters:</p>
                 <div className="flex gap-2">
                    <button onClick={() => applyQuickRange('today')} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[8px] font-black uppercase hover:bg-blue-600 hover:text-white transition-colors">Today</button>
                    <button onClick={() => applyQuickRange('week')} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[8px] font-black uppercase hover:bg-blue-600 hover:text-white transition-colors">Last 7 Days</button>
                    <button onClick={() => applyQuickRange('month')} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[8px] font-black uppercase hover:bg-blue-600 hover:text-white transition-colors">This Month</button>
                    <button onClick={() => applyQuickRange('lastMonth')} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[8px] font-black uppercase hover:bg-orange-600 hover:text-white transition-colors">Last Month</button>
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="relative">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Activity From</label>
                  <input 
                    type="date" 
                    className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${startDate ? 'bg-blue-50 border-blue-400 text-blue-900' : 'bg-gray-50 border-gray-100 text-gray-700'} border outline-none`} 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Activity To</label>
                  <input 
                    type="date" 
                    className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${endDate ? 'bg-blue-50 border-blue-400 text-blue-900' : 'bg-gray-50 border-gray-100 text-gray-700'} border outline-none`} 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                  />
                </div>
                {user.role !== UserRole.EMPLOYEE && (
                  <>
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Personnel Filter</label>
                      <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold" value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
                        <option value="">All Viewable Personnel</option>
                        {filterablePersonnel.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} {u.id === user.id ? '(Me)' : `(${u.role === UserRole.SUPERVISOR ? 'Sup' : 'Emp'})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Classification</label>
                  <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold" value={filterWorkType} onChange={(e) => setFilterWorkType(e.target.value)}>
                    <option value="">All Types</option>
                    {Object.values(WorkType).map(wt => <option key={wt} value={wt}>{wt}</option>)}
                  </select>
                </div>
                {user.role !== UserRole.EMPLOYEE && (
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Supervisor Hub</label>
                    <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold" value={filterSupervisor} onChange={(e) => setFilterSupervisor(e.target.value)}>
                      <option value="">All Managers</option>
                      {companySupervisors.map(u => <option key={u.id} value={u.id}>{u.name} {u.id === user.id ? '(Me)' : ''}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Work Site</label>
                  <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold" value={filterSite} onChange={(e) => setFilterSite(e.target.value)}>
                    <option value="">All Project Sites</option>
                    {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter leading-none">Operational Registry</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Verified Progress Telemetry</p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-3xl font-black text-green-600 tracking-tighter leading-none">{totalMeters.toLocaleString()}</span>
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Units in Selected Range (Mtrs)</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Personnel & Site</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Classification</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Progress</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLogs.slice().reverse().map((log, i) => {
                  const emp = state.users.find(u => u.id === log.userId);
                  const site = companySites.find(s => s.id === log.siteId);
                  const linkedTask = state.tasks.find(t => t.id === log.taskId);
                  const isOwnLog = log.userId === user.id;

                  return (
                    <tr key={log.id || i} className={`hover:bg-gray-50/50 transition-all group ${isOwnLog ? 'bg-blue-50/10' : ''}`}>
                      <td className="px-8 py-6">
                        <button 
                          onClick={() => {
                            // Only allow filtering if user has permission to see that personnel
                            if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || (user.role === UserRole.SUPERVISOR && (emp?.id === user.id || emp?.supervisorId === user.id))) {
                              setFilterEmployee(log.userId);
                            }
                          }}
                          className={`font-black uppercase text-xs tracking-tight leading-none mb-1.5 transition-colors block text-left ${isOwnLog ? 'text-blue-700' : 'text-gray-800 hover:text-blue-600'}`}
                          title={isOwnLog ? "This is your entry" : "Click to audit this employee"}
                        >
                          {emp?.name || 'Unknown'} {isOwnLog ? '(You)' : ''}
                        </button>
                        <div className="flex items-center space-x-1.5">
                          <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                          <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest leading-none">{site?.name || 'General'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-xs font-black text-blue-900 uppercase tracking-widest mb-1">{log.workType}</div>
                        <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none">{log.subCategory}</div>
                        {linkedTask && (
                          <div className="mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[7px] font-black uppercase inline-block border border-blue-100">MILESTONE: {linkedTask.name}</div>
                        )}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-xl font-black text-green-700 tracking-tighter">{log.meters}</span>
                        <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mt-0.5">Mtrs</p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="text-[10px] font-black text-gray-800 uppercase tracking-tight">{log.installationDate}</div>
                        <div className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-1">LOGGED: {log.date}</div>
                      </td>
                    </tr>
                  );
                })}
                {filteredLogs.length === 0 && (
                   <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-gray-300 font-bold italic text-xs uppercase tracking-widest flex flex-col items-center">
                         <span>No matching logs found in registry.</span>
                         {hasActiveFilters && (
                            <button onClick={clearFilters} className="mt-4 text-blue-600 hover:underline font-black uppercase text-[10px]">Clear all filters</button>
                         )}
                      </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkTracking;
