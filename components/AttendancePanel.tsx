
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

const GEOFENCE_RADIUS = 100; // Meters

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Earth radius in meters
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

  // Request location permission on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(c);
        },
        (err) => {
          console.debug("Location permission denied or error:", err);
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  // Manual Entry State (For Leaders)
  const [manualForm, setManualForm] = useState({
    userId: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
    type: 'IN' as 'IN' | 'OUT',
    siteId: ''
  });

  // Site Management State
  const [siteForm, setSiteForm] = useState({ name: '', address: '', lat: '', lng: '' });
  const [isAddingSite, setIsAddingSite] = useState(false);

  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const isSupervisor = user.role === UserRole.SUPERVISOR;
  const companySites = useMemo(() => state.sites.filter(s => s.companyId === user.companyId), [state.sites, user.companyId]);
  const companyPersonnel = state.users.filter(u => u.companyId === user.companyId);
  
  const today = new Date().toISOString().split('T')[0];
  const att = state.attendance.find(a => a.userId === user.id && a.date === today);

  // Real-time distance update when site or location changes
  useEffect(() => {
    if (coords && selectedSite) {
      const site = companySites.find(s => s.id === selectedSite);
      if (site) {
        setDistanceToSite(getDistance(coords.lat, coords.lng, site.lat, site.lng));
      }
    } else {
      setDistanceToSite(null);
    }
  }, [coords, selectedSite, companySites]);

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
      },
      () => {
        setIsLocating(false);
        alert("GPS Error: Satellite connection lost. Ensure location permissions are granted.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePunch = (type: 'IN' | 'OUT') => {
    if (type === 'IN') {
      if (!selectedSite) return alert("CRITICAL: Select a Project Site Node to punch in.");
      if (!coords) return alert("Waiting for Satellite GPS Sync...");
      
      const site = companySites.find(s => s.id === selectedSite);
      if (!site) return alert("Selected site not found in registry.");

      const dist = getDistance(coords.lat, coords.lng, site.lat, site.lng);
      if (dist > GEOFENCE_RADIUS) {
        return alert(`Geofence Breach: You must be within ${GEOFENCE_RADIUS}m of the site. Current distance: ${Math.round(dist)}m.`);
      }
      
      markAttendance(user.id, user.companyId, 'IN', coords, 0, today, undefined, selectedSite);
    } else {
      if (confirm("Confirm Shift Termination?")) {
        markAttendance(user.id, user.companyId, 'OUT', coords || undefined, 0, today);
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.userId || !manualForm.siteId) return alert("Select Personnel and Target Site Location.");
    
    const selectedSiteObj = companySites.find(s => s.id === manualForm.siteId);
    const manualCoords = selectedSiteObj ? { lat: selectedSiteObj.lat, lng: selectedSiteObj.lng } : undefined;

    if (confirm(`Authorize manual ${manualForm.type} entry for ${state.users.find(u => u.id === manualForm.userId)?.name} at node ${selectedSiteObj?.name}?`)) {
      markAttendance(
        manualForm.userId, 
        user.companyId, 
        manualForm.type, 
        manualCoords, 
        0, 
        manualForm.date, 
        manualForm.time, 
        manualForm.siteId
      );
      alert("Manual telemetry log committed to registry.");
      setManualForm({ ...manualForm, userId: '' });
    }
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(siteForm.lat);
    const lngNum = parseFloat(siteForm.lng);
    if (!siteForm.name || isNaN(latNum) || isNaN(lngNum)) return alert("Site name and valid GPS coordinates required.");
    await addSite({ name: siteForm.name, address: siteForm.address, lat: latNum, lng: lngNum, companyId: user.companyId });
    setSiteForm({ name: '', address: '', lat: '', lng: '' });
    setIsAddingSite(false);
    alert("Project Site Integrated into Cluster.");
  };

  const captureSiteLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      setSiteForm({ ...siteForm, lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() });
      setIsLocating(false);
    }, () => {
      setIsLocating(false);
      alert("GPS Capture Failed.");
    });
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
                  <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Project Site Node (Selection Required)</label>
                  <select className="w-full bg-white px-5 py-4 rounded-2xl font-black text-xs uppercase text-slate-700 outline-none border focus:border-blue-500" value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
                    <option value="">Choose Site Location...</option>
                    {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {selectedSite && distanceToSite !== null && (
                    <div className="mt-4 text-center animate-in slide-in-from-top-2">
                       <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase border ${distanceToSite <= GEOFENCE_RADIUS ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                         {Math.round(distanceToSite)}m {distanceToSite <= GEOFENCE_RADIUS ? '✓ Within Range' : '⚠ Out of Range'}
                       </span>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => handlePunch('IN')} 
                  disabled={!selectedSite || isLocating} 
                  className={`w-full py-8 rounded-[2.5rem] font-black text-lg uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 ${(!selectedSite || isLocating) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white shadow-green-900/10 hover:bg-green-700'}`}
                >
                  {isLocating ? 'Locating...' : 'Clock In'}
                </button>
              </div>
            ) : !att.checkOut ? (
              <div className="space-y-8 animate-in zoom-in-95 duration-300">
                <div className="bg-blue-900 p-12 rounded-[2.5rem] text-center border-4 border-blue-800 shadow-2xl">
                   <p className="text-[10px] font-black text-blue-300 uppercase tracking-[0.3em] mb-4">On Duty • Live</p>
                   <p className="text-5xl font-black text-white tracking-tighter mb-2">{liveTimer}</p>
                   <p className="text-[10px] font-black text-blue-400 uppercase">Started at {att.checkIn}</p>
                   {att.siteId && (
                     <p className="text-[8px] font-bold text-blue-500 uppercase mt-4">Node: {companySites.find(s => s.id === att.siteId)?.name}</p>
                   )}
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

        {/* Manual Override & Site Management Terminal (Admin/Supervisor only) */}
        {(isAdmin || isSupervisor) && (
           <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter mb-8 flex items-center">
                 <span className="w-6 h-1 bg-blue-600 mr-3"></span> Manual Override Registry
              </h3>
              
              <form onSubmit={handleManualSubmit} className="space-y-5">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="text-[9px] font-black text-gray-400 uppercase mb-1 ml-1">Select Personnel</label>
                       <select 
                          className="w-full px-4 py-3 bg-gray-50 border rounded-xl font-bold text-xs uppercase" 
                          value={manualForm.userId} 
                          onChange={e => setManualForm({...manualForm, userId: e.target.value})}
                          required
                       >
                          <option value="">Choose Employee...</option>
                          {companyPersonnel.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="text-[9px] font-black text-gray-400 uppercase mb-1 ml-1">Log Date</label>
                       <input type="date" className="w-full px-4 py-3 bg-gray-50 border rounded-xl font-bold text-xs" value={manualForm.date} onChange={e => setManualForm({...manualForm, date: e.target.value})} required />
                    </div>
                    <div>
                       <label className="text-[9px] font-black text-gray-400 uppercase mb-1 ml-1">Log Time</label>
                       <input type="time" className="w-full px-4 py-3 bg-gray-50 border rounded-xl font-bold text-xs" value={manualForm.time} onChange={e => setManualForm({...manualForm, time: e.target.value})} required />
                    </div>
                    <div>
                       <label className="text-[9px] font-black text-gray-400 uppercase mb-1 ml-1">Entry Type</label>
                       <select className="w-full px-4 py-3 bg-gray-50 border rounded-xl font-black text-xs uppercase" value={manualForm.type} onChange={e => setManualForm({...manualForm, type: e.target.value as any})}>
                          <option value="IN">Clock In</option>
                          <option value="OUT">Clock Out</option>
                       </select>
                    </div>
                    <div>
                       <label className="text-[9px] font-black text-blue-600 uppercase mb-1 ml-1">Target Node (Required)</label>
                       <select 
                          className="w-full px-4 py-3 bg-blue-50 border-blue-100 border rounded-xl font-black text-xs uppercase text-blue-900" 
                          value={manualForm.siteId} 
                          onChange={e => setManualForm({...manualForm, siteId: e.target.value})}
                          required
                       >
                          <option value="">Select Site...</option>
                          {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                       </select>
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Commit Manual Log</button>
              </form>

              <div className="mt-10 pt-8 border-t border-gray-100">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Site Registry Management</h3>
                    <button onClick={() => setIsAddingSite(!isAddingSite)} className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-xl">
                      {isAddingSite ? 'Close Form' : 'Add New Site'}
                    </button>
                 </div>

                 {isAddingSite && (
                    <form onSubmit={handleAddSite} className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 mb-8 space-y-4 animate-in slide-in-from-top-4">
                       <input type="text" placeholder="Site Name (e.g. Node-Alpha)" className="w-full px-4 py-3 bg-white border rounded-xl text-xs font-bold uppercase" value={siteForm.name} onChange={e => setSiteForm({...siteForm, name: e.target.value})} required />
                       <input type="text" placeholder="Physical Address" className="w-full px-4 py-3 bg-white border rounded-xl text-xs font-bold" value={siteForm.address} onChange={e => setSiteForm({...siteForm, address: e.target.value})} />
                       <div className="grid grid-cols-2 gap-2">
                          <input type="text" placeholder="Latitude" className="w-full px-4 py-3 bg-white border rounded-xl text-[10px] font-bold" value={siteForm.lat} onChange={e => setSiteForm({...siteForm, lat: e.target.value})} required />
                          <input type="text" placeholder="Longitude" className="w-full px-4 py-3 bg-white border rounded-xl text-[10px] font-bold" value={siteForm.lng} onChange={e => setSiteForm({...siteForm, lng: e.target.value})} required />
                       </div>
                       <div className="flex gap-2">
                          <button type="button" onClick={captureSiteLocation} className="flex-1 bg-blue-900 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest">Auto Capture GPS</button>
                       </div>
                       <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Integrate Site</button>
                    </form>
                 )}

                 <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {companySites.map(site => (
                      <div key={site.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
                         <div className="flex-1 min-w-0 pr-4">
                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{site.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 truncate">{site.address || 'Infrastructure Node'}</p>
                            <code className="text-[7px] font-black text-blue-400 mt-1 block">{site.lat.toFixed(4)}, {site.lng.toFixed(4)}</code>
                         </div>
                         <button onClick={() => confirm(`Terminate Node "${site.name}"?`) && removeSite(site.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                         </button>
                      </div>
                    ))}
                    {companySites.length === 0 && (
                      <p className="text-center py-10 text-[9px] font-black text-slate-300 uppercase tracking-widest">No site nodes registered</p>
                    )}
                 </div>
              </div>
           </div>
        )}
      </div>

      {/* History Registry */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
          <h3 className="text-xl font-black uppercase text-blue-900 tracking-tighter">Operational Attendance Logs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Personnel / Site</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Location lock</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Duty Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {state.attendance
                .filter(a => (isAdmin || isSupervisor) ? a.companyId === user.companyId : a.userId === user.id)
                .sort((a,b) => b.date.localeCompare(a.date))
                .map((log) => {
                const personnel = state.users.find(u => u.id === log.userId);
                const siteName = companySites.find(s => s.id === log.siteId)?.name || 'General Node';
                return (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-10 py-6">
                      <p className="text-sm font-black text-slate-800 uppercase">{personnel?.name || 'Staff'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{log.date}</span>
                        <span className="text-[8px] font-black text-blue-500 bg-blue-50 px-1.5 rounded uppercase">{siteName}</span>
                      </div>
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
                          GPS Locked
                        </a>
                      ) : <span className="text-gray-300">N/A</span>}
                    </td>
                    <td className="px-10 py-6 text-center">
                       <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border ${log.isActive === 1 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
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
