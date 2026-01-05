
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ICONS } from '../constants';

interface Props {
  context: any;
}

const AiAdvisor: React.FC<Props> = ({ context }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsight = async () => {
    setLoading(true);
    try {
      /* Fix: Initialize GoogleGenAI with process.env.API_KEY directly as required by the library guidelines */
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Analyze these field operations telemetry for "Pragati Cloud Workforce Management".
        System Snapshot:
        - Total Personnel: ${context.totalEmployees}
        - Total Production: ${context.totalProductionMeters} meters
        - Active Project Sites: ${context.activeSites}
        - Pending Approvals: ${context.pendingRequests}
        - Average Shift Duration: ${context.averageShiftHours.toFixed(1)} hours
        - Recent Activities: ${context.recentActivity.join(", ")}

        Provide a concise, professional executive summary (max 150 words). 
        Identify 1 key bottleneck and 1 productivity optimization. 
        Tone: Professional, Data-driven, Enterprise Consultant.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      /* Fix: Use .text property directly instead of text() method as per extraction guidelines */
      setInsight(response.text || "Unable to parse operational telemetry at this time.");
    } catch (err) {
      console.error(err);
      setInsight("Cloud Intelligence Node currently unreachable. Ensure API access is enabled.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden border border-slate-800 animate-in fade-in duration-700">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40">
                 <ICONS.Rocket className="w-6 h-6 text-white" />
              </div>
              <div>
                 <h3 className="text-xl font-black uppercase tracking-tighter">Operations AI Advisor</h3>
                 <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Powered by Gemini Cloud Intelligence</p>
              </div>
           </div>
           {!insight && !loading && (
             <button 
               onClick={generateInsight}
               className="px-6 py-3 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-50 transition-all active:scale-95"
             >
               Analyze System
             </button>
           )}
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
             <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Scanning Identity Matrix & Telemetry Logs...</p>
          </div>
        ) : insight ? (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mb-6">
                <p className="text-xs font-medium text-slate-300 leading-relaxed italic">
                  "{insight}"
                </p>
             </div>
             <div className="flex justify-between items-center">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Real-time audit completed successfully.</p>
                <button 
                  onClick={() => setInsight(null)}
                  className="text-[9px] font-black text-blue-400 uppercase tracking-widest hover:underline"
                >
                  Recalibrate Analysis
                </button>
             </div>
          </div>
        ) : (
          <div className="py-6">
             <p className="text-sm font-medium text-slate-400 max-w-md leading-relaxed">
               Execute an AI-driven audit of your enterprise infrastructure to identify anomalies, productivity gaps, and workforce trends based on the latest telemetry.
             </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAdvisor;
