import { useState, useEffect, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { parseSheetData } from '../utils/parser';

export function useFitSheet() {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
    const [sheetId, setSheetId] = useState(localStorage.getItem('sheetId'));
    const [program, setProgram] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    const login = useGoogleLogin({
        onSuccess: (res) => { localStorage.setItem('user', JSON.stringify(res)); setUser(res); },
        scope: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('sheetId');
        localStorage.removeItem('active_draft');
        setUser(null);
        setProgram(null);
        setSheetId(null);
    };

    const loadData = useCallback(async () => {
        if (!user || !sheetId) return;
        setLoading(true);
        try {
            const res = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?ranges=Programme!A:I&ranges=Logs!A:AC&ranges=Config!A:B`,
                { headers: { Authorization: `Bearer ${user.access_token}` } }
            );
            const d = await res.json();
            if (d.error?.code === 401) { logout(); return; }
            if (d.valueRanges) {
                const rawLogs = (d.valueRanges[1].values || []).filter(r => r.length > 2);
                setLogs(rawLogs);
                const cycles = parseSheetData(d.valueRanges[0].values || []);
                const conf = Object.fromEntries(d.valueRanges[2]?.values || []);
                setProgram({
                    cycles,
                    config: {
                        name: conf.coach_name || 'Coach',
                        logo: conf.coach_logo || '',
                        color: conf.app_color || '#E94560',
                    },
                });
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }, [user, sheetId]);

    // Calcule sessionCount au moment d'ouvrir une séance — snapshot stable
    // Dans useFitSheet.js
    const getSessionCount = (workoutName, cycleName) => {
        return logs.filter(l => {
            if (!l[0] || !l[1]) return false;
            const matchWorkout = l[1] === workoutName;
            const matchCycle = l[0].includes(cycleName);
            // On s'assure que c'est bien une entrée S1, S2, S3 valide (1 ou 2 chiffres max)
            const weekMatch = l[0].match(/\| S(\d{1,2})$/);
            return matchWorkout && matchCycle && weekMatch !== null;
        // Dédupliquer par date+semaine — une séance = 1 count même si plusieurs exos
        }).reduce((acc, l) => {
            const key = l[0]; // "2026-03-21 | CYCLE X | S1"
            acc.add(key);
            return acc;
        }, new Set()).size;
    };

    const saveWk = async (activeWk, cycleName, sessionCount, data, duration, totalSets, userNotes) => {
        setLoading(true);
        const weekNum = sessionCount + 1;
        const date = new Date().toISOString().split('T')[0];
        const dateKey = `${date} | ${cycleName} | S${weekNum}`;

        const newRows = activeWk.exercises.map(ex => {
            const r = [dateKey, activeWk.name, ex.block, ex.name, userNotes[ex.name] || ''];
            for (let i = 0; i < 12; i++) {
                r.push(data[`${ex.name}_${i}_w`] || '', data[`${ex.name}_${i}_r`] || '');
            }
            return r;
        });

        try {
            // Upsert — vérifier si lignes existantes
            const existingRes = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Logs!A:B`,
                { headers: { Authorization: `Bearer ${user.access_token}` } }
            );
            const existingData = await existingRes.json();
            const existingRows = existingData.values || [];

            const matchingIndices = existingRows
                .map((r, i) => (r[0] === dateKey && r[1] === activeWk.name ? i + 1 : null))
                .filter(Boolean);

            if (matchingIndices.length > 0) {
                const requests = newRows.map((row, i) => ({
                    range: `Logs!A${matchingIndices[i] || matchingIndices[0]}`,
                    values: [row],
                }));
                await fetch(
                    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`,
                    {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${user.access_token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: requests }),
                    }
                );
            } else {
                await fetch(
                    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Logs!A:A:append?valueInputOption=USER_ENTERED`,
                    {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${user.access_token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ values: newRows }),
                    }
                );
            }

            // loadData UNIQUEMENT ici, après écriture réelle dans Sheets
            await loadData();
            return {
                success: true,
                stats: { name: activeWk.name, time: duration, sets: totalSets }
            };
        } catch (e) {
            console.error(e);
            return { success: false };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [loadData]);

    return { user, sheetId, setSheetId, program, logs, loading, login, logout, saveWk, loadData, getSessionCount };
}