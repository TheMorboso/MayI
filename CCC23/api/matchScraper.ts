// c/Users/Mauri/Desktop/CCC23/MayI/CCC23/api/matchScraper.ts
import * as cheerio from 'cheerio/slim';

export interface MatchDetails {
  week?: string | null;
  fecha?: string | null;
  hora?: string | null;
  lugar?: string | null;
  equipoContrario?: string | null;
  resultado?: string | null;
  error?: string | null;
  match?: string | null;
  Team?: string | null;
}

export async function scrapeMatchDetails(
  url: string, 
  teamName: string | null
): Promise<MatchDetails[]> {
  try {
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `https://${url}`;
    }

    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      return [{
        Team: teamName,
        error: `Error al acceder a la URL (${response.status}) para ${url}`,
      }];
    }

    const htmlText = await response.text();
    const $ = cheerio.load(htmlText);

    const allMatches: MatchDetails[] = [];

    const tableElement = $('#site > div.white > div.content > div.portfolio > div.box > div > table.standard_tabelle');
    
    if (tableElement.length === 0) {
      return [{ Team: teamName, error: `Tabla de partidos no encontrada en la página ${url}.` }];
    }

    tableElement.find('tr').each((index, rowElement) => {
      const row = $(rowElement);

      if (row.find('th').length > 0 || row.find('td[colspan]').length > 0) {
        return;
      }

      let week = row.find('td:nth-child(1) > a').attr('href')?.trim() || null;

      if (week && !week.startsWith('http')) {
        const baseSiteUrl = new URL(fullUrl).origin;
        week = new URL(week, baseSiteUrl).href;
      }
      const fecha = row.find('td:nth-child(2) > a').text().trim() || row.find('td:nth-child(2)').text().trim() || null;
      let hora = row.find('td:nth-child(3)').text().trim() || null;

      // Ajustar la hora restando 6 horas
      if (hora && hora.includes(':')) {
        const timeParts = hora.split(':');
        if (timeParts.length === 2) {
          let hours = parseInt(timeParts[0], 10);
          const minutes = parseInt(timeParts[1], 10);

          if (!isNaN(hours) && !isNaN(minutes)) {
            hours -= 6;
            if (hours < 0) {
              hours += 24; // Ajustar para el día anterior si es necesario
            }
            hora = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          }
        }
      }

      const lugar = row.find('td:nth-child(4)').text().trim() || null;
      const equipoContrario = row.find('td:nth-child(6) > a').text().trim() || null;
      
      const resultadoLinkElement = row.find('td:nth-child(7) > a');
      const resultado = resultadoLinkElement.text().trim() || null;
      let matchLink = resultadoLinkElement.attr('href') || null;

      if (matchLink && !matchLink.startsWith('http')) {
        const baseSiteUrl = new URL(fullUrl).origin;
        matchLink = new URL(matchLink, baseSiteUrl).href;
      }

      // Eliminar "/liveticker/" si está presente en matchLink
      if (matchLink && matchLink.includes('/liveticker/')) {
        matchLink = matchLink.replace('/liveticker/', '/');
      }

      if (fecha && (equipoContrario || resultado || week )) {
        allMatches.push({
          week,
          fecha,
          hora,
          lugar,
          equipoContrario,
          resultado,
          match: matchLink,
          Team: teamName,
        });
      }
    });

    return allMatches;

  } catch (error: any) {
    return [{
      Team: teamName,
      error: `Error en scraping para ${url}: ${error.message || 'Error desconocido'}`,
    }];
  }
}
