
import React, { useState, useEffect } from 'react';
import { User, AppState, UserRole, Site, RequestStatus } from '../types';

interface Props {
  user: User;
  state: AppState;
  markAttendance: (userId: string, companyId: string, type: 'IN' | 'OUT', coords?: { lat: number; lng: number }, overtimeHours?: number) => void;
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
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = state.attendance.find(a => a.userId === user.id && a.date === today);
  
  const companyAttendance = isSuper ? state.attendance.filter(a => a.date === today) : state.attendance.filter(a => a.companyId === user.companyId && a.date === today);
  const companySites = isSuper ? state.sites : state.sites.filter(s => s.companyId === user.companyId);

  // LOGIC: LEAVE VALIDATION
  const isOnLeave = state.leaves.some(l => 
    l.userId === user.id && 
    l.status === RequestStatus.APPROVED && 
    today >= l.fromDate && today <= l.toDate
  );

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestSite, setNearestSite] = useState<{ site: Site, distance: number } | null>(null);
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [isLocating, setIsLocating] = useState(true);

  // Site Management State
  const [newSite, setNewSite] = useState({ name: '', lat: '', lng: '' });
  const [isAddingSite, setIsAddingSite] = useState(false);

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

  // Enforce Geofencing: User must be within 100m of a registered site to punch in
  const canPunch = isSuper || (nearestSite ? nearestSite.distance <= 100 : false);

  const handlePunch = async (type: 'IN' | 'OUT') => {
    if (type === 'IN' && !coords) {
      return alert("Wait for GPS signal to verify your location.");
    }
    if (type === 'IN' && isOnLeave) {
      return alert("SYSTEM LOCK: You have an approved leave for today. Attendance recording is disabled.");
    }

    try {
      await markAttendance(user.id, user.companyId, type, coords || undefined, overtimeHours);
      setOvertimeHours(0);
      alert(`${type === 'IN' ? 'Check-In' : 'Check-Out'} successful.`);
    } catch (e: any) { 
      alert(e.message); 
    }
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSite.name || !newSite.lat || !newSite.lng) return alert("Fill all site details.");
    
    try {
      await addSite({
        name: newSite.name,
        lat: parseFloat(newSite.lat),
        lng: parseFloat(newSite.lng),
        companyId: user.companyId
      });
      setNewSite({ name: '', lat: '', lng: '' });
      setIsAddingSite(false);
      alert("Project site registered successfully.");
    } catch (e: any) {
      alert("Failed to register site.");
    }
  };

  const useCurrentForSite = () => {
    if (coords) {
      setNewSite(prev => ({ ...prev, lat: coords.lat.toString(), lng: coords.lng.toString() }));
    } else {
      alert("GPS not ready.");
    }
  };

  return (
    <div className="space-y-10">
      {/* 1. Operation Punch Section */}
      {!isSuper && (
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-gray-100 text-center max-w-xl mx-auto">
          <h2 className="text-3xl font-black text-blue-900 mb-2 uppercase tracking-tighter">Operation Punch</h2>
          <p className="text-gray-400 font-bold uppercase text-[10px] mb-8 tracking-[0.2em]">{new Date().toDateString()}</p>
          
          <div className="flex flex-col items-center gap-6">
            {isOnLeave && (
               <div className="w-full bg-red-50 p-4 rounded-2xl border border-red-100 mb-4 animate-bounce">
                  <p className="text-red-600 text-[10px] font-black uppercase tracking-widest">Active Approved Leave Detected</p>
                  <p className="text-[9px] text-red-400 font-bold mt-1">Punching capability is suspended for your leave duration.</p>
               </div>
            )}

            {isLocating && (
              <div className="flex items-center space-x-2 text-blue-500 animate-pulse mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[10px] font-black uppercase tracking-widest">Acquiring GPS Signal...</span>
              </div>
            )}

            {!todayAttendance?.checkOut && todayAttendance && (
               <div className="w-full bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-4 animate-in fade-in zoom-in-95 duration-300">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest">Post-Shift Overtime</label>
                  <div className="flex items-center justify-center space-x-4">
                    <input 
                      type="number" 
                      step="0.5" 
                      min="0"
                      className="w-24 px-4 py-3 bg-white border border-gray-200 rounded-xl text-center font-black text-blue-900 outline-none focus:ring-2 focus:ring-blue-500/20" 
                      value={overtimeHours || ''} 
                      onChange={e => setOvertimeHours(parseFloat(e.target.value) || 0)} 
                      placeholder="0.0"
                    />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Hours</span>
                  </div>
               </div>
            )}
            
            <div className="flex justify-center gap-4 w-full">
              <button 
                onClick={() => handlePunch('IN')} 
                disabled={!!todayAttendance || (!canPunch && !isSuper) || isLocating || isOnLeave} 
                className={`flex-1 px-8 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.15em] transition-all shadow-lg ${
                  todayAttendance || (!canPunch && !isSuper) || isLocating || isOnLeave
                  ? 'bg-gray-100 text-gray-400 shadow-none cursor-not-allowed' 
                  : 'bg-green-600 text-white shadow-green-100 hover:scale-105 hover:bg-green-700 active:scale-95'
                }`}
              >
                {todayAttendance ? 'Verified Entry' : 'Punch In'}
              </button>
              
              <button 
                onClick={() => handlePunch('OUT')} 
                disabled={!todayAttendance || !!todayAttendance.checkOut || isLocating} 
                className={`flex-1 px-8 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.15em] transition-all shadow-lg ${
                  !todayAttendance || !!todayAttendance.checkOut || isLocating 
                  ? 'bg-gray-100 text-gray-400 shadow-none cursor-not-allowed' 
                  : 'bg-red-600 text-white shadow-red-100 hover:scale-105 hover:bg-red-700 active:scale-95'
                }`}
              >
                Punch Out
              </button>
            </div>

            {coords && (
              <div className="text-[9px] font-bold text-gray-300 uppercase tracking-widest flex items-center space-x-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                <span>Lat: {coords.lat.toFixed(6)}, Lng: {coords.lng.toFixed(6)}</span>
                {nearestSite && !isSuper && (
                  <span className={`ml-2 px-2 py-0.5 rounded-md ${nearestSite.distance <= 100 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    • {Math.round(nearestSite.distance)}m from {nearestSite.site.name}
                  </span>
                )}
              </div>
            )}
          </div>

          {todayAttendance && (
            <div className="mt-10 pt-10 border-t border-gray-50 flex justify-around">
              <div>
                <p className="text-[9px] text-gray-300 uppercase font-black mb-1 tracking-widest">Entry</p>
                <p className="text-xl font-black text-gray-800 tracking-tighter">{todayAttendance.checkIn}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-300 uppercase font-black mb-1 tracking-widest">Exit</p>
                <p className="text-xl font-black text-gray-800 tracking-tighter">{todayAttendance.checkOut || '--:--'}</p>
              </div>
              {todayAttendance.overtimeHours ? (
                <div>
                  <p className="text-[9px] text-orange-400 uppercase font-black mb-1 tracking-widest">OT Hours</p>
                  <p className="text-xl font-black text-orange-500 tracking-tighter">{todayAttendance.overtimeHours}h</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* 2. Site Management Section - Admin/Super only */}
      {(isAdmin || isSuper) && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
            <div>
              <h3 className="font-black uppercase tracking-tighter text-blue-900 text-lg">Project Sites Registry</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Geofencing Control Points</p>
            </div>
            <button 
              onClick={() => setIsAddingSite(!isAddingSite)}
              className="px-6 py-2.5 bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 transition-all hover:bg-blue-800"
            >
              {isAddingSite ? 'Cancel Registry' : 'Register New Site'}
            </button>
          </div>

          {isAddingSite && (
            <div className="p-8 border-b border-gray-50 bg-blue-50/20 animate-in slide-in-from-top-4 duration-300">
              <form onSubmit={handleAddSite} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Site/Location Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Sector 44 Substation" 
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none font-bold text-xs" 
                    value={newSite.name} 
                    onChange={e => setNewSite({...newSite, name: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Latitude</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="28.123456" 
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none font-bold text-xs" 
                    value={newSite.lat} 
                    onChange={e => setNewSite({...newSite, lat: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Longitude</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="77.123456" 
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none font-bold text-xs" 
                    value={newSite.lng} 
                    onChange={e => setNewSite({...newSite, lng: e.target.value})} 
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={useCurrentForSite} className="flex-1 px-4 py-3 bg-white border border-blue-200 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-50 transition-colors">
                    GPS Assist
                  </button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-800 shadow-lg shadow-blue-100 transition-colors">
                    Commit Site
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Site Name</th>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest text-center">GPS Coordinates</th>
                  {isSuper && <th className="px-8 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Owner Company</th>}
                  <th className="px-8 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest text-right">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {companySites.map((site) => (
                  <tr key={site.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="font-black text-gray-800 text-xs uppercase tracking-tight">{site.name}</div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="text-[10px] font-bold text-blue-500 font-mono">{site.lat.toFixed(5)}, {site.lng.toFixed(5)}</div>
                    </td>
                    {isSuper && (
                      <td className="px-8 py-5">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {state.companies.find(c => c.id === site.companyId)?.name || 'Unknown'}
                        </div>
                      </td>
                    )}
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => removeSite(site.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {companySites.length === 0 && (
                  <tr>
                    <td colSpan={isSuper ? 4 : 3} className="px-8 py-10 text-center text-gray-300 font-bold italic text-xs">No project sites registered. Geofencing disabled.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Daily Ledger Section */}
      {(isAdmin || isSuper) && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
            <div>
              <h3 className="font-black uppercase tracking-tighter text-blue-900 text-lg">Daily Attendance Ledger</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Live Telemetry Stream</p>
            </div>
            <span className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-gray-500 uppercase tracking-widest">{today}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Personnel</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Shift Timing</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest text-center">Overtime</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest text-center">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {companyAttendance.map((a, i) => {
                   const employee = state.users.find(u => u.id === a.userId);
                   const companySpecificSites = state.sites.filter(s => s.companyId === a.companyId);
                   const isGpsVerified = a.lat && a.lng && companySpecificSites.some(s => getDistance(a.lat!, a.lng!, s.lat, s.lng) <= 100);

                   return (
                     <tr key={i} className="hover:bg-gray-50/30 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="font-black text-gray-800 text-xs uppercase tracking-tight">{employee?.name}</div>
                          <div className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mt-0.5">{employee?.role}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-xs font-black text-gray-700 tracking-tighter">{a.checkIn} — {a.checkOut || 'Active'}</div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className={`text-xs font-black ${a.overtimeHours ? 'text-orange-600' : 'text-gray-300'}`}>
                            {a.overtimeHours ? `${a.overtimeHours} hrs` : '--'}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          {isGpsVerified ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="px-4 py-1.5 bg-green-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm shadow-green-100 flex items-center space-x-1.5">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                                <span>GPS Verified</span>
                              </span>
                              <span className="text-[8px] font-bold text-blue-400 mt-2 uppercase tracking-tighter bg-blue-50 px-2 py-0.5 rounded-md">COORD: {a.lat?.toFixed(5)}, {a.lng?.toFixed(5)}</span>
                            </div>
                          ) : (
                            <div className="inline-flex flex-col items-center">
                              <span className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center space-x-1.5">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                                <span>{a.lat ? 'Outside Geofence' : 'No GPS Data'}</span>
                              </span>
                              <span className="text-[7px] font-bold text-gray-300 mt-1 uppercase tracking-widest">Telemetry Absent</span>
                            </div>
                          )}
                        </td>
                     </tr>
                   );
                })}
                {companyAttendance.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-gray-300 font-bold italic tracking-wide">No active punches recorded today.</td>
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
