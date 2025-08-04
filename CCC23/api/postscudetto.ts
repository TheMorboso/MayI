// c/Users/Mauri/Desktop/CCC23/MayI/CCC23/api/postscudetto.ts
import { OrganizedMatchInfo } from './organizador';

export interface PostScudettoMatchInfo extends OrganizedMatchInfo {
  postScudettoProcessed?: boolean;
  puntos?: number; // Cumulative points for THIS team in THIS competition up to THIS match
  // Status describe la posición del equipo en la liga después de este partido, o un estado especial.
  Status?: 'Champion' | 'Can still win' | 'Post scudetto' | 'Not a league match' | 'Data insufficient' | 'Negativo' | 'Neutro' | 'Rojo' | 'Naranja' | 'Verde';

}

