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

  // Lógica de ejemplo:
  // Reemplaza esto con tu lógica real.
  return teams.map(team => ({
    ...team,
    positiveNegativeStatus: Math.random() > 0.5 ? 'Positivo' : 'Negativo', // Estado de ejemplo
  }));
}