import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { parseSheetData } from './utils/parser';
import ActiveWorkout from './components/ActiveWorkout';

export default function App() {
  // --- ÉTATS ---
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [sheetId, setSheetId] = useState(localStorage.getItem('sheetId'));
  const [program, setProgram] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeWk, setActiveWk] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  // --- AUTHENTIFICATION ---
  const login = useGoogleLogin({
    onSuccess: (res) => { 
      localStorage.setItem('user', JSON.stringify(res)); 
      setUser(res); 
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets',
  });

  const logout = () => {
    localStorage.removeItem('user'); // On garde le sheetId !
    setUser(null);
    setProgram(null);
  };

  // --- CHARGEMENT ---
  useEffect(() => { if (user && sheetId) loadData(); }, [user, sheetId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?ranges=Programme!A:H&ranges=Logs!A:AC&ranges=Config!A:B`, {
        headers: { Authorization: `Bearer ${user.access_token}` },
      });
      const d = await res.json();
      if (d.valueRanges) {
        // Sécurité : On filtre les lignes totalement vides de l'onglet Logs
        const rawLogs = (d.valueRanges[1].values || []).filter(row => row.length > 2);
        setLogs(rawLogs);

        const cycles = parseSheetData(d.valueRanges[0].values || [], rawLogs);
        const conf = Object.fromEntries(d.valueRanges[2]?.values || []);
        setProgram({ 
          cycles, 
          config: { 
            name: conf.coach_name || "Coach", 
            logo: conf.coach_logo || "", 
            color: conf.app_color || "#E94560" 
          }
        });
      }
    } catch (e) { console.error("Erreur de chargement:", e); } finally { setLoading(false); }
  };

  // --- SAUVEGARDE ---
  const saveWk = async (data, duration, totalSets, userNotes) => {
    setLoading(true);
    const cycle = program.cycles.find(c => c.workouts.some(w => w.name === activeWk.name));
    const weekNum = logs.filter(l => l[1] === activeWk.name && l[0].includes(cycle.name)).length + 1;
    const date = new Date().toISOString().split('T')[0];
    
    const rows = activeWk.exercises.map(ex => {
      const r = [`${date} | ${cycle.name} | S${weekNum}`, activeWk.name, ex.block, ex.name];
      const MAX_SETS = 12; 
      for(let i=0; i < MAX_SETS; i++) { 
        r.push(data[`${ex.name}_${i}_w`]||"", data[`${ex.name}_${i}_r`]||""); 
      }
      r.push(userNotes[ex.name] || ""); 
      return r;
    });

    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Logs!A:A:append?valueInputOption=USER_ENTERED`, {
        method: 'POST', headers: { Authorization: `Bearer ${user.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: rows })
      });
      setSuccess({ name: activeWk.name, time: duration, sets: totalSets });
      await loadData();
      setActiveWk(null);
    } catch (e) { alert("Erreur de sauvegarde"); } finally { setLoading(false); }
  };

  // --- COMPOSANT HISTORIQUE ---
  const HistoryView = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');

    // Sécurité : On vérifie que curr[0] (id) et curr[1] (nom) existent avant de grouper
    const grouped = logs.reduce((acc, curr) => {
      const id = curr[0]; 
      const name = curr[1];
      if (!id || !name) return acc; 
      if (!acc[id]) acc[id] = { name: name, dateId: id, dateOnly: id.split(' | ')[0], ex: [] };
      acc[id].ex.push(curr); return acc;
    }, {});

    const filtered = Object.values(grouped).reverse().filter(s => {
      // Sécurité : On ajoute ?.toLowerCase() pour éviter de planter sur un texte manquant
      const matchesText = (s.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
                          s.ex.some(e => (e[3]?.toLowerCase() || "").includes(searchTerm.toLowerCase()));
      const matchesStart = !dateStart || s.dateOnly >= dateStart;
      const matchesEnd = !dateEnd || s.dateOnly <= dateEnd;
      return matchesText && matchesStart && matchesEnd;
    });

    return (
      <div className="fixed inset-0 z-[700] bg-[#0f0f0f] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        <div className="sticky top-0 bg-[#0f0f0f]/95 backdrop-blur-md p-6 z-50 border-b border-white/5">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Historique</h2>
            <button onClick={() => setShowHistory(false)} className="bg-white/10 px-6 py-2 rounded-full text-[10px] font-black uppercase">Fermer</button>
          </div>
          {/* BARRE DE RECHERCHE & FILTRES */}
<div className="space-y-4">
  <div className="relative">
    <input 
      type="text" 
      placeholder="Rechercher une séance..." 
      className="w-full bg-[#1a1a1a] p-4 rounded-xl text-base border border-white/5 outline-none focus:border-accent/50"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  </div>
  
  <div className="flex gap-3">
    {/* CHAMP DATE DE DÉBUT */}
    <div className="flex-1 bg-[#1a1a1a] rounded-xl border border-white/5 p-2 px-3">
      <label className="block text-[9px] font-black uppercase text-accent mb-1">Date Début</label>
      <input 
        type="date" 
        className="w-full bg-transparent text-sm outline-none text-white uppercase font-bold"
        value={dateStart}
        onChange={(e) => setDateStart(e.target.value)}
      />
    </div>

    {/* CHAMP DATE DE FIN */}
    <div className="flex-1 bg-[#1a1a1a] rounded-xl border border-white/5 p-2 px-3">
      <label className="block text-[9px] font-black uppercase text-accent mb-1">Date Fin</label>
      <input 
        type="date" 
        className="w-full bg-transparent text-sm outline-none text-white uppercase font-bold"
        value={dateEnd}
        onChange={(e) => setDateEnd(e.target.value)}
      />
    </div>
  </div>
</div>
        </div>
        <div className="p-6 space-y-6 pb-20">
          {filtered.map((s, i) => (
            <div key={i} className="bg-[#161616] p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
              <p className="text-[10px] text-accent font-black mb-1 uppercase tracking-widest">{s.dateId}</p>
              <h3 className="text-xl font-black uppercase italic mb-4">{s.name}</h3>
              <div className="space-y-3 border-t border-white/5 pt-4">
                {s.ex.map((ex, j) => (
                  <div key={j} className="space-y-1">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400">
                      <span className="truncate pr-4">{ex[3]}</span>
                      <span className="text-white flex-shrink-0">{ex[4]}kg x {ex[5]}</span>
                    </div>
                    {ex[28] && <p className="text-[9px] text-gray-600 italic bg-black/20 p-2 rounded-lg mt-1">Note: {ex[28]}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-gray-500 py-20 uppercase font-black text-xs">Aucun résultat</p>}
        </div>
      </div>
    );
  };

  // --- RENDU ---

  if (!user) return (
    <div className="fixed inset-0 bg-[#0f0f0f] flex flex-col items-center justify-center p-8 text-white text-center">
      <div className="w-20 h-20 bg-accent rounded-3xl flex items-center justify-center mb-6 italic font-black text-4xl shadow-2xl shadow-accent/20">FS</div>
      <h1 className="text-5xl font-black italic uppercase mb-12 tracking-tighter">Fit<span className="text-accent">Sheet</span></h1>
      <button onClick={() => login()} className="w-full max-w-xs bg-white text-black h-16 rounded-2xl font-bold flex items-center justify-center gap-3">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="G" />
        Se connecter
      </button>
    </div>
  );

  if (!sheetId) return (
    <div className="fixed inset-0 bg-[#0f0f0f] p-8 text-white flex flex-col justify-center">
      <h2 className="text-3xl font-black mb-2 uppercase italic">Lier votre Sheet</h2>
      <p className="text-gray-500 mb-8 text-sm">Collez l'URL de votre Google Sheets coach</p>
      <input className="w-full bg-[#1a1a1a] p-5 rounded-2xl mb-4 border-2 border-transparent focus:border-accent outline-none text-lg" placeholder="https://docs.google.com/..." onChange={e => {
        const id = e.target.value.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
        if(id) { localStorage.setItem('sheetId', id); setSheetId(id); }
      }} />
    </div>
  );

  if (activeWk) return (
    <ActiveWorkout 
      workout={activeWk} 
      cycleName={program?.cycles.find(c => c.workouts.includes(activeWk))?.name} 
      logs={logs} 
      onBack={() => setActiveWk(null)} 
      onSave={saveWk} 
    />
  );

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {loading && <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center backdrop-blur-sm"><div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div></div>}
      
      {success && (
        <div className="fixed inset-0 z-[800] bg-[#0f0f0f]/95 backdrop-blur-lg flex items-center justify-center p-6 text-center">
          <div className="bg-[#161616] p-10 rounded-[3.5rem] border border-accent/20 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="text-7xl mb-6">🏆</div>
            <h2 className="text-3xl font-black uppercase italic mb-1">Session Finie !</h2>
            <p className="text-accent font-black text-[10px] uppercase mb-8 tracking-[0.3em] leading-tight">{success.name}</p>
            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-white/5 p-4 rounded-3xl"><p className="text-[9px] text-gray-500 font-black uppercase mb-1">Temps</p><p className="text-xl font-black italic">{success.time}min</p></div>
              <div className="bg-white/5 p-4 rounded-3xl"><p className="text-[9px] text-gray-500 font-black uppercase mb-1">Séries</p><p className="text-xl font-black italic">{success.sets}</p></div>
            </div>
            <button onClick={() => setSuccess(null)} className="w-full bg-accent py-5 rounded-2xl font-black uppercase italic tracking-widest">Continuer</button>
          </div>
        </div>
      )}

      <div className="p-4 max-w-md mx-auto">
        <header className="flex items-center justify-between mb-12 mt-6">
          <div className="flex items-center gap-4">
            {program?.config.logo && <img src={program.config.logo} className="w-12 h-12 rounded-full border border-accent/20 object-cover" alt="logo" />}
            <div>
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest leading-none mb-1 text-accent italic">FitSheet</p>
              <h1 className="font-bold text-lg leading-none">{program?.config.name}</h1>
            </div>
          </div>
          <button onClick={() => setShowHistory(true)} className="bg-white/5 w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 transition-transform">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </header>

        <div className="space-y-12 pb-20">
          {program?.cycles.map((c, i) => (
            <div key={i} className="space-y-6">
              <h2 className="text-accent font-black uppercase italic text-2xl border-b border-accent/10 pb-3 flex justify-between items-end">
                {c.name} {i === 0 && <span className="text-[9px] bg-accent text-white px-3 py-1 rounded-full not-italic font-black tracking-widest">ACTUEL</span>}
              </h2>
              <div className="grid gap-4">
                {c.workouts.map((w, j) => (
                  <button key={j} onClick={() => setActiveWk(w)} className="bg-[#161616] p-6 rounded-[2.5rem] border border-white/5 text-left active:scale-[0.96] transition-all flex items-center justify-between shadow-xl min-h-[100px] group">
                    <div className="flex-1 pr-4">
                      <p className="text-[10px] text-gray-600 font-black uppercase mb-1">Séance {j + 1}</p>
                      <h3 className="text-xl font-black italic uppercase leading-tight group-active:text-accent">{w.name}</h3>
                    </div>
                    <div className="bg-accent/10 w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-accent font-black">▶</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button onClick={logout} className="mt-12 mb-12 text-gray-700 text-[10px] font-black uppercase block mx-auto tracking-[0.4em] active:text-white transition-colors">Déconnexion</button>
      </div>

      {showHistory && <HistoryView />}
    </div>
  );
}