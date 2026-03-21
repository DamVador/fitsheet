import React, { useState, useEffect } from 'react';

export default function ActiveWorkout({ workout, cycleName, logs, onSave, onBack }) {
  const [startTime] = useState(Date.now());
  const [rest, setRest] = useState({ active: false, sec: 0 });
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('active_draft');
    return saved ? JSON.parse(saved) : {};
  });
  const [userNotes, setUserNotes] = useState({});

  useEffect(() => { localStorage.setItem('active_draft', JSON.stringify(data)); }, [data]);

  const getYTId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url?.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const calculateSets = () => Object.keys(data).filter(k => k.endsWith('_r') && data[k]).length;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0f0f0f] overflow-y-auto pb-40 text-white font-sans">
      <div className="sticky top-0 bg-[#0f0f0f]/95 backdrop-blur-md p-4 border-b border-white/10 flex justify-between items-center z-50">
        <button onClick={onBack} className="text-gray-500 text-2xl px-4 font-bold">✕</button>
        <div className="text-center">
          <h1 className="font-black italic uppercase text-xs tracking-widest text-accent">{workout.name}</h1>
          <p className="text-[8px] uppercase text-gray-400 font-bold tracking-tighter">Entraînement en cours</p>
        </div>
        <div className="w-12"></div>
      </div>

      <div className="p-4 space-y-12">
        {workout.exercises.map((ex, i) => {
          const count = logs.filter(l => l[1] === workout.name && l[0].includes(cycleName)).length;
          const week = ex.weeks[Math.min(count, ex.weeks.length - 1)];
          const last = [...logs].reverse().find(l => l[3] === ex.name);
          const ytId = getYTId(week.notes);

          return (
            <div key={i} className="space-y-5">
              <div className="flex items-start gap-3">
                <span className="bg-accent w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-black italic text-sm">{ex.block}</span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-black uppercase italic leading-tight mb-1">{ex.name}</h2>
                  {week.notes && <p className="text-[11px] text-gray-500 italic border-l border-white/10 pl-3">{week.notes.replace(/https?:\/\/\S+/g, '').trim()}</p>}
                </div>
              </div>

              {ytId && (
                <div className="rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black shadow-lg">
                  <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${ytId}`} frameBorder="0" allowFullScreen></iframe>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-[8px] font-black uppercase text-gray-600 mb-1 tracking-widest">Tempo</p>
                  <p className="text-xs font-bold">{week.tempo || "Normal"}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-[8px] font-black uppercase text-gray-600 mb-1 tracking-widest">Repos</p>
                  <p className="text-xs font-bold">{week.rest || "N/A"}</p>
                </div>
              </div>

              <div className="space-y-4">
                {[...Array(parseInt(week.sets) || 0)].map((_, s) => (
                  <div key={s} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between px-1"><span className="text-[8px] font-black text-gray-600 uppercase">Set {s+1}</span><span className="text-[8px] font-black text-gray-400 uppercase">Last: {last ? last[4+s*2] : '--'}</span></div>
                      <input type="number" pattern="\d*" placeholder="KG" className="w-full h-16 bg-[#1a1a1a] rounded-xl text-center text-2xl font-black focus:ring-4 ring-accent/20 outline-none border-none" 
                        value={data[`${ex.name}_${s}_w`] || ''} onChange={e => setData({...data, [`${ex.name}_${s}_w`]: e.target.value})} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between px-1"><span className="text-[8px] font-black text-gray-600 uppercase">Cible: {week.reps}</span></div>
                      <input type="number" pattern="\d*" placeholder="REPS" className="w-full h-16 bg-[#1a1a1a] rounded-xl text-center text-2xl font-black focus:ring-4 ring-accent/20 outline-none border-none" 
                        value={data[`${ex.name}_${s}_r`] || ''} onChange={e => setData({...data, [`${ex.name}_${s}_r`]: e.target.value})} />
                    </div>
                    <button onClick={() => setRest({ active: true, sec: parseInt(week.rest) || 90 })} className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center active:bg-green-500 transition-colors flex-shrink-0">
                      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    </button>
                  </div>
                ))}
              </div>

              <textarea 
                placeholder="Notes pour le coach sur cet exercice..."
                className="w-full bg-[#1a1a1a] rounded-xl p-4 text-xs text-gray-300 border border-white/5 focus:border-accent/50 outline-none resize-none h-20 transition-all"
                value={userNotes[ex.name] || ''}
                onChange={(e) => setUserNotes({...userNotes, [ex.name]: e.target.value})}
              />
            </div>
          );
        })}

        <button onClick={() => { onSave(data, Math.floor((Date.now()-startTime)/60000), calculateSets(), userNotes); localStorage.removeItem('active_draft'); }} 
          className="w-full bg-accent h-24 rounded-[2.5rem] font-black text-2xl uppercase italic shadow-2xl shadow-accent/40 active:scale-95 transition-transform">
          Terminer la séance
        </button>
      </div>

      {rest.active && (
        <div className="fixed bottom-0 left-0 right-0 p-8 bg-accent flex justify-between items-center z-[110] shadow-[0_-20px_50px_rgba(233,69,96,0.4)] rounded-t-[2.5rem] animate-in slide-in-from-bottom">
          <RestTimerDisplay seconds={rest.sec} onEnd={() => setRest({ active: false, sec: 0 })} />
        </div>
      )}
    </div>
  );
}

function RestTimerDisplay({ seconds, onEnd }) {
  const [t, setT] = useState(seconds);
  useEffect(() => {
    if (t <= 0) { try { new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play(); } catch(e){} onEnd(); return; }
    const i = setInterval(() => setT(prev => prev - 1), 1000);
    return () => clearInterval(i);
  }, [t]);
  return (
    <>
      <div className="text-5xl font-black italic tracking-tighter">{t}s</div>
      <div className="text-right">
        <p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-widest">Repos en cours</p>
        <button onClick={onEnd} className="bg-black/20 px-8 py-3 rounded-full font-black uppercase text-[10px] tracking-widest active:scale-90 transition-transform">Passer</button>
      </div>
    </>
  );
}