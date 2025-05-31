// api/organizador.ts
import { MatchDetails } from './matchScraper'; // Asumiendo que MatchDetails está en matchScraper.ts

export interface OrganizedMatchInfo extends MatchDetails {
  Competicion?: string | null; // Nuevo atributo para el nombre de la competición
}

/**
 * Procesa y organiza la lista de partidos.
 * Esta función agrupa los partidos por equipo (basado en el campo `Team`).
 * Dentro de cada grupo de equipo, los partidos se ordenan por fecha (campo `fecha`).
 * El formato esperado para 'fecha' es "DD/MM/YYYY". Los partidos se ordenan cronológicamente
 * (Año, luego Mes, luego Día).
 * 
 * @param matches La lista de detalles de partidos originales.
 * @returns Una nueva lista de partidos, agrupados por equipo y ordenados por fecha dentro de cada grupo.
 */
export function organizeMatchData(matches: MatchDetails[]): OrganizedMatchInfo[] {
  console.log('[organizador.ts] Iniciando agrupación de datos por equipo y ordenación por fecha...');
  if (!matches || matches.length === 0) {
    console.log('[organizador.ts] No hay partidos para organizar.');
    return [];
  }

  // 1. Agrupar partidos por teamContextUrl
  const matchesByTeam = new Map<string, OrganizedMatchInfo[]>(); // Clave será el nombre del equipo
  const teamNameOrder: string[] = []; // Para mantener el orden original de los equipos según aparecen

  for (const originalMatch of matches) {
    let competicionValue: string | null = null; // Inicializar como null (vacío)

    if (originalMatch.week) { // originalMatch.week es una URL absoluta
      try {
        const url = new URL(originalMatch.week);
        const pathParts = url.pathname.split('/').filter(part => part.length > 0);
        
        const scheduleIndex = pathParts.indexOf('schedule');

        // Verificar si "schedule" existe y hay al menos dos partes después (TEXTO y AÑO)
        if (scheduleIndex !== -1 && pathParts.length > scheduleIndex + 2) {
          const extractedText = pathParts[scheduleIndex + 1];
          // const yearCandidate = pathParts[scheduleIndex + 2]; // Ya no se usa directamente aquí

          // Nueva lógica para extraer el 'baseSlugForCondition' de 'extractedText'
          // 'extractedText' es el segmento completo como "ita-supercoppa-2024-halbfinale"
          let baseSlugForCondition: string | null = null;
          const segmentParts = extractedText.split('-');
          // Palabras clave que suelen introducir detalles de la temporada/ronda
          // Puedes expandir esta lista según sea necesario.
          const detailKeywords = [
            "final", "finale", "halbfinale", "spieltag", "matchday", 
            "gruppe", "round", "qualifikation", "relegation", 
            "meisterschaftsplayoff", "abstiegsplayoff", "achtelfinale", "viertelfinale"
          ];

          // Intentar encontrar un punto de corte (un año o una palabra clave de detalle)
          for (let k = 1; k < segmentParts.length; k++) {
            const partCandidate = segmentParts[k];
            if (/^\d{4}$/.test(partCandidate) || detailKeywords.includes(partCandidate.toLowerCase())) {
              baseSlugForCondition = segmentParts.slice(0, k).join('-');
              break;
            }
          }

          // Si no se encontró un punto de corte (ej. el segmento es solo "bundesliga"),
          // se asume que todo el segmento es el slug base.
          if (!baseSlugForCondition && segmentParts.length > 0) {
            baseSlugForCondition = extractedText;
          }

          if (baseSlugForCondition) {
            // --- INICIO DE CONDICIONALES (MODIFICAR SEGÚN NECESIDAD) ---
            // Usa 'baseSlugForCondition' para tus comparaciones
            if (baseSlugForCondition === "champions-league") {
              competicionValue = "Champions";
            } else if (baseSlugForCondition === "ita-supercoppa") { // Ejemplo basado en tu URL
              competicionValue = "Supercoppa Italiana"; // Asigna el valor que desees
            }
            // Agrega más 'else if' aquí para otros textos extraídos
            // else if (extractedText === "europa-league") {
            //   competicionValue = "Europa League";
            // }
            // --- FIN DE CONDICIONALES ---
          } else {
            console.warn(`[organizador.ts] No se pudo determinar el slug base de la competición desde el segmento '${extractedText}' en la URL: ${originalMatch.week}`);
          }
        }
        // Si el patrón "/schedule/(TEXTO)/AÑO" no se encuentra, competicionValue permanecerá null.
      } catch (e) {
        console.warn(`[organizador.ts] Error al parsear 'week' URL (${originalMatch.week}) para extraer Competicion:`, e);
      }
    }

    const processedMatch: OrganizedMatchInfo = {
      ...originalMatch,
      Competicion: competicionValue,
    };

    const teamName = processedMatch.Team; // Usar el nombre del equipo

    if (!teamName) {
      // Opcional: manejar partidos sin Team. Por ahora, los omitimos del agrupamiento principal.
      // Podrían ir a un grupo "desconocido" o ser añadidos al final sin ordenar por equipo.
      console.warn('[organizador.ts] Partido procesado sin nombre de equipo (Team), será omitido del agrupamiento por equipo:', processedMatch);
      continue;
    }

    if (!matchesByTeam.has(teamName)) {
      matchesByTeam.set(teamName, []);
      teamNameOrder.push(teamName); // Añadir el nombre del equipo al array de orden
    }
    matchesByTeam.get(teamName)!.push(processedMatch);
  }

  // 2. Ordenar partidos dentro de cada grupo de equipo y concatenar
  const finalOrganizedMatches: OrganizedMatchInfo[] = [];
  for (const currentTeamName of teamNameOrder) {
    const teamMatches = matchesByTeam.get(currentTeamName)!;

    const sortedTeamMatches = [...teamMatches].sort((a, b) => {
      const fechaA = a.fecha;
      const fechaB = b.fecha;

      // Manejar fechas nulas o indefinidas, colocándolas al final
      if (!fechaA && !fechaB) return 0;
      if (!fechaA) return 1; // fechaA es nula, va después
      if (!fechaB) return -1; // fechaB es nula, va después (a antes que b)

      try {
        const partsA = fechaA.split('/');
        const partsB = fechaB.split('/');

        // Validar formato DD/MM/YYYY
        if (partsA.length !== 3 && partsB.length !== 3) return 0; // Ambas inválidas, mantener orden
        if (partsA.length !== 3) return 1; // fechaA inválida, va después
        if (partsB.length !== 3) return -1; // fechaB inválida, va después

        // partsA[0] = Día, partsA[1] = Mes, partsA[2] = Año
        // Normalizar día y mes a dos dígitos para comparación lexicográfica correcta
        const dayA = partsA[0].padStart(2, '0');
        const monthA = partsA[1].padStart(2, '0');
        const yearA = partsA[2]; // Asumimos que el año ya tiene 4 dígitos (YYYY)

        const dayB = partsB[0].padStart(2, '0');
        const monthB = partsB[1].padStart(2, '0');
        const yearB = partsB[2];

        // Crear cadenas comparables en formato YYYYMMDD para orden cronológico
        const comparableA = `${yearA}${monthA}${dayA}`;
        const comparableB = `${yearB}${monthB}${dayB}`;

        return comparableA.localeCompare(comparableB);
      } catch (error) {
        console.warn(`[organizador.ts] Error al parsear fechas para ordenamiento (equipo: ${currentTeamName}): '${fechaA}', '${fechaB}'`, error);
        return 0; // No cambiar orden si hay error de parseo
      }
    });
    finalOrganizedMatches.push(...sortedTeamMatches);
  }
  
  console.log(`[organizador.ts] Datos agrupados por equipo y ordenados cronológicamente por fecha (Año/Mes/Día). Total: ${finalOrganizedMatches.length} partidos de ${teamNameOrder.length} equipos.`);
  return finalOrganizedMatches;
}

// Podrías añadir más funciones de organización aquí según necesites.
