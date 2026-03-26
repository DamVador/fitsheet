import React, { useState } from 'react';

export default function HistoryView({ logs, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // 1. Groupement des logs par session unique
  // Structure d'une ligne Logs : [Date|Cycle|S, Séance, Bloc, Exercice, NoteUser, S1w, S1r...]
  const grouped = logs.reduce((acc, curr) => {
    const id = curr[0]; 
    const name = curr[1];
    if (!id || !name) return acc; 
    if (!acc[id]) acc[id] = { name: name, dateId: id, dateOnly: id.split(' | ')[0], ex: [] };
    acc[id].ex.push(curr); 
    return acc;
  }, {});

  // 2. Logique de filtrage
  const filtered = Object.values(grouped).reverse().filter(s => {
    // Recherche texte sur le nom de la séance ou de l'exercice
    const matchesText = (s.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
                        s.ex.some(e => (e[3]?.toLowerCase() || "").includes(searchTerm.toLowerCase()));
    
    // Filtre par période
    const matchesStart = !dateStart || s.dateOnly >= dateStart;
    const matchesEnd = !dateEnd || s.dateOnly <= dateEnd;

    return matchesText && matchesStart && matchesEnd;
  });

  return (
    <div className="fixed inset-0 z-[700] bg-[#0f0f0f] overflow-y-auto animate-in slide-in-from-bottom duration-300">
      {/* HEADER FIXE AVEC FILTRES */}
      <div className="sticky top-0 bg-[#0f0f0f]/95 backdrop-blur-md p-6 z-50 border-b border-white/5">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">Historique</h2>
          <button onClick={onClose} className="bg-white/10 px-6 py-2 rounded-full text-[10px] font-black uppercase active:scale-90">Fermer</button>
        </div>

        <div className="space-y-4">
          {/* Recherche texte */}
          <input 
            type="text" 
            placeholder="Rechercher une séance ou un exercice..." 
            className="w-full bg-[#1a1a1a] p-4 rounded-xl text-base border border-white/5 outline-none focus:border-accent/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          {/* Filtres Dates */}
          <div className="flex gap-3">
            <div className="flex-1 bg-[#1a1a1a] rounded-xl border border-white/5 p-2 px-3">
              <label className="block text-[9px] font-black uppercase text-accent mb-1 tracking-widest">Du</label>
              <input 
                type="date" 
                className="w-full bg-transparent text-sm outline-none text-white uppercase font-bold"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </div>
            <div className="flex-1 bg-[#1a1a1a] rounded-xl border border-white/5 p-2 px-3">
              <label className="block text-[9px] font-black uppercase text-accent mb-1 tracking-widest">Au</label>
              <input 
                type="date" 
                className="w-full bg-transparent text-sm outline-none text-white uppercase font-bold"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>
          </div>
          
          <p className="text-[9px] font-black uppercase text-accent tracking-widest px-1">
            {filtered.length} séance(s) trouvée(s)
          </p>
        </div>
      </div>

      {/* LISTE DES SÉANCES */}
      <div className="p-6 space-y-6 pb-24">
        {filtered.length > 0 ? (
          filtered.map((s, i) => (
            <div key={i} className="bg-[#161616] p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
              <p className="text-[10px] text-accent font-black mb-1 uppercase tracking-widest">{s.dateId}</p>
              <h3 className="text-xl font-black uppercase italic mb-4 tracking-tighter">{s.name}</h3>
              
              <div className="space-y-4 border-t border-white/5 pt-4">
                {s.ex.map((ex, j) => (
                  <div key={j} className="space-y-1.5">
                    <div className="flex justify-between text-[11px] uppercase font-bold">
                      <span className="text-gray-400 truncate pr-4">{ex[3]}</span>
                      {/* Poids/Reps commencent à l'index 5 car NoteUser est à l'index 4 */}
                      <span className="text-white flex-shrink-0">{ex[5] || '--'}kg x {ex[6] || '--'}</span>
                    </div>
                    
                    {/* Note utilisateur (Index 4) */}
                    {ex[4] && (
                      <p className="text-[10px] text-gray-500 italic leading-tight bg-black/20 p-2.5 rounded-xl border-l-2 border-accent/30">
                        {ex[4]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center opacity-30">
            <p className="font-black uppercase italic tracking-widest">Aucune séance trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
}