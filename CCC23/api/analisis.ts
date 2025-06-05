import * as cheerio from 'cheerio/slim';

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
  homeSubstitutes?: PlayerInfo[];
  awaySubstitutes?: PlayerInfo[];
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
      return players;
    }
    // console.log('Table element HTML (fragmento):', tableElement.html()?.substring(0, 300));

    tableElement.find('tr').each((_, rowElement) => {
      const row = $(rowElement);
      const cells = row.find('td');

      // Omitir filas de cabecera (th) o filas que no parecen ser de jugador (ej. sin suficientes celdas)
      // console.log(`Row HTML: ${row.html()?.substring(0,100)} | TH count: ${row.find('th').length} | TD count: ${cells.length}`);
      if (row.find('th').length > 0 || cells.length < 2) {
        return; 
      }

      const playerNumber = $(cells[0]).text().trim() || null;
      const nameCell = $(cells[1]);
      let playerName = '';

      // Intentar obtener el nombre del jugador desde la etiqueta <a>
      const nameLink = nameCell.find('a').first();
      if (nameLink.length > 0) {
        playerName = nameLink.text().trim();
      }

      // Si playerName sigue vacío (porque no había <a> o el <a> estaba vacío),
      // intentar obtener el texto de la celda completa, limpiando elementos comunes.
      if (!playerName) {
        const tempNameCell = nameCell.clone(); // Clonar para no afectar otros procesamientos
        tempNameCell.find('span, img, i, script, style, a').remove(); // Eliminar elementos no deseados, incluyendo <a> si falló antes
        playerName = tempNameCell.text().trim();
      }

      // console.log(`Row: Number='${playerNumber}', Name='${playerName}', NameCellHTML='${nameCell.html()?.substring(0,100)}'`);
      if (playerNumber && playerName) { // Solo añadir si tenemos número y nombre
        players.push({ number: playerNumber, name: playerName });
      }
    });
    return players;
  }

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
      return {
        error: `Error al acceder a la URL del análisis del partido (${response.status}) para ${url}`,
        sourceUrl: url,
      };
    }

    const htmlText = await response.text();
    const $ = cheerio.load(htmlText);

    const pageTitle = $('title').text().trim() || null;
    let homeTeamName: string | null = null;
    let awayTeamName: string | null = null;

    // Intentar extraer nombres de equipos del título de la página
    if (pageTitle) {
        const reportIndex = pageTitle.indexOf(" Report - ");
        if (reportIndex !== -1) {
            const teamsPart = pageTitle.substring(0, reportIndex);
            const teams = teamsPart.split(' - ');
            if (teams.length >= 2) { // Puede haber más de un '-' en un nombre de equipo
                homeTeamName = teams[0].trim();
                awayTeamName = teams.slice(1).join(' - ').trim(); // Unir el resto por si el nombre del visitante tiene '-'
            }
        }
    }

    // Selectores para los bloques de datos de cada equipo
    // Intentamos encontrar el div.row que específicamente contiene los bloques de datos de alineación.
    const lineupRow = $('div.content > div.row:has(> div.data[align="left"]):has(> div.data[align="right"])').first();

    let leftDataBlock: cheerio.Cheerio<cheerio.Element>;
    let rightDataBlock: cheerio.Cheerio<cheerio.Element>;

    if (lineupRow.length) {
      leftDataBlock = lineupRow.children('div.data[align="left"]').first();
      rightDataBlock = lineupRow.children('div.data[align="right"]').first();
    } else {
      // Si no se encuentra la fila específica, inicializar como selectores vacíos para que .length sea 0
      leftDataBlock = $(); 
      rightDataBlock = $();
    }

    let homePlayersList: PlayerInfo[] = [];
    let homeSubstitutesList: PlayerInfo[] = [];
    let awayPlayersList: PlayerInfo[] = [];
    let awaySubstitutesList: PlayerInfo[] = [];

    console.log('Left data block length:', leftDataBlock.length);
    // console.log('Left data block HTML (fragmento):', leftDataBlock.html()?.substring(0, 300));
    if (leftDataBlock.length) {
      const lineupTable = leftDataBlock.find('table.standard_tabelle').first();
      console.log('Home lineup table length:', lineupTable.length);
      // console.log('Home lineup table HTML:', lineupTable.html()?.substring(0, 300));
      homePlayersList = scrapePlayersFromTable($, lineupTable);
      leftDataBlock.find('h2').each((_, h2Elem) => {
        if ($(h2Elem).text().trim().toLowerCase() === 'substitutes') {
          const subsTable = $(h2Elem).next('table.standard_tabelle');
          console.log('Home substitutes table length:', subsTable.length);
          // console.log('Home substitutes table HTML:', subsTable.html()?.substring(0, 300));
          homeSubstitutesList = scrapePlayersFromTable($, subsTable);
        }
      });
    }

    console.log('Right data block length:', rightDataBlock.length);
    // console.log('Right data block HTML (fragmento):', rightDataBlock.html()?.substring(0, 300));
    if (rightDataBlock.length) {
      awayPlayersList = scrapePlayersFromTable($, rightDataBlock.find('table.standard_tabelle').first());
      rightDataBlock.find('h2').each((_, h2Elem) => {
        if ($(h2Elem).text().trim().toLowerCase() === 'substitutes') {
          const subsTable = $(h2Elem).next('table.standard_tabelle');
          console.log('Away substitutes table length:', subsTable.length);
          // console.log('Away substitutes table HTML:', subsTable.html()?.substring(0, 300));
          awaySubstitutesList = scrapePlayersFromTable($, subsTable);
        }
      });
    }

    return {
      title: pageTitle,
      homeTeamName,
      awayTeamName,
      homePlayers: homePlayersList,
      awayPlayers: awayPlayersList,
      homeSubstitutes: homeSubstitutesList,
      awaySubstitutes: awaySubstitutesList,
      sourceUrl: url,
    };
  } catch (error: any) {
    return {
      error: `Error en el scraping del análisis del partido para ${url}: ${error.message || 'Error desconocido'}`,
      sourceUrl: url,
    };
  }
}