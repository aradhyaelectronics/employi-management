
import React, { useState, useEffect, useMemo } from 'react';
import { User, AppState, UserRole, Site, RequestStatus, Attendance } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  user: User;
  state: AppState;
  markAttendance: (userId: string, companyId: string, type: 'IN' | 'OUT', coords?: { lat: number; lng: number }, overtimeHours?: number, manualDate?: string, manualTime?: string, siteId?: string) => void;
  updateAttendance: (id: string, updates: Partial<Attendance>) => Promise<void>;
  addSite: (site: Omit<Site, 'id'>) => Promise<void>;
  removeSite: (id: string) => Promise<void>;
}

// Haversine formula to calculate distance between two coordinates in meters
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
};

const AttendancePanel: React.FC<Props> = ({ user, state, markAttendance, updateAttendance, addSite, removeSite }) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [newSite, setNewSite] = useState({ name: '', address: '', lat: 0, lng: 0 });
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const companySites = useMemo(() => state.sites.filter(s => s.companyId === user.companyId), [state.sites, user.companyId]);
  
  const todayAttendance = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return state.attendance.find(a => a.userId === user.id && a.date === today);
  }, [state.attendance, user.id]);

  useEffect(() => {
    handleLocate();
  }, []);

  const handleLocate = () => {
    setIsLocating(true);
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      (err) => {
        setError("Unable to retrieve location. Please enable GPS.");
        setIsLocating(false);
      }
    );
  };

  const handlePunchIn = () => {
    if (!selectedSite) return alert("Please select a project site.");
    if (!coords) return alert("Location data missing. Please enable GPS.");

    const site = companySites.find(s => s.id === selectedSite);
    if (site) {
      const dist = getDistance(coords.lat, coords.lng, site.lat, site.lng);
      if (dist > 500) { // 500m geofence
        return alert(`Geofence Violation: You are ${Math.round(dist)}m away from the site. Minimum required: 500m.`);
      }
    }

    markAttendance(user.id, user.companyId, 'IN', coords, 0, undefined, undefined, selectedSite);
    alert("Clock-in recorded successfully.");
  };

  const handlePunchOut = () => {
    markAttendance(user.id, user.companyId, 'OUT', coords || undefined);
    alert("Clock-out recorded successfully.");
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSite.name || !newSite.lat || !newSite.lng) return;
    await addSite({ ...newSite, companyId: user.companyId });
    setNewSite({ name: '', address: '', lat: 0, lng: 0 });
    alert("Site added to registry.");
  };

  // Determine current punch status
  const shiftStatus = useMemo(() => {
    if (!todayAttendance) return 'NOT_STARTED';
    if (todayAttendance.checkIn && !todayAttendance.checkOut) return 'CLOCKED_IN';
    if (todayAttendance.checkIn && todayAttendance.checkOut) return 'COMPLETED';
    return 'UNKNOWN';
  }, [todayAttendance]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Attendance Action Card */}
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col justify-between">
           <div>
             <div className="flex justify-between items-start mb-8">
                <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Punch Ledger</h3>
                <button onClick={handleLocate} disabled={isLocating} className="p-3 bg-gray-50 rounded-2xl text-blue-600 hover:bg-blue-100 transition-colors">
                  <svg className={`w-6 h-6 ${isLocating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
             </div>

             <div className="mb-8 p-6 bg-blue-50 rounded-3xl border border-blue-100">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Live Telemetry</p>
                {coords ? (
                  <p className="text-xs font-bold text-blue-900">GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>
                ) : (
                  <p className="text-xs font-bold text-orange-600 italic">Acquiring satellite signal...</p>
                )}
                {error && <p className="text-[10px] text-red-600 font-black uppercase mt-2">{error}</p>}
             </div>

             {shiftStatus === 'NOT_STARTED' && (
               <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Active Project Site</label>
                  <select 
                    className="w-full px-5 py-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none focus:border-blue-300 transition-all"
                    value={selectedSite}
                    onChange={e => setSelectedSite(e.target.value)}
                  >
                    <option value="">Choose Site...</option>
                    {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button 
                    onClick={handlePunchIn}
                    disabled={!coords}
                    className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                  >
                    Transmit Clock In
                  </button>
               </div>
             )}

             {shiftStatus === 'CLOCKED_IN' && todayAttendance && (
               <div className="space-y-6">
                  <div className="flex items-center justify-between p-6 bg-green-50 rounded-3xl border border-green-100">
                     <div>
                        <p className="text-[9px] font-black text-green-600 uppercase tracking-widest">Shift Active</p>
                        <p className="text-2xl font-black text-green-900">{todayAttendance.checkIn}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[9px] font-black text-green-600 uppercase tracking-widest">Target Site</p>
                        <p className="text-sm font-black text-green-900 uppercase">{companySites.find(s => s.id === todayAttendance.siteId)?.name || 'General'}</p>
                     </div>
                  </div>
                  
                  <button 
                    onClick={handlePunchOut}
                    className="w-full bg-orange-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-orange-100 hover:bg-orange-700 active:scale-95 transition-all"
                  >
                    Transmit Clock Out
                  </button>
               </div>
             )}

             {shiftStatus === 'COMPLETED' && todayAttendance && (
               <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Session Finalized</p>
                    <p className="text-lg font-black text-slate-800 uppercase tracking-tighter">Cycle Complete for Today</p>
                  </div>
                  <div className="flex justify-around pt-4 border-t border-slate-100">
                    <div><p className="text-[8px] font-black text-slate-400 uppercase">In</p><p className="font-black text-slate-800">{todayAttendance.checkIn}</p></div>
                    <div><p className="text-[8px] font-black text-slate-400 uppercase">Out</p><p className="font-black text-slate-800">{todayAttendance.checkOut}</p></div>
                  </div>
               </div>
             )}
           </div>
           
           <div className="mt-8 pt-6 border-t border-gray-50">
              <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] text-center italic">One Cycle Per Day Protocol Active</p>
           </div>
        </div>

        {/* Site Management Panel */}
        {isAdmin && (
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
             <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter mb-8">Site Registry</h3>
             <form onSubmit={handleAddSite} className="space-y-4 mb-10">
                <input type="text" placeholder="Project Site Name" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none" value={newSite.name} onChange={e => setNewSite({...newSite, name: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                   <input type="number" step="any" placeholder="Latitude" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none" value={newSite.lat || ''} onChange={e => setNewSite({...newSite, lat: parseFloat(e.target.value)})} required />
                   <input type="number" step="any" placeholder="Longitude" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none" value={newSite.lng || ''} onChange={e => setNewSite({...newSite, lng: parseFloat(e.target.value)})} required />
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Enroll New Site</button>
             </form>

             <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {companySites.map(s => (
                  <div key={s.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group transition-all">
                     <div>
                        <p className="text-xs font-black text-blue-900 uppercase">{s.name}</p>
                        <p className="text-[9px] font-bold text-gray-400 mt-0.5">{s.lat.toFixed(3)}, {s.lng.toFixed(3)}</p>
                     </div>
                     <button onClick={() => removeSite(s.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* Global Attendance Ledger */}
      {isAdmin && (
        <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
           <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter">Workforce Ledger</h3>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Daily Telemetry View</span>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50/50">
                    <tr>
                       <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Personnel</th>
                       <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                       <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Check In</th>
                       <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Check Out</th>
                       <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Site</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {state.attendance.filter(a => a.companyId === user.companyId).slice().reverse().map(a => {
                       const emp = state.users.find(u => u.id === a.userId);
                       const site = state.sites.find(s => s.id === a.siteId);
                       return (
                         <tr key={a.id} className="hover:bg-blue-50/20 transition-all">
                            <td className="px-8 py-5">
                               <p className="text-xs font-black text-gray-800 uppercase">{emp?.name || 'Unknown'}</p>
                               <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">{emp?.role}</p>
                            </td>
                            <td className="px-8 py-5 text-[11px] font-bold text-gray-500 whitespace-nowrap">{a.date}</td>
                            <td className="px-8 py-5 font-black text-blue-600 text-xs">{a.checkIn}</td>
                            <td className="px-8 py-5 font-black text-orange-600 text-xs">{a.checkOut || 'Active'}</td>
                            <td className="px-8 py-5 text-right font-black text-blue-900 text-[10px] uppercase">{site?.name || 'General'}</td>
                         </tr>
                       )
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePanel;
