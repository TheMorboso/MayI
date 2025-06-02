import { MatchDetails } from './matchScraper';
import { ScrapedTeamInfo, TeamTierType } from './scraper'; // Import ScrapedTeamInfo and TeamTierType

export interface OrganizedMatchInfo extends MatchDetails {
  formato?: string | null;
  Ronda?: string | null;
  Competicion?: string | null;
  tier?: TeamTierType | null; // Add tier property
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

    const teamTier = originalMatch.Team ? teamTierMap.get(originalMatch.Team) ?? null : null;

    const processedMatch: OrganizedMatchInfo = {
      ...originalMatch,
      // resultado se mantiene como el original
      hora: finalHora, // Usar la hora modificada
      Competicion: competicionValue,
      formato: null,
      Ronda: null,
      tier: teamTier, // Assign the determined tier
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
    finalOrganizedMatches.push(...sortedTeamMatches);
  }
  return finalOrganizedMatches;
}
