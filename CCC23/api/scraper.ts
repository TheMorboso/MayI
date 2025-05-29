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
  const ownTeamPrimaryName = teamName; 

  const baseTeamUrl = originalUrl.endsWith('/') ? originalUrl : `${originalUrl}/`;
  const fixturesUrl = `${baseTeamUrl}${season}/2/`; // Standard path for fixtures

  const resultPayload: TeamMatchesData = {
    teamDetails: { originalUrl, name: teamName, emblemSrc: teamEmblemSrc },
    season,
    matches: [],
    fixturesUrl,
  };

  try {
    console.log(`Scraping matches for ${teamName || originalUrl} season ${season} from ${fixturesUrl}`);
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

    const tables = $('table.standard_tabelle');
    let matchTable = null;
    tables.each((i, table) => {
      const ths = $(table).find('thead tr th');
      if (ths.length >= 5) {
        const headerTexts = ths.map((j, th) => $(th).text().trim().toLowerCase()).get();
        if (headerTexts.includes('home') && headerTexts.includes('away') && headerTexts.includes('result')) {
          matchTable = $(table);
          return false; 
        }
      }
    });

    if (!matchTable) {
      if (tables.length > 0 && tables.first().find('tbody tr td').length > 0) {
        console.warn(`No se identificó tabla de partidos por cabeceras para ${fixturesUrl}. Usando la primera 'table.standard_tabelle' con datos.`);
        matchTable = tables.first();
      } else {
        resultPayload.error = "Tabla de partidos no encontrada o vacía.";
        console.warn(`${resultPayload.error} en ${fixturesUrl}`);
        return resultPayload;
      }
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
    console.error(`Error al scrapear partidos para ${teamName} (${originalUrl}) temp ${season}:`, error);
    resultPayload.error = error.message || 'Error desconocido durante scrapeo de partidos.';
  }
  return resultPayload;
}
