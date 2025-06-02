import { MatchDetails } from './matchScraper';
import { ScrapedTeamInfo, TeamTierType } from './scraper'; // Import ScrapedTeamInfo and TeamTierType

export interface OrganizedMatchInfo extends MatchDetails {
  formato?: string | null;
  Ronda?: string | null;
  Competicion?: string | null;
  tier?: TeamTierType | null;
  teamMainLeague?: string | null; // NUEVO: Para almacenar la liga principal del 'Team'
  teamEmblemSrc?: string | null; // NUEVO: Para almacenar el emblema del 'Team'
  opponentTier?: TeamTierType | null; // NUEVO: Tier del equipo contrario
  opponentEmblemSrc?: string | null; // NUEVO: Emblema del equipo contrario
  isMainLeagueCompetition?: boolean; // NUEVO: Indica si la competición es una liga principal
}

// Helper function to parse date strings (DD/MM/YYYY)
function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month, day);
}

// Helper function to calculate difference in days between two dates
function dateDiffInDays(date1: Date, date2: Date): number {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

export function organizeMatchData(
  matches: MatchDetails[],
  savedTeamsFirstNavLinkTexts: string[],
  allSavedTeams: ScrapedTeamInfo[] // Add parameter to access all saved teams
): OrganizedMatchInfo[] {
  if (!matches || matches.length === 0) {
    return [];
  }

  // Create a map for quick tier lookup by team name
  const teamTierMap = new Map<string, TeamTierType | null>();
  allSavedTeams.forEach(team => {
    if (team.teamName) {
      teamTierMap.set(team.teamName, team.tier ?? null);
    }
  });

  const matchesByTeam = new Map<string, OrganizedMatchInfo[]>();
  const teamNameOrder: string[] = [];

  for (const originalMatch of matches) {
    let competicionValue: string | null = null;

    if (originalMatch.week) {
      try {
        const url = new URL(originalMatch.week);
        const pathParts = url.pathname.split('/').filter(part => part.length > 0);

        const scheduleIndex = pathParts.indexOf('schedule');

        if (scheduleIndex !== -1 && pathParts.length > scheduleIndex + 2) {
          const extractedText = pathParts[scheduleIndex + 1];
          let baseSlugForCondition: string | null = null;
          const segmentParts = extractedText.split('-');
          const detailKeywords = [
            "final", "finale", "halbfinale", "spieltag", "matchday",
            "gruppe", "round", "qualifikation", "relegation",
            "meisterschaftsplayoff", "abstiegsplayoff", "achtelfinale", "viertelfinale"
          ];

          for (let k = 1; k < segmentParts.length; k++) {
            const partCandidate = segmentParts[k];
            if (/^\d{4}$/.test(partCandidate) || detailKeywords.includes(partCandidate.toLowerCase())) {
              baseSlugForCondition = segmentParts.slice(0, k).join('-');
              break;
            }
          }
          if (!baseSlugForCondition && segmentParts.length > 0) {
            baseSlugForCondition = extractedText;
          }

          if (baseSlugForCondition) {
            // --- INICIO DE CONDICIONALES (MODIFICAR SEGÚN NECESIDAD) ---
            // Usa 'baseSlugForCondition' para tus comparaciones
            if (baseSlugForCondition === "champions-league") {
              competicionValue = "Competicion";
            } else if (baseSlugForCondition === "ita-supercoppa") { // Ejemplo basado en tu URL
              competicionValue = "Competicion";
            }else if (baseSlugForCondition === "freundschaft-vereine") { // Ejemplo basado en tu URL
              competicionValue = "Amistoso";
            }else if (baseSlugForCondition === "uefa-super-cup") { // Ejemplo basado en tu URL
              competicionValue = "Competicion";
            }else if (baseSlugForCondition === "esp-primera-division") { // Ejemplo basado en tu URL
              competicionValue = "Primera División";
            }else if (baseSlugForCondition === "esp-supercopa") { // Ejemplo basado en tu URL
              competicionValue = "Competicion";
            }else if (baseSlugForCondition === "esp-copa-del-rey") { // Ejemplo basado en tu URL
              competicionValue = "Competicion";
            }else if (baseSlugForCondition === "klub-wm") { // Ejemplo basado en tu URL
              competicionValue = "Competicion";
            }else if (baseSlugForCondition === "eng-premier-league") { // Ejemplo basado en tu URL
              competicionValue = "Premier League";
            }else if (baseSlugForCondition === "eng-league-cup") { // Ejemplo basado en tu URL
              competicionValue = "Competicion";
            }else if (baseSlugForCondition === "eng-fa-cup") { // Ejemplo basado en tu URL
              competicionValue = "Competicion";
            }else if (baseSlugForCondition === "ita-serie-a") { // Ejemplo basado en tu URL
              competicionValue = "Serie A";
            }else if (baseSlugForCondition === "ita-coppa-italia") { // Ejemplo basado en tu URL
              competicionValue = "Competicion";
            }else if (baseSlugForCondition === "eng-fa-community-shield") { // Ejemplo basado en tu URL
              competicionValue = "Competicion";
            }else if (baseSlugForCondition === "europa-league") { // Ejemplo basado en tu URL
              competicionValue = "Competicion";
            }else if (baseSlugForCondition === "tur-sueperlig") { // Ejemplo basado en tu URL
              competicionValue = "SüperLig";
            }else if (baseSlugForCondition === "tur-tuerkiye-kupasi") { // Ejemplo basado en tu URL
              competicionValue = "Competicion";
            }else if (baseSlugForCondition === "tur-sueper-kupa") { // Ejemplo basado en tu URL
              competicionValue = "Competicion";
            }else if (baseSlugForCondition === "wm-quali-europa") { // Ejemplo basado en tu URL
              competicionValue = "World";
            }else if (baseSlugForCondition === "wm-quali-suedamerika") { // Ejemplo basado en tu URL
              competicionValue = "World";
            }else if (baseSlugForCondition === "freundschaft") { // Ejemplo basado en tu URL
              competicionValue = "Amistoso";
            }else if (baseSlugForCondition === "bundesliga") { // Ejemplo basado en tu URL
              competicionValue = "Bundesliga";
            }else if (baseSlugForCondition === "dfb-pokal") { // Ejemplo basado en tu URL
              competicionValue = "Competencia";
            } else if (baseSlugForCondition === "supercup") { // Ejemplo basado en tu URL
              competicionValue = "Competencia";
            }
          }
        }
      } catch (e) {
      }
    }

    // Modificar la hora si el resultado no es "-:-"
    let finalHora = originalMatch.hora;
    if (originalMatch.resultado && originalMatch.resultado.trim() !== "-:-") {
      finalHora = "FT";
    }

    // Obtener tier y la liga principal (firstNavLinkText) del equipo del partido
    const teamInfo = originalMatch.Team ? allSavedTeams.find(t => t.teamName === originalMatch.Team) : undefined;
    const teamTier = teamInfo?.tier ?? null;
    const mainLeagueForTeam = teamInfo?.firstNavLinkText ?? null;
    const emblemForTeam = teamInfo?.teamEmblemSrc ?? null;

    // Obtener tier y emblema del equipo contrario
    const opponentName = originalMatch.equipoContrario;
    const opponentInfo = opponentName ? allSavedTeams.find(t => t.teamName === opponentName) : undefined;
    const tierForOpponent = opponentInfo?.tier ?? null;
    const emblemForOpponent = opponentInfo?.teamEmblemSrc ?? null;
    const isMainLeague = !!(competicionValue && savedTeamsFirstNavLinkTexts.includes(competicionValue));

    const processedMatch: OrganizedMatchInfo = {
      ...originalMatch,
      hora: finalHora,
      Competicion: competicionValue,
      formato: null,
      Ronda: null,
      tier: teamTier,
      teamEmblemSrc: emblemForTeam, // Asignar el emblema del equipo
      opponentTier: tierForOpponent, // Asignar tier del oponente
      opponentEmblemSrc: emblemForOpponent, // Asignar emblema del oponente
      teamMainLeague: mainLeagueForTeam, // Asignar la liga principal del equipo
      isMainLeagueCompetition: isMainLeague, // Asignar si es competición de liga principal
    };
    if (
      originalMatch.week &&
      processedMatch.Competicion
    ) {
      if (savedTeamsFirstNavLinkTexts.includes(processedMatch.Competicion)) {
        try {
          const weekUrl = new URL(originalMatch.week);
          const pathParts = weekUrl.pathname.split('/').filter(part => part.length > 0);

          const scheduleSegmentIndex = pathParts.findIndex(part => part === 'schedule');
          if (scheduleSegmentIndex !== -1 && pathParts.length > scheduleSegmentIndex + 2) {
            const rondaCandidate = pathParts[scheduleSegmentIndex + 2];
            if (rondaCandidate && /^\d+$/.test(rondaCandidate)) {
              processedMatch.Ronda = rondaCandidate;
            }
          }
        } catch (e) {
        }
      }
      else if (processedMatch.Competicion === "Competicion") {
        try {
          const weekUrl = new URL(originalMatch.week);
          const pathParts = weekUrl.pathname.split('/').filter(part => part.length > 0);

          const scheduleSegmentIndex = pathParts.findIndex(part => part === 'schedule');
          if (scheduleSegmentIndex !== -1 && pathParts.length > scheduleSegmentIndex + 2) {
            const rondaCandidate = pathParts[scheduleSegmentIndex + 2];
            if (rondaCandidate && /^\d+$/.test(rondaCandidate)) {
              const rondaNum = parseInt(rondaCandidate, 10);
              if (rondaNum === 1) {
                processedMatch.formato = "ida";
              } else if (rondaNum === 2) {
                processedMatch.formato = "vuelta";
              }
              processedMatch.Ronda = null;
            }
          }
        } catch (e) {
        }
      }
    }


    const teamName = processedMatch.Team;

    if (!teamName) {
      continue;
    }

    if (!matchesByTeam.has(teamName)) {
      matchesByTeam.set(teamName, []);
      teamNameOrder.push(teamName);
    }
    matchesByTeam.get(teamName)!.push(processedMatch);
  }

  const finalOrganizedMatches: OrganizedMatchInfo[] = [];
  for (const currentTeamName of teamNameOrder) {
    const teamMatches = matchesByTeam.get(currentTeamName)!;

    const sortedTeamMatches = [...teamMatches].sort((a, b) => {
      const fechaA = a.fecha;
      const fechaB = b.fecha;

      if (!fechaA && !fechaB) return 0;
      if (!fechaA) return 1;
      if (!fechaB) return -1;

      try {
        const partsA = fechaA.split('/');
        const partsB = fechaB.split('/');

        if (partsA.length !== 3 && partsB.length !== 3) return 0;
        if (partsA.length !== 3) return 1;
        if (partsB.length !== 3) return -1;

        const dayA = partsA[0].padStart(2, '0');
        const monthA = partsA[1].padStart(2, '0');
        const yearA = partsA[2];

        const dayB = partsB[0].padStart(2, '0');
        const monthB = partsB[1].padStart(2, '0');
        const yearB = partsB[2];

        const comparableA = `${yearA}${monthA}${dayA}`;
        const comparableB = `${yearB}${monthB}${dayB}`;

        return comparableA.localeCompare(comparableB);
      } catch (error) {
        return 0;
      }
    });

    // Insert "Parón Internacional" pseudo-matches
    const matchesWithBreaks: OrganizedMatchInfo[] = [];
    const teamInfoForPseudoMatch = allSavedTeams.find(t => t.teamName === currentTeamName);

    for (let i = 0; i < sortedTeamMatches.length; i++) {
      const currentMatch = sortedTeamMatches[i];
      matchesWithBreaks.push(currentMatch); // Add the current match

      // Check for a break after this match, if it's not the last match
      if (currentMatch.Competicion !== "Amistoso" && (i + 1) < sortedTeamMatches.length) {
        const nextMatch = sortedTeamMatches[i + 1];
        if (nextMatch.Competicion !== "Amistoso") {
          const dateCurrent = parseDate(currentMatch.fecha);
          const dateNext = parseDate(nextMatch.fecha);

          if (dateCurrent && dateNext) {
            const diff = dateDiffInDays(dateCurrent, dateNext);
            if (diff >= 12) {
              const internationalBreakPseudoMatch: OrganizedMatchInfo = {
                Team: currentTeamName,
                Competicion: "Parón Internacional", // Special identifier
                fecha: currentMatch.fecha, // Date of the match before the break
                                           // This helps in ordering; display will be based on Competicion
                hora: "---",
                equipoContrario: "---", // Placeholder text
                tier: teamInfoForPseudoMatch?.tier ?? null,
                teamEmblemSrc: teamInfoForPseudoMatch?.teamEmblemSrc ?? null,
                // Fill other fields with null or default values
                week: null,
                lugar: null,
                resultado: null,
                match: null,
                error: null,
                formato: null,
                Ronda: null,
                teamMainLeague: null,
                opponentTier: null,
                opponentEmblemSrc: null,
                isMainLeagueCompetition: false,
              };
              matchesWithBreaks.push(internationalBreakPseudoMatch);
            }
          }
        }
      }
    }
    finalOrganizedMatches.push(...matchesWithBreaks);
  }
  return finalOrganizedMatches;
}
