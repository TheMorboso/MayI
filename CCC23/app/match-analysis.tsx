// c/Users/Mauri/Desktop/CCC23/MayI/CCC23/app/match-analysis.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, ScrollView, Alert, View, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { scrapeMatchAnalysis, MatchAnalysisDetails, PlayerInfo } from '@/api/analisis';
import { TeamTierType } from '@/api/scraper'; // Importar TeamTierType

// --- DEFINICIONES Y CONSTANTES ---
interface FormationSlot {
  id: string;
  label: string;
  line: 'GK' | 'DEF' | 'MID' | 'FWD';
  topRatio: number;
  leftRatio: number;
}

type FormationLayout = FormationSlot[];

const FORMATIONS_ARRAY = ["4-2-3-1", "4-4-2", "4-3-3", "3-4-2-1", "3-5-2", "4-3-1-2"] as const;
type FormationType = typeof FORMATIONS_ARRAY[number];

// Definiciones de posiciones (copiadas de team-matches/[teamId].tsx para consistencia)
const ACTUAL_PLAYER_POSITIONS = [ // CAD, CAI, MCD eliminadas
  "POR", "DFC", "LD", "LI", "MC", "MCO", "MD", "MI", "ED", "EI", "DC", "SD", "PIV"
] as const;
type ActualPlayerPositionType = typeof ACTUAL_PLAYER_POSITIONS[number];

const FORMATION_DEFINITIONS: Record<FormationType, FormationLayout> = {
  "4-4-2": [
    { id: 'gk', label: 'POR', line: 'GK', topRatio: 0.92, leftRatio: 0.5 },
    { id: 'rb', label: 'LD', line: 'DEF', topRatio: 0.75, leftRatio: 0.88 },
    { id: 'rcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.63 },
    { id: 'lcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.37 },
    { id: 'lb', label: 'LI', line: 'DEF', topRatio: 0.75, leftRatio: 0.12 },
    { id: 'rm', label: 'MD', line: 'MID', topRatio: 0.5, leftRatio: 0.88 },
    { id: 'rcm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.63 },
    { id: 'lcm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.37 },
    { id: 'lm', label: 'MI', line: 'MID', topRatio: 0.5, leftRatio: 0.12 },
    { id: 'rs', label: 'DC', line: 'FWD', topRatio: 0.22, leftRatio: 0.6 },
    { id: 'ls', label: 'DC', line: 'FWD', topRatio: 0.22, leftRatio: 0.4 },
  ],
  "4-2-3-1": [
    { id: 'gk', label: 'POR', line: 'GK', topRatio: 0.92, leftRatio: 0.5 },
    { id: 'rb', label: 'LD', line: 'DEF', topRatio: 0.75, leftRatio: 0.88 },
    { id: 'rcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.63 },
    { id: 'lcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.37 },
    { id: 'lb', label: 'LI', line: 'DEF', topRatio: 0.75, leftRatio: 0.12 },
    { id: 'rdm', label: 'MC', line: 'MID', topRatio: 0.58, leftRatio: 0.63 }, // MCD -> MC
    { id: 'ldm', label: 'MC', line: 'MID', topRatio: 0.58, leftRatio: 0.37 }, // MCD -> MC
    { id: 'ram', label: 'ED', line: 'MID', topRatio: 0.38, leftRatio: 0.85 }, // MPD -> ED
    { id: 'cam', label: 'MCO', line: 'MID', topRatio: 0.38, leftRatio: 0.5 },
    { id: 'lam', label: 'EI', line: 'MID', topRatio: 0.38, leftRatio: 0.15 }, // MPI -> EI
    { id: 'st', label: 'DC', line: 'FWD', topRatio: 0.15, leftRatio: 0.5 },
  ],
  "4-3-3": [
    { id: 'gk', label: 'POR', line: 'GK', topRatio: 0.92, leftRatio: 0.5 },
    { id: 'rb', label: 'LD', line: 'DEF', topRatio: 0.75, leftRatio: 0.88 },
    { id: 'rcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.63 },
    { id: 'lcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.37 },
    { id: 'lb', label: 'LI', line: 'DEF', topRatio: 0.75, leftRatio: 0.12 },
    { id: 'rcm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.78 },
    { id: 'cm', label: 'PIV', line: 'MID', topRatio: 0.5, leftRatio: 0.5 },
    { id: 'lcm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.22 },
    { id: 'rw', label: 'ED', line: 'FWD', topRatio: 0.22, leftRatio: 0.88 },
    { id: 'st', label: 'DC', line: 'FWD', topRatio: 0.22, leftRatio: 0.5 },
    { id: 'lw', label: 'EI', line: 'FWD', topRatio: 0.22, leftRatio: 0.12 },
  ],
  "3-4-2-1": [
    { id: 'gk', label: 'POR', line: 'GK', topRatio: 0.92, leftRatio: 0.5 },
    { id: 'rcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.75 },
    { id: 'cb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.5 },
    { id: 'lcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.25 },
    { id: 'rm', label: 'LD', line: 'MID', topRatio: 0.5, leftRatio: 0.88 },
    { id: 'rcm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.63 },
    { id: 'lcm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.37 },
    { id: 'lm', label: 'LI', line: 'MID', topRatio: 0.5, leftRatio: 0.12 },
    { id: 'ram', label: 'MCO', line: 'FWD', topRatio: 0.28, leftRatio: 0.65 },
    { id: 'lam', label: 'MCO', line: 'FWD', topRatio: 0.28, leftRatio: 0.35 },
    { id: 'st', label: 'DC', line: 'FWD', topRatio: 0.15, leftRatio: 0.5 },
  ],
  "3-5-2": [
    { id: 'gk', label: 'POR', line: 'GK', topRatio: 0.92, leftRatio: 0.5 },
    { id: 'rcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.75 },
    { id: 'cb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.5 },
    { id: 'lcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.25 },
    { id: 'rwb', label: 'LD', line: 'MID', topRatio: 0.55, leftRatio: 0.9 }, // CAD -> LD
    { id: 'rcm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.65 },
    { id: 'cm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.5 },
    { id: 'lcm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.35 },
    { id: 'lwb', label: 'LI', line: 'MID', topRatio: 0.55, leftRatio: 0.1 }, // CAI -> LI
    { id: 'rs', label: 'DC', line: 'FWD', topRatio: 0.22, leftRatio: 0.6 },
    { id: 'ls', label: 'DC', line: 'FWD', topRatio: 0.22, leftRatio: 0.4 },
  ],
  "4-3-1-2": [
    { id: 'gk', label: 'POR', line: 'GK', topRatio: 0.92, leftRatio: 0.5 },
    { id: 'rb', label: 'LD', line: 'DEF', topRatio: 0.75, leftRatio: 0.88 },
    { id: 'rcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.63 },
    { id: 'lcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.37 },
    { id: 'lb', label: 'LI', line: 'DEF', topRatio: 0.75, leftRatio: 0.12 },
    { id: 'rcm', label: 'MC', line: 'MID', topRatio: 0.55, leftRatio: 0.78 },
    { id: 'cm', label: 'MC', line: 'MID', topRatio: 0.55, leftRatio: 0.5 },
    { id: 'lcm', label: 'MC', line: 'MID', topRatio: 0.55, leftRatio: 0.22 },
    { id: 'cam', label: 'MCO', line: 'MID', topRatio: 0.35, leftRatio: 0.5 },
    { id: 'rs', label: 'DC', line: 'FWD', topRatio: 0.18, leftRatio: 0.6 },
    { id: 'ls', label: 'DC', line: 'FWD', topRatio: 0.18, leftRatio: 0.4 },
  ],
};

// --- FIN DEFINICIONES ---

// Interfaces para enriquecer los datos del jugador con posiciones
interface EnrichedPlayerInfo extends PlayerInfo {
    assignedPositions?: ActualPlayerPositionType[];
}

interface EnrichedMatchAnalysisDetails extends Omit<MatchAnalysisDetails, 'homePlayers' | 'awayPlayers' | 'homeSubstitutes' | 'awaySubstitutes'> {
    homePlayers?: EnrichedPlayerInfo[];
    awayPlayers?: EnrichedPlayerInfo[];
    homeSubstitutes?: EnrichedPlayerInfo[]; // Aunque no se usen activamente, mantener por consistencia de tipo base
    awaySubstitutes?: EnrichedPlayerInfo[];
}

interface LoadTacticalLineupResult {
  formation: FormationType | null;
  players: Record<string, EnrichedPlayerInfo | null> | null;
  loaded: boolean;
}


export default function MatchAnalysisScreen() {
  const PLAYERS_CACHE_KEY = 'playersGlobalCache';
  const TACTICAL_LINEUPS_CACHE_KEY = 'tacticalLineupsCache';


  const normalizeString = (str: string | null | undefined): string => {
    return (str || '').toLowerCase().trim().replace(/\s+/g, '_');
  };

  const isTierSOrSRed = (tier: TeamTierType | null | undefined): boolean => {
    return tier === "TierS" || tier === "TierSred";
  };

  // Estructura esperada de la entrada en PLAYERS_CACHE_KEY al leerla
  interface PlayerCacheEntryForReading {
    name: string | null;
    isManager?: boolean;
    equipo?: string | null;
    tacticalScheme?: string | null; // Podría ser CoachTacticalSchemeType si se importa
    positions?: ActualPlayerPositionType[] | null;
  }

  const updatePlayersCache = async (
    newPlayers: PlayerInfo[],
    teamName: string | null | undefined, // Nombre del equipo para asociar
    teamTier: TeamTierType | null | undefined,
    teamManagerName: string | null | undefined
  ) => {
    if (!isTierSOrSRed(teamTier)) {
      return;
    }
    if (!teamName) { // No hacer nada si no hay nombre de equipo
        console.log("[CacheGlobal] No se proporcionó teamName, no se actualizará el caché para estos jugadores/entrenador.");
        return;
    }

    try {
      const existingCacheJson = await AsyncStorage.getItem(PLAYERS_CACHE_KEY);
      const cache: Record<string, PlayerCacheEntryForReading> = existingCacheJson
        ? JSON.parse(existingCacheJson)
        : {};
      let cacheWasUpdated = false;

      if (newPlayers && newPlayers.length > 0) {
        for (const player of newPlayers) {
          if (!player.name) continue;
          const playerId = normalizeString(player.name);
          if (!cache[playerId]) { 
            cache[playerId] = { name: player.name, equipo: teamName };
            cacheWasUpdated = true;
            console.log(`[CacheGlobal] Jugador Agregado: ${playerId} (Equipo: ${teamName})`);
          } else if (cache[playerId].equipo !== teamName) {
            cache[playerId].equipo = teamName; // Actualizar equipo si es diferente
            cacheWasUpdated = true;
            console.log(`[CacheGlobal] Jugador Actualizado: ${playerId} (Nuevo Equipo: ${teamName})`);
          }
        }
      }

      if (teamManagerName) {
        const managerId = normalizeString(teamManagerName);
        if (!cache[managerId]) {
          cache[managerId] = { name: teamManagerName, isManager: true, equipo: teamName, tacticalScheme: null }; // Inicializar tacticalScheme
          cacheWasUpdated = true;
          console.log(`[CacheGlobal] Entrenador Agregado: ${managerId} (Equipo: ${teamName})`);
        } else if (cache[managerId].equipo !== teamName) {
          cache[managerId].equipo = teamName; // Actualizar equipo si es diferente
          cacheWasUpdated = true;
          console.log(`[CacheGlobal] Entrenador Actualizado: ${managerId} (Nuevo Equipo: ${teamName})`);
        }
      }

      if (cacheWasUpdated) {
        await AsyncStorage.setItem(PLAYERS_CACHE_KEY, JSON.stringify(cache));
        console.log('[CacheGlobal] Caché global (jugadores/entrenadores) actualizado en AsyncStorage.');
      }
    } catch (error) {
      console.error('Error al actualizar el caché de jugadores/entrenadores:', error);
    }
  };

  const saveTacticalLineup = async (matchId: string, formation: FormationType, lineup: Record<string, PlayerInfo | null>) => {
    if (!matchId || !formation || !lineup || Object.keys(lineup).length === 0) return;

    const hasPlacedPlayers = Object.values(lineup).some(p => p !== null);
    if (!hasPlacedPlayers) {
        console.log(`[TacticalSave] No se guardó para ${matchId} porque no hay jugadores colocados en el tablero.`);
        return;
    }

    try {
      const existingLineupsJson = await AsyncStorage.getItem(TACTICAL_LINEUPS_CACHE_KEY);
      const lineupsCache: Record<string, { formation: FormationType; placedPlayers: Record<string, PlayerInfo | null> }> = existingLineupsJson
        ? JSON.parse(existingLineupsJson)
        : {};

      lineupsCache[matchId] = { formation, placedPlayers: lineup };
      await AsyncStorage.setItem(TACTICAL_LINEUPS_CACHE_KEY, JSON.stringify(lineupsCache));
      console.log(`[TacticalSave] Alineación guardada para ${matchId} con formación ${formation}.`);
    } catch (error) {
      console.error('Error al guardar la alineación táctica:', error);
    }
  };

  const loadTacticalLineup = async (matchId: string, teamFocus: 'home' | 'away'): Promise<LoadTacticalLineupResult> => {
    if (!matchId) return { formation: null, players: null, loaded: false };
    
    const homeIsS = isTierSOrSRed(homeTeamActualTier);
    const awayIsS = isTierSOrSRed(awayTeamActualTier);
    let loadKey = matchId;

    if (homeIsS && awayIsS) {
        loadKey = teamFocus === 'home' ? matchId + "_home" : matchId + "_away";
    }

    try {
      const existingLineupsJson = await AsyncStorage.getItem(TACTICAL_LINEUPS_CACHE_KEY);
      if (existingLineupsJson) {
        const lineupsCache: Record<string, { formation: FormationType; placedPlayers: Record<string, EnrichedPlayerInfo | null> }> = JSON.parse(existingLineupsJson);
        
        let lineupToLoad = lineupsCache[loadKey]; 
        if (!lineupToLoad && (homeIsS && awayIsS)) { 
            lineupToLoad = lineupsCache[matchId];
        }

        if (lineupToLoad) {
          const { formation, placedPlayers: loadedPlacedPlayers } = lineupToLoad;
          setSelectedFormation(formation); 
          setPlacedPlayers(loadedPlacedPlayers); 
          console.log(`[TacticalLoad] Alineación cargada para ${loadKey}: Formación ${formation}`);
          return { formation, players: loadedPlacedPlayers, loaded: true };
        }
      }
      return { formation: null, players: null, loaded: false };
    } catch (error) {
      console.error('Error al cargar la alineación táctica:', error);
      return { formation: null, players: null, loaded: false };
    }
  };


  const params = useLocalSearchParams<{
    matchUrl: string;
    matchIdentifier?: string;
    teamAName?: string;
    teamATier?: string;
    teamBName?: string;
    teamBTier?: string;
    isEditing?: string; // Nuevo parámetro para controlar la redirección
  }>();
  const router = useRouter();
  const matchUrl = params.matchUrl ? decodeURIComponent(params.matchUrl) : undefined;
  const matchIdentifier = params.matchIdentifier ? decodeURIComponent(params.matchIdentifier) : 'Partido';

  const [analysisData, setAnalysisData] = useState<EnrichedMatchAnalysisDetails | null>(null);
  const [homeTeamActualTier, setHomeTeamActualTier] = useState<TeamTierType | null | undefined>(undefined);
  const [awayTeamActualTier, setAwayTeamActualTier] = useState<TeamTierType | null | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedFormation, setSelectedFormation] = useState<FormationType | null>(null); // Puede ser null inicialmente
  
  const [playerToPlace, setPlayerToPlace] = useState<EnrichedPlayerInfo | null>(null); // Ahora es EnrichedPlayerInfo
  const [placedPlayers, setPlacedPlayers] = useState<Record<string, EnrichedPlayerInfo | null>>({}); // Ahora es EnrichedPlayerInfo
  const [fieldDimensions, setFieldDimensions] = useState({ width: 0, height: 0 });
  const [displayMessage, setDisplayMessage] = useState<string | null>(null); // Para mensajes como "Coach sin formacion"
  const [currentTeamFocus, setCurrentTeamFocus] = useState<'home' | 'away'>('home');
  const [homeLineupSnapshot, setHomeLineupSnapshot] = useState<Record<string, EnrichedPlayerInfo | null> | null>(null); // Ahora es EnrichedPlayerInfo

  const isEditingMode = params.isEditing === 'true';

  const areAllSlotsFilledForFormation = useCallback((formation: FormationType | null, players: Record<string, EnrichedPlayerInfo | null>): boolean => {
    if (!formation || !players) return false;
    const formationSlots = FORMATION_DEFINITIONS[formation];
    return formationSlots.every(slot => !!players[slot.id]);
  }, []);

  // Efecto para inicializar el tablero si la formación cambia y no hay jugadores cargados para esa nueva formación
  useEffect(() => {
    if (selectedFormation) {
        // Comprueba si los jugadores actualmente en `placedPlayers` corresponden a la `selectedFormation`
        const currentFormationSlots = FORMATION_DEFINITIONS[selectedFormation]?.map(s => s.id) || [];
        const placedPlayerKeysMatchFormation = currentFormationSlots.every(slotId => slotId in placedPlayers);

        if (Object.keys(placedPlayers).length === 0 || !placedPlayerKeysMatchFormation) {
            const initialSlots: Record<string, EnrichedPlayerInfo | null> = {};
            FORMATION_DEFINITIONS[selectedFormation].forEach(slot => {
                initialSlots[slot.id] = null;
            });
            setPlacedPlayers(initialSlots);
            console.log(`[TacticalBoard] Tablero inicializado para formación ${selectedFormation}`);
        }
        setPlayerToPlace(null);
        setHomeLineupSnapshot(null);
    } else {
      setPlacedPlayers({});
    }
  }, [selectedFormation]); // No quitar esta dependencia, es para cuando selectedFormation cambia

  const getCoachDefaultFormation = async (
    focus: 'home' | 'away',
    currentAnalysisData: EnrichedMatchAnalysisDetails, // Pasar datos actuales
    currentHomeTier: TeamTierType | null | undefined,
    currentAwayTier: TeamTierType | null | undefined
  ): Promise<{ formation: FormationType | null, message: string | null }> => {
    if (!currentAnalysisData) return { formation: null, message: "Datos de análisis no disponibles." };

    const playersGlobalCacheJson = await AsyncStorage.getItem(PLAYERS_CACHE_KEY);
    const globalPlayerData: Record<string, PlayerCacheEntryForReading> = playersGlobalCacheJson ? JSON.parse(playersGlobalCacheJson) : {};

    let coachNameToFind: string | null | undefined = null;
    let teamNameToMatch: string | null | undefined = null;
    let determinedTierForFocus: TeamTierType | null | undefined = null;

    if (focus === 'home') {
      coachNameToFind = currentAnalysisData.homeManager;
      teamNameToMatch = currentAnalysisData.homeTeamName;
      determinedTierForFocus = currentHomeTier;
    } else { // focus === 'away'
      coachNameToFind = currentAnalysisData.awayManager;
      teamNameToMatch = currentAnalysisData.awayTeamName;
      determinedTierForFocus = currentAwayTier;
    }

    if (!isTierSOrSRed(determinedTierForFocus)) {
      return { formation: null, message: null }; // Mensaje manejado por RenderTacticalBoard
    }
    if (!coachNameToFind || !teamNameToMatch) {
      return { formation: null, message: "Entrenador no especificado para el equipo." };
    }

    const coachEntry = Object.values(globalPlayerData).find(
      entry => entry.isManager && entry.name === coachNameToFind && entry.equipo === teamNameToMatch
    );

    if (coachEntry && coachEntry.tacticalScheme) {
      const scheme = coachEntry.tacticalScheme as FormationType; // Viene de CoachTacticalSchemeType
      return FORMATIONS_ARRAY.includes(scheme) ? { formation: scheme, message: null } : { formation: null, message: `Formación del coach (${coachEntry.tacticalScheme}) no compatible.` };
    }
    return { formation: null, message: "Coach sin formacion guardada." };
  };

  // Efecto principal para cargar datos del partido y alineaciones
  useEffect(() => {
    if (!matchUrl) {
      setError("No se proporcionó la URL del partido para el análisis.");
      setIsLoading(false);
      return;
    }

    const fetchAndLoad = async () => {
      setIsLoading(true);
      setAnalysisData(null);
      setError(null);
      setDisplayMessage("Cargando datos...");
      
      // Primero, determinar los tiers para saber cómo cargar/guardar
      const pTeamAName = params.teamAName ? decodeURIComponent(params.teamAName) : undefined;
      const pTeamATier = params.teamATier ? params.teamATier as TeamTierType : null;
      const pTeamBName = params.teamBName ? decodeURIComponent(params.teamBName) : undefined;
      const pTeamBTier = params.teamBTier ? params.teamBTier as TeamTierType : null;

      // Scrapea los datos para obtener nombres reales y compararlos
      let tempAnalysisData: MatchAnalysisDetails | null = null;
      try {
          tempAnalysisData = await scrapeMatchAnalysis(matchUrl);
          if (tempAnalysisData.error) {
              setError(tempAnalysisData.error);
              setIsLoading(false);
              return;
          }
      } catch (e: any) {
          setError(`Error al obtener el análisis del partido: ${e.message}`);
          setIsLoading(false);
          return;
      }

      // Enriquecer jugadores con posiciones desde el caché global
      const playersGlobalCacheJson = await AsyncStorage.getItem(PLAYERS_CACHE_KEY);
      const globalPlayerData: Record<string, PlayerCacheEntryForReading> = playersGlobalCacheJson
        ? JSON.parse(playersGlobalCacheJson)
        : {};

      const enrichPlayersWithPositions = (
        players: PlayerInfo[] | undefined,
        teamNameToMatch: string | null | undefined
      ): EnrichedPlayerInfo[] => {
        if (!players) return [];
        return players.map(p => {
          let foundPositions: ActualPlayerPositionType[] | undefined = undefined;
          if (p.name && teamNameToMatch) {
            // Buscar por nombre normalizado Y que coincida el equipo
            const playerEntry = Object.values(globalPlayerData).find(
              entry => entry.name && normalizeString(entry.name) === normalizeString(p.name) && entry.equipo === teamNameToMatch
            );
            if (playerEntry && playerEntry.positions) {
              foundPositions = playerEntry.positions;
            }
          }
          return { ...p, assignedPositions: foundPositions };
        });
      };
      
      const enrichedHomePlayers = enrichPlayersWithPositions(tempAnalysisData.homePlayers, tempAnalysisData.homeTeamName);
      const enrichedAwayPlayers = enrichPlayersWithPositions(tempAnalysisData.awayPlayers, tempAnalysisData.awayTeamName);

      let determinedHomeTier: TeamTierType | null | undefined = null;
      let determinedAwayTier: TeamTierType | null | undefined = null;

      if (tempAnalysisData.homeTeamName && tempAnalysisData.awayTeamName && pTeamAName && pTeamBName) {
        const homeNameMatchesA = tempAnalysisData.homeTeamName.includes(pTeamAName) || (pTeamAName && pTeamAName.includes(tempAnalysisData.homeTeamName));
        // const homeNameMatchesB = tempAnalysisData.homeTeamName.includes(pTeamBName) || (pTeamBName && pTeamBName.includes(tempAnalysisData.homeTeamName)); // No necesario si A es home

        if (homeNameMatchesA) {
          determinedHomeTier = pTeamATier;
          determinedAwayTier = pTeamBTier;
        } else { // Asumir que B es home si A no lo es
          determinedHomeTier = pTeamBTier;
          determinedAwayTier = pTeamATier;
        }
      }
      // Establecer los tiers ANTES de intentar cargar la alineación táctica específica del equipo
      setHomeTeamActualTier(determinedHomeTier);
      setAwayTeamActualTier(determinedAwayTier);
      
      // Determinar el foco inicial basado en tiers (esto se moverá a su propio useEffect)
      let initialFocus: 'home' | 'away' = 'home';
      if (isTierSOrSRed(determinedHomeTier) && !isTierSOrSRed(determinedAwayTier)) {
        initialFocus = 'home';
      } else if (!isTierSOrSRed(determinedHomeTier) && isTierSOrSRed(determinedAwayTier)) {
        initialFocus = 'away';
      }
      setCurrentTeamFocus(initialFocus); // Establecer el foco antes de cargar

      // Cargar la formación por defecto del coach para el foco inicial
      const coachDefault = await getCoachDefaultFormation(initialFocus, tempAnalysisData, determinedHomeTier, determinedAwayTier);
      // setSelectedFormation y setDisplayMessage se manejan dentro de loadTacticalLineup o después si no se carga nada
      
      // Intentar cargar una alineación específica del partido
      if (matchUrl) {
        const loadResult = await loadTacticalLineup(matchUrl, initialFocus);
        if (loadResult.loaded && loadResult.formation && loadResult.players) {
          // setSelectedFormation y setPlacedPlayers ya se hicieron dentro de loadTacticalLineup
          setDisplayMessage(null); 
          
          if (!isEditingMode) {
            const isCurrentFocusTierS = initialFocus === 'home' ? isTierSOrSRed(determinedHomeTier) : isTierSOrSRed(determinedAwayTier);
            if (isCurrentFocusTierS && areAllSlotsFilledForFormation(loadResult.formation, loadResult.players)) {
              console.log(`[AutoRedirect] Alineación completa cargada para ${initialFocus} team. Redirigiendo a resumen.`);
              
              let summaryParams: any = {
                formation: loadResult.formation, // Usar la formación cargada
                matchUrl: params.matchUrl, 
                matchIdentifier: params.matchIdentifier,
                teamAName: params.teamAName,
                teamATier: params.teamATier,
                teamBName: params.teamBName,
                teamBTier: params.teamBTier,
              };

              if (isTierSOrSRed(determinedHomeTier) && isTierSOrSRed(determinedAwayTier)) { 
                summaryParams.homeLineup = JSON.stringify(initialFocus === 'home' ? loadResult.players : homeLineupSnapshot || {}); 
                summaryParams.awayLineup = JSON.stringify(initialFocus === 'away' ? loadResult.players : {}); 
                summaryParams.homeTeamName = tempAnalysisData.homeTeamName;
                summaryParams.awayTeamName = tempAnalysisData.awayTeamName;
              } else { 
                summaryParams.lineup1 = JSON.stringify(loadResult.players);
                summaryParams.team1Name = initialFocus === 'home' ? tempAnalysisData.homeTeamName : tempAnalysisData.awayTeamName;
              }
              router.replace({ pathname: '/tactical-summary', params: summaryParams });
            }
          }
        } else { // No se cargó alineación guardada, usar la del coach (si existe)
            setSelectedFormation(coachDefault.formation);
            setDisplayMessage(coachDefault.message);
            if (!coachDefault.formation && !coachDefault.message) {
                // RenderTacticalBoard se encargará del mensaje de no TierS.
            }
        }
      } else { // No hay matchUrl (improbable aquí, pero por completitud)
        setSelectedFormation(coachDefault.formation);
        setDisplayMessage(coachDefault.message);
      }
      
      setAnalysisData({
        ...tempAnalysisData,
        homePlayers: enrichedHomePlayers,
        awayPlayers: enrichedAwayPlayers,
      });

      if (tempAnalysisData.homePlayers) {
        await updatePlayersCache(tempAnalysisData.homePlayers, tempAnalysisData.homeTeamName, determinedHomeTier, tempAnalysisData.homeManager);
      }
      if (tempAnalysisData.awayPlayers) {
        await updatePlayersCache(tempAnalysisData.awayPlayers, tempAnalysisData.awayTeamName, determinedAwayTier, tempAnalysisData.awayManager);
      }
      setIsLoading(false);
    };

    fetchAndLoad();
  }, [matchUrl, params.teamAName, params.teamATier, params.teamBName, params.teamBTier, isEditingMode]); // Añadir isEditingMode


  // Efecto para ajustar el foco del equipo basado en los tiers (después de que se establezcan)
  useEffect(() => {
    if (homeTeamActualTier === undefined || awayTeamActualTier === undefined) return;

    const homeIsS = isTierSOrSRed(homeTeamActualTier);
    const awayIsS = isTierSOrSRed(awayTeamActualTier);

    let newFocus = currentTeamFocus; // Mantener el foco actual si es posible
    if (homeIsS && !awayIsS) {
      newFocus = 'home';
    } else if (!homeIsS && awayIsS) {
      newFocus = 'away';
    } else if (!homeIsS && !awayIsS) { // Si ninguno es S, default a home pero el tablero estará deshabilitado
      newFocus = 'home';
    }
    // Si ambos son S, el foco se mantiene o se establece en 'home' por defecto si es la primera carga.
    // La carga de la alineación táctica ya intentó cargar para el foco inicial.
    setCurrentTeamFocus(newFocus);

  }, [homeTeamActualTier, awayTeamActualTier]);

  const determineSaveKeyAndSave = useCallback((teamToSave: 'home' | 'away', lineupToSave: Record<string, EnrichedPlayerInfo | null>) => {
    if (!matchUrl || !selectedFormation || !Object.values(lineupToSave).some(p => p !== null)) {
        console.log(`[TacticalSave] No se guardó para ${teamToSave} (match: ${matchUrl}). Razón: datos insuficientes o tablero vacío.`);
        return;
    }

    const homeIsS = isTierSOrSRed(homeTeamActualTier);
    const awayIsS = isTierSOrSRed(awayTeamActualTier);

    let keyToSave = matchUrl; // Clave base por defecto
    let shouldSave = false;

    if (teamToSave === 'home' && homeIsS) {
        shouldSave = true;
        if (homeIsS && awayIsS) { // Ambos TierS, clave específica para home
            keyToSave = matchUrl + "_home";
        }
        // Si solo home es TierS, la clave es matchUrl (ya asignada)
    } else if (teamToSave === 'away' && awayIsS) {
        shouldSave = true;
        if (homeIsS && awayIsS) { // Ambos TierS, clave específica para away
            keyToSave = matchUrl + "_away";
        }
        // Si solo away es TierS, la clave es matchUrl (ya asignada)
    }

    if (shouldSave) {
        saveTacticalLineup(keyToSave, selectedFormation, lineupToSave);
    } else {
        console.log(`[TacticalSave] No se guardó para ${teamToSave} (match: ${matchUrl}). Razón: El equipo no es TierS/SRed o no se cumplió otra condición.`);
    }
}, [matchUrl, selectedFormation, homeTeamActualTier, awayTeamActualTier, saveTacticalLineup]); // Incluir saveTacticalLineup si es estable

  // Guardar alineación al desmontar el componente
  useEffect(() => {
    return () => {
        determineSaveKeyAndSave(currentTeamFocus, placedPlayers);
    };
  }, [determineSaveKeyAndSave, currentTeamFocus, placedPlayers]); // placedPlayers es importante aquí


  const initializeBoardForCurrentFormation = useCallback(() => {
    if (selectedFormation) {
        const initialSlots: Record<string, EnrichedPlayerInfo | null> = {};
        FORMATION_DEFINITIONS[selectedFormation].forEach(slot => {
            initialSlots[slot.id] = null;
        });
        setPlacedPlayers(initialSlots);
        setPlayerToPlace(null);
    } else {
      setPlacedPlayers({});
      setPlayerToPlace(null);
    }
}, [selectedFormation]);

  const handleClearBoard = () => {
    initializeBoardForCurrentFormation();
  };

  const handleSwitchToAwayTeam = async () => {
    determineSaveKeyAndSave('home', placedPlayers); // Guardar la del local (home)
    setCurrentTeamFocus('away');
    setHomeLineupSnapshot(placedPlayers); // Guardar snapshot de la alineación local

    const coachDefault = await getCoachDefaultFormation('away', analysisData!, homeTeamActualTier, awayTeamActualTier);
    // setSelectedFormation y setDisplayMessage se manejan dentro de loadTacticalLineup o después si no se carga nada
    
    if (matchUrl) {
      const loadResult = await loadTacticalLineup(matchUrl, 'away');
      if (loadResult.loaded) {
        // setSelectedFormation y setPlacedPlayers ya se hicieron en loadTacticalLineup
        setDisplayMessage(null);
      } else { // No se cargó alineación guardada, usar la del coach
        setSelectedFormation(coachDefault.formation);
        setDisplayMessage(coachDefault.message);
        if (!coachDefault.formation && !coachDefault.message) {
            // RenderTacticalBoard se encargará del mensaje de no TierS.
        }
      }
    } else { // No hay matchUrl
        setSelectedFormation(coachDefault.formation);
        setDisplayMessage(coachDefault.message);
    }
  };

  const handleSwitchToHomeTeam = async () => {
    determineSaveKeyAndSave('away', placedPlayers); // Guardar la del visitante (away)
    setCurrentTeamFocus('home');

    const coachDefault = await getCoachDefaultFormation('home', analysisData!, homeTeamActualTier, awayTeamActualTier);
    // setSelectedFormation y setDisplayMessage se manejan dentro de loadTacticalLineup o después si no se carga nada

    if (matchUrl) {
      const loadResult = await loadTacticalLineup(matchUrl, 'home');
      if (loadResult.loaded) {
        setDisplayMessage(null);
      } else {
        setSelectedFormation(coachDefault.formation);
        setDisplayMessage(coachDefault.message);
      }
    } else {
        setSelectedFormation(coachDefault.formation);
        setDisplayMessage(coachDefault.message);
    }
  };

  const areAllSlotsFilled = useCallback(() => {
    if (!selectedFormation) return false;
    const formationSlots = FORMATION_DEFINITIONS[selectedFormation];
    return formationSlots.every(slot => !!placedPlayers[slot.id]); // Usa la función global
  }, [selectedFormation, placedPlayers]); 

  const handleSelectPlayerFromList = (player: EnrichedPlayerInfo) => { // Ahora es EnrichedPlayerInfo
    if (playerToPlace && playerToPlace.name === player.name && playerToPlace.number === player.number) {
      setPlayerToPlace(null); 
    } else {
      const slotIdOfSelectedPlayer = Object.keys(placedPlayers).find(
        slotId => placedPlayers[slotId]?.name === player.name && placedPlayers[slotId]?.number === player.number
      );
      if (slotIdOfSelectedPlayer) {
        setPlacedPlayers(prev => ({ ...prev, [slotIdOfSelectedPlayer]: null }));
      }
      setPlayerToPlace(player); 
    }
  };

  const handleSelectSlotOnField = (slotId: string) => {
    if (playerToPlace) { 
      let newPlacedPlayers = { ...placedPlayers };
      Object.keys(newPlacedPlayers).forEach(sId => {
        if (newPlacedPlayers[sId]?.name === playerToPlace.name && newPlacedPlayers[sId]?.number === playerToPlace.number) {
          newPlacedPlayers[sId] = null;
        }
      });
      
      newPlacedPlayers[slotId] = playerToPlace; 
      setPlacedPlayers(newPlacedPlayers);
      setPlayerToPlace(null); 
    } else { 
      if (placedPlayers[slotId]) { 
        setPlayerToPlace(placedPlayers[slotId]); 
        setPlacedPlayers(prev => ({ ...prev, [slotId]: null })); 
      }
    }
  };

  const onFieldLayout = useCallback((event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setFieldDimensions({ width, height });
  }, []);

  const formatPlayerNameForField = (fullName?: string | null): string => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0]; 
    const firstNameInitial = parts[0].charAt(0).toUpperCase();
    const lastName = parts.slice(1).join(' '); 
    return `${firstNameInitial}. ${lastName}`;
  };

  if (isLoading && !analysisData && homeTeamActualTier === undefined) { 
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
        <ThemedText style={{ marginTop: 10 }}>Cargando análisis para {matchIdentifier}...</ThemedText>
      </ThemedView>
    );
  }

  const renderPlayerList = () => {
    const homeIsS = isTierSOrSRed(homeTeamActualTier);
    const awayIsS = isTierSOrSRed(awayTeamActualTier);

    let playersToList: EnrichedPlayerInfo[] | undefined = []; // Ahora es EnrichedPlayerInfo
    let listTitle = "Jugadores";
    let showListForCurrentFocus = false;

    if (currentTeamFocus === 'home' && homeIsS) {
      playersToList = analysisData?.homePlayers;
      listTitle = `Alineación ${analysisData?.homeTeamName || 'Local'} (TierS)`;
      showListForCurrentFocus = true;
    } else if (currentTeamFocus === 'away' && awayIsS) {
      playersToList = analysisData?.awayPlayers;
      listTitle = `Alineación ${analysisData?.awayTeamName || 'Visitante'} (TierS)`;
      showListForCurrentFocus = true;
    }

    if (!showListForCurrentFocus && analysisData) { // Solo mostrar si hay analysisData
      const teamName = currentTeamFocus === 'home' ? analysisData?.homeTeamName : analysisData?.awayTeamName;
      return (
        <View style={styles.playerListContainer}>
          {teamName && <ThemedText type="label" style={styles.playerListTitle}>{teamName}</ThemedText>}
          <ThemedText>Análisis táctico no disponible para este equipo (no es TierS/SRed).</ThemedText>
        </View>
      );
    }
    if (!analysisData) return null; // No renderizar nada si no hay datos de análisis

    const placedPlayerKeys = new Set(
      Object.values(placedPlayers) // placedPlayers contiene EnrichedPlayerInfo | null
        .filter(p => p !== null)
        .map(p => `${p!.name}_${p!.number}`)
    );
    
    const displayablePlayers = (playersToList || []).filter(p => // playersToList ya es EnrichedPlayerInfo[]
        !placedPlayerKeys.has(`${p.name}_${p.number}`) ||
        (playerToPlace && playerToPlace.name === p.name && playerToPlace.number === p.number)
    );

    return (
      <View style={styles.playerListContainer}>
        <ThemedText type="label" style={styles.playerListTitle}>{listTitle}</ThemedText>
        <View style={styles.playerItemsWrapper}>
          {displayablePlayers.map((player, index) => {
            const isSelected = playerToPlace?.name === player.name && playerToPlace?.number === player.number;
            const positionsString = player.assignedPositions && player.assignedPositions.length > 0
              ? ` (${player.assignedPositions.join(', ')})`
              : '';
            
            return (
              <TouchableOpacity
                key={`${player.name}-${player.number}-${index}`}
                style={[
                  styles.playerItemButton,
                  isSelected && styles.playerItemButtonSelected,
                ]}
                onPress={() => handleSelectPlayerFromList(player)}
              >
                <ThemedText style={[styles.playerItemText, 
                                   isSelected && styles.playerItemTextSelected]} 
                            numberOfLines={1} 
                            ellipsizeMode="tail">
                  {player.number ? `${player.number}. ` : ''}{formatPlayerNameForField(player.name)}{positionsString}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const RenderTacticalBoard = () => {
    const homeIsS = isTierSOrSRed(homeTeamActualTier);
    const awayIsS = isTierSOrSRed(awayTeamActualTier);

    // Mensajes prioritarios basados en Tier
    if (currentTeamFocus === 'home' && !homeIsS && analysisData) {
      return <ThemedText style={styles.tacticalSchemePlaceholderText}>Análisis táctico no disponible para {analysisData?.homeTeamName} (no es TierS/SRed).</ThemedText>;
    }
    if (currentTeamFocus === 'away' && !awayIsS && analysisData) {
      return <ThemedText style={styles.tacticalSchemePlaceholderText}>Análisis táctico no disponible para {analysisData?.awayTeamName} (no es TierS/SRed).</ThemedText>;
    }
    if (!homeIsS && !awayIsS && analysisData) { // Ambos no son TierS
      return <ThemedText style={styles.tacticalSchemePlaceholderText}>Análisis táctico no disponible (ningún equipo es TierS/SRed).</ThemedText>;
    }

    // Mensaje de coach/formación (si aplica y no fue cubierto por los de Tier)
    if (displayMessage) {
      return <ThemedText style={styles.tacticalSchemePlaceholderText}>{displayMessage}</ThemedText>;
    }

    if (!selectedFormation || fieldDimensions.width === 0) { // Si no hay formación seleccionada (y no hay mensaje) o el campo no está listo
      return (
        <ThemedText style={styles.tacticalSchemePlaceholderText}>
          {selectedFormation ? (isLoading ? "Cargando..." : "Calculando campo...") : "Selecciona una formación"}
        </ThemedText>
      );
    }

    const formationLayout = FORMATION_DEFINITIONS[selectedFormation] || [];

    const getSlotLineColor = (line: FormationSlot['line']) => {
      if (line === 'GK') return 'rgba(255, 235, 150, 0.7)'; 
      if (line === 'DEF') return 'rgba(170, 210, 255, 0.7)'; 
      if (line === 'MID') return 'rgba(160, 240, 160, 0.7)'; 
      if (line === 'FWD') return 'rgba(255, 180, 180, 0.7)'; 
      return 'rgba(200, 200, 200, 0.7)'; 
    };
    const outOfPositionColor = 'rgba(220, 50, 50, 0.7)'; // Rojo para fuera de posición

    return (
      <View style={styles.fieldContainer}>
        <View style={[styles.fieldBorder, styles.fieldBorderTop]} />
        <View style={[styles.fieldBorder, styles.fieldBorderBottom]} />
        <View style={[styles.fieldBorder, styles.fieldBorderLeft]} />
        <View style={[styles.fieldBorder, styles.fieldBorderRight]} />
        {formationLayout.map((slot) => {
          const playerInSlot = placedPlayers[slot.id];
          let textContent: string | null = null;
          let textStyleKey: 'slotPlayerName' | 'slotLabel' = 'slotLabel'; 
          let currentSlotBackgroundColor = getSlotLineColor(slot.line);

          if (playerInSlot) {
            const formattedName = formatPlayerNameForField(playerInSlot.name);
            if (formattedName) {
              textContent = formattedName;
              textStyleKey = 'slotPlayerName';
            } else if (playerInSlot.number) {
              textContent = playerInSlot.number;
              textStyleKey = 'slotPlayerName';
            } else {
              textContent = slot.label; 
              textStyleKey = 'slotLabel'; 
            }
            // Lógica para color de fondo si el jugador está fuera de posición
            if (!playerInSlot.assignedPositions || playerInSlot.assignedPositions.length === 0) {
              // Player has no assigned positions in cache, mark as out of position
              currentSlotBackgroundColor = outOfPositionColor;
            } else {
              // Player has assigned positions, check if current slot is one of them
              const isPlayerInCorrectPosition = playerInSlot.assignedPositions.includes(slot.label as ActualPlayerPositionType);
              if (!isPlayerInCorrectPosition) {
                currentSlotBackgroundColor = outOfPositionColor;
              }
              // Else, it remains the default line color (already set by getSlotLineColor)
            }
          } else { 
            if (slot.label) {
              textContent = slot.label;
              textStyleKey = 'slotLabel';
            }
          }

          const slotStyle = {
            position: 'absolute',
            top: `${slot.topRatio * 100}%`,
            left: `${slot.leftRatio * 100}%`,
            transform: [{ translateX: -styles.slot.width! / 2 }, { translateY: -styles.slot.height! / 2 }] 
          };

          return (
            <TouchableOpacity
              key={slot.id}
              style={[
                styles.slot,
                { backgroundColor: currentSlotBackgroundColor }, // Aplicar el color determinado
                slotStyle,
                // playerInSlot && styles.slotFilled // slotFilled ya no es tan relevante para el color de fondo
              ]}
              onPress={() => handleSelectSlotOnField(slot.id)}
            >
              {textContent ? (
                <ThemedText 
                  style={playerInSlot ? styles.slotPlayerName : styles.slotLabel} // Nombre siempre blanco si hay jugador
                  numberOfLines={playerInSlot ? 2 : 1} 
                  ellipsizeMode="tail"
                >
                  {textContent}
                </ThemedText>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const homeIsS = isTierSOrSRed(homeTeamActualTier);
  const awayIsS = isTierSOrSRed(awayTeamActualTier);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: `Análisis: ${matchIdentifier}` }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error && !isLoading && (
          <ThemedView style={styles.centeredError}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </ThemedView>
        )}
        
        <ThemedView 
          style={styles.tacticalSchemeContainer} 
          lightColor="#e0e0e0"
          darkColor="#1c1c1e"
          onLayout={onFieldLayout}
        >
          {isLoading && !analysisData && homeTeamActualTier === undefined ? ( 
             <ActivityIndicator size="small" style={{marginVertical: 20}}/>
          ) : (
            <RenderTacticalBoard />
          )}
        </ThemedView>
        
        {analysisData && !analysisData.error && !isLoading && (homeIsS || awayIsS) && ( 
          <>
            {renderPlayerList()}
          </>
        )}
         {!analysisData && !error && !isLoading && (
            <ThemedText style={{textAlign: 'center', marginTop: 20}}>No hay datos de análisis para mostrar.</ThemedText>
        )}

        {selectedFormation && areAllSlotsFilled() && currentTeamFocus === 'home' &&
         homeIsS && awayIsS && 
         analysisData?.awayPlayers && analysisData.awayPlayers.length > 0 && (
          <TouchableOpacity onPress={handleSwitchToAwayTeam} style={styles.switchTeamButton}>
            <ThemedText style={styles.switchTeamButtonText}>Crear Esquema Visitante (TierS)</ThemedText>
          </TouchableOpacity>
        )}

        {selectedFormation && currentTeamFocus === 'away' &&
         homeIsS && awayIsS && 
         analysisData?.homePlayers && analysisData.homePlayers.length > 0 && (
          <TouchableOpacity onPress={handleSwitchToHomeTeam} style={styles.switchTeamButton}>
            <ThemedText style={styles.switchTeamButtonText}>Ver Esquema Local (TierS)</ThemedText>
          </TouchableOpacity>
        )}
        
        {selectedFormation && areAllSlotsFilled() && currentTeamFocus === 'home' &&
         homeIsS && !awayIsS && analysisData && (
          <TouchableOpacity
            onPress={() => {
              determineSaveKeyAndSave('home', placedPlayers);
              router.push({
                pathname: '/tactical-summary',
                params: {
                  lineup1: JSON.stringify(placedPlayers),
                  team1Name: analysisData.homeTeamName || 'Local',
                  formation: selectedFormation,
                  // Pasar parámetros originales para poder volver a editar
                  matchUrl: params.matchUrl,
                  matchIdentifier: params.matchIdentifier,
                  teamAName: params.teamAName, teamATier: params.teamATier,
                  teamBName: params.teamBName, teamBTier: params.teamBTier,
                }
              });
            }}
            style={[styles.switchTeamButton, styles.nextScreenButton]}>
            <ThemedText style={styles.switchTeamButtonText}>Siguiente (Resumen)</ThemedText>
          </TouchableOpacity>
        )}

        {selectedFormation && areAllSlotsFilled() && currentTeamFocus === 'away' &&
         !homeIsS && awayIsS && analysisData && (
          <TouchableOpacity
            onPress={() => {
              determineSaveKeyAndSave('away', placedPlayers);
              router.push({
                pathname: '/tactical-summary',
                params: {
                  lineup1: JSON.stringify(placedPlayers),
                  team1Name: analysisData.awayTeamName || 'Visitante',
                  formation: selectedFormation,
                  // Pasar parámetros originales para poder volver a editar
                  matchUrl: params.matchUrl,
                  matchIdentifier: params.matchIdentifier,
                  teamAName: params.teamAName, teamATier: params.teamATier,
                  teamBName: params.teamBName, teamBTier: params.teamBTier,
                }
              });
            }}
            style={[styles.switchTeamButton, styles.nextScreenButton]}>
            <ThemedText style={styles.switchTeamButtonText}>Siguiente (Resumen)</ThemedText>
          </TouchableOpacity>
        )}

        {selectedFormation && areAllSlotsFilled() && currentTeamFocus === 'away' &&
         homeIsS && awayIsS && 
         analysisData && homeLineupSnapshot && (
          <TouchableOpacity
            onPress={() => {
              determineSaveKeyAndSave('away', placedPlayers); // Guardar la del visitante (actualmente en foco)
              router.push({
                pathname: '/tactical-summary',
                params: {
                  homeLineup: JSON.stringify(homeLineupSnapshot),
                  awayLineup: JSON.stringify(placedPlayers),
                  formation: selectedFormation,
                  // Nombres de equipos para el resumen
                  homeTeamName: analysisData.homeTeamName || 'Local',
                  awayTeamName: analysisData.awayTeamName || 'Visitante',
                  // Pasar parámetros originales para poder volver a editar
                  matchUrl: params.matchUrl,
                  matchIdentifier: params.matchIdentifier,
                  teamAName: params.teamAName, teamATier: params.teamATier,
                  teamBName: params.teamBName, teamBTier: params.teamBTier,
                }
              });
            }}
            style={[styles.switchTeamButton, styles.nextScreenButton]}>
            <ThemedText style={styles.switchTeamButtonText}>Siguiente (Resumen)</ThemedText>
          </TouchableOpacity>
        )}


        {selectedFormation && Object.values(placedPlayers).some(p => p !== null) && (homeIsS || awayIsS) && ( 
          <TouchableOpacity onPress={handleClearBoard} style={styles.clearButton}>
            <ThemedText style={styles.clearButtonText}>Limpiar Esquema</ThemedText>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centeredError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 30,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
  },
  formationButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  formationButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  formationButtonText: {
    fontSize: 14,
  },
  formationButtonTextSelected: {
    color: '#fff',
  },
  tacticalSchemeContainer: {
    width: '95%', 
    aspectRatio: 0.75, 
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20, // Ajustado ya que no hay selector de formación arriba
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'center', 
  },
  tacticalSchemePlaceholderText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  fieldContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  fieldBorder: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.4)', 
  },
  fieldBorderTop: {
    top: '2%', 
    left: '2%',
    right: '2%',
    height: 2,
  },
  fieldBorderBottom: {
    bottom: '2%',
    left: '2%',
    right: '2%',
    height: 2,
  },
  fieldBorderLeft: {
    top: '2%', bottom: '2%', left: '2%', width: 2,
  },
  fieldBorderRight: {
    top: '2%', bottom: '2%', right: '2%', width: 2,
  },
  slot: {
    width: 65, 
    height: 50, 
    borderWidth: 1,
    borderColor: '#fff', 
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  slotFilled: { // Este estilo ahora solo se usa para el borde, el fondo se maneja dinámicamente
    borderColor: '#fff', 
  },
  slotLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff', 
  },
  slotPlayerName: { // Asegurar que el nombre del jugador sea blanco
    fontSize: 9,
    color: '#fff', 
    textAlign: 'center',
  },
  playerListContainer: {
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  playerListTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  playerItemsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  playerItemButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    margin: 4,
    backgroundColor: '#f9f9f9'
  },
  playerItemButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#0056b3',
  },
  playerItemText: {
    fontSize: 12,
    color: '#333'
  },
  playerItemTextSelected: {
    color: '#fff',
  },
  clearButton: {
    marginTop: 20,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    alignSelf: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchTeamButton: {
    marginTop: 15,
    marginBottom: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF', 
    borderRadius: 8,
    alignSelf: 'center',
  },
  switchTeamButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  nextScreenButton: { 
    backgroundColor: '#28a745', 
  },
  teamsHeader: { 
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  lineupsContainer: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  teamColumn: { 
    flex: 1,
    paddingHorizontal: 5,
  },
});
