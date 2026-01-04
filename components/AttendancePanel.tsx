
import React, { useState, useEffect, useMemo } from 'react';
import { User, AppState, UserRole, Site, Attendance } from '../types';

interface Props {
  user: User;
  state: AppState;
  markAttendance: (userId: string, companyId: string, type: 'IN' | 'OUT', coords?: { lat: number; lng: number }, overtimeHours?: number, manualDate?: string, manualTime?: string, siteId?: string) => void;
  updateAttendance: (id: string, updates: Partial<Attendance>) => Promise<void>;
  removeAttendance?: (id: string) => Promise<void>;
  addSite: (site: Omit<Site, 'id'>) => Promise<void>;
  removeSite: (id: string) => Promise<void>;
}

const GEOFENCE_RADIUS = 100;

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const calculateHours = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const s = start.split(':').map(Number);
  const e = end.split(':').map(Number);
  const startMins = s[0] * 60 + s[1];
  const endMins = e[0] * 60 + e[1];
  return Math.max(0, (endMins - startMins) / 60);
};

const getCurrentTimeStr = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

const AttendancePanel: React.FC<Props> = ({ user, state, markAttendance, updateAttendance, removeAttendance, addSite, removeSite }) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedSite, setSelectedSite] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [distanceToSite, setDistanceToSite] = useState<number | null>(null);

  const [manualAtt, setManualAtt] = useState({ userId: '', date: new Date().toISOString().split('T')[0], checkIn: '09:00', checkOut: '18:00', siteId: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Attendance>>({});

  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const companySites = state.sites.filter(s => s.companyId === user.companyId);
  const companyPersonnel = state.users.filter(u => u.companyId === user.companyId && u.role !== UserRole.SUPER_ADMIN);
  
  const today = new Date().toISOString().split('T')[0];
  const att = state.attendance.find(a => a.userId === user.id && a.date === today);

  const handleLocate = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        setIsLocating(false);
        if (selectedSite) {
          const site = companySites.find(s => s.id === selectedSite);
          if (site) setDistanceToSite(getDistance(c.lat, c.lng, site.lat, site.lng));
        }
      },
      () => {
        setIsLocating(false);
        setCoords({ lat: 0, lng: 0 }); 
      }
    );
  };

  useEffect(() => { handleLocate(); }, [selectedSite]);

  const handlePunch = (type: 'IN' | 'OUT') => {
    if (type === 'IN') {
      if (!selectedSite) return alert("Select a Project Site (Node).");
      if (!coords) return alert("Waiting for Satellite GPS Sync...");
      if (distanceToSite && distanceToSite > GEOFENCE_RADIUS) {
        return alert(`Geofence Breach: You are ${Math.round(distanceToSite)}m away.`);
      }
      markAttendance(user.id, user.companyId, 'IN', coords, 0, today, undefined, selectedSite);
    } else {
      markAttendance(user.id, user.companyId, 'OUT', coords || undefined, 0, today);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAtt.userId || !manualAtt.date || !manualAtt.siteId) return alert("Administrative data entry incomplete.");
    
    // Check for sequence logic
    if (manualAtt.checkOut && manualAtt.checkOut < manualAtt.checkIn) {
      return alert("Sequence Error: Check-OUT cannot precede Check-IN.");
    }

    const conflict = state.attendance.find(a => a.userId === manualAtt.userId && a.date === manualAtt.date);
    if (conflict) return alert("Duplicate Entry: Record already exists for this date.");

    markAttendance(manualAtt.userId, user.companyId, 'IN', undefined, 0, manualAtt.date, manualAtt.checkIn, manualAtt.siteId);
    if (manualAtt.checkOut) {
      markAttendance(manualAtt.userId, user.companyId, 'OUT', undefined, 0, manualAtt.date, manualAtt.checkOut);
    }
    
    alert("Manual override committed.");
    setManualAtt({ userId: '', date: today, checkIn: '09:00', checkOut: '18:00', siteId: '' });
  };

  const handleForcePunchOut = async (logId: string) => {
    if (confirm("FORCE TERMINATION: Clock out this personnel with current server time?")) {
      const time = getCurrentTimeStr();
      await updateAttendance(logId, { checkOut: time });
      alert(`Session closed at ${time}`);
    }
  };

  const handleStartEdit = (log: Attendance) => {
    setEditingId(log.id);
    setEditForm(log);
  };

  const handleSaveEdit = async () => {
    if (editingId && editForm) {
      await updateAttendance(editingId, editForm);
      setEditingId(null);
      alert("Ledger updated.");
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (confirm("PERMANENT PURGE: Remove this attendance record from the global ledger?")) {
      if (removeAttendance) await removeAttendance(id);
      else alert("Purge capability restricted.");
    }
  };

  const filteredAttendance = useMemo(() => {
    return state.attendance
      .filter(a => {
        if (isAdmin) return a.companyId === user.companyId;
        if (user.role === UserRole.SUPERVISOR) {
          const emp = state.users.find(u => u.id === a.userId);
          return emp?.supervisorId === user.id || a.userId === user.id;
        }
        return a.userId === user.id;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.attendance, user, isAdmin]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Terminal Card */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="flex justify-between items-center mb-10 relative z-10">
            <div>
              <h3 className="text-xl font-black uppercase text-blue-900 tracking-tighter">Terminal Punch</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{today}</p>
            </div>
            <button onClick={handleLocate} disabled={isLocating} className="p-3 bg-blue-50 text-blue-600 rounded-2xl transition-all active:scale-90 hover:bg-blue-100">
              <svg className={`w-6 h-6 ${isLocating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
            </button>
          </div>

          {!att ? (
            <div className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Node Selection</label>
                <select className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs uppercase" value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
                  <option value="">Choose Site Node...</option>
                  {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <button onClick={() => handlePunch('IN')} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-blue-900/10 hover:bg-blue-700 active:scale-95 transition-all">Establish Presence</button>
            </div>
          ) : !att.checkOut ? (
            <div className="text-center space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-blue-900 p-12 rounded-[2.5rem] border-4 border-blue-800 shadow-inner">
                <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-4">Personnel Active</p>
                <p className="text-5xl font-black text-white tracking-tighter">{att.checkIn}</p>
              </div>
              <button onClick={() => handlePunch('OUT')} className="w-full bg-orange-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-orange-900/10 hover:bg-orange-700 active:scale-95 transition-all">Close Cycle</button>
            </div>
          ) : (
            <div className="bg-slate-50 p-12 rounded-[2.5rem] text-center border border-slate-100 relative z-10 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                 <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Cycle Finalized</p>
            </div>
          )}
        </div>

        {/* Enhanced Manual Overwrite Card */}
        {isAdmin && (
           <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-sm font-black uppercase text-slate-800 mb-6 flex items-center"><span className="w-2 h-4 bg-orange-500 rounded-full mr-3"></span> Proxy Punch</h3>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                 <select required className="w-full p-4 bg-slate-50 border rounded-xl font-bold text-xs" value={manualAtt.userId} onChange={e => setManualAtt({...manualAtt, userId: e.target.value})}>
                    <option value="">Target Personnel...</option>
                    {companyPersonnel.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                 </select>
                 <div className="grid grid-cols-2 gap-4">
                    <input type="date" required className="p-4 bg-slate-50 border rounded-xl font-black text-xs" value={manualAtt.date} onChange={e => setManualAtt({...manualAtt, date: e.target.value})} />
                    <select required className="p-4 bg-slate-50 border rounded-xl font-bold text-xs" value={manualAtt.siteId} onChange={e => setManualAtt({...manualAtt, siteId: e.target.value})}>
                       <option value="">Site Node...</option>
                       {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <input type="time" required className="w-full p-4 bg-slate-50 border rounded-xl font-black text-xs" value={manualAtt.checkIn} onChange={e => setManualAtt({...manualAtt, checkIn: e.target.value})} />
                      <button type="button" onClick={() => setManualAtt({...manualAtt, checkIn: getCurrentTimeStr()})} className="absolute top-1 right-1 px-2 py-1 bg-white border text-[8px] font-black uppercase rounded shadow-sm">Now</button>
                    </div>
                    <div className="relative">
                      <input type="time" className="w-full p-4 bg-slate-50 border rounded-xl font-black text-xs" value={manualAtt.checkOut} onChange={e => setManualAtt({...manualAtt, checkOut: e.target.value})} />
                      <button type="button" onClick={() => setManualAtt({...manualAtt, checkOut: getCurrentTimeStr()})} className="absolute top-1 right-1 px-2 py-1 bg-white border text-[8px] font-black uppercase rounded shadow-sm">Now</button>
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl mt-4">Commit Proxy Entry</button>
              </form>
           </div>
        )}

        {/* Node Status Card */}
        {isAdmin && (
           <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
              <h3 className="text-sm font-black uppercase text-slate-800 mb-6 flex items-center"><span className="w-2 h-4 bg-blue-600 rounded-full mr-3"></span> Site Activity</h3>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 max-h-[300px]">
                 {companySites.map(s => {
                   const activeHere = filteredAttendance.filter(a => a.siteId === s.id && !a.checkOut).length;
                   return (
                     <div key={s.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <div><p className="text-xs font-black uppercase text-blue-900">{s.name}</p></div>
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${activeHere > 0 ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                         {activeHere} Active
                       </span>
                     </div>
                   );
                 })}
              </div>
           </div>
        )}
      </div>

      {/* Advanced Registry */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
          <div><h3 className="text-xl font-black uppercase text-blue-900 tracking-tighter">Admin Ledger</h3></div>
          <span className="bg-blue-600 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase">{filteredAttendance.length} Entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Personnel / Date</th>
                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Cycle Protocol</th>
                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Work Hrs</th>
                {isAdmin && <th className="px-8 py-5 text-[9px] font-black text-blue-600 uppercase tracking-widest text-right">System Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAttendance.map((log) => {
                const personnel = state.users.find(u => u.id === log.userId);
                const isEditing = editingId === log.id;
                const totalHours = log.checkOut ? calculateHours(log.checkIn, log.checkOut) : 0;

                return (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-6">
                      <p className="text-xs font-black text-slate-800 uppercase">{personnel?.name || log.userId}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{log.date}</p>
                    </td>
                    <td className="px-8 py-6">
                      {isEditing ? (
                        <div className="flex items-center space-x-2">
                           <input type="time" className="p-1 border text-[10px]" value={editForm.checkIn} onChange={e => setEditForm({...editForm, checkIn: e.target.value})} />
                           <span className="text-slate-300">→</span>
                           <input type="time" className="p-1 border text-[10px]" value={editForm.checkOut || ''} onChange={e => setEditForm({...editForm, checkOut: e.target.value})} />
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3 text-[10px] font-black">
                          <span className="text-gray-800">{log.checkIn}</span>
                          <span className="text-slate-300">→</span>
                          <span className={log.checkOut ? 'text-gray-800' : 'text-blue-500 animate-pulse'}>{log.checkOut || 'ACTIVE'}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 text-center text-sm font-black text-slate-700">{totalHours.toFixed(2)}</td>
                    {isAdmin && (
                      <td className="px-8 py-6 text-right space-x-3">
                         {isEditing ? (
                           <button onClick={handleSaveEdit} className="text-green-600 text-[9px] font-black uppercase">Save</button>
                         ) : (
                           <>
                             {!log.checkOut && (
                               <button onClick={() => handleForcePunchOut(log.id)} className="text-orange-600 text-[9px] font-black uppercase bg-orange-50 px-2 py-1 rounded">Force Out</button>
                             )}
                             <button onClick={() => handleStartEdit(log)} className="text-blue-600 text-[9px] font-black uppercase">Edit</button>
                             <button onClick={() => handleDeleteRecord(log.id)} className="text-red-300 hover:text-red-600 text-[9px] font-black uppercase">Purge</button>
                           </>
                         )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendancePanel;
