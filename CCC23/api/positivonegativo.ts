import { ScrapedTeamInfo } from './scraper';

export interface PositiveNegativeTeamInfo extends ScrapedTeamInfo {
  positiveNegativeStatus?: 'Positivo' | 'Negativo' | 'Neutral' | string; // Campo de ejemplo
  // Agrega aquí cualquier otro campo que este procesamiento pueda añadir
}

export function processPositiveNegative(
  teams: ScrapedTeamInfo[]
): PositiveNegativeTeamInfo[] {
  if (!teams || teams.length === 0) {
    return [];
  }

  return teams.map(team => {
    let status: 'Positivo' | 'Negativo' | 'Neutral' = 'Neutral';

    if (team.error) {
      status = 'Negativo';
    } else if (team.teamName && team.teamEmblemSrc) {
      // Consideramos 'Positivo' si no hay error y tenemos datos esenciales como nombre y emblema.
      status = 'Positivo';
    }
    // Si no hay error pero falta teamName o teamEmblemSrc, se queda como 'Neutral'.
    return {
      ...team,
      positiveNegativeStatus: status,
    };
  });
}