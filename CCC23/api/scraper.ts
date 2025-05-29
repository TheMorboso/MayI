// c:\Users\Mauri\Desktop\CCC23\MayI\CCC23\api\scraper.ts
import * as cheerio from 'cheerio/slim'; // Cambiado para usar la versión slim

export interface ScrapedTeamInfo {
  originalUrl: string;
  teamEmblemSrc: string | null;
  firstNavLinkText: string | null;
  teamName?: string | null; // Nuevo campo para el nombre del equipo
  error?: string; // Optional field for any scraping errors
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
