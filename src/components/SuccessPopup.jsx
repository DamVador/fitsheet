import React from 'react';

export default function SuccessPopup({ stats, onClose }) {
  return (
    <div className="fixed inset-0 z-[800] bg-[#0f0f0f]/95 backdrop-blur-lg flex items-center justify-center p-6 text-center">
      <div className="bg-[#161616] p-10 rounded-[3.5rem] border border-accent/20 max-w-sm w-full shadow-2xl">
        <div className="text-7xl mb-6">🏆</div>
        <h2 className="text-3xl font-black uppercase italic mb-1">Session Finie !</h2>
        <p className="text-accent font-black text-[10px] uppercase mb-8 tracking-[0.3em]">{stats.name}</p>
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-white/5 p-4 rounded-3xl"><p className="text-[9px] text-gray-500 font-black uppercase mb-1 text-center">Temps</p><p className="text-xl font-black italic">{stats.time}min</p></div>
          <div className="bg-white/5 p-4 rounded-3xl"><p className="text-[9px] text-gray-500 font-black uppercase mb-1 text-center">Séries</p><p className="text-xl font-black italic">{stats.sets}</p></div>
        </div>
        <button onClick={onClose} className="w-full bg-accent py-5 rounded-2xl font-black uppercase italic tracking-widest active:scale-95 transition-transform">Continuer</button>
      </div>
    </div>
  );
}