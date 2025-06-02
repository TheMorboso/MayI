import { PostScudettoMatchInfo } from './postscudetto'; // Importar la interfaz correcta

export function processPositiveNegative(
  matches: PostScudettoMatchInfo[],
  savedTeamsFirstNavLinkTexts: string[] // Parámetro para los nombres de las competiciones de liga
): PostScudettoMatchInfo[] {
  if (!matches || matches.length === 0) {
    return [];
  }

  return matches.map((currentMatch, index, allMatches) => {
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
        for (let i = index - 1; i >= 0; i--) {
          if (allMatches[i].Team === updatedMatch.Team) {
            prevMatchOfSameTeam = allMatches[i];
            break;
          }
        }

        let nextMatchOfSameTeam: PostScudettoMatchInfo | null = null;
        for (let i = index + 1; i < allMatches.length; i++) {
          if (allMatches[i].Team === updatedMatch.Team) {
            nextMatchOfSameTeam = allMatches[i];
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

    // Nueva lógica para partidos de "Amistoso"
    // Si el partido es "Amistoso" y el tier del equipo NO es "TierS",
    // se establece el Status como "Negativo".
    if (updatedMatch.Competicion === "Amistoso" && updatedMatch.Team) {
      if (updatedMatch.tier !== "TierS") {
        updatedMatch.Status = "Negativo";
      }
    }

    // Condición adicional: Si el equipo es "RB Leipzig" Y la competición es "Amistoso",
    // el Status es "Negativo".
    if (updatedMatch.Competicion === "Amistoso" &&
        updatedMatch.Team &&
        updatedMatch.Team.includes("RB Leipzig")) {
      updatedMatch.Status = "Negativo";
    }

    // NUEVA CONDICIÓN: Para matches de TierS Y Competicion "Amistoso",
    // si el equipoContrario no tiene experiencia en "ligas" (competiciones cuyo nombre está en savedTeamsFirstNavLinkTexts),
    // se establece el Status como "Negativo".
    if (updatedMatch.tier === "TierS" &&
        updatedMatch.Team &&
        updatedMatch.Competicion === "Amistoso") {
      const opponentName = updatedMatch.equipoContrario;

      // Asegurarse que hay un oponente y no es una cadena vacía
      if (opponentName && opponentName.trim() !== "") {
        let opponentHasLeagueExperience = false;
        // Iterar sobre todos los partidos para verificar la experiencia del oponente
        for (const otherMatch of allMatches) {
          // El oponente debe haber sido el 'Team' principal en 'otherMatch'
          // Y la 'Competicion' de 'otherMatch' debe ser una de las competiciones de liga
          if (otherMatch.Team === opponentName &&
              otherMatch.Competicion && // Asegurarse que otherMatch.Competicion no es null/undefined
              savedTeamsFirstNavLinkTexts.includes(otherMatch.Competicion)) {
            opponentHasLeagueExperience = true;
            break; // Se encontró experiencia, no es necesario seguir buscando
          }
        }
        if (!opponentHasLeagueExperience) {
          updatedMatch.Status = "Negativo"; // Si el oponente no tiene experiencia en liga, el match de TierS es Negativo
        }
      }
    }

    return updatedMatch; // Devolver el partido (modificado o no)
  });
}