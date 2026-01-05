
import React, { useState, useEffect, useMemo } from 'react';
import { User, AppState, UserRole, Site, Attendance, UserStatus } from '../types';

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

const AttendancePanel: React.FC<Props> = ({ user, state, markAttendance, addSite, removeSite }) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedSite, setSelectedSite] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [distanceToSite, setDistanceToSite] = useState<number | null>(null);
  const [liveTimer, setLiveTimer] = useState('00:00:00');

  // Site Management State
  const [siteForm, setSiteForm] = useState({ name: '', address: '', lat: 0, lng: 0 });
  const [isAddingSite, setIsAddingSite] = useState(false);

  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const companySites = state.sites.filter(s => s.companyId === user.companyId);
  
  const today = new Date().toISOString().split('T')[0];
  const att = state.attendance.find(a => a.userId === user.id && a.date === today);

  useEffect(() => {
    let interval: any;
    if (att && att.checkIn && !att.checkOut) {
      interval = setInterval(() => {
        const now = new Date();
        const [h, m] = att.checkIn.split(':').map(Number);
        const startTime = new Date();
        startTime.setHours(h, m, 0);
        const diff = Math.max(0, now.getTime() - startTime.getTime());
        const hh = Math.floor(diff / 3600000);
        const mm = Math.floor((diff % 3600000) / 60000);
        const ss = Math.floor((diff % 60000) / 1000);
        setLiveTimer(`${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`);
      }, 1000);
    } else {
      setLiveTimer('00:00:00');
    }
    return () => clearInterval(interval);
  }, [att]);

  const handleLocate = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported.");
      setIsLocating(false);
      return;
    }
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
        alert("GPS Error: Satellite connection lost.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePunch = (type: 'IN' | 'OUT') => {
    if (type === 'IN') {
      if (!selectedSite) return alert("Select a Project Site Node.");
      if (!coords) return alert("Waiting for Satellite GPS Sync...");
      if (distanceToSite && distanceToSite > GEOFENCE_RADIUS) {
        return alert(`Geofence Breach: Move closer to the site (${Math.round(distanceToSite)}m away).`);
      }
      markAttendance(user.id, user.companyId, 'IN', coords, 0, today, undefined, selectedSite);
    } else {
      if (confirm("Confirm Shift Termination?")) {
        markAttendance(user.id, user.companyId, 'OUT', coords || undefined, 0, today);
      }
    }
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteForm.name || siteForm.lat === 0) return alert("Name and coordinates required.");
    await addSite({ ...siteForm, companyId: user.companyId });
    setSiteForm({ name: '', address: '', lat: 0, lng: 0 });
    setIsAddingSite(false);
    alert("Project Site Integrated.");
  };

  const captureSiteLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      setSiteForm({ ...siteForm, lat: pos.coords.latitude, lng: pos.coords.longitude });
      setIsLocating(false);
    }, () => setIsLocating(false));
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Attendance Main Terminal */}
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Attendance Terminal</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{today}</p>
              </div>
              <button onClick={handleLocate} disabled={isLocating} className="p-4 rounded-2xl bg-blue-50 text-blue-600 transition-all active:scale-95 shadow-sm">
                <svg className={`w-6 h-6 ${isLocating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
              </button>
            </div>

            {!att ? (
              <div className="space-y-8">
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                  <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Project Site Node</label>
                  <select className="w-full bg-white px-5 py-4 rounded-2xl font-black text-xs uppercase text-slate-700 outline-none" value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
                    <option value="">Choose Site...</option>
                    {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {selectedSite && distanceToSite !== null && (
                    <div className="mt-4 text-center">
                       <span className={`text-[10px] font-black uppercase ${distanceToSite <= GEOFENCE_RADIUS ? 'text-green-600' : 'text-red-500'}`}>
                         {Math.round(distanceToSite)}m {distanceToSite <= GEOFENCE_RADIUS ? '✓ Within Range' : '⚠ Breach'}
                       </span>
                    </div>
                  )}
                </div>
                <button onClick={() => handlePunch('IN')} disabled={!selectedSite} className={`w-full py-8 rounded-[2.5rem] font-black text-lg uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 ${!selectedSite ? 'bg-gray-100 text-gray-400' : 'bg-green-600 text-white shadow-green-900/10'}`}>Clock In</button>
              </div>
            ) : !att.checkOut ? (
              <div className="space-y-8 animate-in zoom-in-95 duration-300">
                <div className="bg-blue-900 p-12 rounded-[2.5rem] text-center border-4 border-blue-800 shadow-2xl">
                   <p className="text-[10px] font-black text-blue-300 uppercase tracking-[0.3em] mb-4">On Duty • Live</p>
                   <p className="text-5xl font-black text-white tracking-tighter mb-2">{liveTimer}</p>
                   <p className="text-[10px] font-black text-blue-400 uppercase">Started at {att.checkIn}</p>
                </div>
                <button onClick={() => handlePunch('OUT')} className="w-full bg-orange-600 text-white py-8 rounded-[2.5rem] font-black text-lg uppercase tracking-[0.2em] shadow-2xl shadow-orange-900/10 hover:bg-orange-700 active:scale-95 transition-all">Clock Out</button>
              </div>
            ) : (
              <div className="bg-slate-50 p-16 rounded-[3rem] text-center border-2 border-dashed border-slate-200">
                <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-4">Shift Completed</h4>
                <div className="flex justify-center gap-10">
                  <div className="text-center"><p className="text-[8px] font-black text-slate-400 uppercase">IN</p><p className="text-sm font-black text-slate-700">{att.checkIn}</p></div>
                  <div className="text-center"><p className="text-[8px] font-black text-slate-400 uppercase">OUT</p><p className="text-sm font-black text-slate-700">{att.checkOut}</p></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Site Management Panel (Admin only) */}
        {isAdmin && (
           <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Project Sites</h3>
                 <button onClick={() => setIsAddingSite(!isAddingSite)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-xl">Add New Site</button>
              </div>

              {isAddingSite && (
                 <form onSubmit={handleAddSite} className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 mb-8 space-y-4 animate-in slide-in-from-top-4">
                    <input type="text" placeholder="Site Name" className="w-full px-4 py-3 bg-white border rounded-xl text-xs font-bold uppercase" value={siteForm.name} onChange={e => setSiteForm({...siteForm, name: e.target.value})} required />
                    <input type="text" placeholder="Physical Address" className="w-full px-4 py-3 bg-white border rounded-xl text-xs font-bold" value={siteForm.address} onChange={e => setSiteForm({...siteForm, address: e.target.value})} />
                    <div className="flex gap-2">
                       <button type="button" onClick={captureSiteLocation} className="flex-1 bg-blue-900 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest">Capture Location</button>
                       <div className="flex-1 bg-white border border-blue-200 rounded-xl px-4 py-3 text-[10px] font-black text-blue-900 text-center truncate">
                          {siteForm.lat !== 0 ? `${siteForm.lat.toFixed(4)}, ${siteForm.lng.toFixed(4)}` : 'Wait GPS...'}
                       </div>
                    </div>
                    <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Integrate Site</button>
                 </form>
              )}

              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                 {companySites.map(site => (
                   <div key={site.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
                      <div>
                         <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{site.name}</p>
                         <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{site.address || 'Standard Operational Sector'}</p>
                         <code className="text-[7px] font-black text-blue-400 mt-1 block">{site.lat.toFixed(4)}, {site.lng.toFixed(4)}</code>
                      </div>
                      <button onClick={() => confirm("Delete Site?") && removeSite(site.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                   </div>
                 ))}
              </div>
           </div>
        )}
      </div>

      {/* History Registry */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
          <h3 className="text-xl font-black uppercase text-blue-900 tracking-tighter">Attendance Registry</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Personnel / Date</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Location Lock</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Duty Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {state.attendance
                .filter(a => isAdmin ? a.companyId === user.companyId : a.userId === user.id)
                .sort((a,b) => b.date.localeCompare(a.date))
                .map((log) => {
                const personnel = state.users.find(u => u.id === log.userId);
                return (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-10 py-6">
                      <p className="text-sm font-black text-slate-800 uppercase">{personnel?.name || 'Staff'}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{log.date}</p>
                    </td>
                    <td className="px-10 py-6 text-center">
                      {log.latitude ? (
                        <a 
                          href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                          {log.latitude.toFixed(4)}, {log.longitude?.toFixed(4)}
                        </a>
                      ) : <span className="text-gray-300">N/A</span>}
                    </td>
                    <td className="px-10 py-6 text-center">
                       <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase ${log.isActive === 1 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {log.isActive === 1 ? 'Present' : 'Logged Out'}
                       </span>
                    </td>
                    <td className="px-10 py-6 text-right font-black text-slate-900 text-sm">
                       {log.checkIn} → {log.checkOut || 'Active'}
                    </td>
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
