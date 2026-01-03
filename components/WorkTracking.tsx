
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

  const companySites = useMemo(() => state.sites.filter(s => s.companyId === user.companyId), [state.sites, user.companyId]);
  const relevantTasks = useMemo(() => {
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    if (isAdmin) {
      return state.tasks.filter(t => {
        const proj = state.projects.find(p => p.id === t.projectId);
        return proj?.companyId === user.companyId;
      });
    }
    const userInvolvedProjectIds = Array.from(new Set(state.tasks.filter(t => t.assignedTo === user.id).map(t => t.projectId)));
    return state.tasks.filter(t => userInvolvedProjectIds.includes(t.projectId));
  }, [state.tasks, state.projects, user.id, user.role, user.companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logData.siteId) return alert('Select a Work Site.');
    if (logData.meters <= 0) return alert('Quantity must be > 0');
    const finalWorkType = logData.workType === 'Other' ? logData.customWorkType : logData.workType;
    const finalDescription = descriptionType === 'Other Detail' ? logData.description : descriptionType;
    try {
      await addWorkLog({
        userId: user.id, companyId: user.companyId, siteId: logData.siteId,
        date: new Date().toISOString().split('T')[0], installationDate: logData.installationDate,
        workType: finalWorkType.trim(), subCategory: logData.subCategory.trim(),
        meters: logData.meters, description: finalDescription.trim(), taskId: logData.taskId || undefined
      });
      setLogData({ 
        installationDate: new Date().toISOString().split('T')[0], siteId: '',
        workType: WorkType.CABLE_LAYING, customWorkType: '', subCategory: '4 Pair',
        meters: 0, description: 'General Progress', taskId: ''
      });
      alert("Operational progress recorded.");
    } catch (error: any) { alert("Progress transmission failed."); }
  };

  const companyEmployees = useMemo(() => state.users.filter(u => u.companyId === user.companyId), [state.users, user.companyId]);
  const companySupervisors = useMemo(() => companyEmployees.filter(u => u.role === UserRole.SUPERVISOR), [companyEmployees]);
  
  const filterablePersonnel = useMemo(() => {
    let members = companyEmployees.filter(u => u.role === UserRole.EMPLOYEE || u.role === UserRole.SUPERVISOR);
    if (user.role === UserRole.SUPERVISOR) {
      members = members.filter(m => m.id === user.id || m.supervisorId === user.id);
    }
    return members.sort((a, b) => a.name.localeCompare(b.name));
  }, [companyEmployees, user.id, user.role]);
  
  const filteredLogs = useMemo(() => {
    return state.workLogs.filter(log => {
      if (log.companyId !== user.companyId) return false;
      if (user.role === UserRole.EMPLOYEE && log.userId !== user.id) return false;
      if (user.role === UserRole.SUPERVISOR) {
        const logUser = state.users.find(u => u.id === log.userId);
        if (log.userId !== user.id && logUser?.supervisorId !== user.id) return false;
      }
      const activityDate = log.installationDate || log.date;
      const isAfterStart = startDate ? activityDate >= startDate : true;
      const isBeforeEnd = endDate ? activityDate <= endDate : true;
      const isEmployeeMatch = filterEmployee ? log.userId === filterEmployee : true;
      const isWorkTypeMatch = filterWorkType ? log.workType === filterWorkType : true;
      const isSiteMatch = filterSite ? log.siteId === filterSite : true;
      return isAfterStart && isBeforeEnd && isEmployeeMatch && isWorkTypeMatch && isSiteMatch;
    });
  }, [state.workLogs, user, startDate, endDate, filterEmployee, filterWorkType, filterSite, state.users]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Work Telemetry</h2>
        <div className="flex gap-2">
           <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400">Sync Database</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Logging Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-4">
            <h3 className="text-lg font-black text-blue-900 uppercase tracking-tighter mb-6 flex items-center">
              <span className="w-6 h-1 bg-orange-500 mr-2"></span> Log Activity
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Activity Date</label>
                <input type="date" required className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none" value={logData.installationDate} onChange={e => setLogData({ ...logData, installationDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest ml-1">Project Site</label>
                <select required className="w-full px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl outline-none font-black text-orange-900" value={logData.siteId} onChange={e => setLogData({ ...logData, siteId: e.target.value })}>
                  <option value="">Select Site...</option>
                  {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Classification</label>
                <select className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none" value={logData.workType} onChange={e => setLogData({ ...logData, workType: e.target.value })}>
                  {Object.values(WorkType).map(wt => <option key={wt} value={wt}>{wt}</option>)}
                  <option value="Other">Custom Type...</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantity (Units)</label>
                <input type="number" placeholder="0" required className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none font-black text-blue-900" value={logData.meters || ''} onChange={e => setLogData({ ...logData, meters: parseInt(e.target.value) || 0 })} />
              </div>
              <button type="submit" className="w-full bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl mt-4">Commit Entry</button>
            </form>
          </div>
        </div>

        {/* Main: Work History */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
                <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter">Operational Registry</h3>
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{filteredLogs.length} Records Verified</span>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-gray-50/50">
                   <tr>
                     <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Personnel</th>
                     <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                     <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Progress</th>
                     <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Date</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {filteredLogs.slice().reverse().map((log, i) => {
                       const emp = state.users.find(u => u.id === log.userId);
                       const site = companySites.find(s => s.id === log.siteId);
                       return (
                         <tr key={i} className="hover:bg-gray-50/50 transition-all">
                            <td className="px-8 py-6">
                               <p className="font-black text-xs uppercase text-gray-800">{emp?.name}</p>
                               <p className="text-[8px] font-black text-orange-600 uppercase tracking-widest mt-1">{site?.name || 'General'}</p>
                            </td>
                            <td className="px-8 py-6">
                               <p className="text-xs font-black text-blue-900 uppercase">{log.workType}</p>
                               <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">{log.subCategory}</p>
                            </td>
                            <td className="px-8 py-6 text-center font-black text-green-600 text-lg">{log.meters}</td>
                            <td className="px-8 py-6 text-right font-black text-gray-400 text-[10px]">{log.installationDate}</td>
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
