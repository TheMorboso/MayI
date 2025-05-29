// c:\Users\Mauri\Desktop\CCC23\MayI\CCC23\api\scraper.ts
import * as cheerio from 'cheerio/slim'; // Cambiado para usar la versión slim

export interface ScrapedTeamInfo {
  originalUrl: string;
  teamEmblemSrc: string | null;
  firstNavLinkText: string | null;
  teamName?: string | null; // Nuevo campo para el nombre del equipo
  error?: string; // Optional field for any scraping errors
}

export interface MatchInfo {
  round: string | null;
  date: string | null;
  time: string | null;
  opponent: string | null;
  venue: 'H' | 'A' | 'N' | null; // Home, Away, Neutral
  result: string | null;
}

export interface TeamMatchesData {
  teamDetails: {
    originalUrl: string;
    name: string | null;
    emblemSrc: string | null;
  };
  season: string;
  matches: MatchInfo[];
  fixturesUrl?: string; // The URL from which these matches were scraped
  error?: string;
}



export async function scrapeWorldFootballTeamData(url: string): Promise<ScrapedTeamInfo> {
  try {
    // Asegurarse de que la URL tenga un protocolo si no lo tiene
    // Aunque mencionaste que el formato será consistente, esto es una buena práctica.
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `https://${url}`; // Asumir https si no se especifica
    }

    const response = await fetch(fullUrl, {
      // Algunos sitios pueden requerir un User-Agent para devolver contenido correctamente
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error(`Error al obtener la URL ${fullUrl}: ${response.status} ${response.statusText}`);
      return {
        originalUrl: url,
        teamEmblemSrc: null,
        firstNavLinkText: null,
        teamName: null,
        error: `Error al acceder a la URL: ${response.status}`,
      };
    }

    const htmlText = await response.text();
    const $ = cheerio.load(htmlText);

    // Selector para la imagen del emblema
    const emblemSelector = '#site > div.white > div.sidebar > div.box.emblemwrapper > div:nth-child(2) > div.emblem > a > img';
    const teamEmblemSrc = $(emblemSelector).attr('src') || null;

    // Selector para el texto del primer enlace de navegación
    const navLinkSelector = '#navi > div.subnavi > ul > li:nth-child(1) > a';
    const firstNavLinkText = $(navLinkSelector).text().trim() || null;

    // Selector para el nombre del equipo
    const teamNameSelector = '#site > div.white > div.sidebar > div.box.emblemwrapper > div.head > h2';
    const teamName = $(teamNameSelector).text().trim() || null;
    
    // Si la URL del emblema es relativa, convertirla a absoluta
    let absoluteEmblemSrc = teamEmblemSrc;
    if (teamEmblemSrc && !teamEmblemSrc.startsWith('http')) {
        const siteBaseUrl = new URL(fullUrl).origin;
        absoluteEmblemSrc = new URL(teamEmblemSrc, siteBaseUrl).href;
    }


    return {
      originalUrl: url,
      teamEmblemSrc: absoluteEmblemSrc,
      firstNavLinkText: firstNavLinkText,
      teamName: teamName,
    };

  } catch (error: any) {
    console.error(`Error durante el scraping de ${url}:`, error);
    return {
      originalUrl: url,
      teamEmblemSrc: null,
      firstNavLinkText: null,
      teamName: null,
      error: error.message || 'Error desconocido durante el scraping',
    };
  }
}

// Helper to normalize team names for comparison
function normalizeTeamName(name: string | null | undefined): string {
  if (!name) return '';
  // Lógica de normalización: minúsculas, quitar prefijos comunes, trim.
  return name
    .toLowerCase()
    .replace(/\b(fc|cf|cd|ac|sc|as|rc|fk|sk|tsg|vfb|vfl|borussia|eintracht|atlético|deportivo|real|unión|union|united|city|wanderers|albion|hotspur|athletic|club|sporting|racing)\b/gi, '')
    .replace(/[^\w\s]/gi, '') // Quitar caracteres especiales excepto espacios
    .replace(/\s+/g, ' ')
    .trim();
}

export async function scrapeWorldFootballTeamMatches(
  teamInfo: ScrapedTeamInfo,
  season: string
): Promise<TeamMatchesData> {
  const { originalUrl, teamName, teamEmblemSrc } = teamInfo;
  // Usar el teamName del ScrapedTeamInfo, que debería ser el nombre principal del equipo.
  const configuredSeason = season;
  const ownTeamPrimaryName = teamName; 

  let finalBaseTeamUrl: string;

  // Regex to extract the true base team URL (e.g., https://www.worldfootball.net/teams/real-madrid/)
  // from potentially longer URLs like .../real-madrid/2024/2/ or .../real-madrid/some-other-path/
  const teamBaseUrlPattern = /^(https?:\/\/www\.worldfootball\.net\/teams\/[^/]+\/?)/;
  const match = originalUrl.match(teamBaseUrlPattern);

  if (match && match[1]) {
    finalBaseTeamUrl = match[1];
    if (!finalBaseTeamUrl.endsWith('/')) {
      finalBaseTeamUrl += '/';
    }
  } else {
    // This case should ideally not happen if originalUrl is a valid team page from worldfootball.net
    console.warn(`Could not extract a clean base team URL from ${originalUrl}. Using it directly, which might lead to incorrect fixture URL construction.`);
    finalBaseTeamUrl = originalUrl.endsWith('/') ? originalUrl : `${originalUrl}/`;
  }

  let fixturesUrl: string;
  const pathAfterBase = originalUrl.substring(finalBaseTeamUrl.length); // Ej: "2025/3/" o "overview/" o ""

  // Intenta encontrar un patrón como "YYYY/ALGO_MAS" en la parte de la ruta después de la URL base del equipo.
  // El objetivo es reemplazar YYYY con configuredSeason y mantener /ALGO_MAS.
  const yearAndRestPattern = /^(\d{4})\/(.+)/; 
  const pathMatch = pathAfterBase.match(yearAndRestPattern);

  if (pathMatch && pathMatch[1] && pathMatch[2]) {
    // originalUrl tiene una estructura como /YYYY/NUMERO/ o /YYYY/OTRACOSA/ después de la base.
    // pathMatch[1] es el año original (ej. "2025")
    // pathMatch[2] es el resto de la ruta después del año original (ej. "3/" o "stats/")
    const restOfThePath = pathMatch[2];
    fixturesUrl = `${finalBaseTeamUrl}${configuredSeason}/${restOfThePath}`;
    console.log(`Original URL path "${pathAfterBase}" matched. Constructed fixtures URL: ${fixturesUrl}`);
  } else {
    // originalUrl no tiene el patrón /YYYY/ALGO_MAS/ después de la base,
    // o la parte después de la base está vacía.
    // Usamos el comportamiento por defecto de agregar configuredSeason/2/.
    fixturesUrl = `${finalBaseTeamUrl}${configuredSeason}/2/`;
    console.log(`Original URL path "${pathAfterBase}" did not match /YYYY/ALGO_MAS/ pattern or was empty. Defaulting fixtures URL to: ${fixturesUrl}`);
  }
  

  const resultPayload: TeamMatchesData = {
    teamDetails: { originalUrl, name: teamName, emblemSrc: teamEmblemSrc },
    season: configuredSeason, // Usar la temporada configurada aquí también
    matches: [],
    fixturesUrl,
  };

  try {
    console.log(`Scraping matches for ${teamName || originalUrl} season ${configuredSeason} from ${fixturesUrl}`);
    const response = await fetch(fixturesUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      resultPayload.error = `Error ${response.status} al acceder a ${fixturesUrl.substring(0, 50)}...`;
      console.error(`Error fetching fixtures from ${fixturesUrl}: ${response.status} ${response.statusText}`);
      return resultPayload;
    }

    const htmlText = await response.text();
    const $ = cheerio.load(htmlText);

    // Nuevo selector proporcionado por el usuario
    const matchTableSelector = '#site > div.white > div.content > div.portfolio > div.box > div > table';
    const matchTable = $(matchTableSelector).first(); // Tomamos el primer elemento que coincida

    // Verificar si la tabla fue encontrada con el nuevo selector
    if (!matchTable || matchTable.length === 0) {
      resultPayload.error = `Tabla de partidos no encontrada con el selector: ${matchTableSelector.substring(0,50)}...`;
      console.warn(`${resultPayload.error} en ${fixturesUrl}`);
      // Podrías intentar un fallback aquí si lo deseas, o simplemente retornar el error.
      // Por ahora, si el selector específico no funciona, retornamos.
      return resultPayload;
    }

    const headerCells = matchTable.find('thead tr th');
    const hasTimeColumn = headerCells.filter((i, el) => $(el).text().trim().toLowerCase() === 'time').length > 0;

    const colIdx = {
      round: 0,
      date: 1,
      time: hasTimeColumn ? 2 : -1,
      homeTeam: hasTimeColumn ? 3 : 2,
      awayTeam: hasTimeColumn ? 5 : 4,
      result: hasTimeColumn ? 6 : 5,
    };

    matchTable.find('tbody tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length < (hasTimeColumn ? 7 : 6)) return;

      const round = cells.eq(colIdx.round).text().trim() || null;
      const date = cells.eq(colIdx.date).text().trim() || null;
      const time = hasTimeColumn ? (cells.eq(colIdx.time).text().trim() || null) : null;
      const homeTeamRaw = cells.eq(colIdx.homeTeam).text().trim();
      const awayTeamRaw = cells.eq(colIdx.awayTeam).text().trim();
      const resultText = cells.eq(colIdx.result).text().trim() || null;

      let opponent: string | null = null;
      let venue: 'H' | 'A' | 'N' | null = null;

      // Comparar con el nombre principal del equipo obtenido de ScrapedTeamInfo
      const ownNameForComparison = ownTeamPrimaryName || ''; 

      if (ownNameForComparison) {
        // Intenta una coincidencia que sea lo suficientemente robusta
        // Compara si el nombre del equipo local/visitante CONTIENE el nombre principal del equipo.
        // Esto es más flexible que la igualdad exacta o la normalización estricta.
        if (homeTeamRaw.toLowerCase().includes(ownNameForComparison.toLowerCase())) {
          venue = 'H';
          opponent = awayTeamRaw;
        } else if (awayTeamRaw.toLowerCase().includes(ownNameForComparison.toLowerCase())) {
          venue = 'A';
          opponent = homeTeamRaw;
        } else {
          // Si no se encuentra, podría ser un partido en campo neutral o un problema de nombres.
           console.warn(`No se pudo determinar el rival/lugar para '${ownNameForComparison}' en: ${homeTeamRaw} vs ${awayTeamRaw} en ${fixturesUrl}`);
           opponent = `${homeTeamRaw} vs ${awayTeamRaw}`; // Mostrar ambos como fallback
           venue = 'N'; // Asumir neutral o desconocido
        }
      } else {
         console.warn(`Nombre del equipo propio no disponible para ${originalUrl}, no se puede determinar rival/lugar.`);
         opponent = `${homeTeamRaw} vs ${awayTeamRaw}`;
         venue = null;
      }

      if (round || date || opponent || resultText) {
        resultPayload.matches.push({ round, date, time, opponent, venue, result: resultText });
      }
    });
  } catch (error: any) {
    console.error(`Error al scrapear partidos para ${teamName} (${originalUrl}) temp ${configuredSeason}:`, error);
    resultPayload.error = error.message || 'Error desconocido durante scrapeo de partidos.';
  }
  return resultPayload;
}
