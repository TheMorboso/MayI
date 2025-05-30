// c:\Users\Mauri\Desktop\CCC23\MayI\CCC23\api\matchScraper.ts
import * as cheerio from 'cheerio/slim';

export interface MatchDetails {
  week?: string | null; // Nuevo campo para la jornada/semana
  fecha?: string | null;
  hora?: string | null;
  lugar?: string | null;
  equipoContrario?: string | null;
  resultado?: string | null;
  error?: string | null;
  match?: string | null; // Nuevo atributo para el enlace del partido
}

export async function scrapeMatchDetails(url: string): Promise<MatchDetails[]> {
  console.log(`[scrapeMatchDetails] Iniciando scraping para URL: ${url}`);
  try {
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `https://${url}`;
    }
    console.log(`[scrapeMatchDetails] URL completa a fetchear: ${fullUrl}`);

    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      console.error(`[scrapeMatchDetails] Error al acceder a la URL (${response.status}): ${fullUrl}`);
      return [{
        error: `Error al acceder a la URL (${response.status}) para ${url}`,
      }];
    }

    const htmlText = await response.text();
    const $ = cheerio.load(htmlText);

    // Para depuración: loguear una parte del HTML para verificar que es el esperado
    // Es MUY IMPORTANTE revisar este HTML. Puedes copiarlo y pegarlo en un archivo .html
    // y abrirlo en tu navegador para ver qué está obteniendo realmente tu script.
    // console.log('[scrapeMatchDetails] HTML recibido (primeros 5000 caracteres):', htmlText.substring(0, 5000)); // Descomentar si es necesario
    if (htmlText.length < 1000) { // Si el HTML es muy corto, podría ser una página de error/bloqueo
        console.warn('[scrapeMatchDetails] El HTML recibido es muy corto, podría no ser la página esperada.');
    }

    const allMatches: MatchDetails[] = [];

    // Actualizado para usar la clase específica de la tabla de partidos
    const tableElement = $('#site > div.white > div.content > div.portfolio > div.box > div > table.standard_tabelle');
    
    if (tableElement.length === 0) {
      console.warn('[scrapeMatchDetails] Tabla de partidos no encontrada.');
      return [{ error: `Tabla de partidos no encontrada en la página ${url}.` }];
    }

    tableElement.find('tr').each((index, rowElement) => {
      const row = $(rowElement);

      // Omitir filas de encabezado (que contienen <th>) o filas de título de competición (<td> con colspan)
      if (row.find('th').length > 0 || row.find('td[colspan]').length > 0) {
        return; // Saltar esta fila
      }

      // Extracción de datos para cada celda de la fila actual
      // const week = row.find('td:nth-child(1)').text().trim() || null; // Original: obtenía el texto
      let week = row.find('td:nth-child(1) > a').attr('href')?.trim() || null; // Nuevo: obtener el href del enlace

      // Convertir link de 'week' a absoluto si es necesario
      if (week && !week.startsWith('http')) {
        const baseSiteUrl = new URL(fullUrl).origin;
        week = new URL(week, baseSiteUrl).href;
      }
      // Para 'fecha', intentar obtener de 'a' y luego directamente de 'td'
      const fecha = row.find('td:nth-child(2) > a').text().trim() || row.find('td:nth-child(2)').text().trim() || null;
      const hora = row.find('td:nth-child(3)').text().trim() || null;
      const lugar = row.find('td:nth-child(4)').text().trim() || null; // H/A
      const equipoContrario = row.find('td:nth-child(6) > a').text().trim() || null;
      
      const resultadoLinkElement = row.find('td:nth-child(7) > a');
      const resultado = resultadoLinkElement.text().trim() || null;
      let matchLink = resultadoLinkElement.attr('href') || null;

      // Convertir link relativo a absoluto si es necesario
      if (matchLink && !matchLink.startsWith('http')) {
        const baseSiteUrl = new URL(fullUrl).origin; // Obtener la base de la URL original (ej: https://www.worldfootball.net)
        matchLink = new URL(matchLink, baseSiteUrl).href;
      }

      // Considerar una fila como un partido válido si tiene al menos fecha y equipo contrario o resultado
      if (fecha && (equipoContrario || resultado || week )) { // week también puede indicar un partido válido (ej. "Final")
        allMatches.push({
          week,
          fecha,
          hora,
          lugar,
          equipoContrario,
          resultado,
          match: matchLink, // Guardar el enlace del partido
        });
      }
    });

    if (allMatches.length === 0 && tableElement.find('tr').length > 2) { // Si hay filas pero no se extrajeron partidos
        console.warn('[scrapeMatchDetails] Tabla encontrada con filas, pero no se extrajeron partidos válidos. Verifique la estructura.');
        // Podrías devolver un mensaje específico aquí si lo deseas, ej:
        // return [{ error: `No se encontraron partidos válidos en la tabla de ${url}.` }];
    }

    console.log(`[scrapeMatchDetails] Se extrajeron datos para ${allMatches.length} partidos desde ${url}`);
    return allMatches;

  } catch (error: any) {
    console.error(`[scrapeMatchDetails] Error durante el scraping de detalles del partido desde ${url}:`, error);
    return [{
      error: `Error en scraping para ${url}: ${error.message || 'Error desconocido'}`,
    }];
  }
}
