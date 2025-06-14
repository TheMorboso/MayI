// c/Users/Mauri/Desktop/CCC23/MayI/CCC23/api/postscudetto.ts
import { OrganizedMatchInfo } from './organizador';

export interface PostScudettoMatchInfo extends OrganizedMatchInfo {
  postScudettoProcessed?: boolean;
  puntos?: number; // Cumulative points for THIS team in THIS competition up to THIS match
  // Status describe la posición del equipo en la liga después de este partido, o un estado especial.
  Status?: 'Champion' | 'Can still win' | 'Post scudetto' | 'Not a league match' | 'Data insufficient' | 'Negativo' | 'Neutro' | 'Rojo' | 'Naranja' | 'Verde';

}

export function processPostScudettoData(
  organizedMatches: OrganizedMatchInfo[],
  leagueCompetitionNames: string[]
): PostScudettoMatchInfo[] {
  if (!organizedMatches || organizedMatches.length === 0) {
    return [];
  }

  // --- INICIO: Lógica para calcular y mostrar rondas totales por competición ---
  console.log("\n--- Rondas Totales por Competición de Liga ---");
  const roundsByCompetition = new Map<string, number>();

  leagueCompetitionNames.forEach(competitionName => {
    // Ensure competitionName is valid before processing
    if (!competitionName || typeof competitionName !== 'string') return;
    
    let maxRoundForThisCompetition = 0;
    organizedMatches.forEach(match => {
      if (match.Competicion === competitionName && match.Ronda) {
        const roundNumber = parseInt(match.Ronda, 10);
        if (!isNaN(roundNumber) && roundNumber > maxRoundForThisCompetition) {
          maxRoundForThisCompetition = roundNumber;
        }
      }
    });
    if (maxRoundForThisCompetition > 0) {
      roundsByCompetition.set(competitionName, maxRoundForThisCompetition);
    }
  });

  if (roundsByCompetition.size > 0) {
    roundsByCompetition.forEach((totalRounds, competition) => {
      const puntajeMaximoRelativo = totalRounds * 3;
      console.log(`Competición: "${competition}", Rondas Totales: ${totalRounds}, Puntaje máximo relativo: ${puntajeMaximoRelativo}`);
    });
  } else {
    console.log("No se encontraron datos de rondas para las competiciones de liga especificadas.");
  }
  console.log("------------------------------------------------\n");
  // --- FIN: Lógica para calcular y mostrar rondas totales por competición ---

  const cumulativePointsTracker = new Map<string, number>();

  let processedData: PostScudettoMatchInfo[] = organizedMatches.map(match => {
    const postScudettoMatch: PostScudettoMatchInfo = {
      ...match,
      Status: '', // Default value
    };

    if (
      match.Team &&
      match.Competicion &&
      leagueCompetitionNames.includes(match.Competicion)
    ) {
      let matchPoints = 0;
      if (match.resultado) {
        const scoreMatch = match.resultado.match(/^(\d+):(\d+)/);
        if (scoreMatch) {
          const scoreA = parseInt(scoreMatch[1], 10);
          const scoreB = parseInt(scoreMatch[2], 10);

          if (scoreA > scoreB) {
            matchPoints = 3;
          } else if (scoreA === scoreB) {
            matchPoints = 1;
          } else {
            matchPoints = 0;
          }
        }
      }

      const pointsTrackerKey = `${match.Team}_${match.Competicion}`;
      
      const currentAccumulatedPoints = cumulativePointsTracker.get(pointsTrackerKey) || 0;
      const newAccumulatedPoints = currentAccumulatedPoints + matchPoints;
      
      cumulativePointsTracker.set(pointsTrackerKey, newAccumulatedPoints);
      postScudettoMatch.puntos = newAccumulatedPoints;
    }
    return postScudettoMatch;
  });

  // --- INICIO: Lógica para determinar estado en la liga (Can win, Cannot win, Champion) ---

  // Helper function to get a team's points after a specific round in a league
  // Assumes sortedMatchesForTeamInLeague are sorted by Ronda and have 'puntos' calculated
  function getPointsAfterRound(
    targetRound: number,
    sortedMatchesForTeamInLeague: PostScudettoMatchInfo[]
  ): number {
    let pointsAfterTargetRound = 0;
    // Iterate backwards to find the last match at or before the targetRound more efficiently
    for (let i = sortedMatchesForTeamInLeague.length - 1; i >= 0; i--) {
      const match = sortedMatchesForTeamInLeague[i];
      if (typeof match.Ronda !== 'string' || match.puntos === undefined) continue;
      const matchRound = parseInt(match.Ronda, 10);
      if (isNaN(matchRound)) continue;

      if (matchRound <= targetRound) {
        pointsAfterTargetRound = match.puntos;
        break; 
      }
    }
    // If no match found up to targetRound, check if the first match is after targetRound
    // (meaning 0 points before their first game in that round range)
    // or if the list is empty.
    if (pointsAfterTargetRound === 0 && sortedMatchesForTeamInLeague.length > 0) {
        const firstMatch = sortedMatchesForTeamInLeague[0];
        if (typeof firstMatch.Ronda === 'string' && !isNaN(parseInt(firstMatch.Ronda, 10))) {
            if (parseInt(firstMatch.Ronda, 10) > targetRound) {
                return 0; // Team hasn't played up to this round yet
            }
        }
    }
    return pointsAfterTargetRound;
  }

  // Group matches by team and then by league, ensuring they are sorted by round
  const matchesByTeamAndLeague = new Map<string, Map<string, PostScudettoMatchInfo[]>>();
  processedData.forEach(match => {
    if (match.Team && match.Competicion && match.Ronda && roundsByCompetition.has(match.Competicion)) {
      if (!matchesByTeamAndLeague.has(match.Team)) {
        matchesByTeamAndLeague.set(match.Team, new Map<string, PostScudettoMatchInfo[]>());
      }
      const teamLeagues = matchesByTeamAndLeague.get(match.Team)!;
      if (!teamLeagues.has(match.Competicion)) {
        teamLeagues.set(match.Competicion, []);
      }
      teamLeagues.get(match.Competicion)!.push(match);
    }
  });

  // Sort matches within each team's league by round
  matchesByTeamAndLeague.forEach(teamLeagues => {
    teamLeagues.forEach(leagueMatches => {
      leagueMatches.sort((a, b) => {
        const roundA = a.Ronda ? parseInt(a.Ronda, 10) : NaN;
        const roundB = b.Ronda ? parseInt(b.Ronda, 10) : NaN;
        
        if (isNaN(roundA) && isNaN(roundB)) return 0;
        if (isNaN(roundA)) return 1; // Treat NaN as greater for sorting
        if (isNaN(roundB)) return -1; // Treat NaN as greater for sorting
        return roundA - roundB;
      });
    });
  });

  processedData.forEach(matchA => {
    // Skip if not a league match relevant for this analysis or data is missing
    if (!matchA.Team || !matchA.Competicion || !matchA.Ronda || !roundsByCompetition.has(matchA.Competicion) || matchA.puntos === undefined) {
      matchA.Status = matchA.Competicion && leagueCompetitionNames.includes(matchA.Competicion) ? 'Data insufficient' : '';
      return;
    }

    const currentRoundA = parseInt(matchA.Ronda, 10);
    if (isNaN(currentRoundA)) {
      matchA.Status = 'Data insufficient';
      return;
    }

    const totalRoundsInLeague = roundsByCompetition.get(matchA.Competicion)!;
    const pointsA_after_currentMatch = matchA.puntos;
    const matchesLeftA = totalRoundsInLeague - currentRoundA;
    const maxPossiblePointsA = pointsA_after_currentMatch + (matchesLeftA < 0 ? 0 : matchesLeftA * 3);

    let teamA_canStillWinLeague = true;

    const allTeamsInThisLeague = Array.from(matchesByTeamAndLeague.keys()).filter(teamName =>
        matchesByTeamAndLeague.get(teamName)!.has(matchA.Competicion!)
    );

    // "Cannot Win" Check
    for (const teamB_name of allTeamsInThisLeague) {
      if (teamB_name === matchA.Team) continue;

      const matchesTeamBInLeague = matchesByTeamAndLeague.get(teamB_name)!.get(matchA.Competicion!)!;
      // Get points of Team B as of the *end* of currentRoundA
      const pointsB_at_currentRoundA = getPointsAfterRound(currentRoundA, matchesTeamBInLeague);

      if (maxPossiblePointsA < pointsB_at_currentRoundA) {
        teamA_canStillWinLeague = false;
        break;
      }
    }

    if (!teamA_canStillWinLeague) {
      matchA.Status = 'Post scudetto';
    } else {
      // "Champion" Check
      let teamA_isChampion = true;
      if (allTeamsInThisLeague.length <= 1) { // If only one team or no other teams, they are champion by default if they can win
         teamA_isChampion = true;
      } else {
        for (const teamB_name of allTeamsInThisLeague) {
          if (teamB_name === matchA.Team) continue;

          const matchesTeamBInLeague = matchesByTeamAndLeague.get(teamB_name)!.get(matchA.Competicion!)!;
          const pointsB_at_currentRoundA = getPointsAfterRound(currentRoundA, matchesTeamBInLeague);
          // Matches left for B *after* currentRoundA has concluded for everyone
          const matchesLeftB = totalRoundsInLeague - currentRoundA;
          const maxPossiblePointsB = pointsB_at_currentRoundA + (matchesLeftB < 0 ? 0 : matchesLeftB * 3);

          if (pointsA_after_currentMatch <= maxPossiblePointsB) {
            teamA_isChampion = false;
            break;
          }
        }
      }

      if (teamA_isChampion) {
        matchA.Status = 'Champion';
      } else {
        matchA.Status = ''; // Estado por defecto si puede ganar pero no es campeón aún
      }
    }
  });
  // --- FIN: Lógica para determinar estado en la liga ---

  return processedData;
}
