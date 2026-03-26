import React, { useState } from 'react';
import { useFitSheet } from './hooks/useFitSheet';
import ActiveWorkout from './components/ActiveWorkout';
import HistoryView from './components/HistoryView';
import SuccessPopup from './components/SuccessPopup';

export default function App() {
  const { user, sheetId, setSheetId, program, logs, loading, login, logout, saveWk, loadData, getSessionCount } = useFitSheet();
  const [activeWk, setActiveWk] = useState(null);
  const [activeCycleName, setActiveCycleName] = useState(null);
  const [activeSessionCount, setActiveSessionCount] = useState(0); // snapshot stable
  const [success, setSuccess] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showArchives, setShowArchives] = useState(false);

  const openWorkout = (workout, cycleName) => {
    const count = getSessionCount(workout.name, cycleName);
    setActiveSessionCount(count);
    setActiveCycleName(cycleName);

    // Restaurer le draft local si c'est la même séance
    const meta = JSON.parse(localStorage.getItem('active_draft_meta'));
    if (meta?.workoutName === workout.name && meta?.cycleName === cycleName) {
      // Le draft sera rechargé automatiquement dans ActiveWorkout via useState init
    } else {
      // Nouvelle séance — vider l'ancien draft
      localStorage.removeItem('active_draft');
      localStorage.removeItem('active_draft_meta');
    }

    setActiveWk(workout);
  };

  const handleSave = async (data, duration, totalSets, userNotes, isSilent) => {
    const result = await saveWk(activeWk, activeCycleName, activeSessionCount, data, duration, totalSets, userNotes, isSilent);
    if (result?.success && !result.isSilent) {
      setSuccess(result.stats);
      setActiveWk(null);
    }
  };

  const handleBack = () => setActiveWk(null);

  const suggestedName = (() => {
    if (!program || !program.cycles.length) return null;
    const currentCycle = program.cycles[0];
    if (!logs.length) return currentCycle.workouts[0]?.name;
    const lastLog = [...logs].reverse().find(l => l[0]?.includes(currentCycle.name));
    const lastIdx = currentCycle.workouts.findIndex(w => w.name === lastLog?.[1]);
    return currentCycle.workouts[(lastIdx + 1) % currentCycle.workouts.length]?.name;
  })();

  // ── Écrans d'auth ──────────────────────────────────────────────
  if (!user) return (
    <div className="fixed inset-0 bg-[#0f0f0f] flex flex-col items-center justify-center p-8 text-white text-center">
      <h1 className="text-5xl font-black italic uppercase mb-4">
        Fit<span className="text-accent">Sheet</span>
      </h1>
      <p className="text-gray-600 text-sm mb-12 font-bold uppercase tracking-widest">Ton programme. Ton rythme.</p>
      <button onClick={login} className="w-full max-w-sm bg-white text-black h-16 rounded-2xl font-bold text-lg">
        Se connecter avec Google
      </button>
    </div>
  );

  if (!sheetId) return (
    <div className="fixed inset-0 bg-[#0f0f0f] p-8 text-white flex flex-col justify-center">
      <h2 className="text-3xl font-black mb-2 uppercase italic">Lier votre Sheet</h2>
      <p className="text-gray-500 text-sm mb-8">Colle l'URL de ton Google Sheet ou sélectionne-le depuis Drive</p>
      <input
        className="w-full bg-[#1a1a1a] p-5 rounded-2xl mb-4 outline-none border-2 border-transparent focus:border-accent text-lg"
        placeholder="https://docs.google.com/spreadsheets/d/..."
        onChange={e => {
          const id = e.target.value.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
          if (id) { localStorage.setItem('sheetId', id); setSheetId(id); }
        }}
      />
    </div>
  );

  if (activeWk) return (
    <ActiveWorkout
      workout={activeWk}
      cycleName={activeCycleName}
      sessionCount={activeSessionCount}
      logs={logs}
      onBack={handleBack}
      onSave={handleSave}
    />
  );

  // ── Écran principal ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-4 max-w-md mx-auto pb-20">
      {loading && (
        <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {success && <SuccessPopup stats={success} onClose={() => setSuccess(null)} />}

      {/* Header */}
      <header className="flex items-center justify-between mb-12 mt-6">
        <div className="flex items-center gap-4">
          {program?.config.logo && (
            <img src={program.config.logo} className="w-12 h-12 rounded-full border border-accent/20 object-cover" alt="logo" />
          )}
          <div>
            <p className="text-[10px] text-accent font-black uppercase tracking-widest leading-none mb-1 italic">FitSheet</p>
            <h1 className="font-bold text-lg leading-none">{program?.config.name}</h1>
          </div>
        </div>
        <button onClick={() => setShowHistory(true)} className="bg-white/5 w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 transition-transform">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </header>

      {/* Cycles */}
      <div className="space-y-12">
        {program?.cycles.map((c, i) => {
          if (i > 0 && !showArchives) return null;
          return (
            <div key={i} className="space-y-6">
              <h2 className="text-accent font-black uppercase italic text-2xl border-b border-accent/10 pb-3 flex justify-between items-end">
                <span className="truncate pr-2">{c.name}</span>
                {i === 0 && (
                  <span className="text-[9px] bg-accent text-white px-3 py-1 rounded-full not-italic font-black tracking-widest uppercase flex-shrink-0">
                    Actuel
                  </span>
                )}
              </h2>
              <div className="grid gap-4">
                {c.workouts.map((w, j) => {
                  const isSug = i === 0 && w.name === suggestedName;
                  const count = getSessionCount(w.name, c.name);
                  const totalWeeks = w.exercises[0]?.weeks.length || 1;
                  return (
                    <button
                      key={j}
                      onClick={() => openWorkout(w, c.name)}
                      className={`p-6 rounded-[2.5rem] border text-left flex items-center justify-between min-h-[100px] shadow-xl transition-all active:scale-[0.97] ${
                        isSug ? 'border-accent bg-accent/5 ring-1 ring-accent/50 shadow-accent/10' : 'border-white/5 bg-[#161616]'
                      }`}
                    >
                      <div className="flex-1 pr-4">
                        {isSug && <p className="text-[8px] text-accent font-black uppercase mb-1 animate-pulse">Suivante</p>}
                        <p className="text-[10px] text-gray-600 font-black uppercase mb-1">Séance {j + 1}</p>
                        <h3 className="text-xl font-black italic uppercase leading-tight">{w.name}</h3>
                        {/* Indicateur de semaine */}
                        <p className="text-[9px] text-gray-600 mt-1 font-bold">
                          Semaine {Math.min(count + 1, totalWeeks)} / {totalWeeks}
                        </p>
                      </div>
                      <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-lg ${
                        isSug ? 'bg-accent text-white shadow-lg' : 'bg-accent/10 text-accent'
                      }`}>▶</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {program?.cycles.length > 1 && !showArchives && (
          <button onClick={() => setShowArchives(true)} className="w-full py-6 rounded-3xl border-2 border-dashed border-white/5 text-gray-600 font-black uppercase text-[10px] mt-4 active:border-accent/20">
            Cycles précédents ({program.cycles.length - 1})
          </button>
        )}
      </div>

      <button onClick={logout} className="mt-12 mb-12 text-gray-700 text-[10px] font-black uppercase block mx-auto tracking-[0.4em] active:text-white">
        Déconnexion
      </button>

      {showHistory && <HistoryView logs={logs} onClose={() => setShowHistory(false)} />}
    </div>
  );
}