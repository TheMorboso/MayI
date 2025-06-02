import { PostScudettoMatchInfo } from './postscudetto'; // Importar la interfaz correcta

export function processPositiveNegative(
  matches: PostScudettoMatchInfo[],
  savedTeamsFirstNavLinkTexts: string[] // Parámetro para los nombres de las competiciones de liga
): PostScudettoMatchInfo[] {
  if (!matches || matches.length === 0) {
    return [];
  }

  return matches.map((currentMatch, index, allMatchesArray) => {
    const updatedMatch = { ...currentMatch }; // Clonar el partido actual

    // Lógica para partidos de "Competencia"
    if (updatedMatch.Competicion === "Competencia" && updatedMatch.Team) {
      // Si el tier del equipo NO es "TierS", se establece el Status como "Negativo".
      // Esto incluye tiers como "TierSred", "TierA", "TierC", "Red", "World", o si el tier es null/undefined.
      if (updatedMatch.tier !== "TierS") {
        updatedMatch.Status = "Negativo";
      } else {
        // Lógica original (ahora se aplica solo a equipos "TierS" para partidos de "Competencia")
        // Busca el partido anterior y siguiente del mismo equipo para verificar su Status.
        let prevMatchOfSameTeam: PostScudettoMatchInfo | null = null;
        for (let i = index - 1; i >= 0; i--) { // Usar allMatchesArray
          if (allMatchesArray[i].Team === updatedMatch.Team) {
            prevMatchOfSameTeam = allMatchesArray[i];
            break;
          }
        }

        let nextMatchOfSameTeam: PostScudettoMatchInfo | null = null;
        for (let i = index + 1; i < allMatchesArray.length; i++) { // Usar allMatchesArray
          if (allMatchesArray[i].Team === updatedMatch.Team) {
            nextMatchOfSameTeam = allMatchesArray[i];
            break;
          }
        }

        // Si ambos partidos adyacentes (del mismo equipo) tienen Status "Post scudetto",
        // el partido actual "Competencia" (para el equipo TierS) se marca como "Negativo".
        if (prevMatchOfSameTeam && prevMatchOfSameTeam.Status === "Post scudetto" &&
            nextMatchOfSameTeam && nextMatchOfSameTeam.Status === "Post scudetto") {
          updatedMatch.Status = "Negativo";
        }
      }
    }

    // Lógicas para partidos de "Amistoso"
    if (updatedMatch.Competicion === "Amistoso" && updatedMatch.Team) {
      // Regla 1: Si el tier del equipo NO es "TierS"
      if (updatedMatch.tier !== "TierS") {
        updatedMatch.Status = "Negativo";
      }

      // Regla 2: Si el equipo es "RB Leipzig"
      if (updatedMatch.Team.includes("RB Leipzig")) {
        updatedMatch.Status = "Negativo";
      }

      // Regla 3 (NUEVA): Amistoso donde el oponente juega en la misma liga principal que el equipo del amistoso.
      const opponentName = updatedMatch.equipoContrario;
      const mainTeamActualLeague = updatedMatch.teamMainLeague; // Liga principal del equipo del amistoso

      if (opponentName && mainTeamActualLeague && savedTeamsFirstNavLinkTexts.includes(mainTeamActualLeague)) {
        // El equipo principal del amistoso pertenece a una liga principal reconocida.
        // Verificamos si el oponente ha jugado partidos EN ESA MISMA LIGA.
        let opponentGamesInMainTeamLeague = 0;
        for (const anyMatch of allMatchesArray) {
          // Considerar solo partidos de la liga específica del equipo principal del amistoso
          if (anyMatch.Competicion === mainTeamActualLeague) {
            // Si el oponente fue el equipo local o visitante en un partido de esa liga
            if (anyMatch.Team === opponentName || anyMatch.equipoContrario === opponentName) {
              opponentGamesInMainTeamLeague++;
            }
          }
        }
        // Si el oponente ha jugado al menos 1 partido en la misma liga que el equipo principal del amistoso
        if (opponentGamesInMainTeamLeague > 0) {
          updatedMatch.Status = "Negativo";
        }
      }

      // Regla 4 (ANTERIOR GENERAL, AHORA AJUSTADA):
      // Si el oponente no tiene NINGUNA experiencia en CUALQUIER liga principal.
      // Esta regla se evalúa independientemente de las anteriores que también asignan "Negativo".
      if (opponentName && opponentName.trim() !== "") {
        let opponentTotalGamesInAnyMainLeague = 0;
        for (const otherMatch of allMatchesArray) {
          // Verificar si otherMatch.Competicion es una de las ligas principales
          if (otherMatch.Competicion && savedTeamsFirstNavLinkTexts.includes(otherMatch.Competicion)) {
            // Si el oponente fue el equipo local o visitante en CUALQUIER partido de liga principal
            if (otherMatch.Team === opponentName || otherMatch.equipoContrario === opponentName) {
              opponentTotalGamesInAnyMainLeague++;
            }
          }
        }
        // Si el oponente no ha jugado NINGÚN partido en CUALQUIER liga principal.
        if (opponentTotalGamesInAnyMainLeague === 0) {
          updatedMatch.Status = "Negativo";
        }
      }
    }

    // LÓGICA PARA PARTIDOS DE LIGA POSTERGADOS:
    // Si un partido de liga (currentMatch) tiene una 'Ronda' menor que la 'Ronda'
    // del partido de liga ANTERIOR del mismo equipo, entonces currentMatch se considera postergado
    // y se marca como "Negativo".
    if (updatedMatch.Team &&
        updatedMatch.Competicion &&
        savedTeamsFirstNavLinkTexts.includes(updatedMatch.Competicion) && // Es un partido de liga principal
        updatedMatch.Ronda) { // El partido actual (updatedMatch) tiene una ronda

      const currentRondaStr = updatedMatch.Ronda;
      const currentRondaNum = parseInt(currentRondaStr, 10);

      if (!isNaN(currentRondaNum)) { // Asegurarse de que la ronda actual es un número válido
        // Buscar el partido de LIGA ANTERIOR del MISMO EQUIPO que también tenga una RONDA válida
        for (let j = index - 1; j >= 0; j--) {
          const prevMatchCandidate = allMatchesArray[j];
          if (prevMatchCandidate.Team === updatedMatch.Team &&
              prevMatchCandidate.Competicion &&
              savedTeamsFirstNavLinkTexts.includes(prevMatchCandidate.Competicion) &&
              prevMatchCandidate.Ronda) {
            
            const prevRondaStr = prevMatchCandidate.Ronda;
            const prevRondaNum = parseInt(prevRondaStr, 10);

            // Si la ronda anterior es mayor que la ronda actual (ej. prev: 26, current: 15)
            if (!isNaN(prevRondaNum) && prevRondaNum > currentRondaNum) {
              updatedMatch.Status = "Negativo";
            }
            // Encontramos el partido de liga anterior relevante, no necesitamos seguir buscando hacia atrás para este updatedMatch
            break; 
          }
        }
      }
    }
    return updatedMatch; // Devolver el partido (modificado o no)
  });
}