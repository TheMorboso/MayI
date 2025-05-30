// c:\Users\Mauri\Desktop\CCC23\MayI\CCC23\api\organizador.ts
import { MatchDetails } from './matchScraper'; // Asumiendo que MatchDetails está en matchScraper.ts

export interface OrganizedMatchInfo extends MatchDetails {
  // Puedes añadir campos específicos para la data organizada si es necesario
  // Por ejemplo:
  // isProcessed?: boolean;
  // customNote?: string;
}

/**
 * Procesa y organiza la lista de partidos.
 * Como ejemplo inicial, esta función filtrará los partidos que no tengan errores
 * y añadirá una nota simple.
 * 
 * @param matches La lista de detalles de partidos originales.
 * @returns Una nueva lista de partidos procesados.
 */
export function organizeMatchData(matches: MatchDetails[]): OrganizedMatchInfo[] {
  console.log('[organizador.ts] Iniciando organización de datos...');
  if (!matches || matches.length === 0) {
    console.log('[organizador.ts] No hay partidos para organizar.');
    return [];
  }

  const organizedData = matches
    .filter(match => !match.error) // Ejemplo: quitar partidos con error
    .map(match => ({
      ...match,
      // Ejemplo de transformación: añadir una nota o un campo
      // isProcessed: true, 
      resultado: match.resultado ? `✨ ${match.resultado} ✨` : null, // Ejemplo: decorar el resultado
    }));
  
  console.log(`[organizador.ts] Datos organizados. Original: ${matches.length} partidos, Organizados: ${organizedData.length} partidos.`);
  return organizedData;
}

// Podrías añadir más funciones de organización aquí según necesites.
