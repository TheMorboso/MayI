import { PostScudettoMatchInfo } from './postscudetto';

/**
 * Aplica correcciones personalizadas a los datos de los partidos.
 * Esta función se ejecuta después de processPostScudettoData y processPositiveNegative.
 * - Sincroniza el Status para partidos de "Competicion" entre equipos TierS/TierSred.
 * - Aplica lógica de Status específica para estos enfrentamientos en AMBAS perspectivas.
 *
 * @param matches Los datos de los partidos ya procesados.
 * @returns Los datos de los partidos con las correcciones aplicadas.
 */
export function applyCorrections(
  matches: PostScudettoMatchInfo[]
): PostScudettoMatchInfo[] {
  if (!matches || matches.length === 0) {
    return [];
  }

  // Crear una copia mutable para trabajar sobre ella
  const matchesToProcess = matches.map(m => ({ ...m }));
  const processedPairIds = new Set<string>(); // Para rastrear pares ya procesados y evitar recalcular

  for (let i = 0; i < matchesToProcess.length; i++) {
    const currentMatch = matchesToProcess[i];

    // Solo nos interesan los partidos de "Competicion" entre TierS/TierSred
    if (
      currentMatch.Competicion !== "Competicion" ||
      !currentMatch.Team ||
      !currentMatch.equipoContrario ||
      !(currentMatch.tier === "TierS" || currentMatch.tier === "TierSred") ||
      !(currentMatch.opponentTier === "TierS" || currentMatch.opponentTier === "TierSred")
    ) {
      continue;
    }

    const team1 = currentMatch.Team;
    const team2 = currentMatch.equipoContrario;
    const sortedTeams = [team1, team2].sort();
    const pairId = `${currentMatch.fecha}-${sortedTeams[0]}-${sortedTeams[1]}-${currentMatch.Competicion}`;

    if (processedPairIds.has(pairId)) {
      // La lógica de Status para este par ya fue aplicada desde la perspectiva del mirrorMatch.
      continue;
    }

    // Encontrar el índice del partido espejo en la lista `matchesToProcess`
    const mirrorMatchIndex = matchesToProcess.findIndex(
      (m, idx) =>
        idx !== i && // No es el mismo partido
        m.Team === currentMatch.equipoContrario &&
        m.equipoContrario === currentMatch.Team &&
        m.fecha === currentMatch.fecha &&
        m.Competicion === currentMatch.Competicion
    );

    const statusTeam1 = currentMatch.Status; // Status del currentMatch.Team en su liga
    const tierTeam1 = currentMatch.tier;

    // Status del equipo contrario (mirrorMatch.Team) en su liga
    const statusTeam2 = mirrorMatchIndex !== -1 ? matchesToProcess[mirrorMatchIndex].Status : undefined;
    const tierTeam2 = currentMatch.opponentTier; // Tier del oponente ya está en currentMatch

    let newCalculatedStatus: PostScudettoMatchInfo['Status'] | undefined = undefined;

    // Caso 1: Competicion, ambos TierS
    if (tierTeam1 === "TierS" && tierTeam2 === "TierS") {
      if (statusTeam1 === "Post scudetto" || statusTeam2 === "Post scudetto") {
        newCalculatedStatus = "Negativo";
      }
    }
    // Casos 2 y 3: Competicion, TierS vs TierSred
    else if (
      (tierTeam1 === "TierS" && tierTeam2 === "TierSred") ||
      (tierTeam1 === "TierSred" && tierTeam2 === "TierS")
    ) {
      const teamS_is_Team1 = tierTeam1 === "TierS";
      const statusOfTierS = teamS_is_Team1 ? statusTeam1 : statusTeam2;
      const statusOfTierSred = teamS_is_Team1 ? statusTeam2 : statusTeam1;

      // Caso 2: TierS tiene status Post scudetto
      if (statusOfTierS === "Post scudetto") {
        newCalculatedStatus = "Negativo";
      }
      // Caso 3: TierSred tiene status Post scudetto
      else if (statusOfTierSred === "Post scudetto") {
        newCalculatedStatus = ""; // Sin status
      }
    }

    // Si se calculó un nuevo status, aplicarlo a AMBAS perspectivas del partido
    if (newCalculatedStatus !== undefined) {
      currentMatch.Status = newCalculatedStatus; // Aplicar al partido actual
      if (mirrorMatchIndex !== -1) {
        matchesToProcess[mirrorMatchIndex].Status = newCalculatedStatus; // Aplicar al partido espejo
      }
    }
    
    processedPairIds.add(pairId); // Marcar este par como procesado
  }

  return matchesToProcess; // Devolver la lista completa con los Status actualizados
}
