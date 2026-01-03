
import React, { useState, useEffect } from 'react';
import { User, AppState, UserRole, Site, RequestStatus } from '../types';

interface Props {
  user: User;
  state: AppState;
  markAttendance: (userId: string, companyId: string, type: 'IN' | 'OUT', coords?: { lat: number; lng: number }, overtimeHours?: number, manualDate?: string, manualTime?: string) => void;
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
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

const AttendancePanel: React.FC<Props> = ({ user, state, markAttendance, addSite, removeSite }) => {
  const isSuper = user.role === UserRole.SUPER_ADMIN;
  const isAdmin = user.role === UserRole.ADMIN;
  const isSupervisor = user.role === UserRole.SUPERVISOR;
  const today = new Date().toISOString().split('T')[0];
  
  const companyAttendance = isSuper ? state.attendance.filter(a => a.date === today) : state.attendance.filter(a => a.companyId === user.companyId && a.date === today);
  const companySites = isSuper ? state.sites : state.sites.filter(s => s.companyId === user.companyId);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestSite, setNearestSite] = useState<{ site: Site, distance: number } | null>(null);
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [isLocating, setIsLocating] = useState(true);

  // Manual Entry State
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualData, setManualData] = useState({ userId: '', date: today, checkIn: '09:00', checkOut: '18:00', ot: 0 });

  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLocating(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition((pos) => {
      const currentCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(currentCoords);
      setIsLocating(false);

      if (companySites.length > 0) {
        let minDist = Infinity; 
        let closest: Site | null = null;
        companySites.forEach(s => {
          const d = getDistance(currentCoords.lat, currentCoords.lng, s.lat, s.lng);
          if (d < minDist) { minDist = d; closest = s; }
        });
        if (closest) setNearestSite({ site: closest, distance: minDist });
      }
    }, (error) => {
      console.error("GPS Error:", error);
      setIsLocating(false);
    }, { enableHighAccuracy: true });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [companySites.length]);

  const canPunch = isSuper || (nearestSite ? nearestSite.distance <= 100 : false);
  const isOnLeave = state.leaves.some(l => l.userId === user.id && l.status === RequestStatus.APPROVED && today >= l.fromDate && today <= l.toDate);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualData.userId) return alert("Select an employee.");
    
    try {
      markAttendance(manualData.userId, user.companyId, 'IN', undefined, 0, manualData.date, manualData.checkIn);
      markAttendance(manualData.userId, user.companyId, 'OUT', undefined, manualData.ot, manualData.date, manualData.checkOut);
      alert("Manual attendance synchronized with ledger.");
      setIsManualMode(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const manageableEmployees = state.users.filter(u => {
    const isSameCompany = u.companyId === user.companyId;
    if (isAdmin || isSuper) return isSameCompany && (u.role === UserRole.EMPLOYEE || u.role === UserRole.SUPERVISOR);
    if (isSupervisor) return isSameCompany && u.supervisorId === user.id;
    return false;
  });

  return (
    <div className="space-y-10">
      {/* 1. Operation Punch Section for Field Staff */}
      {!isSuper && user.role === UserRole.EMPLOYEE && (
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-gray-100 text-center max-w-xl mx-auto">
          <h2 className="text-3xl font-black text-blue-900 mb-2 uppercase tracking-tighter">Operation Punch</h2>
          <p className="text-gray-400 font-bold uppercase text-[10px] mb-8 tracking-[0.2em]">{new Date().toDateString()}</p>
          
          <div className="flex flex-col items-center gap-6">
            {isOnLeave && (
               <div className="w-full bg-red-50 p-4 rounded-2xl border border-red-100 mb-4">
                  <p className="text-red-600 text-[10px] font-black uppercase tracking-widest text-center">Active Approved Leave Detected</p>
               </div>
            )}

            <div className="flex justify-center gap-4 w-full">
              <button 
                onClick={() => markAttendance(user.id, user.companyId, 'IN', coords || undefined, 0)} 
                disabled={!!state.attendance.find(a => a.userId === user.id && a.date === today) || !canPunch || isOnLeave} 
                className={`flex-1 px-8 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${(!canPunch || isOnLeave) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white shadow-xl shadow-green-100 hover:bg-green-700 active:scale-95'}`}
              >
                Punch In
              </button>
              <button 
                onClick={() => markAttendance(user.id, user.companyId, 'OUT', coords || undefined, overtimeHours)} 
                disabled={!state.attendance.find(a => a.userId === user.id && a.date === today) || !!state.attendance.find(a => a.userId === user.id && a.date === today)?.checkOut} 
                className="flex-1 px-8 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-red-600 text-white shadow-xl shadow-red-100 disabled:opacity-50 transition-all hover:bg-red-700 active:scale-95"
              >
                Punch Out
              </button>
            </div>
            
            {!canPunch && !isOnLeave && (
               <p className="text-[9px] text-orange-500 font-bold uppercase tracking-widest mt-2 animate-pulse">Out of Geofence Range (Must be within 100m of Site)</p>
            )}
          </div>
        </div>
      )}

      {/* Manual Entry Form for Management & Supervisors */}
      {(isAdmin || isSupervisor || isSuper) && (
        <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
           <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center bg-blue-50/20 gap-4">
              <div>
                 <h3 className="text-lg font-black text-blue-900 uppercase tracking-tighter">Attendance Ledger Management</h3>
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Direct Overrides for {isSupervisor ? 'Your Team' : 'All Staff'}</p>
              </div>
              <button 
                onClick={() => setIsManualMode(!isManualMode)}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all"
              >
                {isManualMode ? 'Close Portal' : 'Add Manual Record'}
              </button>
           </div>
           
           {isManualMode && (
             <form onSubmit={handleManualSubmit} className="p-8 grid grid-cols-1 md:grid-cols-5 gap-6 items-end animate-in slide-in-from-top-4 duration-300">
                <div className="md:col-span-1">
                   <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Select Personnel</label>
                   <select className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none" value={manualData.userId} onChange={e => setManualData({...manualData, userId: e.target.value})} required>
                      <option value="">Choose Staff...</option>
                      {manageableEmployees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Work Date</label>
                   <input type="date" className="w-full px-4 py-2 bg-gray-50 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none" value={manualData.date} onChange={e => setManualData({...manualData, date: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Punch In</label>
                      <input type="time" className="w-full px-2 py-2 bg-gray-50 border rounded-xl text-xs font-bold" value={manualData.checkIn} onChange={e => setManualData({...manualData, checkIn: e.target.value})} />
                   </div>
                   <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Punch Out</label>
                      <input type="time" className="w-full px-2 py-2 bg-gray-50 border rounded-xl text-xs font-bold" value={manualData.checkOut} onChange={e => setManualData({...manualData, checkOut: e.target.value})} />
                   </div>
                </div>
                <div>
                   <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">OT Credited (Hrs)</label>
                   <input type="number" step="0.5" className="w-full px-4 py-2 bg-gray-50 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none" value={manualData.ot} onChange={e => setManualData({...manualData, ot: parseFloat(e.target.value) || 0})} />
                </div>
                <button type="submit" className="w-full bg-blue-700 text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-800 transition-all">Commit Entry</button>
             </form>
           )}
        </div>
      )}

      {/* Ledger View - Real-time + Manual Mix */}
      {(isAdmin || isSupervisor || isSuper) && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
            <div>
              <h3 className="font-black uppercase tracking-tighter text-blue-900 text-lg">Daily Workforce Status</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Verified Telemetry • {today}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Personnel</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Shift Data</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest text-center">OT (Hrs)</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest text-center">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {companyAttendance.slice().reverse().map((a, i) => {
                   const employee = state.users.find(u => u.id === a.userId);
                   const isGpsVerified = !!(a.lat && a.lng);

                   return (
                     <tr key={i} className="hover:bg-gray-50/30 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="font-black text-gray-800 text-xs uppercase tracking-tight">{employee?.name}</div>
                          <div className="text-[8px] text-blue-400 font-bold uppercase tracking-widest">{employee?.role}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-xs font-black text-gray-700">{a.checkIn} — {a.checkOut || 'Active'}</div>
                          <div className="text-[8px] text-gray-300 uppercase font-black">{a.date}</div>
                        </td>
                        <td className="px-8 py-6 text-center text-xs font-black text-orange-600">{a.overtimeHours ? `${a.overtimeHours}h` : '--'}</td>
                        <td className="px-8 py-6 text-center">
                          {isGpsVerified ? (
                            <span className="px-3 py-1 bg-green-50 text-green-600 rounded-xl text-[8px] font-black uppercase border border-green-100">GPS Verified</span>
                          ) : (
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-xl text-[8px] font-black uppercase border border-blue-100">Manual Entry</span>
                          )}
                        </td>
                     </tr>
                   );
                })}
                {companyAttendance.length === 0 && (
                   <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-gray-300 font-bold italic text-xs uppercase tracking-widest">No active attendance records for today.</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePanel;
