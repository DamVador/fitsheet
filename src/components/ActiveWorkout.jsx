import React, { useState, useEffect, useRef } from 'react';

export default function ActiveWorkout({ workout, cycleName, sessionCount, logs, onSave, onBack }) {
  const [startTime] = useState(Date.now());
  const [rest, setRest] = useState({ active: false, sec: 0, total: 0 });
  const [data, setData] = useState(() => {
    const meta = JSON.parse(localStorage.getItem('active_draft_meta'));
    if (meta?.workoutName === workout.name && meta?.cycleName === cycleName) {
      return JSON.parse(localStorage.getItem('active_draft')) || {};
    }
    return {};
  });
  const [userNotes, setUserNotes] = useState(() => {
    const meta = JSON.parse(localStorage.getItem('active_draft_meta'));
    if (meta?.workoutName === workout.name && meta?.cycleName === cycleName) {
      return meta.userNotes || {};
    }
    return {};
  });
  const timerRef = useRef(null);

  // Auto-save local à chaque changement
  useEffect(() => {
    localStorage.setItem('active_draft', JSON.stringify(data));
  }, [data]);

  // Timer countdown
  useEffect(() => {
    if (!rest.active || rest.sec <= 0) {
      clearTimeout(timerRef.current);
      if (rest.active && rest.sec === 0) setRest(r => ({ ...r, active: false }));
      return;
    }
    timerRef.current = setTimeout(() => setRest(r => ({ ...r, sec: r.sec - 1 })), 1000);
    return () => clearTimeout(timerRef.current);
  }, [rest.active, rest.sec]);

  // Back — sauvegarde locale uniquement, pas d'écriture Sheets
  const handleBack = () => {
    localStorage.setItem('active_draft', JSON.stringify(data));
    localStorage.setItem('active_draft_meta', JSON.stringify({
      workoutName: workout.name,
      cycleName,
      sessionCount,
      userNotes,
    }));
    onBack();
  };

  // Finish — écriture dans Sheets + nettoyage draft
  const handleFinish = () => {
    localStorage.removeItem('active_draft');
    localStorage.removeItem('active_draft_meta');
    onSave(
      data,
      Math.floor((Date.now() - startTime) / 60000),
      Object.keys(data).filter(k => k.endsWith('_r') && data[k]).length,
      userNotes
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0f0f0f] overflow-y-auto pb-40 text-white font-sans">
      {/* Header */}
      <div className="sticky top-0 bg-[#0f0f0f]/95 backdrop-blur-md p-4 border-b border-white/10 flex justify-between items-center z-50">
        <button onClick={handleBack} className="text-gray-500 text-2xl px-4 font-bold">✕</button>
        <div className="text-center">
          <h1 className="font-black italic uppercase text-[10px] tracking-widest text-accent truncate max-w-[200px]">
            {workout.name}
          </h1>
          <p className="text-[8px] uppercase text-gray-500 font-bold">
            Semaine {sessionCount + 1}
          </p>
        </div>
        <div className="w-12" />
      </div>

      <div className="p-4 space-y-12">
        {workout.exercises.map((ex, i) => {
          const weekIndex = Math.min(sessionCount, ex.weeks.length - 1);
          const currentWeek = ex.weeks[weekIndex];
          const s1 = ex.weeks[0];

          const displayVideoId = currentWeek.videoId || s1.videoId;
          const displayNote    = currentWeek.notes?.trim() || null; // pas de fallback S1
          const displayTempo   = currentWeek.tempo || s1.tempo;
          const displayRest    = currentWeek.rest  || s1.rest;
          const displayReps    = currentWeek.reps  || s1.reps;
          const displaySets    = parseInt(currentWeek.sets || s1.sets) || 0;
          const restSeconds    = parseInt((displayRest || '').replace(/[^0-9]/g, '')) || 90;

          const lastPerf = [...logs]
            .reverse()
            .find(l => l[3] === ex.name && l[0]?.includes(cycleName));

          return (
            <div key={i} className="space-y-6 border-b border-white/5 pb-10">
              {/* Titre */}
              <div className="flex items-start gap-4">
                <span className="bg-accent w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-black italic text-lg shadow-lg shadow-accent/20">
                  {ex.block}
                </span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-black uppercase italic leading-tight tracking-tighter">
                    {ex.name}
                  </h2>
                </div>
              </div>

              {/* Note — toujours avant la vidéo */}
              {displayNote && (
                <div className="bg-white/5 p-3 rounded-xl border-l-4 border-accent/40">
                  <p className="text-[11px] text-gray-300 italic">{displayNote}</p>
                </div>
              )}

              {/* Vidéo — fallback S1 */}
              {displayVideoId && (
                <div className="rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black shadow-lg">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${displayVideoId}`}
                    frameBorder="0"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Infos séance */}
              <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase">
                <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/5">
                  <p className="text-gray-600 mb-1">Tempo</p>
                  <p className="text-white text-xs">{displayTempo || '—'}</p>
                </div>
                <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/5">
                  <p className="text-gray-600 mb-1">Repos</p>
                  <p className="text-white text-xs">
                    {displayRest || '—'}
                    {(displayRest || '').includes('/côté') && (
                      <span className="text-accent ml-1"> par côté</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Inputs KG / Reps */}
              <div className="space-y-4">
                {[...Array(displaySets)].map((_, s) => (
                  <div key={s} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <div className="flex justify-between px-1 mb-1">
                        <span className="text-[9px] font-black text-gray-700 uppercase">Set {s + 1}</span>
                        <span className="text-[9px] font-black text-gray-500 uppercase">
                          Last: {lastPerf ? (lastPerf[5 + s * 2] || '—') : '—'}kg
                        </span>
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="KG"
                        className="w-full h-16 bg-[#1a1a1a] rounded-xl text-center text-2xl font-black outline-none border-2 border-transparent focus:border-accent/40"
                        value={data[`${ex.name}_${s}_w`] || ''}
                        onChange={e => setData({ ...data, [`${ex.name}_${s}_w`]: e.target.value })}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between px-1 mb-1">
                        <span className="text-[9px] font-black uppercase text-accent">
                          Cible: {displayReps}
                        </span>
                        <span className="text-[9px] font-black text-gray-500 uppercase">
                          Last: {lastPerf ? (lastPerf[6 + s * 2] || '—') : '—'}
                        </span>
                      </div>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="REPS"
                        className="w-full h-16 bg-[#1a1a1a] rounded-xl text-center text-2xl font-black outline-none border-2 border-transparent focus:border-accent/40"
                        value={data[`${ex.name}_${s}_r`] || ''}
                        onChange={e => setData({ ...data, [`${ex.name}_${s}_r`]: e.target.value })}
                      />
                    </div>
                    <button
                      onClick={() => setRest({ active: true, sec: restSeconds, total: restSeconds })}
                      className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center active:bg-green-500/20 transition-colors"
                    >
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Note athlète */}
              <textarea
                placeholder="Note pour le coach..."
                className="w-full bg-[#1a1a1a] rounded-2xl p-4 text-sm text-gray-300 border border-white/5 outline-none h-24 focus:border-accent/30"
                value={userNotes[ex.name] || ''}
                onChange={e => setUserNotes({ ...userNotes, [ex.name]: e.target.value })}
              />
            </div>
          );
        })}

        {/* Bouton terminer */}
        <button
          onClick={handleFinish}
          className="w-full bg-accent h-24 rounded-[2.5rem] font-black text-2xl uppercase italic shadow-2xl active:scale-95 transition-transform mb-20 shadow-accent/20"
        >
          Terminer la séance
        </button>
      </div>

      {/* Timer sticky */}
      {rest.active && (
        <div className="fixed bottom-0 left-0 right-0 p-8 bg-accent flex justify-between items-center z-[110] rounded-t-[2.5rem] shadow-2xl">
          <div>
            <p className="text-[9px] font-black uppercase opacity-60 mb-1">Repos</p>
            <div className="text-5xl font-black italic tracking-tighter">{rest.sec}s</div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setRest(r => ({ ...r, sec: r.total }))}
              className="bg-black/20 px-5 py-3 rounded-full font-black uppercase text-[10px] tracking-widest active:scale-90"
            >
              Reset
            </button>
            <button
              onClick={() => setRest({ active: false, sec: 0, total: 0 })}
              className="bg-black/20 px-5 py-3 rounded-full font-black uppercase text-[10px] tracking-widest active:scale-90"
            >
              Passer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}