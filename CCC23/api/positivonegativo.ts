// c/Users/Mauri/Desktop/CCC23/MayI/CCC23/api/positivonegativo.ts
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

    // NUEVA REGLA: Si opponentTier es "TierA", reemplazar equipoContrario por "TierA"
    if (updatedMatch.opponentTier === "TierA") {
      updatedMatch.equipoContrario = "TierA";
    }

    // REGLA GENERAL PARA TIER "RED": Siempre "Negativo" si el equipo o el oponente es "Red"
    if (updatedMatch.tier === "Red" || updatedMatch.opponentTier === "Red") {
      updatedMatch.Status = "Negativo";
    }

    // NUEVA REGLA: TierSred vs TierSred siempre es "Negativo"
    if (updatedMatch.tier === "TierSred" && updatedMatch.opponentTier === "TierSred") {
      updatedMatch.Status = "Negativo";
    }

    // NUEVA REGLA: Partido de liga principal vs TierA es "Negativo"
    if (updatedMatch.Competicion &&
        savedTeamsFirstNavLinkTexts.includes(updatedMatch.Competicion) && // Es una liga principal
        updatedMatch.opponentTier === "TierA") { // opponentTier ya sería "TierA" si la regla anterior aplicó, pero la condición original se mantiene por claridad
      // Solo aplicar si el Status actual no es Champion o Post scudetto, para no sobrescribirlos.
      if (updatedMatch.Status !== "Champion" && updatedMatch.Status !== "Post scudetto") {
        updatedMatch.Status = "Negativo";
      }
    }

    // Lógica para partidos de "Competencia"
    // Aplicar esta lógica si Competicion es "Competencia" (con 'e') O "Competicion" (con 'o')
    if ((updatedMatch.Competicion === "Competencia" || updatedMatch.Competicion === "Competicion") && updatedMatch.Team) {
      if (updatedMatch.tier === "TierSred") {
        // Si ya se estableció como "Negativo" por TierSred vs TierSred, no sobrescribir a menos que sea vs TierS
        if (updatedMatch.opponentTier !== "TierS" && updatedMatch.Status !== "Negativo") {
          updatedMatch.Status = "Negativo";
        } else if (updatedMatch.opponentTier === "TierS" && updatedMatch.Status === "Negativo" && updatedMatch.opponentTier === "TierSred") {
          // Este caso es TierSred vs TierSred, ya manejado arriba.
          // Si es TierSred vs TierS, y el status ya es Negativo (por TierSred vs TierSred), no hacer nada.
          // Si es TierSred vs TierS, y el status NO es Negativo, se evaluará más adelante si es necesario.
        } else if (updatedMatch.opponentTier !== "TierS") { // Si no es vs TierS, y no fue TierSred vs TierSred
            updatedMatch.Status = "Negativo";
        }
      }
      // Regla existente: Si el tier del equipo NO es TierS ni TierSred, es Negativo.
      else if (updatedMatch.tier !== "TierS") { // Esto cubre TierA, TierC, Red, World, null/undefined
        updatedMatch.Status = "Negativo";
      } else {
        // Lógica existente: Si el equipo es TierS, aplicar la regla de partidos adyacentes "Post scudetto".
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

        // Si ambos partidos adyacentes (del mismo equipo TierS) tienen Status "Post scudetto",
        // el partido actual "Competencia" se marca como "Negativo".
        if (prevMatchOfSameTeam && prevMatchOfSameTeam.Status === "Post scudetto" &&
            nextMatchOfSameTeam && nextMatchOfSameTeam.Status === "Post scudetto") {
          updatedMatch.Status = "Negativo";
        }
      }
    }

    // NUEVA REGLA: Partido de "Competicion" (Champions/Europa League, etc.) entre dos partidos con Status "Post scudetto"
    // Esta regla SOLO aplica a equipos TierS.
    if (updatedMatch.Competicion === "Competicion" && updatedMatch.Team && updatedMatch.tier === "TierS") {
      // Solo aplicar si el Status actual no es Champion o Post scudetto
      if (updatedMatch.Status !== "Champion" && updatedMatch.Status !== "Post scudetto") {
        let prevMatchOfSameTeam: PostScudettoMatchInfo | null = null;
        // Buscar el partido inmediatamente anterior del mismo equipo
        for (let i = index - 1; i >= 0; i--) {
          if (allMatchesArray[i].Team === updatedMatch.Team) {
            prevMatchOfSameTeam = allMatchesArray[i];
            break; // Encontramos el partido anterior más reciente del mismo equipo
          }
        }

        let nextMatchOfSameTeam: PostScudettoMatchInfo | null = null;
        // Buscar el partido inmediatamente siguiente del mismo equipo
        for (let i = index + 1; i < allMatchesArray.length; i++) {
          if (allMatchesArray[i].Team === updatedMatch.Team) {
            nextMatchOfSameTeam = allMatchesArray[i];
            break; // Encontramos el partido siguiente más cercano del mismo equipo
          }
        }

        if (prevMatchOfSameTeam && prevMatchOfSameTeam.Status === "Post scudetto" &&
            nextMatchOfSameTeam && nextMatchOfSameTeam.Status === "Post scudetto") {
          updatedMatch.Status = "Negativo";
        }
      }
    }

    // Nueva lógica para partidos "Amistoso":
    if (updatedMatch.Competicion === "Amistoso" && updatedMatch.Team) {
      if (updatedMatch.opponentTier === "TierS") {
        updatedMatch.Status = "Negativo";
      }
      // Si el equipo contrario no es TierS, no modificar el Status
    }

    // LÓGICA PARA PARTIDOS DE LIGA POSTERGADOS:
    if (updatedMatch.Team &&
        updatedMatch.Competicion &&
        savedTeamsFirstNavLinkTexts.includes(updatedMatch.Competicion) && 
        updatedMatch.Ronda) { 

      const currentRondaStr = updatedMatch.Ronda;
      const currentRondaNum = parseInt(currentRondaStr, 10);

      if (!isNaN(currentRondaNum)) { 
        for (let j = index - 1; j >= 0; j--) {
          const prevMatchCandidate = allMatchesArray[j];
          if (prevMatchCandidate.Team === updatedMatch.Team &&
              prevMatchCandidate.Competicion &&
              savedTeamsFirstNavLinkTexts.includes(prevMatchCandidate.Competicion) &&
              prevMatchCandidate.Ronda) {
            
            const prevRondaStr = prevMatchCandidate.Ronda;
            const prevRondaNum = parseInt(prevRondaStr, 10);

            if (!isNaN(prevRondaNum) && prevRondaNum > currentRondaNum) {
              if (updatedMatch.opponentTier !== "TierS") {
                updatedMatch.Status = "Negativo";
              }
            }
            break; 
          }
        }
      }
    }

    // NUEVA REGLA: Partidos de liga principal precedidos por un partido de "Competicion" con "aet"
    if (updatedMatch.Team &&
        updatedMatch.Competicion &&
        savedTeamsFirstNavLinkTexts.includes(updatedMatch.Competicion)) {

      if (updatedMatch.Status !== "Champion" && updatedMatch.Status !== "Post scudetto") {
        let prevMatchOfSameTeam: PostScudettoMatchInfo | null = null;
        for (let i = index - 1; i >= 0; i--) {
          if (allMatchesArray[i].Team === updatedMatch.Team) {
            prevMatchOfSameTeam = allMatchesArray[i];
            break; 
          }
        }

        if (prevMatchOfSameTeam &&
            prevMatchOfSameTeam.Competicion === "Competicion" &&
            prevMatchOfSameTeam.resultado &&
            prevMatchOfSameTeam.resultado.includes("aet")) {
          
          updatedMatch.Status = "Negativo";
        }
      }
    }


    // NUEVA REGLA: Partido de liga ("A") entre dos partidos de "Competicion" ("A")
    if (updatedMatch.Team &&
        updatedMatch.Competicion &&
        savedTeamsFirstNavLinkTexts.includes(updatedMatch.Competicion) &&
        updatedMatch.lugar === "A") {

      if (updatedMatch.Status !== "Champion" && updatedMatch.Status !== "Post scudetto") {
        let prevMatchOfSameTeam: PostScudettoMatchInfo | null = null;
        for (let i = index - 1; i >= 0; i--) {
          if (allMatchesArray[i].Team === updatedMatch.Team) {
            prevMatchOfSameTeam = allMatchesArray[i];
            break;
          }
        }

        let nextMatchOfSameTeam: PostScudettoMatchInfo | null = null;
        for (let i = index + 1; i < allMatchesArray.length; i++) {
          if (allMatchesArray[i].Team === updatedMatch.Team) {
            nextMatchOfSameTeam = allMatchesArray[i];
            break;
          }
        }

        if (prevMatchOfSameTeam && prevMatchOfSameTeam.Competicion === "Competicion" && prevMatchOfSameTeam.lugar === "A" &&
            nextMatchOfSameTeam && nextMatchOfSameTeam.Competicion === "Competicion" && nextMatchOfSameTeam.lugar === "A") {
          updatedMatch.Status = "Negativo";
        }
      }
    }

    // NUEVAS REGLAS ESPECIALES PARA PREMIER LEAGUE
    const PREMIER_LEAGUE_COMPETITION_NAME = "Premier League"; 

    if (updatedMatch.Competicion === PREMIER_LEAGUE_COMPETITION_NAME && updatedMatch.Team) {
      if (updatedMatch.Status !== "Champion" && updatedMatch.Status !== "Post scudetto") {
        let prevMatchOfSameTeam: PostScudettoMatchInfo | null = null;
        for (let i = index - 1; i >= 0; i--) {
          if (allMatchesArray[i].Team === updatedMatch.Team) {
            prevMatchOfSameTeam = allMatchesArray[i];
            break;
          }
        }

        let nextMatchOfSameTeam: PostScudettoMatchInfo | null = null;
        for (let i = index + 1; i < allMatchesArray.length; i++) {
          if (allMatchesArray[i].Team === updatedMatch.Team) {
            nextMatchOfSameTeam = allMatchesArray[i];
            break;
          }
        }

        if (
          prevMatchOfSameTeam && prevMatchOfSameTeam.Competicion === "Competicion" &&
          nextMatchOfSameTeam && nextMatchOfSameTeam.Competicion === "Competicion"
        ) {
          updatedMatch.Status = "Negativo";
        }

        if (prevMatchOfSameTeam && prevMatchOfSameTeam.Competicion === "Parón Internacional") {
          updatedMatch.Status = "Negativo";
        }
      }
    }

    return updatedMatch;
  });
}
 