export const parseSheetData = (programmeRows, logRows = []) => {
  let cycles = [];
  let currentCycle = null;
  let currentWorkout = null;
  let currentExercise = null;

  programmeRows.forEach((row, index) => {
    const colA = row[0]?.toString().trim() || "";
    const colB = row[1]?.toString().trim() || "";

    if (index === 0 || colA.startsWith("//") || colB.startsWith("//")) return;

    if (colA.startsWith("##") || colB.startsWith("##")) {
      currentCycle = { name: (colA || colB).replace("##", "").trim(), workouts: [] };
      cycles.push(currentCycle);
      return;
    }

    const prevRow = programmeRows[index - 1];
    const isPrevRowEmpty = !prevRow || prevRow.every(cell => !cell || cell === "");
    if (isPrevRowEmpty && (colA.startsWith("▶") || colB.startsWith("▶"))) {
      if (currentCycle) {
        currentWorkout = { name: (colA || colB).replace("▶", "").trim(), exercises: [] };
        currentCycle.workouts.push(currentWorkout);
      }
      return;
    }

    const isBlock = /^[A-E]$/i.test(colA);
    const isWeek = /^S[2-9]$/i.test(colA);

    if (isBlock) {
      currentExercise = { block: colA.toUpperCase(), name: colB, weeks: [extractWeek("S1", row)] };
      currentWorkout?.exercises.push(currentExercise);
    } else if (isWeek && currentExercise) {
      currentExercise.weeks.push(extractWeek(colA, row));
    }
  });

  return cycles.reverse();
};

const extractWeek = (label, row) => ({
  label, 
  flag: row[2] || "", 
  tempo: row[3] || "", 
  sets: row[4] || "0", 
  reps: row[5] || "", // Cible
  rest: row[6] || "", 
  notes: row[7] || "" 
});