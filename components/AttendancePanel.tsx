
import React, { useState, useEffect, useMemo } from 'react';
import { User, AppState, UserRole, Site, Attendance } from '../types';

interface Props {
  user: User;
  state: AppState;
  markAttendance: (userId: string, companyId: string, type: 'IN' | 'OUT', coords?: { lat: number; lng: number }, overtimeHours?: number, manualDate?: string, manualTime?: string, siteId?: string) => void;
  updateAttendance: (id: string, updates: Partial<Attendance>) => Promise<void>;
  addSite: (site: Omit<Site, 'id'>) => Promise<void>;
  removeSite: (id: string) => Promise<void>;
}

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
  // Simple time calculation for the same day
  const startMins = s[0] * 60 + s[1];
  const endMins = e[0] * 60 + e[1];
  return Math.max(0, (endMins - startMins) / 60);
};

const AttendancePanel: React.FC<Props> = ({ user, state, markAttendance, addSite, removeSite }) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedSite, setSelectedSite] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [distanceToSite, setDistanceToSite] = useState<number | null>(null);

  // Manual entry state for Admins
  const [manualAtt, setManualAtt] = useState({ userId: '', date: '', checkIn: '09:00', checkOut: '18:00', siteId: '' });

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
      if (!selectedSite) return alert("Please select a work site first.");
      if (!coords) return alert("GPS location is required to punch in.");
      
      const alreadyLogged = state.attendance.some(a => a.userId === user.id && a.date === today);
      if (alreadyLogged) return alert("System Error: You have already marked attendance for today.");

      if (distanceToSite && distanceToSite > 500) {
        return alert(`Violation: You are ${Math.round(distanceToSite)}m away from site. Maximum allowed limit is 500m.`);
      }
      markAttendance(user.id, user.companyId, 'IN', coords, 0, today, undefined, selectedSite);
    } else {
      markAttendance(user.id, user.companyId, 'OUT', coords || undefined, 0, today);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAtt.userId || !manualAtt.date || !manualAtt.siteId) return alert("Complete all required fields.");
    
    const conflict = state.attendance.find(a => a.userId === manualAtt.userId && a.date === manualAtt.date);
    if (conflict) {
      return alert(`CRITICAL CONFLICT: Personnel already has an attendance record on this date.`);
    }

    markAttendance(manualAtt.userId, user.companyId, 'IN', undefined, 0, manualAtt.date, manualAtt.checkIn, manualAtt.siteId);
    markAttendance(manualAtt.userId, user.companyId, 'OUT', undefined, 0, manualAtt.date, manualAtt.checkOut);
    
    alert("Manual attendance protocol finalized.");
    setManualAtt({ userId: '', date: '', checkIn: '09:00', checkOut: '18:00', siteId: '' });
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
      {/* Primary Punch Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
          </div>

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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Deployment Site</label>
                <select className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs uppercase outline-none focus:border-blue-400 transition-all" value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
                  <option value="">Choose Site Location...</option>
                  {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              
              {distanceToSite !== null && (
                <div className={`p-4 rounded-2xl text-center text-[10px] font-black uppercase border animate-in zoom-in-95 ${distanceToSite <= 500 ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                  {distanceToSite <= 500 ? `Safe Zone Verified: Site in Range (${Math.round(distanceToSite)}m)` : `Outside Authorized Zone: ${Math.round(distanceToSite)}m away`}
                </div>
              )}
              
              <button onClick={() => handlePunch('IN')} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-blue-900/10 hover:bg-blue-700 transition-all active:scale-95">Verify & Punch In</button>
            </div>
          ) : !att.checkOut ? (
            <div className="text-center space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-blue-900 p-12 rounded-[2.5rem] border-4 border-blue-800 shadow-inner">
                <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-4">Shift Authorization Live</p>
                <p className="text-5xl font-black text-white tracking-tighter">{att.checkIn}</p>
                <p className="text-[8px] font-black text-blue-400 uppercase mt-4 tracking-[0.4em]">Node: {att.siteId?.slice(-6) || 'N/A'}</p>
              </div>
              <button onClick={() => handlePunch('OUT')} className="w-full bg-orange-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-orange-900/10 hover:bg-orange-700 transition-all active:scale-95">Terminate Shift (Punch Out)</button>
            </div>
          ) : (
            <div className="bg-slate-50 p-12 rounded-[2.5rem] text-center border border-slate-100 relative z-10 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                 <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Today's Protocol Completed</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">One Attendance Record Limit Reached</p>
              
              <div className="flex justify-center space-x-12 mt-8 pt-8 border-t border-slate-200/50">
                <div><p className="text-[8px] font-black uppercase text-slate-400 mb-1">In Bound</p><p className="font-black text-blue-600 text-lg uppercase">{att.checkIn}</p></div>
                <div className="w-px h-8 bg-slate-200 self-center"></div>
                <div><p className="text-[8px] font-black uppercase text-slate-400 mb-1">Out Bound</p><p className="font-black text-orange-600 text-lg uppercase">{att.checkOut}</p></div>
              </div>
            </div>
          )}
        </div>

        {/* Manual Entry Form */}
        {isAdmin && (
           <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-sm font-black uppercase text-slate-800 mb-6 flex items-center">
                <span className="w-2 h-4 bg-orange-500 rounded-full mr-3"></span>
                Manual Protocol
              </h3>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Personnel</label>
                    <select required className="w-full p-4 bg-slate-50 border rounded-xl font-bold text-xs" value={manualAtt.userId} onChange={e => setManualAtt({...manualAtt, userId: e.target.value})}>
                      <option value="">Choose User...</option>
                      {companyPersonnel.map(u => <option key={u.id} value={u.id}>{u.name} ({u.id})</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Date</label>
                      <input type="date" required className="w-full p-4 bg-slate-50 border rounded-xl font-black text-xs" value={manualAtt.date} onChange={e => setManualAtt({...manualAtt, date: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Node</label>
                      <select required className="w-full p-4 bg-slate-50 border rounded-xl font-bold text-xs" value={manualAtt.siteId} onChange={e => setManualAtt({...manualAtt, siteId: e.target.value})}>
                        <option value="">Site...</option>
                        {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Time In</label>
                      <input type="time" required className="w-full p-4 bg-slate-50 border rounded-xl font-black text-xs" value={manualAtt.checkIn} onChange={e => setManualAtt({...manualAtt, checkIn: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Time Out</label>
                      <input type="time" required className="w-full p-4 bg-slate-50 border rounded-xl font-black text-xs" value={manualAtt.checkOut} onChange={e => setManualAtt({...manualAtt, checkOut: e.target.value})} />
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl mt-4">Commit Overwrite</button>
              </form>
           </div>
        )}

        {/* Active Sites Registry */}
        {isAdmin && (
           <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
              <h3 className="text-sm font-black uppercase text-slate-800 mb-6 flex items-center">
                <span className="w-2 h-4 bg-blue-600 rounded-full mr-3"></span>
                Active Sites
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 max-h-[300px]">
                 {companySites.map(s => (
                   <div key={s.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-sm transition-all group">
                     <div>
                       <p className="text-xs font-black uppercase text-blue-900 group-hover:text-blue-600 transition-colors">{s.name}</p>
                       <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Geo: {s.lat.toFixed(4)}, {s.lng.toFixed(4)}</p>
                     </div>
                     <button onClick={() => removeSite(s.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                   </div>
                 ))}
                 {companySites.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-10">
                      <p className="text-[10px] font-black uppercase tracking-widest">No site nodes registered</p>
                   </div>
                 )}
              </div>
           </div>
        )}
      </div>

      {/* Attendance Registry with OT Calculations */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-xl font-black uppercase text-blue-900 tracking-tighter">Presence Registry</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Real-time Personnel Tracking & Overtime Calculations</p>
          </div>
          <div className="flex items-center space-x-3">
             <span className="bg-blue-600 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg shadow-blue-900/10">{filteredAttendance.length} Records</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Personnel / Date</th>
                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">In / Out Protocol</th>
                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Duration</th>
                <th className="px-8 py-5 text-[9px] font-black text-blue-600 uppercase tracking-widest text-center">Verification Status</th>
                <th className="px-8 py-5 text-[9px] font-black text-orange-600 uppercase tracking-widest text-center bg-orange-50/30">Overtime Hours</th>
                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Overtime Rate</th>
                <th className="px-8 py-5 text-[9px] font-black text-green-600 uppercase tracking-widest text-right">OT Pay (Accrued)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAttendance.map((log) => {
                const personnel = state.users.find(u => u.id === log.userId);
                const site = companySites.find(s => s.id === log.siteId);
                const totalHours = log.checkOut ? calculateHours(log.checkIn, log.checkOut) : 0;
                // OT calculation: any hours beyond 8 are counted as OT
                const overtimeHours = Math.max(0, totalHours - 8);
                const otRate = personnel?.overtimeRate || 0;
                const otPay = overtimeHours * otRate;

                // Verification Status Logic
                let verificationStatus = 'Location Data Missing';
                if (log.lat !== undefined && log.lng !== undefined && log.lat !== 0 && site) {
                  const dist = getDistance(log.lat, log.lng, site.lat, site.lng);
                  if (dist <= 100) {
                    verificationStatus = 'GPS Verified';
                  }
                }

                return (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6">
                      <p className="text-xs font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{personnel?.name || log.userId}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{log.date}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-3">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-gray-800">{log.checkIn}</span>
                           <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Punch In</span>
                        </div>
                        <span className="text-slate-300 font-black">→</span>
                        <div className="flex flex-col">
                           <span className={`text-[10px] font-black ${log.checkOut ? 'text-gray-800' : 'text-blue-500 animate-pulse'}`}>{log.checkOut || 'ACTIVE'}</span>
                           <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Punch Out</span>
                        </div>
                      </div>
                      <p className="text-[7px] font-black text-orange-500 uppercase mt-2 tracking-[0.2em]">{site?.name || 'FIELD NODE'}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <span className="text-sm font-black text-slate-700">{totalHours.toFixed(2)} <span className="text-[8px] text-slate-400 font-bold uppercase">Hrs</span></span>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <span className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase border ${verificationStatus === 'GPS Verified' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                         {verificationStatus}
                       </span>
                    </td>
                    <td className="px-8 py-6 text-center bg-orange-50/20">
                       <span className={`text-sm font-black ${overtimeHours > 0 ? 'text-orange-600' : 'text-slate-300'}`}>
                         {overtimeHours > 0 ? `+${overtimeHours.toFixed(2)}` : '0.00'}
                       </span>
                       {overtimeHours > 0 && <p className="text-[7px] font-bold text-orange-400 uppercase tracking-tighter mt-0.5">Shift Overflow</p>}
                    </td>
                    <td className="px-8 py-6 text-center">
                       <span className="text-[10px] font-black text-slate-500 italic">₹{otRate}/hr</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <p className="text-sm font-black text-green-600">₹{otPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                       {overtimeHours > 0 && <span className="text-[7px] font-black text-green-400 uppercase tracking-[0.2em]">Accrued Benefit</span>}
                    </td>
                  </tr>
                );
              })}
              {filteredAttendance.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-20">
                       <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       <p className="text-xs font-black uppercase tracking-widest">No Presence Data Detected in Cluster</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendancePanel;
