
import React, { useState } from 'react';

const LegalCompliance: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'vision' | 'privacy' | 'terms'>('vision');

  const content = {
    vision: {
      title: "Our Vision: Empowering Infrastructure",
      subtitle: "The Digitization of Indian Projects",
      body: [
        "WorkManager was founded on a singular premise: that the physical building of our world deserves the best digital tools. Our vision is to eliminate the 'information gap' between the site and the office.",
        "We aim to be the backbone of cable laying and workforce management across the nation, ensuring every meter of progress is accounted for, every worker is fairly compensated, and every project is completed with absolute transparency.",
        "By leveraging real-time telemetry and geofencing, we are not just tracking work—we are building trust between companies and their most valuable asset: their people."
      ]
    },
    privacy: {
      title: "Privacy Policy",
      subtitle: "Effective Date: October 2023 | Version 1.2",
      body: [
        "1. Data Collection: WorkManager collects essential operational data, including real-time Geolocation during punch-in/out, work logs (cable specifications), and financial disbursement requests.",
        "2. Purpose: Location data is used strictly for Geofencing verification to ensure work is performed at authorized project sites. This data is never used for tracking outside of operational hours.",
        "3. Multi-Tenant Isolation: We employ strict database isolation. Your company's data (personnel, logs, financials) is mathematically segmented from other enterprises on the platform. No cross-tenant data leakage is possible.",
        "4. Third-Party Sharing: WorkManager does not sell or trade your project data. Information is only shared with authorized administrators within your specific organization.",
        "5. Security: Data is stored in secure, local-first environments with simulated end-to-end encryption to protect sensitive corporate intel."
      ]
    },
    terms: {
      title: "Terms & Conditions",
      subtitle: "User Agreement for WorkManager Platform",
      body: [
        "1. Acceptance of Terms: By registering an enterprise or a personal account, you agree to abide by these operational protocols.",
        "2. Accuracy of Logs: Employees are responsible for the physical accuracy of the 'Meters Laid' logged in the system. Discrepancies between digital logs and physical site audits may lead to disciplinary action as per your company's policy.",
        "3. Financial Protocol: Advance and Salary requests are subject to hierarchical approval. WorkManager acts as a ledger and is not responsible for the actual bank transfer of funds.",
        "4. Geofencing Compliance: Attempting to bypass GPS verification using 'Mock Location' apps is a violation of the system's security integrity and will be flagged to administrators.",
        "5. Project Data Ownership: All work logs and telemetry generated on the platform are the sole property of the registering Enterprise (Company)."
      ]
    }
  };

  const current = content[activeSubTab];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Tab Navigation */}
      <div className="flex space-x-2 bg-gray-100 p-1.5 rounded-2xl w-fit mx-auto">
        {Object.keys(content).map((key) => (
          <button
            key={key}
            onClick={() => setActiveSubTab(key as any)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeSubTab === key 
                ? 'bg-white text-blue-900 shadow-md' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Document Viewer */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-10 md:p-16 relative overflow-hidden">
        {/* Professional Watermark/Bg */}
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none select-none">
           <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
        </div>

        <div className="relative z-10">
          <div className="flex flex-col items-center text-center mb-12">
            <h2 className="text-3xl font-black text-blue-900 uppercase tracking-tighter mb-2">{current.title}</h2>
            <div className="h-1 w-12 bg-orange-500 mb-4"></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">{current.subtitle}</p>
          </div>

          <div className="space-y-6">
            {current.body.map((paragraph, i) => (
              <p key={i} className="text-gray-600 leading-relaxed font-medium text-sm md:text-base border-l-4 border-gray-50 pl-6 py-2 hover:border-blue-100 transition-colors">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-16 pt-10 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black border border-blue-100">
                   ✓
                </div>
                <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Digitally Verified Document</p>
             </div>
             <p className="text-[9px] text-gray-300 font-bold uppercase tracking-[0.4em]">© WorkManager Core System 2023</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex items-center space-x-5">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
               <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
               <p className="font-black uppercase tracking-widest text-[10px] text-blue-200">Security Inquiry?</p>
               <p className="text-sm font-bold opacity-80 mt-1">Contact your designated Enterprise Admin for local policy details.</p>
            </div>
         </div>
         <button className="bg-white text-blue-900 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors">
            Request PDF Copy
         </button>
      </div>
    </div>
  );
};

export default LegalCompliance;