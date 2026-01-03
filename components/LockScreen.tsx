
import React, { useState } from 'react';
import { User } from '../types';
import { Logo } from '../constants';

interface Props {
  user: User;
  onUnlock: () => void;
  onLogout: () => void;
}

const LockScreen: React.FC<Props> = ({ user, onUnlock, onLogout }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleInput = (val: string) => {
    if (pin.length < 4) {
      const newPin = pin + val;
      setPin(newPin);
      if (newPin.length === 4) {
        if (newPin === user.pin) {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 800);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0D47A1]/80 backdrop-blur-2xl flex items-center justify-center p-6 select-none animate-in fade-in duration-500">
      <div className="w-full max-w-sm text-center">
        <Logo iconClassName="w-24 h-20 mx-auto opacity-80" showText={false} light={true} />
        
        <div className="mt-8 mb-12">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Security Locked</h2>
          <p className="text-blue-200 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Enter your 4-digit PIN to access Pragati Cloud</p>
        </div>

        <div className="flex justify-center gap-4 mb-16">
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                error ? 'bg-red-500 border-red-500 scale-125' :
                pin.length > i ? 'bg-orange-500 border-orange-500 scale-110' : 'border-white/30'
              }`}
            ></div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 px-8 mb-12">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(val => (
            <button 
              key={val} 
              onClick={() => handleInput(val)}
              className="w-full aspect-square flex items-center justify-center rounded-2xl bg-white/10 text-white text-xl font-black hover:bg-white/20 active:bg-orange-500 active:scale-90 transition-all border border-white/5"
            >
              {val}
            </button>
          ))}
          <div className="w-full"></div>
          <button 
            onClick={() => handleInput('0')}
            className="w-full aspect-square flex items-center justify-center rounded-2xl bg-white/10 text-white text-xl font-black hover:bg-white/20 active:bg-orange-500 transition-all border border-white/5"
          >
            0
          </button>
          <button 
            onClick={handleBackspace}
            className="w-full aspect-square flex items-center justify-center rounded-2xl bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all border border-red-500/20"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={2.5} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.41-6.41A2 2 0 0110.83 5H20a2 2 0 012 2v10a2 2 0 01-2 2h-9.17a2 2 0 01-1.42-.59L3 12z" /></svg>
          </button>
        </div>

        <button 
          onClick={onLogout}
          className="text-white/40 font-black uppercase text-[9px] tracking-[0.4em] hover:text-orange-400 transition-colors"
        >
          Forgot PIN? Exit System
        </button>
      </div>
    </div>
  );
};

export default LockScreen;
