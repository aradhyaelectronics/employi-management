
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, AppState, CableType, WorkLog, UserRole } from '../types';

interface Props {
  user: User;
  state: AppState;
  addWorkLog: (log: Omit<WorkLog, 'id'>) => Promise<void>;
}

const sizeOptions = ['4 Pair', '8 Pair', '12 Pair', '24 Core', 'Custom'];
const workOptions = [
  'Installation Panel',
  'Panel Stand',
  'Cable Laying',
  'Testing & Commissioning',
  'Maintenance & Repair',
  'Other'
];
const MAX_DESC_LIMIT = 200;

const WorkTracking: React.FC<Props> = ({ user, state, addWorkLog }) => {
  const customSizeRef = useRef<HTMLInputElement>(null);
  const customDescRef = useRef<HTMLTextAreaElement>(null);
  
  const [sizeOption, setSizeOption] = useState('4 Pair');
  const [descriptionType, setDescriptionType] = useState('Installation Panel');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterSupervisor, setFilterSupervisor] = useState('');
  const [filterCableType, setFilterCableType] = useState('');
  const [filterSite, setFilterSite] = useState('');
  
  const [logData, setLogData] = useState({
    installationDate: new Date().toISOString().split('T')[0],
    siteId: '',
    cableType: CableType.CAT6,
    cableSize: '4 Pair',
    meters: 0,
    description: 'Installation Panel',
    taskId: ''
  });

  // Get sites for the current company
  const companySites = useMemo(() => state.sites.filter(s => s.companyId === user.companyId), [state.sites, user.companyId]);
  
  // Filter tasks assigned to this user
  const assignedTasks = state.tasks.filter(t => t.assignedTo === user.id);

  useEffect(() => {
    if (sizeOption === 'Custom' && customSizeRef.current) {
      customSizeRef.current.focus();
    }
  }, [sizeOption]);

  useEffect(() => {
    if (descriptionType === 'Other' && customDescRef.current) {
      customDescRef.current.focus();
    }
  }, [descriptionType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!logData.siteId) return alert('Please select a Work Site.');
    if (logData.meters <= 0) return alert('Meters must be greater than 0');
    if (!logData.installationDate) return alert('Please select the date of installation');
    
    const finalDescription = descriptionType === 'Other' ? logData.description : descriptionType;
    if (!finalDescription || !finalDescription.trim()) return alert('Please provide a work description');
    
    try {
      await addWorkLog({
        userId: user.id,
        companyId: user.companyId,
        siteId: logData.siteId,
        date: new Date().toISOString().split('T')[0],
        installationDate: logData.installationDate,
        cableType: logData.cableType,
        cableSize: logData.cableSize.trim(),
        meters: logData.meters,
        description: finalDescription.trim(),
        taskId: logData.taskId || undefined
      });
      
      setLogData({ 
        installationDate: new Date().toISOString().split('T')[0],
        siteId: '',
        cableType: CableType.CAT6,
        cableSize: '4 Pair',
        meters: 0, 
        description: 'Installation Panel',
        taskId: ''
      });
      setSizeOption('4 Pair');
      setDescriptionType('Installation Panel');
      alert("Work progress committed successfully.");
    } catch (error: any) {
      alert(error.message || "Progress transmission failed.");
    }
  };

  const handleSizeDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setSizeOption(selected);
    if (selected !== 'Custom') {
      setLogData(prev => ({ ...prev, cableSize: selected }));
    } else {
      setLogData(prev => ({ ...prev, cableSize: '' }));
    }
  };

  const handleDescriptionDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setDescriptionType(selected);
    if (selected !== 'Other') {
      setLogData(prev => ({ ...prev, description: selected }));
    } else {
      setLogData(prev => ({ ...prev, description: '' }));
    }
  };

  const companyEmployees = useMemo(() => state.users.filter(u => u.companyId === user.companyId), [state.users, user.companyId]);
  const companySupervisors = useMemo(() => companyEmployees.filter(u => u.role === UserRole.SUPERVISOR), [companyEmployees]);
  
  const filteredPersonnelList = useMemo(() => {
    if (!filterSupervisor) return companyEmployees.filter(u => u.role === UserRole.EMPLOYEE);
    return companyEmployees.filter(u => u.supervisorId === filterSupervisor);
  }, [companyEmployees, filterSupervisor]);

  const filteredLogs = useMemo(() => {
    return state.workLogs.filter(log => {
      const isCompanyMatch = log.companyId === user.companyId;
      if (!isCompanyMatch) return false;

      if (user.role === UserRole.EMPLOYEE && log.userId !== user.id) return false;

      const dateToCompare = log.installationDate || log.date;
      const isAfterStart = startDate ? dateToCompare >= startDate : true;
      const isBeforeEnd = endDate ? dateToCompare <= endDate : true;

      const logUser = state.users.find(u => u.id === log.userId);
      const isSupervisorMatch = filterSupervisor ? (
        log.userId === filterSupervisor || 
        logUser?.supervisorId === filterSupervisor
      ) : true;

      const isEmployeeMatch = filterEmployee ? log.userId === filterEmployee : true;
      const isCableMatch = filterCableType ? log.cableType === filterCableType : true;
      const isSiteMatch = filterSite ? log.siteId === filterSite : true;

      const searchLower = searchQuery.toLowerCase();
      const empName = logUser?.name.toLowerCase() || '';
      const siteObj = companySites.find(s => s.id === log.siteId);
      const siteName = siteObj?.name.toLowerCase() || '';
      
      const isSearchMatch = searchQuery 
        ? (log.description.toLowerCase().includes(searchLower) || 
           empName.includes(searchLower) || 
           siteName.includes(searchLower) ||
           log.cableSize.toLowerCase().includes(searchLower))
        : true;

      return isAfterStart && isBeforeEnd && isSupervisorMatch && isEmployeeMatch && isCableMatch && isSiteMatch && isSearchMatch;
    });
  }, [state.workLogs, user, startDate, endDate, filterSupervisor, filterEmployee, filterCableType, filterSite, searchQuery, state.users, companySites]);

  const totalMeters = useMemo(() => filteredLogs.reduce((sum, l) => sum + l.meters, 0), [filteredLogs]);

  const setPreset = (days: number) => {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setStartDate(start);
    setEndDate(end);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setFilterEmployee('');
    setFilterSupervisor('');
    setFilterCableType('');
    setFilterSite('');
  };

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return alert('No data to export');
    const headers = ['Entry Date', 'Installation Date', 'Site', 'Employee', 'Cable Type', 'Size', 'Meters', 'Description'];
    const rows = filteredLogs.map(log => {
      const emp = state.users.find(u => u.id === log.userId);
      const site = companySites.find(s => s.id === log.siteId);
      return [log.date, log.installationDate || log.date, site?.name || '--', emp?.name || 'Unknown', log.cableType, log.cableSize, log.meters, `"${log.description.replace(/"/g, '""')}"`];
    });
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `work_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters = startDate || endDate || searchQuery || filterEmployee || filterSupervisor || filterCableType || filterSite;
  const remainingChars = MAX_DESC_LIMIT - logData.description.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-4">
          <h3 className="text-lg font-black text-blue-900 uppercase tracking-tighter mb-6 flex items-center">
            <span className="w-6 h-1 bg-orange-500 mr-2"></span>
            New Progress Entry
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Installation Date</label>
              <input type="date" required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-gray-700" value={logData.installationDate} onChange={e => setLogData({ ...logData, installationDate: e.target.value })} />
            </div>

            <div>
              <label className="block text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1.5 ml-1">Assigned Work Site</label>
              <select required className="w-full px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-black text-orange-900" value={logData.siteId} onChange={e => setLogData({ ...logData, siteId: e.target.value })}>
                <option value="">Choose Site Location...</option>
                {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {assignedTasks.length > 0 && (
              <div>
                <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5 ml-1">Assigned Task Milestone</label>
                <select className="w-full px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl outline-none font-bold text-blue-900" value={logData.taskId} onChange={e => setLogData({ ...logData, taskId: e.target.value })}>
                  <option value="">General Work (No Milestone)</option>
                  {assignedTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Cable Type</label>
              <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-gray-700" value={logData.cableType} onChange={e => setLogData({ ...logData, cableType: e.target.value as CableType })}>
                {Object.values(CableType).map(ct => <option key={ct} value={ct}>{ct}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Cable Size</label>
              <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-gray-700" value={sizeOption} onChange={handleSizeDropdownChange}>
                {sizeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            {sizeOption === 'Custom' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Custom Specification</label>
                <input ref={customSizeRef} type="text" placeholder="e.g. 48 Core, 16mm" required className="w-full px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-bold text-orange-900" value={logData.cableSize} onChange={e => setLogData({ ...logData, cableSize: e.target.value })} />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Work Description</label>
              <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-gray-700" value={descriptionType} onChange={handleDescriptionDropdownChange}>
                {workOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            {descriptionType === 'Other' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-center mb-1.5 ml-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Custom Details</label>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${remainingChars < 20 ? 'text-red-500' : 'text-gray-300'}`}>{remainingChars} Left</span>
                </div>
                <textarea ref={customDescRef} maxLength={MAX_DESC_LIMIT} className="w-full px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 h-24 resize-none transition-all text-sm font-medium" placeholder="Specific site location or progress notes..." value={logData.description} onChange={e => setLogData({ ...logData, description: e.target.value.slice(0, MAX_DESC_LIMIT) })}></textarea>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Meters Achieved</label>
              <input type="number" placeholder="0" required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-black text-blue-900" value={logData.meters || ''} onChange={e => setLogData({ ...logData, meters: parseInt(e.target.value) || 0 })} />
            </div>
            <button type="submit" className="w-full bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-800 shadow-xl shadow-blue-100 transform active:scale-[0.98] transition-all mt-4">Commit Work Log</button>
          </form>
        </div>
      </div>
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></span>
                <input type="text" placeholder="Search description, employee, site or specifications..." className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-gray-300 font-medium" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                 <button onClick={() => setPreset(0)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${startDate === new Date().toISOString().split('T')[0] ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>Today</button>
                 <button onClick={() => setPreset(7)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${startDate === new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>7 Days</button>
                 {hasActiveFilters && (
                    <button onClick={clearFilters} className="flex items-center space-x-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      <span>Clear All Filters</span>
                    </button>
                 )}
                 <button onClick={exportToCSV} className="flex items-center space-x-2 px-5 py-2.5 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-100 transition-all border border-orange-100"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg><span>Export CSV</span></button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div><label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Range From</label><input type="date" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 focus:ring-2 focus:ring-blue-500/10 outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
              <div><label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Range To</label><input type="date" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 focus:ring-2 focus:ring-blue-500/10 outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
              
              {user.role !== UserRole.EMPLOYEE ? (
                <>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Filter Team</label>
                    <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 focus:ring-2 focus:ring-blue-500/10 outline-none" value={filterSupervisor} onChange={(e) => { setFilterSupervisor(e.target.value); setFilterEmployee(''); }}>
                      <option value="">All Supervisors</option>
                      {companySupervisors.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Personnel</label>
                    <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 focus:ring-2 focus:ring-blue-500/10 outline-none" value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
                      <option value="">{filterSupervisor ? 'Full Team' : 'All Staff'}</option>
                      {filteredPersonnelList.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="hidden lg:block"></div>
                  <div className="hidden lg:block"></div>
                </>
              )}
              
              <div><label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Work Site</label><select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 focus:ring-2 focus:ring-blue-500/10 outline-none" value={filterSite} onChange={(e) => setFilterSite(e.target.value)}><option value="">All Sites</option>{companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Cable Type</label><select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 focus:ring-2 focus:ring-blue-500/10 outline-none" value={filterCableType} onChange={(e) => setFilterCableType(e.target.value)}><option value="">All Cables</option>{Object.values(CableType).map(ct => <option key={ct} value={ct}>{ct}</option>)}</select></div>
            </div>
            {hasActiveFilters && (
              <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center space-x-2"><span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span><p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Active Search Filters Applied</p></div>
                <button onClick={clearFilters} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-700 transition underline underline-offset-4 decoration-red-200">Reset All Telemetry Filters</button>
              </div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div><h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter">Operational History</h3><p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Verified Project Telemetry</p></div>
            <div className="flex flex-col items-end"><span className="text-3xl font-black text-green-600 tracking-tighter leading-none">{totalMeters.toLocaleString()}m</span><span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Filtered Progress Total</span></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr><th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Personnel & Site</th><th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Installation Date</th><th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Technical Specification</th><th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center">Progress</th><th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center">Verification</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLogs.slice().reverse().map((log, i) => {
                  const emp = state.users.find(u => u.id === log.userId);
                  const supervisor = state.users.find(u => u.id === emp?.supervisorId);
                  const linkedTask = state.tasks.find(t => t.id === log.taskId);
                  const site = companySites.find(s => s.id === log.siteId);

                  return (
                    <tr key={log.id || i} className="hover:bg-gray-50/50 transition-all group">
                      <td className="px-8 py-6">
                        <div className="font-black text-gray-800 uppercase text-xs tracking-tight">{emp?.name || 'Unknown'}</div>
                        <div className="flex items-center space-x-1.5 mt-1">
                          <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                          <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">{site?.name || 'Unassigned Site'}</span>
                        </div>
                        {supervisor && (
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Team {supervisor.name}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6"><div className="text-sm font-black text-blue-900 tracking-tighter bg-blue-50/50 px-3 py-1.5 rounded-xl inline-block border border-blue-100/50">{log.installationDate || log.date}</div></td>
                      <td className="px-8 py-6">
                        <div className="text-xs font-black text-blue-600 uppercase tracking-widest">{log.cableType}</div>
                        <div className="text-[10px] text-orange-600 font-black uppercase tracking-widest mt-0.5">{log.cableSize}</div>
                        {linkedTask && (
                           <div className="mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[8px] font-black uppercase inline-block">TASK: {linkedTask.name}</div>
                        )}
                        <div className="text-[10px] text-gray-400 font-medium mt-1.5 italic group-hover:text-gray-600 transition-colors line-clamp-1 max-w-[200px] border-l-2 border-gray-100 pl-2">"{log.description || 'Standard installation procedure.'}"</div>
                      </td>
                      <td className="px-8 py-6 text-center"><span className="text-lg font-black text-green-700 tracking-tighter">{log.meters}m</span></td>
                      <td className="px-8 py-6 text-center"><div className="flex flex-col items-center"><div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-1"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg></div><span className="text-[8px] font-black text-green-700 uppercase tracking-widest">Secured</span></div></td>
                    </tr>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <tr><td colSpan={5} className="px-8 py-24 text-center"><div className="flex flex-col items-center justify-center opacity-20"><svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg><p className="text-lg font-black uppercase tracking-tighter">No Matching Data</p><p className="text-xs font-bold mt-1">Adjust your search criteria or range filters.</p></div></td></tr>
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
