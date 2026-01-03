
import React from 'react';

export const COLORS = {
  primary: '#0D47A1', // Deep Blue from logo
  secondary: '#64748b',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#E35D22', // Orange from logo
  accent: '#E35D22'
};

interface LogoProps {
  className?: string;
  iconClassName?: string;
  showText?: boolean;
  light?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  iconClassName = "w-16 h-16", 
  showText = true, 
  light = false 
}) => (
  <div className={`flex flex-col items-center justify-center ${className}`}>
    <div className={`relative flex items-center justify-center shrink-0 ${iconClassName}`}>
      <svg viewBox="0 0 400 300" className="w-full h-full">
        {/* Background Arc */}
        <path d="M50 220 Q40 100 200 80 Q360 100 350 220" fill="none" stroke={light ? "#fff" : "#E35D22"} strokeWidth="8" strokeLinecap="round" />
        
        {/* Buildings (Orange) */}
        <path d="M130 200 L130 120 L160 120 L160 100 L180 100 L180 150 L200 150 L200 200 Z" fill={light ? "#fff" : "#E35D22"} />
        <rect x="135" y="130" width="5" height="5" fill="white" opacity="0.6" />
        <rect x="135" y="145" width="5" height="5" fill="white" opacity="0.6" />
        <rect x="165" y="110" width="5" height="5" fill="white" opacity="0.6" />
        
        {/* Cable Spool */}
        <ellipse cx="170" cy="210" rx="40" ry="25" fill="#333" />
        <ellipse cx="170" cy="205" rx="40" ry="25" fill="#444" />
        <ellipse cx="170" cy="200" rx="40" ry="25" fill="#222" />
        <ellipse cx="170" cy="200" rx="35" ry="20" fill="#333" />
        <ellipse cx="170" cy="200" rx="15" ry="8" fill="#111" />
        
        {/* Wrench */}
        <path d="M220 220 L270 170" stroke="#333" strokeWidth="15" strokeLinecap="round" />
        <circle cx="270" cy="170" r="15" fill="#333" />
        <rect x="265" y="160" width="10" height="10" fill="white" transform="rotate(45 270 170)" />
        
        {/* Hard Hat (Blue) */}
        <path d="M200 180 A50 40 0 0 1 300 180 L300 190 L200 190 Z" fill="#0072BC" />
        <path d="M210 180 L290 180 L290 185 L210 185 Z" fill="#0054A6" />
        
        {/* Wires/Cables */}
        <path d="M300 150 L300 120" stroke="#333" strokeWidth="12" strokeLinecap="round" />
        <circle cx="285" cy="110" r="4" fill="red" />
        <circle cx="295" cy="105" r="4" fill="yellow" />
        <circle cx="305" cy="105" r="4" fill="green" />
        <circle cx="315" cy="110" r="4" fill="orange" />
      </svg>
    </div>
    
    {showText && (
      <div className="text-center mt-4">
        <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tight leading-none" style={{ color: light ? '#fff' : '#E35D22' }}>
          PRAGATI
        </h1>
        <div className="flex items-center justify-center space-x-4 mt-2">
          <div className="h-[3px] w-8 md:w-12 bg-[#0D47A1]"></div>
          <p className="text-sm md:text-lg font-bold tracking-[0.2em] uppercase text-[#0D47A1]">
            ENTERPRISES
          </p>
          <div className="h-[3px] w-8 md:w-12 bg-[#0D47A1]"></div>
        </div>
        <p className="text-[10px] md:text-xs font-medium text-gray-500 mt-2 tracking-wide italic">
          Workforce & Cable Project Management
        </p>
      </div>
    )}
  </div>
);

export const ICONS = {
  Dashboard: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
    </svg>
  ),
  Users: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-3.833-6.242 4.125 4.125 0 01-4.53-4.058 4.125 4.125 0 018.25 0c0 .554-.031 1.101-.092 1.64m-2.322 4.309a2.313 2.313 0 011.121 1.816v.448c0 .532-.07 1.05-.204 1.54m-4.387-4.546a5.014 5.014 0 00-6.142-6.142 5.014 5.014 0 00-6.142 6.142 5.014 5.014 0 006.142 6.142 5.014 5.014 0 006.142-6.142z" />
    </svg>
  ),
  Time: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Work: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 .621-.504 1.125-1.125 1.125H4.875c-.621 0-1.125-.504-1.125-1.125v-4.25m16.5 0a2.25 2.25 0 00-2.25-2.25H5.625a2.25 2.25 0 00-2.25 2.25m16.5 0V9.45c0-.621-.504-1.125-1.125-1.125h-4.466a2.25 2.25 0 01-1.488-.568l-1.956-1.71a2.25 2.25 0 00-1.488-.568H5.625c-.621 0-1.125.504-1.125 1.125v6.95m17.167 4.5l-2.62-2.62M4.5 19.5l2.62-2.62" />
    </svg>
  ),
  Money: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.107c.19.074.396-.072.404-.273L18.75 15.75m-2.625 4.5c.328-1.558.487-3.13.463-4.696a48.656 48.656 0 015.01-1.685c.19-.059.273-.284.184-.455l-3.426-6.59c-.04-.077-.12-.12-.205-.12H8.962a.225.225 0 00-.191.107l-3.47 5.562c-.043.07-.05.156-.019.231l.82 2.012c.03.074.1.12.18.12H13.5c.21 0 .416-.072.58-.204l1.32-1.076a.375.375 0 01.59.294v1.8c0 .24-.12.464-.316.6l-1.636 1.14c-.164.114-.264.3-.264.5v1.2c0 .2.1.386.264.5l1.636 1.14c.196.136.316.36.316.6v1.8a.375.375 0 01-.59.294l-1.32-1.076a.825.825 0 00-.58-.204H5.35c-.08 0-.15.046-.18.12l-.82 2.012c-.03.075-.024.161.019.231l3.47 5.562a.225.225 0 00.191.107H16.038c.085 0 .165.043.205.12l3.426 6.59c.089.171.006.396-.184.455a48.678 48.678 0 01-5.01 1.685c.024 1.566-.135 3.138-.463 4.696M12 18.75a60.07 60.07 0 00-15.797 2.107c-.19.074-.396-.072-.404-.273L1.25 15.75" />
    </svg>
  ),
  Shield: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  Rocket: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41m5.96 5.96a14.926 14.926 0 01-5.84 1.2l-3.1-3.1a14.926 14.926 0 011.2-5.84m5.74 7.74l3.5 3.5m-7.24-7.24L5.5 5.5" />
    </svg>
  )
};
