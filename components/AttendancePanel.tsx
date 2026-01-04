
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
  const [isCapturingSiteLocation, setIsCapturingSiteLocation] = useState(false);
  const [distanceToSite, setDistanceToSite] = useState<number | null>(null);
  const [liveTimer, setLiveTimer] = useState('00:00:00');

  // Site Management form state
  const [newSite, setNewSite] = useState({ name: '', address: '', lat: 0, lng: 0 });

  const [manualAtt, setManualAtt] = useState({ userId: '', date: new Date().toISOString().split('T')[0], checkIn: '09:00', checkOut: '18:00', siteId: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Attendance>>({});

  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const companySites = state.sites.filter(s => s.companyId === user.companyId);
  const companyPersonnel = state.users.filter(u => u.companyId === user.companyId && u.role !== UserRole.SUPER_ADMIN);
  
  const today = new Date().toISOString().split('T')[0];
  const att = state.attendance.find(a => a.userId === user.id && a.date === today);

  // Live Timer Effect
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
      alert("Geolocation is not supported by your browser.");
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
      (error) => {
        console.error("GPS Error:", error);
        setIsLocating(false);
        alert("Satellite Sync Failed: Ensure location services are active.");
        setCoords({ lat: 0, lng: 0 }); 
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const autoDetectSiteLocation = () => {
    setIsCapturingSiteLocation(true);
    if (!navigator.geolocation) {
      alert("Location features unavailable.");
      setIsCapturingSiteLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewSite(prev => ({
          ...prev,
          lat: parseFloat(pos.coords.latitude.toFixed(6)),
          lng: parseFloat(pos.coords.longitude.toFixed(6))
        }));
        setIsCapturingSiteLocation(false);
      },
      (error) => {
        setIsCapturingSiteLocation(false);
        alert("Could not detect location. Please type coordinates manually.");
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => { 
    if (selectedSite) {
      handleLocate(); 
    }
  }, [selectedSite]);

  const handlePunch = (type: 'IN' | 'OUT') => {
    if (type === 'IN') {
      if (!selectedSite) return alert("Select a Project Site (Node).");
      if (!coords || (coords.lat === 0 && coords.lng === 0)) return alert("Waiting for Satellite GPS Sync...");
      if (distanceToSite && distanceToSite > GEOFENCE_RADIUS) {
        return alert(`Geofence Breach: You are ${Math.round(distanceToSite)}m away. Move closer to the site node.`);
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
    if (!manualAtt.userId || !manualAtt.date || !manualAtt.siteId) return alert("Administrative data entry incomplete.");
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

  const handleAddSiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSite.name) return alert("Site name is mandatory.");
    if (newSite.lat === 0 || newSite.lng === 0) return alert("Coordinates cannot be zero. Use 'Auto-Detect' or type manually.");
    try {
      await addSite({ ...newSite, companyId: user.companyId });
      setNewSite({ name: '', address: '', lat: 0, lng: 0 });
      alert("Success: Project Site enrolled in registry.");
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteSite = async (s: Site) => {
    if (confirm(`CRITICAL: Remove project node "${s.name}"? This will disable future attendance at this location.`)) {
      await removeSite(s.id);
      alert("Site purged.");
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
    <div className="space-y-12 animate-in fade-in duration-500 pb-24">
      
      {/* SECTION 1: PUNCH TERMINAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Field Terminal</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{today}</p>
                </div>
              </div>
              <button 
                onClick={handleLocate} 
                disabled={isLocating}
                title="Sync Satellite GPS"
                className={`p-4 rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all ${isLocating ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}
              >
                <svg className={`w-6 h-6 ${isLocating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </button>
            </div>

            {!att ? (
              <div className="space-y-8">
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                  <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 ml-2">Assigned Project Node</label>
                  <select 
                    className="w-full bg-white px-5 py-4 rounded-2xl border-none shadow-sm font-black text-xs uppercase text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
                    value={selectedSite}
                    onChange={e => setSelectedSite(e.target.value)}
                  >
                    <option value="">Choose Site...</option>
                    {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  
                  {selectedSite && distanceToSite !== null && (
                    <div className="mt-4 flex items-center justify-between px-2">
                       <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Site Distance</span>
                       <span className={`text-[10px] font-black uppercase ${distanceToSite <= GEOFENCE_RADIUS ? 'text-green-600' : 'text-red-500 animate-pulse'}`}>
                         {Math.round(distanceToSite)} Meters {distanceToSite <= GEOFENCE_RADIUS ? '✓ Within Range' : '⚠ Breach: Too Far'}
                       </span>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => handlePunch('IN')}
                  disabled={!selectedSite || isLocating}
                  className={`w-full py-8 rounded-[2.5rem] font-black text-lg uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex flex-col items-center justify-center space-y-2 ${
                    !selectedSite ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : 'bg-green-600 text-white hover:bg-green-700 shadow-green-900/20'
                  }`}
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                  <span>Clock In</span>
                </button>
              </div>
            ) : !att.checkOut ? (
              <div className="space-y-8 animate-in zoom-in-95 duration-300">
                <div className="bg-blue-900 p-10 rounded-[2.5rem] text-center border-4 border-blue-800 shadow-2xl relative overflow-hidden">
                   <div className="absolute inset-0 bg-blue-400/5 animate-pulse"></div>
                   <p className="text-[10px] font-black text-blue-300 uppercase tracking-[0.3em] mb-4">On Duty • {state.sites.find(s => s.id === att.siteId)?.name}</p>
                   <p className="text-5xl font-black text-white tracking-tighter mb-2">{liveTimer}</p>
                   <p className="text-[10px] font-black text-blue-400 uppercase">Shift started at {att.checkIn}</p>
                </div>

                <button 
                  onClick={() => handlePunch('OUT')}
                  className="w-full bg-orange-600 text-white py-8 rounded-[2.5rem] font-black text-lg uppercase tracking-[0.2em] shadow-2xl shadow-orange-900/20 hover:bg-orange-700 active:scale-95 transition-all flex flex-col items-center justify-center space-y-2"
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013-3v1" /></svg>
                  <span>Clock Out</span>
                </button>
                
                <p className="text-center text-[9px] font-bold text-gray-400 uppercase tracking-widest">Verification: Live Satellite Lock Active</p>
              </div>
            ) : (
              <div className="bg-slate-50 p-16 rounded-[3rem] text-center border-2 border-dashed border-slate-200 animate-in fade-in scale-95 duration-500">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                   <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Duty Terminated</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Telemetry Synced to Cloud</p>
                <div className="mt-8 flex justify-center gap-4">
                  <div className="text-center px-4 border-r">
                    <p className="text-[8px] font-black text-slate-400 uppercase">In</p>
                    <p className="text-sm font-black text-slate-700">{att.checkIn}</p>
                  </div>
                  <div className="text-center px-4">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Out</p>
                    <p className="text-sm font-black text-slate-700">{att.checkOut}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: ADMIN CONTROLS (Manual Overrides) */}
        {isAdmin && (
           <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter mb-8 flex items-center">
                  <span className="w-2 h-5 bg-blue-600 rounded-full mr-3"></span> Administrative Proxy
                </h3>
                <form onSubmit={handleManualSubmit} className="space-y-4">
                   <select required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs uppercase outline-none focus:ring-2 focus:ring-blue-100" value={manualAtt.userId} onChange={e => setManualAtt({...manualAtt, userId: e.target.value})}>
                      <option value="">Select Personnel...</option>
                      {companyPersonnel.map(u => <option key={u.id} value={u.id}>{u.name} ({u.id})</option>)}
                   </select>
                   <div className="grid grid-cols-2 gap-4">
                      <input type="date" required className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs outline-none" value={manualAtt.date} onChange={e => setManualAtt({...manualAtt, date: e.target.value})} />
                      <select required className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs uppercase outline-none" value={manualAtt.siteId} onChange={e => setManualAtt({...manualAtt, siteId: e.target.value})}>
                         <option value="">Project Site...</option>
                         {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="text-[8px] font-black text-gray-400 absolute top-2 left-4 uppercase">In-Time</label>
                        <input type="time" required className="w-full p-4 pt-6 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs outline-none" value={manualAtt.checkIn} onChange={e => setManualAtt({...manualAtt, checkIn: e.target.value})} />
                      </div>
                      <div className="relative">
                        <label className="text-[8px] font-black text-gray-400 absolute top-2 left-4 uppercase">Out-Time</label>
                        <input type="time" className="w-full p-4 pt-6 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs outline-none" value={manualAtt.checkOut} onChange={e => setManualAtt({...manualAtt, checkOut: e.target.value})} />
                      </div>
                   </div>
                   <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-black transition-all">Enroll Proxy Entry</button>
                </form>
              </div>
              <div className="mt-8 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center space-x-4">
                 <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black">!</div>
                 <p className="text-[10px] font-bold text-blue-900 leading-tight">Admin Override: Use only for site connectivity failures. All entries are audited.</p>
              </div>
           </div>
        )}
      </div>

      {/* SECTION 3: SITE INFRASTRUCTURE REGISTRY (ADMIN ONLY) */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-1 bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                   <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter">Enroll Site</h3>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Establish Geofence Boundaries</p>
                </div>
                <button 
                  onClick={autoDetectSiteLocation}
                  disabled={isCapturingSiteLocation}
                  className={`p-3 rounded-xl transition-all shadow-sm ${isCapturingSiteLocation ? 'bg-orange-50 text-orange-600 animate-pulse' : 'bg-green-50 text-green-600 hover:bg-green-600 hover:text-white'}`}
                  title="Auto-detect current location"
                >
                  <svg className={`w-5 h-5 ${isCapturingSiteLocation ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleAddSiteSubmit} className="space-y-4 mt-8">
                 <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Site Label</label>
                    <input type="text" placeholder="e.g. Sector-4 Node" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none" value={newSite.name} onChange={e => setNewSite({...newSite, name: e.target.value})} required />
                 </div>
                 <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Location Details</label>
                    <input type="text" placeholder="Brief Address" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none" value={newSite.address} onChange={e => setNewSite({...newSite, address: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Latitude</label>
                      <input type="number" step="any" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl font-black text-blue-600 text-xs outline-none" value={newSite.lat || ''} onChange={e => setNewSite({...newSite, lat: parseFloat(e.target.value) || 0})} required />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Longitude</label>
                      <input type="number" step="any" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl font-black text-blue-600 text-xs outline-none" value={newSite.lng || ''} onChange={e => setNewSite({...newSite, lng: parseFloat(e.target.value) || 0})} required />
                    </div>
                 </div>
                 <p className="text-[8px] font-bold text-orange-600 uppercase text-center px-4 bg-orange-50 py-2 rounded-xl">Accuracy is critical for geofencing.</p>
                 <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-900/10 active:scale-95 transition-all">Establish Site Node</button>
              </form>
           </div>

           <div className="lg:col-span-2 bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
                <h4 className="text-sm font-black uppercase text-blue-900 tracking-tighter">Active Site Nodes</h4>
                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">{companySites.length} Registered</span>
              </div>
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-8 py-4">Node Descriptor</th>
                      <th className="px-8 py-4">Coordinates</th>
                      <th className="px-8 py-4 text-right">System Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {companySites.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50/30 transition-all group">
                        <td className="px-8 py-6">
                           <p className="text-sm font-black text-slate-800 uppercase">{s.name}</p>
                           <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{s.address || 'Standard Node Location'}</p>
                        </td>
                        <td className="px-8 py-6">
                           <code className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{s.lat.toFixed(5)}, {s.lng.toFixed(5)}</code>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <button 
                            onClick={() => handleDeleteSite(s)}
                            className="p-3 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                            title="Purge Node"
                           >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      )}

      {/* SECTION 4: REGISTRY TABLE (ATTENDANCE LOGS) */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
          <h3 className="text-xl font-black uppercase text-blue-900 tracking-tighter">Enterprise Attendance Ledger</h3>
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-full uppercase">{filteredAttendance.length} Records Verified</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Personnel / Date</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Site Node</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Operational Cycle</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Work Units (Hrs)</th>
                {isAdmin && <th className="px-10 py-6 text-[10px] font-black text-blue-600 uppercase tracking-widest text-right">Registry Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAttendance.map((log) => {
                const personnel = state.users.find(u => u.id === log.userId);
                const isEditing = editingId === log.id;
                const totalHours = log.checkOut ? calculateHours(log.checkIn, log.checkOut) : 0;
                const site = companySites.find(s => s.id === log.siteId);

                return (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-10 py-6">
                      <p className="text-sm font-black text-slate-800 uppercase group-hover:text-blue-600 transition-colors">{personnel?.name || log.userId}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{log.date}</p>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{site?.name || 'GEN-NODE'}</span>
                      </div>
                      <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">{site?.address || 'Site Record'}</p>
                    </td>
                    <td className="px-10 py-6">
                      {isEditing ? (
                        <div className="flex items-center space-x-2">
                           <input type="time" className="p-2 border rounded-lg text-xs font-black" value={editForm.checkIn} onChange={e => setEditForm({...editForm, checkIn: e.target.value})} />
                           <span className="text-slate-300 font-black">→</span>
                           <input type="time" className="p-2 border rounded-lg text-xs font-black" value={editForm.checkOut || ''} onChange={e => setEditForm({...editForm, checkOut: e.target.value})} />
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <div className="flex flex-col">
                             <span className="text-[8px] font-black text-gray-300 uppercase">In</span>
                             <span className="text-xs font-black text-slate-700 tracking-tight">{log.checkIn}</span>
                          </div>
                          <span className="text-slate-200 font-black">/</span>
                          <div className="flex flex-col">
                             <span className="text-[8px] font-black text-gray-300 uppercase">Out</span>
                             <span className={`text-xs font-black tracking-tight ${log.checkOut ? 'text-slate-700' : 'text-blue-500 animate-pulse'}`}>{log.checkOut || 'ON FIELD'}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-10 py-6 text-center">
                       <p className="text-xl font-black text-slate-800 tracking-tighter">{totalHours.toFixed(2)}</p>
                       <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Duration</p>
                    </td>
                    {isAdmin && (
                      <td className="px-10 py-6 text-right space-x-3">
                         {isEditing ? (
                           <button onClick={() => { updateAttendance(editingId!, editForm); setEditingId(null); }} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-green-100">Commit</button>
                         ) : (
                           <>
                             {!log.checkOut && (
                               <button onClick={() => updateAttendance(log.id, { checkOut: getCurrentTimeStr() })} className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase hover:bg-orange-600 hover:text-white transition-all">Force Out</button>
                             )}
                             <button onClick={() => { setEditingId(log.id); setEditForm(log); }} className="text-blue-600 text-[9px] font-black uppercase hover:underline">Edit</button>
                             <button onClick={() => removeAttendance && removeAttendance(log.id)} className="text-red-300 hover:text-red-600 text-[9px] font-black uppercase">Purge</button>
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
