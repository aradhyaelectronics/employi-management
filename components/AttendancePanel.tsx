
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

const AttendancePanel: React.FC<Props> = ({ user, state, markAttendance, updateAttendance, addSite, removeSite }) => {
  const isSuper = user.role === UserRole.SUPER_ADMIN;
  const isAdmin = user.role === UserRole.ADMIN;
  const isSupervisor = user.role === UserRole.SUPERVISOR;
  const today = new Date().toISOString().split('T')[0];
  
  const [ledgerDate, setLedgerDate] = useState(today);
  const companyAttendance = useMemo(() => isSuper ? state.attendance.filter(a => a.date === ledgerDate) : state.attendance.filter(a => a.companyId === user.companyId && a.date === ledgerDate), [state.attendance, user.companyId, isSuper, ledgerDate]);
  const companySites = useMemo(() => isSuper ? state.sites : state.sites.filter(s => s.companyId === user.companyId), [state.sites, user.companyId, isSuper]);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [isLocating, setIsLocating] = useState(true);

  const [isManualMode, setIsManualMode] = useState(false);
  const [manualData, setManualData] = useState({ userId: '', siteId: '', date: today, checkIn: '09:00', checkOut: '18:00', ot: 0 });

  const [showSiteManager, setShowSiteManager] = useState(false);
  const [newSite, setNewSite] = useState({ name: '', address: '', lat: 0, lng: 0 });
  const [isResolving, setIsResolving] = useState(false);

  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLocating(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition((pos) => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setIsLocating(false);
    }, (error) => {
      console.error("GPS Error:", error);
      setIsLocating(false);
    }, { enableHighAccuracy: true });

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const selectedSite = useMemo(() => companySites.find(s => s.id === selectedSiteId), [companySites, selectedSiteId]);
  
  const currentDistance = useMemo(() => {
    if (!coords || !selectedSite) return Infinity;
    return getDistance(coords.lat, coords.lng, selectedSite.lat, selectedSite.lng);
  }, [coords, selectedSite]);

  const canPunchIn = isSuper || (selectedSiteId && currentDistance <= 100);
  const isOnLeave = state.leaves.some(l => l.userId === user.id && l.status === RequestStatus.APPROVED && today >= l.fromDate && today <= l.toDate);

  const resolveAddress = async () => {
    if (!newSite.address.trim()) return alert("Please enter an address first.");
    setIsResolving(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Act as a geocoding service. Return the Latitude and Longitude for the following address: "${newSite.address}". Return ONLY valid JSON.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lat: { type: Type.NUMBER, description: 'Latitude' },
              lng: { type: Type.NUMBER, description: 'Longitude' }
            },
            required: ['lat', 'lng']
          }
        }
      });
      
      const data = JSON.parse(response.text);
      if (data.lat && data.lng) {
        setNewSite(prev => ({ ...prev, lat: data.lat, lng: data.lng }));
      }
    } catch (error) {
      console.error("Geocoding failed:", error);
      alert("System could not resolve address. Please enter coordinates manually.");
    } finally {
      setIsResolving(false);
    }
  };

  const manualDuplicateCheck = useMemo(() => {
    if (!manualData.userId || !manualData.date) return false;
    return state.attendance.some(a => a.userId === manualData.userId && a.date === manualData.date);
  }, [manualData.userId, manualData.date, state.attendance]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualData.userId) return alert("Select an employee.");
    if (!manualData.siteId) return alert("Select a work site.");
    
    if (manualDuplicateCheck) {
      return alert(`Error: User already has an attendance record for ${manualData.date}. Only 1 entry per day is permitted.`);
    }

    try {
      markAttendance(manualData.userId, user.companyId, 'IN', undefined, 0, manualData.date, manualData.checkIn, manualData.siteId);
      markAttendance(manualData.userId, user.companyId, 'OUT', undefined, manualData.ot, manualData.date, manualData.checkOut);
      alert("Manual attendance synchronized with ledger.");
      setManualData({ userId: '', siteId: '', date: today, checkIn: '09:00', checkOut: '18:00', ot: 0 });
      setIsManualMode(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    try {
      await updateAttendance(editingRecord.id, {
        date: editingRecord.date,
        checkIn: editingRecord.checkIn,
        checkOut: editingRecord.checkOut,
        siteId: editingRecord.siteId,
        overtimeHours: editingRecord.overtimeHours
      });
      alert("Attendance record updated successfully.");
      setEditingRecord(null);
    } catch (err: any) {
      alert("Update failed: " + err.message);
    }
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSite.name.trim() || !newSite.lat || !newSite.lng) return alert("Fill all site details.");
    await addSite({ ...newSite, companyId: user.companyId });
    setNewSite({ name: '', address: '', lat: 0, lng: 0 });
    alert("New site registered successfully.");
  };

  const manageableEmployees = state.users.filter(u => {
    const isSameCompany = u.companyId === user.companyId;
    if (isAdmin || isSuper) return isSameCompany && (u.role === UserRole.EMPLOYEE || u.role === UserRole.SUPERVISOR);
    if (isSupervisor) return isSameCompany && u.supervisorId === user.id;
    return false;
  });

  const userTodayRecord = state.attendance.find(a => a.userId === user.id && a.date === today);

  return (
    <div className="space-y-10">
      {!isSuper && user.role === UserRole.EMPLOYEE && (
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-gray-100 text-center max-w-xl mx-auto">
          <h2 className="text-3xl font-black text-blue-900 mb-2 uppercase tracking-tighter leading-none">Operation Punch</h2>
          <p className="text-gray-400 font-bold uppercase text-[10px] mb-8 tracking-[0.2em]">{new Date().toDateString()}</p>
          
          <div className="flex flex-col items-center gap-6">
            {isOnLeave && (
               <div className="w-full bg-red-50 p-4 rounded-2xl border border-red-100 mb-4">
                  <p className="text-red-600 text-[10px] font-black uppercase tracking-widest text-center">Active Approved Leave Detected</p>
               </div>
            )}

            {!userTodayRecord ? (
              <div className="w-full space-y-2 mb-4 text-left">
                <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Assigned Work Site (Required)</label>
                <select 
                  className="w-full px-5 py-4 bg-blue-50 border border-blue-100 rounded-2xl font-black text-blue-900 text-sm outline-none focus:ring-4 focus:ring-blue-500/10"
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                >
                  <option value="">Choose Site Location...</option>
                  {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {selectedSiteId && (
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-2 flex items-center p-2 rounded-lg border ${currentDistance <= 100 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    <span className={`w-2.5 h-2.5 rounded-full mr-2 ${currentDistance <= 100 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                    {currentDistance <= 100 
                      ? `Within Site Radius (${Math.round(currentDistance)}m)` 
                      : `Access Restricted: You are ${Math.round(currentDistance)}m away. Move closer.`
                    }
                  </p>
                )}
              </div>
            ) : (
              <div className="w-full bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-4">
                 <p className="text-blue-900 text-[10px] font-black uppercase tracking-widest text-center">Daily Entry Captured: {userTodayRecord.checkIn} {userTodayRecord.checkOut ? `— ${userTodayRecord.checkOut}` : ''}</p>
              </div>
            )}

            <div className="flex justify-center gap-4 w-full">
              <button 
                onClick={() => {
                  try {
                    markAttendance(user.id, user.companyId, 'IN', coords || undefined, 0, undefined, undefined, selectedSiteId);
                  } catch (e: any) {
                    alert(e.message);
                  }
                }} 
                disabled={!!userTodayRecord || !canPunchIn || isOnLeave} 
                className={`flex-1 px-8 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${(!canPunchIn || isOnLeave || !!userTodayRecord) ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50' : 'bg-green-600 text-white shadow-xl shadow-green-100 hover:bg-green-700 active:scale-95'}`}
              >
                Punch In
              </button>
              <button 
                onClick={() => markAttendance(user.id, user.companyId, 'OUT', coords || undefined, overtimeHours)} 
                disabled={!userTodayRecord || !!userTodayRecord.checkOut} 
                className="flex-1 px-8 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-red-600 text-white shadow-xl shadow-red-100 disabled:opacity-50 transition-all hover:bg-red-700 active:scale-95"
              >
                Punch Out
              </button>
            </div>
          </div>
        </div>
      )}

      {(isAdmin || isSupervisor || isSuper) && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
             <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center bg-blue-50/20 gap-4">
                <div>
                   <h3 className="text-lg font-black text-blue-900 uppercase tracking-tighter leading-none">Attendance Ledger Console</h3>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Centralized Site Deployment Control</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center bg-white border border-gray-200 rounded-xl px-4 py-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mr-2">Filter Date:</span>
                    <input type="date" className="bg-transparent text-xs font-bold outline-none border-none p-0" value={ledgerDate} onChange={e => setLedgerDate(e.target.value)} />
                  </div>
                  <button 
                    onClick={() => setShowSiteManager(!showSiteManager)}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${showSiteManager ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                  >
                    {showSiteManager ? 'Close Registry' : 'Site Registry'}
                  </button>
                  <button 
                    onClick={() => setIsManualMode(!isManualMode)}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${isManualMode ? 'bg-red-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {isManualMode ? 'Close Portal' : 'Add Manual Record'}
                  </button>
                </div>
             </div>
             
             {showSiteManager && (
                <div className="p-8 bg-orange-50/10 border-b border-orange-50 animate-in fade-in slide-in-from-top-4 duration-300">
                  <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-6">Register Operational Project Site</h4>
                  <form onSubmit={handleAddSite} className="space-y-6 max-w-4xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Site Label / Name</label>
                        <input type="text" placeholder="e.g. Sector-62 Node" className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-black text-gray-800 outline-none" value={newSite.name} onChange={e => setNewSite({...newSite, name: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">Site Physical Address (Autofill Coordinates)</label>
                        <div className="flex gap-2">
                          <input type="text" placeholder="e.g. 123 Industrial Area, Noida" className="flex-1 px-4 py-3.5 bg-blue-50/50 border border-blue-100 rounded-xl text-sm font-bold text-gray-700 outline-none" value={newSite.address} onChange={e => setNewSite({...newSite, address: e.target.value})} />
                          <button type="button" onClick={resolveAddress} disabled={isResolving} className={`px-4 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg transition-all ${isResolving ? 'opacity-50' : 'hover:bg-blue-700 active:scale-95'}`}>
                            {isResolving ? 'Resolving...' : 'Resolve Location'}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                      <div className="space-y-2">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Lat Coordinates</label>
                        <input type="number" step="any" placeholder="28.123" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-black text-blue-900 outline-none" value={newSite.lat || ''} onChange={e => setNewSite({...newSite, lat: parseFloat(e.target.value) || 0})} required />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Lng Coordinates</label>
                        <input type="number" step="any" placeholder="77.456" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-black text-blue-900 outline-none" value={newSite.lng || ''} onChange={e => setNewSite({...newSite, lng: parseFloat(e.target.value) || 0})} required />
                      </div>
                      <button type="submit" className="bg-orange-600 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-orange-700 transition-all">Add Site Registry</button>
                    </div>
                  </form>

                  <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {companySites.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                        <div className="overflow-hidden">
                          <p className="text-xs font-black text-gray-800 uppercase truncate">{s.name}</p>
                          <p className="text-[9px] text-gray-400 font-bold tracking-tight line-clamp-1">{s.address || 'Manual Entry'}</p>
                          <p className="text-[9px] text-blue-500 font-black tracking-widest mt-1">{s.lat.toFixed(5)}, {s.lng.toFixed(5)}</p>
                        </div>
                        <button onClick={() => removeSite(s.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
             )}

             {isManualMode && (
               <form onSubmit={handleManualSubmit} className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-end animate-in slide-in-from-top-4 duration-300">
                  <div className="space-y-4">
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Staff Selection</label>
                        <select className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold outline-none" value={manualData.userId} onChange={e => setManualData({...manualData, userId: e.target.value})} required>
                            <option value="">Choose Employee...</option>
                            {manageableEmployees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5 ml-1">Assigned Work Site (Required)</label>
                        <select className="w-full px-5 py-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs font-black text-blue-900 outline-none" value={manualData.siteId} onChange={e => setManualData({...manualData, siteId: e.target.value})} required>
                            <option value="">Select Site...</option>
                            {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Ledger Date</label>
                        <input type="date" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold outline-none" value={manualData.date} onChange={e => setManualData({...manualData, date: e.target.value})} required />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Check In</label>
                            <input type="time" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold outline-none" value={manualData.checkIn} onChange={e => setManualData({...manualData, checkIn: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Check Out</label>
                            <input type="time" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold outline-none" value={manualData.checkOut} onChange={e => setManualData({...manualData, checkOut: e.target.value})} />
                        </div>
                     </div>
                  </div>
                  <div className="space-y-6">
                     {manualDuplicateCheck && (
                       <div className="bg-red-50 p-3 rounded-xl border border-red-100 mb-2">
                         <p className="text-[9px] font-black text-red-600 uppercase tracking-widest text-center">Entry Already Exists for this date</p>
                       </div>
                     )}
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Overtime Credit (Hrs)</label>
                        <input type="number" step="0.5" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-black text-orange-600 outline-none" placeholder="0.0" value={manualData.ot || ''} onChange={e => setManualData({...manualData, ot: parseFloat(e.target.value) || 0})} />
                     </div>
                     <button type="submit" disabled={manualDuplicateCheck} className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all ${manualDuplicateCheck ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-900 text-white hover:bg-black'}`}>Submit Manual Entry</button>
                  </div>
               </form>
             )}
          </div>
        </div>
      )}

      {/* Ledger View */}
      {(isAdmin || isSupervisor || isSuper) && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
            <div>
              <h3 className="font-black uppercase tracking-tighter text-blue-900 text-lg leading-none">Global Attendance Ledger</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Active Multi-Project Telemetry • {ledgerDate}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Personnel</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest text-center">Operational Site</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Session Logic</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest text-center">OT (Hrs)</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase text-gray-400 tracking-widest text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {companyAttendance.slice().reverse().map((a, i) => {
                   const employee = state.users.find(u => u.id === a.userId);
                   const site = companySites.find(s => s.id === a.siteId);
                   const isGpsVerified = !!(a.lat && a.lng);

                   return (
                     <tr key={a.id || i} className="hover:bg-gray-50/30 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="font-black text-gray-800 text-xs uppercase tracking-tight">{employee?.name || 'Unknown'}</div>
                          <div className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-1">ID: {a.userId.split('-').pop()}</div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-[9px] font-black uppercase border border-blue-100/50 inline-block shadow-sm">
                            {site?.name || 'General Site'}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-xs font-black text-gray-700">{a.checkIn} — {a.checkOut || 'Shift Active'}</div>
                          <div className="text-[8px] text-gray-300 uppercase font-bold mt-1 tracking-widest">Session Date: {a.date}</div>
                        </td>
                        <td className="px-8 py-6 text-center text-xs font-black text-orange-600">
                          {a.overtimeHours ? (
                            <span className="bg-orange-50 px-3 py-1 rounded-lg border border-orange-100">{a.overtimeHours}</span>
                          ) : '--'}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end space-x-3">
                            {isGpsVerified ? (
                              <div className="flex items-center space-x-1">
                                <span className="px-3 py-1 bg-green-50 text-green-700 rounded-xl text-[8px] font-black uppercase border border-green-100">Satellite Verified</span>
                              </div>
                            ) : (
                              <span className="px-3 py-1 bg-gray-50 text-gray-400 rounded-xl text-[8px] font-black uppercase border border-gray-100">Manual Override</span>
                            )}
                            <button 
                              onClick={() => setEditingRecord(a)}
                              className="p-2 text-gray-300 hover:text-blue-600 transition-colors"
                              title="Edit Attendance"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          </div>
                        </td>
                     </tr>
                   );
                })}
                {companyAttendance.length === 0 && (
                   <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-gray-300 font-bold italic text-xs uppercase tracking-widest">No workforce movement detected for {ledgerDate}.</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editing Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl p-10 relative">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
             <button onClick={() => setEditingRecord(null)} className="absolute top-8 right-8 text-gray-300 hover:text-red-500 transition-colors">
               <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>

             <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter mb-2">Edit Entry Record</h3>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Personnel: {state.users.find(u => u.id === editingRecord.userId)?.name}</p>

             <form onSubmit={handleEditSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Site</label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs"
                      value={editingRecord.siteId || ''}
                      onChange={e => setEditingRecord({...editingRecord, siteId: e.target.value})}
                    >
                      <option value="">No Site</option>
                      {companySites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Record Date</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs"
                      value={editingRecord.date}
                      onChange={e => setEditingRecord({...editingRecord, date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Check In</label>
                    <input 
                      type="text"
                      placeholder="09:00:00"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs"
                      value={editingRecord.checkIn}
                      onChange={e => setEditingRecord({...editingRecord, checkIn: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Check Out</label>
                    <input 
                      type="text"
                      placeholder="18:00:00"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs"
                      value={editingRecord.checkOut || ''}
                      onChange={e => setEditingRecord({...editingRecord, checkOut: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">OT Hours</label>
                    <input 
                      type="number"
                      step="0.5"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs"
                      value={editingRecord.overtimeHours || 0}
                      onChange={e => setEditingRecord({...editingRecord, overtimeHours: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl">Confirm Override</button>
                  <button type="button" onClick={() => setEditingRecord(null)} className="px-8 bg-gray-100 text-gray-400 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePanel;
