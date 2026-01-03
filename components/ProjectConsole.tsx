
import React, { useState, useMemo } from 'react';
import { User, AppState, UserRole, Project, Task } from '../types';

interface Props {
  user: User;
  state: AppState;
  addProject: (p: any) => void;
  addTask: (t: any) => void;
  updateTaskStatus: (id: string, status: 'TODO' | 'IN_PROGRESS' | 'DONE') => void;
}

const ProjectConsole: React.FC<Props> = ({ user, state, addProject, addTask, updateTaskStatus }) => {
  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const isSupervisor = user.role === UserRole.SUPERVISOR;
  const [showProjForm, setShowProjForm] = useState(false);
  const [newProj, setNewProj] = useState({ name: '', description: '', startDate: '', endDate: '', status: 'ACTIVE' as const });
  const [newTask, setNewTask] = useState({ name: '', projectId: '', assignedTo: '' });

  const relevantProjects = state.projects.filter(p => p.companyId === user.companyId);

  const handleToggleTaskStatus = (task: Task) => {
    if (!isAdmin && !isSupervisor && task.assignedTo !== user.id) return;
    
    const statusCycle: ('TODO' | 'IN_PROGRESS' | 'DONE')[] = ['TODO', 'IN_PROGRESS', 'DONE'];
    const currentIndex = statusCycle.indexOf(task.status as any);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    updateTaskStatus(task.id, nextStatus);
  };

  const getProjectProgress = (projId: string) => {
    const projectTasks = state.tasks.filter(t => t.projectId === projId);
    if (projectTasks.length === 0) return 0;
    const completedTasks = projectTasks.filter(t => t.status === 'DONE').length;
    return Math.round((completedTasks / projectTasks.length) * 100);
  };

  return (
    <div className="space-y-10">
      {isAdmin && (
        <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full"></div>
          <div className="relative z-10">
             <div className="flex justify-between items-center mb-10">
                <div>
                   <h2 className="text-3xl font-black uppercase tracking-tighter">Project Command</h2>
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Infrastructure Deployment Orchestration</p>
                </div>
                <button onClick={() => setShowProjForm(!showProjForm)} className="bg-blue-600 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-500 transition-all">Initialize Project</button>
             </div>

             {showProjForm && (
                <form onSubmit={e => { e.preventDefault(); addProject({...newProj, companyId: user.companyId}); setShowProjForm(false); }} className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4">
                   <div className="md:col-span-2"><input type="text" placeholder="Project Name" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500" value={newProj.name} onChange={e => setNewProj({...newProj, name: e.target.value})} required /></div>
                   <div><label className="text-[10px] text-slate-500 uppercase font-black ml-1">Start Date</label><input type="date" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white" value={newProj.startDate} onChange={e => setNewProj({...newProj, startDate: e.target.value})} required /></div>
                   <div><label className="text-[10px] text-slate-500 uppercase font-black ml-1">End Date</label><input type="date" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white" value={newProj.endDate} onChange={e => setNewProj({...newProj, endDate: e.target.value})} required /></div>
                   <button type="submit" className="md:col-span-2 bg-white text-slate-900 py-5 rounded-2xl font-black uppercase text-xs">Commit Registry</button>
                </form>
             )}
          </div>
        </div>
      )}

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {relevantProjects.map(p => {
           const progress = getProjectProgress(p.id);
           return (
             <div key={p.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col group hover:shadow-xl transition-all duration-500">
                <div className="flex justify-between items-start mb-6">
                   <div>
                      <h3 className="text-xl font-black text-blue-900 uppercase tracking-tight">{p.name}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{p.startDate} — {p.endDate}</p>
                   </div>
                   <div className="text-right">
                      <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${progress === 100 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                        {progress === 100 ? 'COMPLETED' : 'ACTIVE'}
                      </span>
                      <p className="text-[9px] font-black text-gray-300 mt-2 uppercase tracking-widest">{progress}% DONE</p>
                   </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-gray-100 rounded-full mb-8 overflow-hidden">
                   <div 
                    className="h-full bg-blue-600 transition-all duration-1000" 
                    style={{ width: `${progress}%` }}
                   ></div>
                </div>

                <div className="flex-1 space-y-3 mb-8">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2 mb-4">Milestone Progress</p>
                   {state.tasks.filter(t => t.projectId === p.id).map(t => (
                     <button 
                      key={t.id} 
                      onClick={() => handleToggleTaskStatus(t)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-white hover:shadow-md rounded-2xl border border-gray-100 transition-all text-left"
                     >
                        <div className="flex items-center space-x-3">
                           <div className={`w-3 h-3 rounded-full shadow-sm ${t.status === 'DONE' ? 'bg-green-500' : t.status === 'IN_PROGRESS' ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                           <span className={`text-xs font-bold ${t.status === 'DONE' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{t.name}</span>
                        </div>
                        <div className="text-right">
                           <span className="text-[8px] font-black text-blue-400 uppercase block">{state.users.find(u => u.id === t.assignedTo)?.name.split(' ')[0]}</span>
                           <span className={`text-[7px] font-black uppercase tracking-tighter ${t.status === 'DONE' ? 'text-green-600' : 'text-orange-500'}`}>{t.status}</span>
                        </div>
                     </button>
                   ))}
                   {state.tasks.filter(t => t.projectId === p.id).length === 0 && (
                     <p className="text-center py-4 text-gray-300 font-bold text-[10px] uppercase tracking-widest">No Milestones Defined</p>
                   )}
                </div>

                {isAdmin && (
                  <div className="pt-6 border-t border-gray-50">
                     <div className="flex gap-2">
                        <select className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold outline-none focus:border-blue-500" value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value, projectId: p.id})}>
                           <option value="">Assign Personnel...</option>
                           {state.users.filter(u => u.companyId === user.companyId).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <input type="text" placeholder="New Task..." className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold outline-none focus:border-blue-500" value={newTask.name} onChange={e => setNewTask({...newTask, name: e.target.value})} />
                        <button onClick={() => { if(!newTask.name || !newTask.assignedTo) return; addTask(newTask); setNewTask({name:'', projectId:'', assignedTo:''}); }} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-50">Add</button>
                     </div>
                  </div>
                )}
             </div>
           );
         })}
      </div>
    </div>
  );
};

export default ProjectConsole;
