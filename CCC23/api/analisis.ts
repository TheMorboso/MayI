// c/Users/Mauri/Desktop/CCC23/MayI/CCC23/api/analisis.ts
import * as cheerio from 'cheerio/slim';
// import fs from 'fs'; // Descomenta si quieres guardar el HTML y tienes 'fs' disponible en tu entorno de ejecución

export interface PlayerInfo {
  number?: string | null;
  name?: string | null;
  // Aquí se podrían añadir más detalles en el futuro, como:
  // isSubstitute?: boolean;
  // substitutedInMinute?: string | null;
  // substitutedOutMinute?: string | null;
  // card?: 'yellow' | 'red' | null;
  // cardMinute?: string | null;
}
export interface MatchAnalysisDetails {
  title?: string | null; // Ejemplo: Scrapea el título de la página
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  homePlayers?: PlayerInfo[];
  awayPlayers?: PlayerInfo[];
  homeSubstitutes?: PlayerInfo[]; // Se mantiene la propiedad, pero siempre estará vacía
  awaySubstitutes?: PlayerInfo[]; // Se mantiene la propiedad, pero siempre estará vacía
  homeManager?: string | null;
  awayManager?: string | null;
  stadiumName?: string | null;
  error?: string | null;
  sourceUrl?: string | null;
}

export async function scrapeMatchAnalysis(url: string): Promise<MatchAnalysisDetails> {
  if (!url) {
    return { error: "URL no proporcionada para el análisis.", sourceUrl: url };
  }

  // Función helper para extraer jugadores de una tabla específica
  function scrapePlayersFromTable($: cheerio.CheerioAPI, tableElement: cheerio.Cheerio<cheerio.Element>): PlayerInfo[] {
    const players: PlayerInfo[] = [];
    if (!tableElement || tableElement.length === 0) {
      console.log('[scrapePlayersFromTable] La tabla de jugadores está vacía o no se proporcionó.');
      return players;
    }
    // console.log('[scrapePlayersFromTable] HTML de la tabla (primeros 300):', tableElement.html()?.substring(0, 300));

    tableElement.find('tr').each((idx, rowElement) => {
      const row = $(rowElement);
      const cells = row.find('td');

      // console.log(`[scrapePlayersFromTable] Fila ${idx}: TH count: ${row.find('th').length}, TD count: ${cells.length}`);
      if (row.find('th').length > 0 || cells.length < 2) {
        // console.log(`[scrapePlayersFromTable] Fila ${idx} omitida (cabecera o celdas insuficientes).`);
        return;
      }

      const playerNumber = $(cells[0]).text().trim() || null;
      const nameCell = $(cells[1]);
      let playerName = '';

      const nameLink = nameCell.find('a').first();
      if (nameLink.length > 0) {
        playerName = nameLink.text().trim();
      }

      if (!playerName) {
        const tempNameCell = nameCell.clone();
        tempNameCell.find('span, img, i, script, style, a').remove();
        playerName = tempNameCell.text().trim();
      }
      
      // console.log(`[scrapePlayersFromTable] Fila ${idx} procesada: Número='${playerNumber}', Nombre='${playerName}'`);
      if (playerNumber && playerName) {
        players.push({ number: playerNumber, name: playerName });
      } else {
        // console.log(`[scrapePlayersFromTable] Fila ${idx} omitida (sin número o nombre): Número='${playerNumber}', Nombre='${playerName}'`);
      }
    });
    console.log(`[scrapePlayersFromTable] Total de jugadores extraídos de esta tabla: ${players.length}`);
    return players;
  }

  try {
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `https://${url}`;
    }

    console.log('\n--- INICIO DEBUG scrapeMatchAnalysis ---');
    console.log('URL Analizada:', fullUrl);

    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      console.error(`Error al acceder a la URL: ${response.status}`);
      return {
        error: `Error al acceder a la URL del análisis del partido (${response.status}) para ${url}`,
        sourceUrl: url,
      };
    }

    const htmlText = await response.text();
    const $ = cheerio.load(htmlText);

    // --- Debugging: Guardar el HTML completo (opcional, puede ser muy grande) ---
    // try {
    //   fs.writeFileSync('debug_page.html', htmlText);
    //   console.log('HTML completo guardado en debug_page.html');
    // } catch (writeErr) {
    //   console.error('Error al guardar debug_page.html:', writeErr);
    // }
    // --------------------------------------------------------------------------

    const pageTitle = $('title').text().trim() || null;
    console.log('Título de la Página (desde <title>):', pageTitle);
    
    let homeTeamName: string | null = null;
    let awayTeamName: string | null = null;

    // Intentar extraer nombres de equipos del H1
    const h1Element = $('div.breadcrumb > h1').first(); // Selector ajustado al HTML proporcionado
    let h1Text = h1Element.text().trim();
    console.log('Texto H1 (selector: "div.breadcrumb > h1"):', h1Text || 'No encontrado');

    if (h1Text) {
        // Ejemplo H1: "Germany » Bundesliga 2024/2025 » 34. Round » SC Freiburg - Eintracht Frankfurt 1:3"
        // Extraer la última parte después de ' » ' que contiene los equipos y el resultado
        const h1Parts = h1Text.split(' » ');
        const matchTitlePartFromH1 = h1Parts.pop() || ""; // "SC Freiburg - Eintracht Frankfurt 1:3"
        
        // Quitar el marcador del final
        const teamsOnlyTextFromH1 = matchTitlePartFromH1.replace(/\s+\d+:\d+(\s*\(.+?\))?$/, '').trim(); // "SC Freiburg - Eintracht Frankfurt"
        console.log('Parte de equipos del H1 procesada:', teamsOnlyTextFromH1);

        if (teamsOnlyTextFromH1.includes(' - ')) {
            const parts = teamsOnlyTextFromH1.split(' - ');
            if (parts.length >= 2) {
                homeTeamName = parts[0].trim();
                awayTeamName = parts.slice(1).join(' - ').trim(); // Para nombres de equipo con '-'
            }
        }
    }

    // Fallback al título de la página si la extracción del H1 falla o no da ambos nombres
    if ((!homeTeamName || !awayTeamName) && pageTitle) {
        console.log('Fallback: Extrayendo nombres de equipos desde el <title>');
        // Ejemplo: "Germany - France 0:2 (Nations League A 2024/2025, Third place)"
        // Regex para capturar "TeamA - TeamB" antes de un posible marcador
        const teamNameMatch = pageTitle.match(/^(.*?) - (.*?)(?:\s+\d+:\d+|$|\s*\()/);
        if (teamNameMatch && teamNameMatch.length >= 3 && teamNameMatch[1] && teamNameMatch[2]) {
            homeTeamName = teamNameMatch[1].trim();
            awayTeamName = teamNameMatch[2].trim();
        } else {
            // Si la regex falla, un intento más simple si el título no tiene marcador pero sí " - "
            const parts = pageTitle.split(' - ');
            if (parts.length >= 2) {
                homeTeamName = parts[0].trim();
                // Para el equipo visitante, tomar la segunda parte pero quitar detalles de competición si están entre paréntesis
                awayTeamName = parts[1].split('(')[0].trim();
            } else {
                console.log('No se pudo deducir los nombres de los equipos del título con el formato esperado:', pageTitle);
            }
        }
    }
    console.log('Equipo Local (deducido):', homeTeamName || 'No deducido');
    console.log('Equipo Visitante (deducido):', awayTeamName || 'No deducido');

    let homePlayerTable: cheerio.Cheerio<cheerio.Element> = $();
    let awayPlayerTable: cheerio.Cheerio<cheerio.Element> = $();

    // Intento 1: Buscar la tabla principal que sigue al div del anuncio
    // Ser más específico: buscar la primera tabla SIGUIENTE a #wac_660x40_2
    // que contenga al menos una celda (td) que a su vez contenga una table.standard_tabelle.
    let mainLayoutTable = $('#wac_660x40_2').nextAll('table:has(td table.standard_tabelle)').first();
    console.log("Intento 1: Tabla después de '#wac_660x40_2' encontrada:", mainLayoutTable.length > 0);

    // Intento 2: Búsqueda general de la tabla de diseño si el Intento 1 falla
    if (!mainLayoutTable.length) {
        console.log("Intento 1 fallido. Intento 2: Búsqueda general de tabla de diseño.");
        // Busca una tabla dentro de div.content que tenga dos celdas <td> en su primera fila,
        // y cada celda contenga una table.standard_tabelle
        $('div.content table').each((_, tableEl) => {
            const $table = $(tableEl);
            // Asegurarse de que estamos buscando en el tbody implícito o explícito
            const firstRowCells = $table.children('tbody').children('tr').first().children('td');
            if (firstRowCells.length === 2 &&
                firstRowCells.eq(0).find('> table.standard_tabelle').length === 1 &&
                firstRowCells.eq(1).find('> table.standard_tabelle').length === 1) {
                mainLayoutTable = $table;
                console.log("Intento 2: Tabla de diseño general encontrada.");
                return false; // Romper el .each
            }
        });
    }

    if (mainLayoutTable.length) {
        // Descomenta la siguiente línea para ver el HTML de la tabla principal si es necesario
        // console.log("HTML de mainLayoutTable (primeros 500 chars):", mainLayoutTable.html()?.substring(0,500));

        // Intentar sin asumir tbody explícito primero
        const firstTr = mainLayoutTable.children('tr').first();
        console.log(`Intento 1: Primera <tr> directa en mainLayoutTable encontrada: ${firstTr.length > 0}`);
        let cells = firstTr.children('td');
        console.log(`Intento 1: Celdas (td) en primera <tr> directa: ${cells.length}`);

        if (cells.length === 0 && mainLayoutTable.children('tbody').length > 0) { // Si no se encuentran celdas y hay tbody, intentar con tbody
            console.log("Intento 1: No se encontraron celdas en <tr> directa, buscando en <tbody> > <tr>.");
            const firstTbody = mainLayoutTable.children('tbody').first();
            const firstTrInTbody = firstTbody.children('tr').first();
            console.log(`Intento 1: Primera <tr> en <tbody> encontrada: ${firstTrInTbody.length > 0}`);
            cells = firstTrInTbody.children('td');
            console.log(`Intento 1: Celdas (td) en primera <tr> de <tbody>: ${cells.length}`);
        }
        console.log(`FINAL: Celdas (td) encontradas para procesar: ${cells.length}`);

        if (cells.length >= 1) {
            // console.log("HTML de cells.eq(0) (primeros 300 chars):", cells.eq(0).html()?.substring(0,300)); // DEBUG
            homePlayerTable = cells.eq(0).find('table.standard_tabelle').first();
        }
        if (cells.length >= 2) {
            // console.log("HTML de cells.eq(1) (primeros 300 chars):", cells.eq(1).html()?.substring(0,300)); // DEBUG
            awayPlayerTable = cells.eq(1).find('table.standard_tabelle').first();
        }
    } else {
        // Intento 3: Como último recurso, buscar las dos primeras table.standard_tabelle
        // Esto es menos preciso y asume que son las tablas de jugadores.
        console.log("Intento 2 fallido. Intento 3: Buscar 'table.standard_tabelle' directamente.");
        const allStandardTables = $('table.standard_tabelle');
        if (allStandardTables.length >= 1) {
            homePlayerTable = allStandardTables.eq(0);
        }
        if (allStandardTables.length >= 2) {
            awayPlayerTable = allStandardTables.eq(1);
        }
    }

    console.log('Tabla de Jugadores Local (homePlayerTable) encontrada:', homePlayerTable.length > 0);
    console.log('Tabla de Jugadores Visitante (awayPlayerTable) encontrada:', awayPlayerTable.length > 0);

    let homePlayersList: PlayerInfo[] = [];
    let awayPlayersList: PlayerInfo[] = [];

    // Función helper para procesar una tabla de jugadores (home o away)
    const processPlayerTable = (playerTable: cheerio.Cheerio<cheerio.Element>, isHomeTeam: boolean) => {
        if (!playerTable.length) {
            console.log(`Tabla de jugadores para ${isHomeTeam ? 'local' : 'visitante'} no encontrada.`);
            return;
        }

        const allRowsInTable = playerTable.find('tr');
        let isParsingSubstitutes = false;
        const starterRows: cheerio.Element[] = [];    
    
        allRowsInTable.each((_, rowEl) => {
            const $row = $(rowEl);
            // Identificar la fila de encabezado "Substitutes"
            const ueberschriftCell = $row.find('td.ueberschrift[colspan="3"]');
            if (ueberschriftCell.length > 0 && ueberschriftCell.find('b').text().trim().toLowerCase() === 'substitutes') {
                isParsingSubstitutes = true;
                return; // Saltar esta fila de encabezado y las siguientes (para no procesar suplentes)
            }

            // Si ya estamos en la sección de suplentes (después del encabezado "Substitutes"), no procesar más filas.
            if (isParsingSubstitutes) {
                return;
            }

            // Saltar otras filas que no sean de jugadores (ej. cabeceras TH o filas con menos de 2 celdas TD)
            if ($row.find('th').length > 0 || $row.find('td').length < 2) {
                return;
            }
            // Solo se añaden a starterRows si no estamos en la sección de suplentes
            starterRows.push(rowEl);
        });

        // Helper para llamar a scrapePlayersFromTable con un conjunto de filas
        const getPlayersFromRows = (rows: cheerio.Element[]): PlayerInfo[] => {
            if (rows.length === 0) return [];
            const tableHtml = '<table><tbody>' + rows.map(r => $(r).prop('outerHTML')).join('') + '</tbody></table>';
            const $tempCheerio = cheerio.load(tableHtml);
            return scrapePlayersFromTable($, $tempCheerio('table').first());
        };

        if (isHomeTeam) {
            homePlayersList = getPlayersFromRows(starterRows);
            console.log('Jugadores Titulares Locales extraídos:', homePlayersList.length);
        } else {
            awayPlayersList = getPlayersFromRows(starterRows);
            console.log('Jugadores Titulares Visitantes extraídos:', awayPlayersList.length);
        }
    };

    // Procesar tabla del equipo local
    console.log('\n--- Procesando Bloque Izquierdo (Home) ---');
    processPlayerTable(homePlayerTable, true);

    // Procesar tabla del equipo visitante
    console.log('\n--- Procesando Bloque Derecho (Away) ---');
    processPlayerTable(awayPlayerTable, false);

    // Extracción de Entrenadores
    let homeManagerName: string | null = null;
    let awayManagerName: string | null = null;

    // Buscar la tabla de entrenadores. Esta tabla es la que sigue a la mainLayoutTable (que contiene las alineaciones)
    // y tiene una estructura específica.
    // El HTML proporcionado para los entrenadores es:
    // <table class="standard_tabelle" cellpadding="3" cellspacing="1">
    //   <tr>
    //     <td width="50%" valign="top"> <p> <b>Manager: <a ...>Nombre</a></b> </p> ... </td>
    //     <td width="50%" valign="top"> <p> <b>Manager: <a ...>Nombre</a></b> </p> ... </td>
    //   </tr>
    // </table>
    // Esta tabla suele estar después de un <br /> que sigue a la tabla de alineaciones.
    
    let coachTable: cheerio.Cheerio<cheerio.Element> | undefined;

    // Intento 1: Buscar la tabla de entrenadores como la siguiente `table.standard_tabelle`
    // después de `mainLayoutTable` (que es la tabla que contiene las dos `td` con las alineaciones).
    // Esta búsqueda es más robusta si la tabla de entrenadores está directamente después de un <br/>
    // que a su vez está después de la tabla de alineaciones.
    if (mainLayoutTable.length > 0) {
        // Buscamos un <br> que sea hermano de mainLayoutTable y luego la tabla siguiente a ese <br>
        const brAfterMainLayout = mainLayoutTable.next('br');
        if (brAfterMainLayout.length > 0) {
            coachTable = brAfterMainLayout.next('table.standard_tabelle:has(td p b:contains("Manager:"))');
        }
        // Fallback si no hay <br> o la estructura es diferente: buscar cualquier tabla siguiente con "Manager:"
        if (!coachTable || coachTable.length === 0) {
            coachTable = mainLayoutTable.nextAll('table.standard_tabelle:has(td p b:contains("Manager:"))').first();
        }
    }

    // Intento 2: Si mainLayoutTable no se encontró o el Intento 1 falló,
    // buscar globalmente una `table.standard_tabelle` que contenga "Manager:".
    // Esto es menos preciso.
    if (!coachTable || coachTable.length === 0) {
        console.log("Tabla de entrenadores no encontrada con el método primario, intentando búsqueda global.");
        coachTable = $('table.standard_tabelle:has(td p b:contains("Manager:"))').first();
    }
    
    console.log("Tabla de Entrenadores encontrada:", coachTable.length > 0);
    if (coachTable && coachTable.length > 0) {
        const coachCells = coachTable.find('tr').first().children('td');
        if (coachCells.length >= 1) {
            // El selector busca el texto "Manager:" dentro de un <b>, que está dentro de un <p>, y luego toma el texto del <a>
            homeManagerName = coachCells.eq(0).find('p > b:contains("Manager:")').parent().find('a').first().text().trim() || null;
        }
        if (coachCells.length >= 2) {
            awayManagerName = coachCells.eq(1).find('p > b:contains("Manager:")').parent().find('a').first().text().trim() || null;
        }
    }
    console.log('Entrenador Local:', homeManagerName || 'No encontrado');
    console.log('Entrenador Visitante:', awayManagerName || 'No encontrado');

    // Extracción del Nombre del Estadio
    let stadiumName: string | null = null;
    // Buscamos una tabla que contenga una imagen con title="stadium"
    // y luego tomamos el texto del enlace en la tercera celda de la primera fila.
    const stadiumTable = $('table.standard_tabelle:has(img[title="stadium"])').first();
    if (stadiumTable.length > 0) {
        stadiumName = stadiumTable.find('tr').first().find('td').eq(2).find('a').first().text().trim() || null;
    }
    console.log('Nombre del Estadio:', stadiumName || 'No encontrado');


    console.log('\n--- RESUMEN DE EXTRACCIÓN ---');
    console.log('Titulares Locales:', homePlayersList.length);
    console.log('Titulares Visitantes:', awayPlayersList.length);
    console.log('Entrenadores:', homeManagerName || 'N/A', '-', awayManagerName || 'N/A');
    console.log('Estadio:', stadiumName || 'N/A');
    console.log('--- FIN DEBUG scrapeMatchAnalysis ---\n');

    return {
      title: pageTitle,
      homeTeamName,
      awayTeamName,
      homePlayers: homePlayersList,
      awayPlayers: awayPlayersList,
      homeSubstitutes: [], 
      awaySubstitutes: [], 
      homeManager: homeManagerName,
      awayManager: awayManagerName,
      stadiumName: stadiumName,
      sourceUrl: url,
    };
  } catch (error: any) {
    console.error('\n--- ERROR CRÍTICO EN scrapeMatchAnalysis ---');
    console.error(error);
    console.error('--- FIN ERROR CRÍTICO ---\n');
    return {
      error: `Error en el scraping del análisis del partido para ${url}: ${error.message || 'Error desconocido'}`,
      sourceUrl: url,
    };
  }
}
