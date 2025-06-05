import { PostScudettoMatchInfo } from './postscudetto';

/**
 * Aplica correcciones personalizadas a los datos de los partidos de "Competicion".
 * Esta función se ejecuta después de processPostScudettoData y processPositiveNegative.
 * - Sincroniza el Status para partidos de "Competicion" entre equipos TierS/TierSred.
 * - Aplica lógica de Status específica para estos enfrentamientos en AMBAS perspectivas.
 * - Sincroniza el Status para partidos de "Competicion" entre equipos World/World.
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

    // Solo procesar si hay información de equipo y equipo contrario
    if (!currentMatch.Team || !currentMatch.equipoContrario) {
      continue;
    }

    const isTierSPair = (currentMatch.tier === "TierS" || currentMatch.tier === "TierSred") &&
                        (currentMatch.opponentTier === "TierS" || currentMatch.opponentTier === "TierSred");
    const isWorldPair = currentMatch.tier === "World" && currentMatch.opponentTier === "World";
    let effectiveCompetition = currentMatch.Competicion; // Usar una variable para la competición efectiva

    // Determinar si este partido necesita procesamiento y cuál es su competición efectiva
    let shouldProcessThisMatch = false;
    if (isTierSPair && currentMatch.Competicion === "Competicion") {
      shouldProcessThisMatch = true;
      // effectiveCompetition ya es "Competicion"
    } else if (isWorldPair) {
      // Para World/World, procesar si Competicion es "Competicion" o null.
      // Si es null, lo trataremos como "Competicion" para la deduplicación y lo corregiremos.
      if (currentMatch.Competicion === "Competicion" || currentMatch.Competicion === null) {
        shouldProcessThisMatch = true;
        if (currentMatch.Competicion === null) {
          effectiveCompetition = "Competicion"; // Marcar para usar "Competicion" y corregir luego
        }
      }
    }

    if (!shouldProcessThisMatch) {
      continue;
    }
    // Helper para normalizar strings para la clave del par
    const normalizeStrForKey = (str: string | null | undefined): string => {
      return str ? str.trim().toLowerCase() : '';
    };
    
    const team1Normalized = normalizeStrForKey(currentMatch.Team);
    const team2Normalized = normalizeStrForKey(currentMatch.equipoContrario);
    const sortedNormalizedTeams = [team1Normalized, team2Normalized].sort();
    // Usar effectiveCompetition para la clave, que será "Competicion" si originalmente era null para World/World
    const competicionNormalized = normalizeStrForKey(effectiveCompetition);
    const fechaNormalized = normalizeStrForKey(currentMatch.fecha); // Aunque la fecha debería ser consistente
    const pairId = `${fechaNormalized}-${sortedNormalizedTeams[0]}-${sortedNormalizedTeams[1]}-${competicionNormalized}`;

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
        // El espejo también debe coincidir con la competición efectiva (o ser null si effectiveCompetition se derivó de null y el currentMatch original era null)
        (m.Competicion === effectiveCompetition || (m.Competicion === null && currentMatch.Competicion === null && effectiveCompetition === "Competicion"))
    );

    const tierTeam1 = currentMatch.tier;
    const tierTeam2 = currentMatch.opponentTier; // Tier del oponente ya está en currentMatch
    const statusTeam1 = currentMatch.Status; // Status del currentMatch.Team en su liga
    // Status del equipo contrario (mirrorMatch.Team) en su liga
    const mirrorMatchInstance = mirrorMatchIndex !== -1 ? matchesToProcess[mirrorMatchIndex] : undefined;
    const statusTeam2 = mirrorMatchInstance ? mirrorMatchInstance.Status : undefined;

    let newCalculatedStatus: PostScudettoMatchInfo['Status'] | undefined = undefined;

    // La lógica de `shouldProcessThisMatch` y `effectiveCompetition` asegura que
    // `effectiveCompetition` es "Competicion" para los casos que procesamos aquí.
    if (isTierSPair && effectiveCompetition === "Competicion") {
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
    } else if (isWorldPair && effectiveCompetition === "Competicion") {
      // Para pares World/World cuya competición efectiva es "Competicion" (original o corregida desde null),
      // establecer Status a "Negativo"
      // para que matches.tsx pueda deduplicar la visualización.
      newCalculatedStatus = "Negativo";
    }

    // Si se calculó un nuevo status, aplicarlo y corregir Competicion si es necesario
    if (newCalculatedStatus !== undefined) {
      currentMatch.Status = newCalculatedStatus; // Aplicar al partido actual
      // Si la competición original era null y la estamos tratando como "Competicion" para World/World, actualizarla.
      if (currentMatch.Competicion === null && effectiveCompetition === "Competicion" && isWorldPair) {
        currentMatch.Competicion = "Competicion";
      }

      if (mirrorMatchInstance) {
        mirrorMatchInstance.Status = newCalculatedStatus; // Aplicar al partido espejo
        // También corregir la competición del espejo si era null y es un par World/World procesado
        if (mirrorMatchInstance.Competicion === null && effectiveCompetition === "Competicion" && isWorldPair) {
          mirrorMatchInstance.Competicion = "Competicion";
        }
      }
    }

    processedPairIds.add(pairId); // Marcar este par como procesado
  }

  return matchesToProcess; // Devolver la lista completa con los Status actualizados
}
