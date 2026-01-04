
import React, { useState } from 'react';

type LegalTab = 'vision' | 'privacy' | 'terms' | 'disclaimer' | 'refund' | 'contact';

const LegalCompliance: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<LegalTab>('vision');
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: 'Support', message: '' });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Support Ticket Created: Our technical team will contact you within 4-6 business hours.");
    setContactForm({ name: '', email: '', subject: 'Support', message: '' });
  };

  const content: Record<Exclude<LegalTab, 'contact'>, { title: string; subtitle: string; body: string[] }> = {
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
        "3. Multi-Tenant Isolation: We employ strict database isolation. Your company's data (personnel, logs, financials) is mathematically segmented from other enterprises on the platform.",
        "4. Third-Party Sharing: WorkManager does not sell or trade your project data. Information is only shared with authorized administrators within your specific organization.",
        "5. Security: Data is stored in secure, local-first environments with simulated end-to-end encryption to protect sensitive corporate intel."
      ]
    },
    terms: {
      title: "Terms & Conditions",
      subtitle: "User Agreement for WorkManager Platform",
      body: [
        "1. Acceptance of Terms: By registering an enterprise or a personal account, you agree to abide by these operational protocols.",
        "2. Accuracy of Logs: Employees are responsible for the physical accuracy of the 'Meters Laid' logged in the system. Discrepancies between digital logs and physical site audits may lead to disciplinary action.",
        "3. Financial Protocol: Advance and Salary requests are subject to hierarchical approval. WorkManager acts as a ledger and is not responsible for the actual bank transfer of funds.",
        "4. Geofencing Compliance: Attempting to bypass GPS verification using 'Mock Location' apps is a violation of the system's security integrity and will be flagged.",
        "5. Project Data Ownership: All work logs and telemetry generated on the platform are the sole property of the registering Enterprise (Company)."
      ]
    },
    disclaimer: {
      title: "Legal Disclaimer",
      subtitle: "Limitation of Liability & Responsibility",
      body: [
        "1. Information Accuracy: While we strive for absolute precision, WorkManager provides the platform 'as-is'. We do not guarantee the 100% accuracy of GPS satellite coordinates in areas with high interference.",
        "2. Third-Party Links: The AI Intelligence Audit may provide links to external websites (Google Search). We do not endorse or take responsibility for the content on these third-party domains.",
        "3. Financial Decisions: Payroll calculations are based on user-inputted data and shift configurations. Final disbursement decisions rest solely with the Enterprise Admin.",
        "4. System Availability: We target 99.9% uptime for the cloud cluster; however, we are not liable for operational delays caused by local network failures or ISP outages at remote project sites."
      ]
    },
    refund: {
      title: "Refund & Cancellation",
      subtitle: "Subscription Billing Protocols",
      body: [
        "1. Subscription Terms: All Service Tier (Pro/Elite) subscriptions are billed in advance. Renewal is required upon expiry to maintain advanced features.",
        "2. Refund Eligibility: A full refund is available within 7 days of the initial purchase if no more than 5 workforce IDs have been enrolled under the new tier.",
        "3. Prorated Credits: No partial refunds are provided for monthly cycles. However, if a plan is downgraded, the remaining balance will be applied as credit for the next billing cycle.",
        "4. Termination: Users may cancel their subscription at any time via the Master Root request. Access to Pro features will continue until the end of the current paid term."
      ]
    }
  };

  const isContact = activeSubTab === 'contact';
  const current = !isContact ? content[activeSubTab as keyof typeof content] : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Tab Navigation */}
      <div className="flex flex-wrap justify-center gap-2 bg-gray-100 p-2 rounded-2xl w-full">
        {(['vision', 'privacy', 'terms', 'disclaimer', 'refund', 'contact'] as LegalTab[]).map((key) => (
          <button
            key={key}
            onClick={() => setActiveSubTab(key)}
            className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              activeSubTab === key 
                ? 'bg-blue-900 text-white shadow-md' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Document Viewer */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 md:p-14 relative overflow-hidden">
        {/* Professional Watermark */}
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none select-none">
           <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
        </div>

        <div className="relative z-10">
          {isContact ? (
            <div className="animate-in fade-in duration-500">
              <div className="flex flex-col items-center text-center mb-10">
                <h2 className="text-3xl font-black text-blue-900 uppercase tracking-tighter mb-2">Contact Us</h2>
                <div className="h-1 w-12 bg-blue-600 mb-4"></div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Direct Technical Support Cluster</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                    <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-4">Support Channels</h4>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase">Phone Support</p>
                          <p className="text-sm font-black text-blue-900">+91 77093 84869</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase">Email Protocol</p>
                          <p className="text-sm font-black text-blue-900">support@workmanager.com</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <p className="text-xs font-medium text-gray-500 leading-relaxed italic">
                      "Our dedicated engineers are stationed to ensure your project cluster remains 100% operational. For priority Elite users, the response time is instantaneous via the internal Command Center."
                    </p>
                  </div>
                </div>

                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <input type="text" placeholder="Your Name" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl outline-none text-sm font-bold" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} required />
                  <input type="email" placeholder="Work Email" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl outline-none text-sm font-bold" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} required />
                  <select className="w-full px-5 py-4 bg-gray-50 border rounded-2xl outline-none text-sm font-bold" value={contactForm.subject} onChange={e => setContactForm({...contactForm, subject: e.target.value})}>
                    <option value="Support">Technical Support</option>
                    <option value="Billing">Billing Inquiry</option>
                    <option value="Sales">Enterprise Upgrade</option>
                  </select>
                  <textarea rows={4} placeholder="Describe your inquiry..." className="w-full px-5 py-4 bg-gray-50 border rounded-2xl outline-none text-sm font-bold" value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})} required></textarea>
                  <button type="submit" className="w-full bg-blue-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Submit Ticket</button>
                </form>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center text-center mb-12">
                <h2 className="text-3xl font-black text-blue-900 uppercase tracking-tighter mb-2">{current?.title}</h2>
                <div className="h-1 w-12 bg-orange-500 mb-4"></div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">{current?.subtitle}</p>
              </div>

              <div className="space-y-6">
                {current?.body.map((paragraph, i) => (
                  <p key={i} className="text-gray-600 leading-relaxed font-medium text-sm md:text-base border-l-4 border-gray-50 pl-6 py-2 hover:border-blue-100 transition-colors">
                    {paragraph}
                  </p>
                ))}
              </div>
            </>
          )}

          <div className="mt-16 pt-10 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black border border-blue-100">
                   ✓
                </div>
                <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Digitally Verified Platform</p>
             </div>
             <p className="text-[9px] text-gray-300 font-bold uppercase tracking-[0.4em]">© WorkManager Core System 2023</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalCompliance;
