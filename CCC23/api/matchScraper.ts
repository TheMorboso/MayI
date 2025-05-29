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
  sourceUrl?: string | null; // Para saber de qué URL se extrajo
}

export async function scrapeMatchDetails(url: string): Promise<MatchDetails> {
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
      return {
        sourceUrl: url,
        error: `Error al acceder a la URL (${response.status}): ${fullUrl}`,
      };
    }

    const htmlText = await response.text();
    const $ = cheerio.load(htmlText);

    // Para depuración: loguear una parte del HTML para verificar que es el esperado
    // Es MUY IMPORTANTE revisar este HTML. Puedes copiarlo y pegarlo en un archivo .html
    // y abrirlo en tu navegador para ver qué está obteniendo realmente tu script.
    console.log('[scrapeMatchDetails] HTML recibido (primeros 5000 caracteres):', htmlText.substring(0, 5000));
    if (htmlText.length < 1000) { // Si el HTML es muy corto, podría ser una página de error/bloqueo
        console.warn('[scrapeMatchDetails] El HTML recibido es muy corto, podría no ser la página esperada.');
    }


    // Verificación de selectores base
    const siteElement = $('#site');
    console.log(`[scrapeMatchDetails] Verificando selector base '#site'. Encontrado: ${siteElement.length > 0}`);
    if (siteElement.length === 0) {
        console.error("[scrapeMatchDetails] El elemento #site NO fue encontrado. El scraping probablemente fallará. Revisa el HTML de arriba.");
    }

    // Actualizado para usar la clase específica de la tabla de partidos
    const tableElement = $('#site > div.white > div.content > div.portfolio > div.box > div > table.standard_tabelle');
    console.log(`[scrapeMatchDetails] Verificando selector de tabla. Encontrado: ${tableElement.length > 0}`);
    if (tableElement.length > 0) {
        console.log(`[scrapeMatchDetails] HTML de la tabla encontrada (primeros 500 caracteres): ${tableElement.html()?.substring(0,500)}`);
        const tableRows = tableElement.find('tr'); // Buscamos todas las filas directas de la tabla
        console.log(`[scrapeMatchDetails] Número de filas (tr) encontradas en tbody: ${tableRows.length}`);
        if (tableRows.length < 3) { // Si queremos tr:nth-child(3), necesitamos al menos 3 filas
            console.warn(`[scrapeMatchDetails] Se encontraron ${tableRows.length} filas, pero se esperaba al menos 3 para acceder al primer partido. La estructura podría ser diferente o no hay suficientes datos.`);
        } else if (tableRows.length === 0) {
            console.warn(`[scrapeMatchDetails] No se encontraron filas (tr) en el tbody de la tabla.`);
        }
    } else {
        console.error("[scrapeMatchDetails] La tabla principal NO fue encontrada. Revisa el HTML y los selectores.");
    }

    // Selectores actualizados para worldfootball.net y el primer partido (ahora tr:nth-child(3) sin tbody)
    // La tabla de partidos principal tiene la clase .standard_tabelle
    const selectors = {
      week: '#site > div.white > div.content > div.portfolio > div.box > div > table.standard_tabelle > tr:nth-child(3) > td:nth-child(1)',
      fecha: '#site > div.white > div.content > div.portfolio > div.box > div > table.standard_tabelle > tr:nth-child(3) > td:nth-child(2) > a',
      hora: '#site > div.white > div.content > div.portfolio > div.box > div > table.standard_tabelle > tr:nth-child(3) > td:nth-child(3)',
      lugar: '#site > div.white > div.content > div.portfolio > div.box > div > table.standard_tabelle > tr:nth-child(3) > td:nth-child(4)', // H/A
      equipoContrario: '#site > div.white > div.content > div.portfolio > div.box > div > table.standard_tabelle > tr:nth-child(3) > td:nth-child(6) > a',
      resultado: '#site > div.white > div.content > div.portfolio > div.box > div > table.standard_tabelle > tr:nth-child(3) > td:nth-child(7) > a',
    };

    const extractedData: MatchDetails = { sourceUrl: url };

    for (const key in selectors) {
      const selector = selectors[key as keyof typeof selectors];
      const element = $(selector);
      if (element.length > 0) {
        const textValue = element.text().trim();
        extractedData[key as keyof MatchDetails] = textValue || null;
        console.log(`[scrapeMatchDetails] Selector '${key}': Encontrado. Texto: '${textValue}'. HTML: ${element.html()}`);
      } else {
        extractedData[key as keyof MatchDetails] = null;
        console.warn(`[scrapeMatchDetails] Selector '${key}': NO encontrado. Selector: ${selector}`);
        // Intentar loguear el padre más cercano para ayudar a depurar
        const parts = selector.split(' > ');
        if (parts.length > 1) {
          const parentSelector = parts.slice(0, -1).join(' > ');
          const parentElement = $(parentSelector);
          if (parentElement.length > 0) {
            console.warn(`[scrapeMatchDetails] Selector '${key}': HTML del padre ('${parentSelector}') encontrado: ${parentElement.html()?.substring(0, 300)}...`);
          } else {
            console.warn(`[scrapeMatchDetails] Selector '${key}': Padre ('${parentSelector}') TAMPOCO encontrado.`);
          }
        }
      }
    }
    
    console.log('[scrapeMatchDetails] Datos extraídos:', extractedData);
    return extractedData;

  } catch (error: any) {
    console.error(`[scrapeMatchDetails] Error durante el scraping de detalles del partido desde ${url}:`, error);
    return {
      sourceUrl: url,
      error: error.message || 'Error desconocido durante el scraping de detalles del partido',
    };
  }
}
