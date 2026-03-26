export const parseSheetData = (programmeRows) => {
  const cycles = [];
  let currentCycle = null;
  let currentWorkout = null;
  let currentExercise = null;

  const getYTId = (url) => {
    if (!url) return null;
    const str = url.toString().trim();
    const match = str.match(/(?:youtu\.be\/|v\/|watch\?v=|embed\/)([^#&?]{11})/);
    return match ? match[1] : null;
  };

  const isYoutubeUrl = (val) => {
    if (!val) return false;
    return val.toString().includes('youtu');
  };

  programmeRows.forEach((row, index) => {
    const colA = row[0]?.toString().trim() || "";
    const colB = row[1]?.toString().trim() || "";

    // Row 1 toujours ignorée
    if (index === 0) return;

    // Lignes // ignorées
    if (colA.startsWith("//") || colB.startsWith("//")) return;

    // Ligne vide complète
    if (!colA && !colB && !row[2] && !row[3] && !row[4]) return;

    // Nouveau cycle ##
    if (colA.startsWith("##")) {
      currentCycle = { name: colA.replace("##", "").trim(), workouts: [] };
      cycles.push(currentCycle);
      currentWorkout = null;
      currentExercise = null;
      return;
    }

    // Nouveau workout ▶
    if (colA.startsWith("▶")) {
      if (currentCycle) {
        currentWorkout = { name: colA.replace("▶", "").trim(), exercises: [] };
        currentCycle.workouts.push(currentWorkout);
      }
      currentExercise = null;
      return;
    }

    if (!currentWorkout) return;

    // Bloc letter : A, B, C, D, E, B1, B2, D1, D2 etc.
    const isBlock = /^[A-E][0-9]?$/i.test(colA);
    // Semaine suivante : S2, S3, S4... OU colA vide mais row a du contenu (séance 3/4 mal formatée)
    const isWeek = /^S[2-9]([0-9])?$/i.test(colA);
    // Ligne de continuation sans label (cas séance 3/4)
    const isContinuation = !colA && currentExercise && (row[4] || row[5]);

    if (isBlock) {
      // Détecter si la note H est une URL YouTube (bug de saisie)
      const rawNote = row[7]?.toString() || "";
      const rawVideo = row[8]?.toString() || "";
      
      const notes   = isYoutubeUrl(rawNote)  ? "" : rawNote;
      const videoId = getYTId(rawVideo) || getYTId(rawNote) || null;

      currentExercise = {
        block: colA.toUpperCase(),
        name: colB,
        weeks: [{
          label: "S1",
          flag:    row[2]?.toString() || "",
          tempo:   row[3]?.toString() || "",
          sets:    row[4]?.toString() || "0",
          reps:    row[5]?.toString() || "",
          rest:    row[6]?.toString() || "",
          notes,
          videoId,
        }]
      };
      currentWorkout.exercises.push(currentExercise);

    } else if ((isWeek || isContinuation) && currentExercise) {
      const rawNote = row[7]?.toString() || "";
      const rawVideo = row[8]?.toString() || "";

      const notes   = isYoutubeUrl(rawNote)  ? "" : rawNote;
      const videoId = getYTId(rawVideo) || getYTId(rawNote) || null;

      currentExercise.weeks.push({
        label: colA || `S${currentExercise.weeks.length + 1}`,
        flag:    row[2]?.toString() || "",
        tempo:   row[3]?.toString() || "",
        sets:    row[4]?.toString() || "0",
        reps:    row[5]?.toString() || "",
        rest:    row[6]?.toString() || "",
        notes,
        videoId,
      });
    }
  });

  return cycles.reverse();
};