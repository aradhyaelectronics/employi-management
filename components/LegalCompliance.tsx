
import React, { useState } from 'react';

type LegalTab = 'vision' | 'privacy' | 'terms' | 'disclaimer' | 'refund' | 'payment' | 'contact';

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
      title: "Our Vision",
      subtitle: "Digital Transformation of the Workforce",
      body: [
        "To empower every organization with seamless digital infrastructure that bridges the gap between administrative vision and field execution.",
        "We strive to be the global benchmark for real-time workforce telemetry, ensuring transparency, safety, and productivity in every meter laid and every task completed.",
        "Our goal is to build an ecosystem where labor is recognized through data, and management is optimized through cloud intelligence."
      ]
    },
    privacy: {
      title: "Privacy Policy",
      subtitle: "Data Protection & Security Standards",
      body: [
        "1. Data Collection: We collect location data only during active shifts (Punch In to Punch Out) for geofence verification.",
        "2. Usage: Your personal information is never sold to third parties. It is strictly used for identity verification and payroll processing within your enterprise node.",
        "3. Security: All sensitive data is encrypted using industry-standard protocols. PINs are hashed and never stored in plain text.",
        "4. Retention: Organizational data is retained as long as the subscription node is active. Terminated nodes have a 30-day grace period before permanent erasure."
      ]
    },
    terms: {
      title: "Terms & Conditions",
      subtitle: "Usage Rights & Service Agreement",
      body: [
        "1. Account Security: Users are responsible for maintaining the confidentiality of their 6-digit PIN and mobile ID.",
        "2. Fair Usage: System abuse, including GPS spoofing or identity duplication, will lead to immediate account suspension.",
        "3. Service Availability: While we aim for 99.9% uptime, Pragati is not liable for data loss during local network outages or device failures.",
        "4. License: Subscriptions are non-transferable between organizations."
      ]
    },
    disclaimer: {
      title: "Disclaimer",
      subtitle: "Legal Scope & Limitations",
      body: [
        "1. Accuracy: GPS coordinates are subject to satellite precision. Geofence alerts are intended as aids and not absolute proofs of presence.",
        "2. Financials: The payroll engine is a calculator. Final disbursements are the sole responsibility of the company administrator.",
        "3. Third Party: We integrate with Razorpay for payments; their terms apply to all transactions."
      ]
    },
    refund: {
      title: "Refund Policy",
      subtitle: "Cancellation & Refund Terms",
      body: [
        "1. Processing Fee: A mandatory and non-refundable payment gateway charge of 2.5% applies to all transactions and will be deducted from any eligible refund amount.",
        "2. Eligibility: Refunds are only considered for technical failures that prevent system access within 48 hours of purchase.",
        "3. Timeline: Approved refunds will be processed back to the original payment method within 7-10 business days.",
        "4. Pro-rata: We do not offer pro-rata refunds for partially used subscription months."
      ]
    },
    payment: {
      title: "Payment Policy",
      subtitle: "Safe & Secure Transactions",
      body: [
        "1. Methods: We accept all major UPI, Credit/Debit cards, and Net Banking via the Razorpay secure gateway.",
        "2. Billing: Subscriptions are pre-paid. Access is granted instantly upon successful gateway verification.",
        "3. Taxes: All prices are inclusive of applicable GST unless stated otherwise.",
        "4. Security: Pragati Cloud never stores your CVV or Card details; all transactions are handled by PCI-DSS compliant partners."
      ]
    }
  };

  const isContact = activeSubTab === 'contact';
  const current = !isContact ? content[activeSubTab as keyof typeof content] : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-wrap justify-center gap-2 bg-white/80 backdrop-blur-md p-2 rounded-3xl border border-slate-200 sticky top-24 z-40">
        {(['vision', 'privacy', 'terms', 'payment', 'refund', 'disclaimer', 'contact'] as LegalTab[]).map((key) => (
          <button
            key={key}
            onClick={() => setActiveSubTab(key)}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              activeSubTab === key 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-slate-500 hover:text-blue-600'
            }`}
          >
            {key === 'terms' ? 'T&C' : key}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-10 relative overflow-hidden">
        <div className="relative z-10">
          {isContact ? (
            <div className="animate-in fade-in duration-500">
              <h2 className="text-3xl font-black text-blue-900 uppercase tracking-tighter mb-8 text-center">Contact Us</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-3xl">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Corporate Support</p>
                    <p className="text-lg font-black text-slate-800">+91 77093 84869</p>
                    <p className="text-xs font-bold text-slate-400 lowercase mt-1">pragatienterprises569@gmail.com</p>
                  </div>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed border-l-4 border-blue-100 pl-4">
                    Our technical support desk is operational from 9:00 AM to 7:00 PM IST, Monday to Saturday. Enterprise priority support is available 24/7.
                  </p>
                </div>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <input type="text" placeholder="Name" className="w-full px-6 py-4 bg-slate-50 border rounded-2xl text-xs font-bold" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} required />
                  <input type="email" placeholder="Email" className="w-full px-6 py-4 bg-slate-50 border rounded-2xl text-xs font-bold" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} required />
                  <textarea rows={4} placeholder="How can we help?" className="w-full px-6 py-4 bg-slate-50 border rounded-2xl text-xs font-bold" value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})} required></textarea>
                  <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Submit Message</button>
                </form>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-black text-blue-900 uppercase tracking-tighter mb-2">{current?.title}</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{current?.subtitle}</p>
              </div>
              <div className="space-y-6 max-w-3xl mx-auto">
                {current?.body.map((text, i) => (
                  <p key={i} className="text-slate-600 leading-relaxed font-bold text-sm border-l-2 border-slate-100 pl-6 py-1">
                    {text}
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalCompliance;
