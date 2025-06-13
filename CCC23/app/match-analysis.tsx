// c/Users/Mauri/Desktop/CCC23/MayI/CCC23/app/match-analysis.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, ScrollView, Alert, View, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useIsFocused } from '@react-navigation/native'; // Importar useIsFocused
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { scrapeMatchAnalysis, MatchAnalysisDetails, PlayerInfo } from '@/api/analisis';
import { TeamTierType } from '@/api/scraper'; // Importar TeamTierType
import { PostScudettoMatchInfo } from '@/api/postscudetto'; // Para tipar los datos de AsyncStorage

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

const ACTUAL_PLAYER_POSITIONS = [ 
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
    { id: 'rdm', label: 'MC', line: 'MID', topRatio: 0.58, leftRatio: 0.63 }, 
    { id: 'ldm', label: 'MC', line: 'MID', topRatio: 0.58, leftRatio: 0.37 }, 
    { id: 'ram', label: 'ED', line: 'MID', topRatio: 0.38, leftRatio: 0.85 }, 
    { id: 'cam', label: 'MCO', line: 'MID', topRatio: 0.38, leftRatio: 0.5 },
    { id: 'lam', label: 'EI', line: 'MID', topRatio: 0.38, leftRatio: 0.15 }, 
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
    { id: 'rwb', label: 'LD', line: 'MID', topRatio: 0.55, leftRatio: 0.9 }, 
    { id: 'rcm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.65 },
    { id: 'cm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.5 },
    { id: 'lcm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.35 },
    { id: 'lwb', label: 'LI', line: 'MID', topRatio: 0.55, leftRatio: 0.1 }, 
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

interface EnrichedPlayerInfo extends PlayerInfo {
    assignedPositions?: ActualPlayerPositionType[];
}

interface EnrichedMatchAnalysisDetails extends Omit<MatchAnalysisDetails, 'homePlayers' | 'awayPlayers' | 'homeSubstitutes' | 'awaySubstitutes'> {
    homePlayers?: EnrichedPlayerInfo[];
    awayPlayers?: EnrichedPlayerInfo[];
    homeSubstitutes?: EnrichedPlayerInfo[]; 
    awaySubstitutes?: EnrichedPlayerInfo[];
}

interface LoadTacticalLineupResult {
  formation: FormationType | null;
  players: Record<string, EnrichedPlayerInfo | null> | null;
  loaded: boolean;
}

interface LoadedLineupData {
  formation: FormationType | null;
  players: Record<string, EnrichedPlayerInfo | null> | null;
  loaded: boolean;
}

interface PlayerCacheEntryForReading {
  name: string | null;
  isManager?: boolean;
  equipo?: string | null;
  tacticalScheme?: string | null; 
  positions?: ActualPlayerPositionType[] | null;
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

  const updatePlayersCache = async (
    newPlayers: PlayerInfo[],
    teamName: string | null | undefined,
    teamTier: TeamTierType | null | undefined,
    teamManagerName: string | null | undefined
  ) => {
    if (!isTierSOrSRed(teamTier)) {
      return;
    }
    if (!teamName) {
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
          } else if (cache[playerId].equipo !== teamName) {
            cache[playerId].equipo = teamName; 
            cacheWasUpdated = true;
          }
        }
      }

      if (teamManagerName) {
        const managerId = normalizeString(teamManagerName);
        if (!cache[managerId]) {
          cache[managerId] = { name: teamManagerName, isManager: true, equipo: teamName, tacticalScheme: null }; 
          cacheWasUpdated = true;
        } else if (cache[managerId].equipo !== teamName) {
          cache[managerId].equipo = teamName; 
          cacheWasUpdated = true;
        }
      }

      if (cacheWasUpdated) {
        await AsyncStorage.setItem(PLAYERS_CACHE_KEY, JSON.stringify(cache));
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

  const loadTacticalLineup = async (
    matchId: string, 
    teamFocus: 'home' | 'away',
    isTierSvsSredMatch: boolean,
    isTierSvsTierSMatch: boolean // Nuevo parámetro
  ): Promise<LoadTacticalLineupResult> => {
    if (!matchId) return { formation: null, players: null, loaded: false };
    
    const homeIsS_or_SRed = isTierSOrSRed(homeTeamActualTier);
    const awayIsS_or_SRed = isTierSOrSRed(awayTeamActualTier);
    let loadKey = matchId;

    if (isTierSvsSredMatch) {
        loadKey = matchId; // TierS vs TierSred: usa la clave base (solo se guarda el TierS)
    } else if (isTierSvsTierSMatch) {
        loadKey = teamFocus === 'home' ? matchId + "_home" : matchId + "_away"; // TierS vs TierS: claves específicas
    } else if (homeIsS_or_SRed && awayIsS_or_SRed) { 
        // SRed vs SRed (u otro S/SRed vs S/SRed que no sea S vs S)
        loadKey = teamFocus === 'home' ? matchId + "_home" : matchId + "_away";
    }
    // Si solo un equipo es S/SRed (y no es S vs SRed ni S vs S), o ninguno es S/SRed, loadKey permanece como matchId (clave base).

    try {
      const existingLineupsJson = await AsyncStorage.getItem(TACTICAL_LINEUPS_CACHE_KEY);
      if (existingLineupsJson) {
        const lineupsCache: Record<string, { formation: FormationType; placedPlayers: Record<string, EnrichedPlayerInfo | null> }> = JSON.parse(existingLineupsJson);
        
        let lineupToLoad = lineupsCache[loadKey]; 
        // Fallback si la clave específica no existe pero la base sí (migración o caso raro)
        if (!lineupToLoad && (isTierSvsTierSMatch || (homeIsS_or_SRed && awayIsS_or_SRed && !isTierSvsSredMatch))) { 
            lineupToLoad = lineupsCache[matchId]; // Intenta cargar desde la clave base si la específica no está
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
  
  const loadSpecificLineupData = async (loadKey: string): Promise<LoadedLineupData> => {
    try {
      const existingLineupsJson = await AsyncStorage.getItem(TACTICAL_LINEUPS_CACHE_KEY);
      if (existingLineupsJson) {
        const lineupsCache = JSON.parse(existingLineupsJson);
        const lineupToLoad = lineupsCache[loadKey];
        if (lineupToLoad) {
          return { formation: lineupToLoad.formation, players: lineupToLoad.placedPlayers, loaded: true };
        }
      }
      return { formation: null, players: null, loaded: false };
    } catch (error) {
      console.error(`Error loading specific lineup data for key ${loadKey}:`, error);
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
    isEditing?: string; 
  }>();
  const router = useRouter();
  const matchUrl = params.matchUrl ? decodeURIComponent(params.matchUrl) : undefined;
  const matchIdentifier = params.matchIdentifier ? decodeURIComponent(params.matchIdentifier) : 'Partido';
  const POST_SCUDETTO_DATA_KEY = 'postScudettoAllMatchData';

  const [analysisData, setAnalysisData] = useState<EnrichedMatchAnalysisDetails | null>(null);
  const [homeTeamActualTier, setHomeTeamActualTier] = useState<TeamTierType | null | undefined>(undefined);
  const [awayTeamActualTier, setAwayTeamActualTier] = useState<TeamTierType | null | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedFormation, setSelectedFormation] = useState<FormationType | null>(null); 
  
  const [playerToPlace, setPlayerToPlace] = useState<EnrichedPlayerInfo | null>(null); 
  const [placedPlayers, setPlacedPlayers] = useState<Record<string, EnrichedPlayerInfo | null>>({}); 
  const [fieldDimensions, setFieldDimensions] = useState({ width: 0, height: 0 });
  const [displayMessage, setDisplayMessage] = useState<string | null>(null); 
  const [currentTeamFocus, setCurrentTeamFocus] = useState<'home' | 'away'>('home');
  const [homeLineupSnapshot, setHomeLineupSnapshot] = useState<Record<string, EnrichedPlayerInfo | null> | null>(null); 
  const [homeFormationSnapshot, setHomeFormationSnapshot] = useState<FormationType | null>(null);


  const isEditingMode = params.isEditing === 'true';
  const isFocused = useIsFocused(); 

  const areAllSlotsFilledForFormation = useCallback((formation: FormationType | null, players: Record<string, EnrichedPlayerInfo | null>): boolean => {
    if (!formation || !players) return false;
    const formationSlots = FORMATION_DEFINITIONS[formation];
    return formationSlots.every(slot => !!players[slot.id]);
  }, []);

  useEffect(() => {
    if (selectedFormation) {
        const currentFormationSlots = FORMATION_DEFINITIONS[selectedFormation]?.map(s => s.id) || [];
        const placedPlayerKeysMatchFormation = currentFormationSlots.every(slotId => slotId in placedPlayers);

        if (Object.keys(placedPlayers).length === 0 || !placedPlayerKeysMatchFormation) {
            const initialSlots: Record<string, EnrichedPlayerInfo | null> = {};
            FORMATION_DEFINITIONS[selectedFormation].forEach(slot => {
                initialSlots[slot.id] = null;
            });
            setPlacedPlayers(initialSlots);
        }
        setPlayerToPlace(null);
        // No resetear homeLineupSnapshot aquí, se maneja en los cambios de foco
    } else {
      setPlacedPlayers({});
    }
  }, [selectedFormation]); 

  const getCoachDefaultFormation = async (
    focus: 'home' | 'away',
    currentAnalysisData: EnrichedMatchAnalysisDetails, 
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
    } else { 
      coachNameToFind = currentAnalysisData.awayManager;
      teamNameToMatch = currentAnalysisData.awayTeamName;
      determinedTierForFocus = currentAwayTier;
    }

    if (!isTierSOrSRed(determinedTierForFocus)) {
      return { formation: null, message: null }; 
    }
    if (!coachNameToFind || !teamNameToMatch) {
      return { formation: null, message: "Entrenador no especificado para el equipo." };
    }

    const coachEntry = Object.values(globalPlayerData).find(
      entry => entry.isManager && entry.name === coachNameToFind && entry.equipo === teamNameToMatch
    );

    if (coachEntry && coachEntry.tacticalScheme) {
      const scheme = coachEntry.tacticalScheme as FormationType; 
      return FORMATIONS_ARRAY.includes(scheme) ? { formation: scheme, message: null } : { formation: null, message: `Formación del coach (${coachEntry.tacticalScheme}) no compatible.` };
    }
    return { formation: null, message: "Coach sin formacion guardada." };
  };

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
      
      const pTeamAName = params.teamAName ? decodeURIComponent(params.teamAName) : undefined;
      const pTeamATier = params.teamATier ? params.teamATier as TeamTierType : null;
      const pTeamBName = params.teamBName ? decodeURIComponent(params.teamBName) : undefined;
      const pTeamBTier = params.teamBTier ? params.teamBTier as TeamTierType : null;

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
        if (homeNameMatchesA) {
          determinedHomeTier = pTeamATier;
          determinedAwayTier = pTeamBTier;
        } else { 
          determinedHomeTier = pTeamBTier;
          determinedAwayTier = pTeamATier;
        }
      }
      setHomeTeamActualTier(determinedHomeTier);
      setAwayTeamActualTier(determinedAwayTier);
      
      const homeIsS_Actual = determinedHomeTier === "TierS";
      const awayIsS_Actual = determinedAwayTier === "TierS";
      const homeIsSRed_Actual = determinedHomeTier === "TierSred";
      const awayIsSRed_Actual = determinedAwayTier === "TierSred";
      const isTierSvsSredCurrentMatch = (homeIsS_Actual && awayIsSRed_Actual) || (homeIsSRed_Actual && awayIsS_Actual);
      const isTierSvsTierSCurrentMatch = homeIsS_Actual && awayIsS_Actual;


      let initialFocus: 'home' | 'away' = 'home';
      if (isTierSvsSredCurrentMatch) {
        initialFocus = homeIsS_Actual ? 'home' : 'away';
      } else if (isTierSvsTierSCurrentMatch) {
        initialFocus = 'home'; // Para S vs S, empezar por home
      } else if (isTierSOrSRed(determinedHomeTier) && !isTierSOrSRed(determinedAwayTier)) {
        initialFocus = 'home';
      } else if (!isTierSOrSRed(determinedHomeTier) && isTierSOrSRed(determinedAwayTier)) {
        initialFocus = 'away';
      }
      setCurrentTeamFocus(initialFocus);

      const coachDefault = await getCoachDefaultFormation(initialFocus, tempAnalysisData, determinedHomeTier, determinedAwayTier);
      let lineupLoadedFromStorage = false;
      
      if (matchUrl) {
        const loadResult = await loadTacticalLineup(matchUrl, initialFocus, isTierSvsSredCurrentMatch, isTierSvsTierSCurrentMatch);
        if (loadResult.loaded && loadResult.formation && loadResult.players) {
          setDisplayMessage(null); 
          const freshlyEnrichedPlayersForCurrentFocus = initialFocus === 'home' ? enrichedHomePlayers : enrichedAwayPlayers;
          const reEnrichedLoadedPlayers: Record<string, EnrichedPlayerInfo | null> = {};
          for (const slotId in loadResult.players) {
            const loadedPlayerInSlot = loadResult.players[slotId];
            if (loadedPlayerInSlot && loadedPlayerInSlot.name) {
              const correspondingFreshPlayer = freshlyEnrichedPlayersForCurrentFocus.find(
                fp => fp.name === loadedPlayerInSlot.name && (fp.number === loadedPlayerInSlot.number || (!fp.number && !loadedPlayerInSlot.number))
              );
              if (correspondingFreshPlayer) {
                reEnrichedLoadedPlayers[slotId] = { ...loadedPlayerInSlot, assignedPositions: correspondingFreshPlayer.assignedPositions };
              } else {
                reEnrichedLoadedPlayers[slotId] = loadedPlayerInSlot; 
              }
            } else {
              reEnrichedLoadedPlayers[slotId] = loadedPlayerInSlot; 
            }
          }
          setPlacedPlayers(reEnrichedLoadedPlayers); 
          lineupLoadedFromStorage = true;
          
          if (!isEditingMode) {
            let summaryParams: any = {
                matchUrl: params.matchUrl, matchIdentifier: params.matchIdentifier,
                teamAName: params.teamAName, teamATier: params.teamATier,
                teamBName: params.teamBName, teamBTier: params.teamBTier,
            };

            if (isTierSvsSredCurrentMatch) {
                if (areAllSlotsFilledForFormation(loadResult.formation, reEnrichedLoadedPlayers)) {
                    summaryParams.lineup1 = JSON.stringify(reEnrichedLoadedPlayers);
                    summaryParams.team1Name = initialFocus === 'home' ? tempAnalysisData.homeTeamName : tempAnalysisData.awayTeamName;
                    summaryParams.formation = loadResult.formation;
                    router.replace({ pathname: '/tactical-summary', params: summaryParams });
                }
            } else if (isTierSvsTierSCurrentMatch) {
                const otherTeamFocus = initialFocus === 'home' ? 'away' : 'home';
                const otherTeamLoadKey = matchUrl + (otherTeamFocus === 'home' ? "_home" : "_away");
                const otherTeamData = await loadSpecificLineupData(otherTeamLoadKey);

                if (areAllSlotsFilledForFormation(loadResult.formation, reEnrichedLoadedPlayers) &&
                    otherTeamData.loaded && otherTeamData.formation && otherTeamData.players &&
                    areAllSlotsFilledForFormation(otherTeamData.formation, otherTeamData.players)) {
                    
                    summaryParams.homeLineup = initialFocus === 'home' ? JSON.stringify(reEnrichedLoadedPlayers) : JSON.stringify(otherTeamData.players);
                    summaryParams.awayLineup = initialFocus === 'away' ? JSON.stringify(reEnrichedLoadedPlayers) : JSON.stringify(otherTeamData.players);
                    summaryParams.homeTeamName = tempAnalysisData.homeTeamName;
                    summaryParams.awayTeamName = tempAnalysisData.awayTeamName;
                    // Asumimos que ambas formaciones son iguales para S vs S, o tomamos la del foco actual
                    summaryParams.formation = loadResult.formation; 
                    router.replace({ pathname: '/tactical-summary', params: summaryParams });
                }
            } else if (isTierSOrSRed(determinedHomeTier) && isTierSOrSRed(determinedAwayTier) && !isTierSvsSredCurrentMatch && !isTierSvsTierSCurrentMatch) {
                // SRed vs SRed (o cualquier otro S/SRed vs S/SRed que no sea S vs S)
                let finalHomeLineupJson = "{}";
                let finalAwayLineupJson = "{}";
                if (initialFocus === 'home') {
                  finalHomeLineupJson = JSON.stringify(reEnrichedLoadedPlayers);
                  const awayData = await loadSpecificLineupData(matchUrl + "_away");
                  if (awayData.loaded && awayData.players) finalAwayLineupJson = JSON.stringify(awayData.players);
                } else { 
                  finalAwayLineupJson = JSON.stringify(reEnrichedLoadedPlayers);
                  const homeData = await loadSpecificLineupData(matchUrl + "_home");
                  if (homeData.loaded && homeData.players) finalHomeLineupJson = JSON.stringify(homeData.players);
                }
                if (areAllSlotsFilledForFormation(loadResult.formation, reEnrichedLoadedPlayers) && 
                    ( (initialFocus === 'home' && JSON.parse(finalAwayLineupJson) && Object.keys(JSON.parse(finalAwayLineupJson)).length > 0 && areAllSlotsFilledForFormation(loadResult.formation, JSON.parse(finalAwayLineupJson))) ||
                      (initialFocus === 'away' && JSON.parse(finalHomeLineupJson) && Object.keys(JSON.parse(finalHomeLineupJson)).length > 0 && areAllSlotsFilledForFormation(loadResult.formation, JSON.parse(finalHomeLineupJson))) ||
                      (!JSON.parse(finalAwayLineupJson) || Object.keys(JSON.parse(finalAwayLineupJson)).length === 0) || 
                      (!JSON.parse(finalHomeLineupJson) || Object.keys(JSON.parse(finalHomeLineupJson)).length === 0)
                    )
                   ) {
                    summaryParams.homeLineup = finalHomeLineupJson;
                    summaryParams.awayLineup = finalAwayLineupJson;
                    summaryParams.homeTeamName = tempAnalysisData.homeTeamName;
                    summaryParams.awayTeamName = tempAnalysisData.awayTeamName;
                    summaryParams.formation = loadResult.formation;
                    router.replace({ pathname: '/tactical-summary', params: summaryParams });
                }
            } else if ( (initialFocus === 'home' ? isTierSOrSRed(determinedHomeTier) : isTierSOrSRed(determinedAwayTier)) && 
                        areAllSlotsFilledForFormation(loadResult.formation, reEnrichedLoadedPlayers)
                      ) {
                // Single S/SRed team vs non-S/SRed
                summaryParams.lineup1 = JSON.stringify(reEnrichedLoadedPlayers);
                summaryParams.team1Name = initialFocus === 'home' ? tempAnalysisData.homeTeamName : tempAnalysisData.awayTeamName;
                summaryParams.formation = loadResult.formation;
                router.replace({ pathname: '/tactical-summary', params: summaryParams });
            }
          }
        } 
      }
      
      if (!lineupLoadedFromStorage) {
        setSelectedFormation(coachDefault.formation);
        setDisplayMessage(coachDefault.message);
      }      
      const currentAnalysisData = { 
        ...tempAnalysisData,
        homePlayers: enrichedHomePlayers,
        awayPlayers: enrichedAwayPlayers,
      };

      if (tempAnalysisData.homePlayers) {
        await updatePlayersCache(tempAnalysisData.homePlayers, tempAnalysisData.homeTeamName, determinedHomeTier, tempAnalysisData.homeManager);
      }
      if (tempAnalysisData.awayPlayers) {
        await updatePlayersCache(tempAnalysisData.awayPlayers, tempAnalysisData.awayTeamName, determinedAwayTier, tempAnalysisData.awayManager);
      }
      setAnalysisData(currentAnalysisData); 
      setIsLoading(false);
    };

    fetchAndLoad();
  }, [matchUrl, params.teamAName, params.teamATier, params.teamBName, params.teamBTier, isEditingMode, isFocused]); 


  useEffect(() => {
    if (homeTeamActualTier === undefined || awayTeamActualTier === undefined) return;

    const homeIsS = homeTeamActualTier === "TierS";
    const awayIsS = awayTeamActualTier === "TierS";
    const homeIsSRed = homeTeamActualTier === "TierSred";
    const awayIsSRed = awayTeamActualTier === "TierSred";

    let newFocus = currentTeamFocus; 

    if (homeIsS && awayIsSRed) {
        newFocus = 'home'; 
    } else if (homeIsSRed && awayIsS) {
        newFocus = 'away'; 
    } else if (homeIsS && awayIsS) { // TierS vs TierS
        // Mantener el foco actual o default a 'home' si no hay snapshot
        newFocus = currentTeamFocus; 
    } else if (isTierSOrSRed(homeTeamActualTier) && !isTierSOrSRed(awayTeamActualTier)) {
      newFocus = 'home';
    } else if (!isTierSOrSRed(homeTeamActualTier) && isTierSOrSRed(awayTeamActualTier)) {
      newFocus = 'away';
    } else if (!isTierSOrSRed(homeTeamActualTier) && !isTierSOrSRed(awayTeamActualTier)) { 
      newFocus = 'home';
    }
    
    if (newFocus !== currentTeamFocus) {
        setCurrentTeamFocus(newFocus);
    }
  }, [homeTeamActualTier, awayTeamActualTier]);

  const getLineupTacticalStatus = useCallback((
    lineupToCheck: Record<string, EnrichedPlayerInfo | null> | null,
    formationToCheck: FormationType | null
  ): 'Neutro' | 'Rojo' | null => {
    if (!formationToCheck || !lineupToCheck || Object.keys(lineupToCheck).length === 0 || !FORMATION_DEFINITIONS[formationToCheck]) {
      return null;
    }
    const currentFormationLayout = FORMATION_DEFINITIONS[formationToCheck];
    let hasPlacedPlayers = false;
    let hasMisplacedPlayer = false;

    for (const slot of currentFormationLayout) {
      const playerInSlot = lineupToCheck[slot.id];
      if (playerInSlot) {
        hasPlacedPlayers = true;
        if (!playerInSlot.assignedPositions || playerInSlot.assignedPositions.length === 0) {
          hasMisplacedPlayer = true; 
        } else {
          const isPlayerInCorrectPosition = playerInSlot.assignedPositions.includes(slot.label as ActualPlayerPositionType);
          if (!isPlayerInCorrectPosition) {
            hasMisplacedPlayer = true;
          }
        }
      }
    }
    if (!hasPlacedPlayers) return null;
    return hasMisplacedPlayer ? 'Rojo' : 'Neutro';
  }, []);

  const determineSaveKeyAndSave = useCallback(async (teamToSave: 'home' | 'away', lineupToSave: Record<string, EnrichedPlayerInfo | null>) => {
    if (!matchUrl || !selectedFormation || !Object.values(lineupToSave).some(p => p !== null)) {
        return;
    }

    const homeIsS_Actual = homeTeamActualTier === "TierS";
    const awayIsS_Actual = awayTeamActualTier === "TierS";
    const homeIsSRed_Actual = homeTeamActualTier === "TierSred";
    const awayIsSRed_Actual = awayTeamActualTier === "TierSred";
    
    const isCurrentTierS_vs_TierSred = (homeIsS_Actual && awayIsSRed_Actual) || (homeIsSRed_Actual && awayIsS_Actual);
    const isCurrentTierS_vs_TierS = homeIsS_Actual && awayIsS_Actual;


    let keyToSave = matchUrl; 
    let shouldSave = false;

    if (isCurrentTierS_vs_TierSred) {
        const tierS_TeamIsHome = homeIsS_Actual;
        if ((tierS_TeamIsHome && teamToSave === 'home') || (!tierS_TeamIsHome && teamToSave === 'away')) {
            shouldSave = true; 
        }
    } else if (isCurrentTierS_vs_TierS) {
        keyToSave = teamToSave === 'home' ? matchUrl + "_home" : matchUrl + "_away";
        shouldSave = true;
    } else if (teamToSave === 'home' && isTierSOrSRed(homeTeamActualTier)) {
        shouldSave = true;
        if (isTierSOrSRed(homeTeamActualTier) && isTierSOrSRed(awayTeamActualTier)) { 
            keyToSave = matchUrl + "_home";
        }
    } else if (teamToSave === 'away' && isTierSOrSRed(awayTeamActualTier)) {
        shouldSave = true;
        if (isTierSOrSRed(homeTeamActualTier) && isTierSOrSRed(awayTeamActualTier)) {
            keyToSave = matchUrl + "_away";
        }
    }

    if (shouldSave) {
        await saveTacticalLineup(keyToSave, selectedFormation, lineupToSave);

        let overallTacticalStatus: 'Neutro' | 'Rojo' | 'Naranja' | null = null;

        if (isCurrentTierS_vs_TierS) {
            const homeDataKey = matchUrl + "_home";
            const awayDataKey = matchUrl + "_away";
            const homeData = teamToSave === 'home' ? { loaded: true, players: lineupToSave, formation: selectedFormation } : await loadSpecificLineupData(homeDataKey);
            const awayData = teamToSave === 'away' ? { loaded: true, players: lineupToSave, formation: selectedFormation } : await loadSpecificLineupData(awayDataKey);

            const homeComplete = homeData.loaded && homeData.formation && homeData.players && areAllSlotsFilledForFormation(homeData.formation, homeData.players);
            const awayComplete = awayData.loaded && awayData.formation && awayData.players && areAllSlotsFilledForFormation(awayData.formation, awayData.players);

            if (homeComplete && awayComplete) {
                overallTacticalStatus = 'Naranja';
            } else {
                // Si no ambos completos, no es Naranja. Podría ser Neutro/Rojo individual si solo uno está.
                // Pero para S vs S, el estado "Naranja" es el principal. Si no es Naranja, es null.
                overallTacticalStatus = null;
            }
        } else if (isCurrentTierS_vs_TierSred) {
            overallTacticalStatus = getLineupTacticalStatus(lineupToSave, selectedFormation);
        } else if (isTierSOrSRed(homeTeamActualTier) && isTierSOrSRed(awayTeamActualTier)) { // SRed vs SRed
            const homeData = await loadSpecificLineupData(matchUrl + "_home");
            const awayData = await loadSpecificLineupData(matchUrl + "_away");
            const homeStatus = homeData.loaded ? getLineupTacticalStatus(homeData.players, homeData.formation) : null;
            const awayStatus = awayData.loaded ? getLineupTacticalStatus(awayData.players, awayData.formation) : null;
            if (homeStatus === 'Rojo' || awayStatus === 'Rojo') {
                overallTacticalStatus = 'Rojo';
            } else if (homeStatus === 'Neutro' && awayStatus === 'Neutro') {
                overallTacticalStatus = 'Neutro';
            }
        } else { 
            overallTacticalStatus = getLineupTacticalStatus(lineupToSave, selectedFormation);
        }

        const storedDataJson = await AsyncStorage.getItem(POST_SCUDETTO_DATA_KEY);
        if (storedDataJson) {
            let allMatches: PostScudettoMatchInfo[] = JSON.parse(storedDataJson);
            const decodedMatchUrl = decodeURIComponent(matchUrl); 
            const matchIndex = allMatches.findIndex(m => m.match === decodedMatchUrl);

            if (matchIndex !== -1) {
                const currentMatchStatus = allMatches[matchIndex].Status;
                if (currentMatchStatus !== 'Champion' && currentMatchStatus !== 'Post scudetto' && currentMatchStatus !== 'Negativo') {
                    if (overallTacticalStatus === 'Neutro' || overallTacticalStatus === 'Rojo' || overallTacticalStatus === 'Naranja') {
                        allMatches[matchIndex].Status = overallTacticalStatus;
                    } else { 
                        if (currentMatchStatus === "Neutro" || currentMatchStatus === "Rojo" || currentMatchStatus === "Naranja") {
                            allMatches[matchIndex].Status = null; 
                        }
                    }
                }
                await AsyncStorage.setItem(POST_SCUDETTO_DATA_KEY, JSON.stringify(allMatches));
            }
        }
    }
}, [matchUrl, selectedFormation, homeTeamActualTier, awayTeamActualTier, getLineupTacticalStatus, areAllSlotsFilledForFormation, POST_SCUDETTO_DATA_KEY]);

  useEffect(() => {
    return () => {
        const performSaveAndStatusUpdate = async () => {
            await determineSaveKeyAndSave(currentTeamFocus, placedPlayers);
        };
        performSaveAndStatusUpdate();
    };
  }, [determineSaveKeyAndSave, currentTeamFocus, placedPlayers]); 


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
    await determineSaveKeyAndSave('home', placedPlayers); 
    setHomeLineupSnapshot(placedPlayers); 
    setHomeFormationSnapshot(selectedFormation); // Guardar también la formación del local
    setCurrentTeamFocus('away');

    const coachDefault = await getCoachDefaultFormation('away', analysisData!, homeTeamActualTier, awayTeamActualTier);
    
    if (matchUrl) {
      const isSvsS = homeTeamActualTier === "TierS" && awayTeamActualTier === "TierS";
      const loadResult = await loadTacticalLineup(matchUrl, 'away', false, isSvsS); 
      if (loadResult.loaded) {
        setDisplayMessage(null);
      } else { 
        setSelectedFormation(coachDefault.formation);
        setDisplayMessage(coachDefault.message);
        if (coachDefault.formation) initializeBoardForCurrentFormation(); else setPlacedPlayers({});
      }
    } else { 
        setSelectedFormation(coachDefault.formation);
        setDisplayMessage(coachDefault.message);
        if (coachDefault.formation) initializeBoardForCurrentFormation(); else setPlacedPlayers({});
    }
  };

  const handleSwitchToHomeTeam = async () => {
    await determineSaveKeyAndSave('away', placedPlayers); 
    setCurrentTeamFocus('home');
    // No necesitamos guardar snapshot del visitante, ya que el flujo SvsS es Home -> Away -> Summary

    const coachDefault = await getCoachDefaultFormation('home', analysisData!, homeTeamActualTier, awayTeamActualTier);

    if (matchUrl) {
      const isSvsS = homeTeamActualTier === "TierS" && awayTeamActualTier === "TierS";
      const loadResult = await loadTacticalLineup(matchUrl, 'home', false, isSvsS); 
      if (loadResult.loaded) {
        setDisplayMessage(null);
      } else {
        setSelectedFormation(coachDefault.formation);
        setDisplayMessage(coachDefault.message);
        if (coachDefault.formation) initializeBoardForCurrentFormation(); else setPlacedPlayers({});
      }
    } else {
        setSelectedFormation(coachDefault.formation);
        setDisplayMessage(coachDefault.message);
        if (coachDefault.formation) initializeBoardForCurrentFormation(); else setPlacedPlayers({});
    }
  };

  const areAllSlotsFilled = useCallback(() => {
    if (!selectedFormation) return false;
    const formationSlots = FORMATION_DEFINITIONS[selectedFormation];
    return formationSlots.every(slot => !!placedPlayers[slot.id]); 
  }, [selectedFormation, placedPlayers]); 

  const handleSelectPlayerFromList = (player: EnrichedPlayerInfo) => { 
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

  const homeIsS_Actual = homeTeamActualTier === "TierS";
  const awayIsS_Actual = awayTeamActualTier === "TierS";
  const homeIsSRed_Actual = homeTeamActualTier === "TierSred";
  const awayIsSRed_Actual = awayTeamActualTier === "TierSred";
  const isCurrentTierS_vs_TierSred_Match = (homeIsS_Actual && awayIsSRed_Actual) || (homeIsSRed_Actual && awayIsS_Actual);
  const isCurrentTierS_vs_TierS_Match = homeIsS_Actual && awayIsS_Actual;

  const tierS_TeamFocusInSvsSred: 'home' | 'away' | null = 
      isCurrentTierS_vs_TierSred_Match ? (homeIsS_Actual ? 'home' : 'away') : null;


  const renderPlayerList = () => {
    let playersToList: EnrichedPlayerInfo[] | undefined = []; 
    let listTitle = "Jugadores";
    let showListForCurrentFocus = false;
    let listIsEnabled = true;

    if (isCurrentTierS_vs_TierSred_Match) {
        if (currentTeamFocus === tierS_TeamFocusInSvsSred) {
            playersToList = currentTeamFocus === 'home' ? analysisData?.homePlayers : analysisData?.awayPlayers;
            listTitle = `Alineación ${currentTeamFocus === 'home' ? analysisData?.homeTeamName : analysisData?.awayTeamName} (TierS)`;
            showListForCurrentFocus = true;
        } else {
            const teamName = currentTeamFocus === 'home' ? analysisData?.homeTeamName : analysisData?.awayTeamName;
            return (
                <View style={styles.playerListContainer}>
                  {teamName && <ThemedText type="label" style={styles.playerListTitle}>{teamName} (TierSred)</ThemedText>}
                  <ThemedText>Análisis táctico solo para el equipo TierS en este enfrentamiento.</ThemedText>
                </View>
            );
        }
    } else if (isCurrentTierS_vs_TierS_Match) { // TierS vs TierS
        playersToList = currentTeamFocus === 'home' ? analysisData?.homePlayers : analysisData?.awayPlayers;
        listTitle = `Alineación ${currentTeamFocus === 'home' ? analysisData?.homeTeamName : analysisData?.awayTeamName} (TierS)`;
        showListForCurrentFocus = true;
    } else { // Otros casos (SRed vs SRed, S/SRed vs No-S/SRed, etc.)
        if (currentTeamFocus === 'home' && isTierSOrSRed(homeTeamActualTier)) {
            playersToList = analysisData?.homePlayers;
            listTitle = `Alineación ${analysisData?.homeTeamName || 'Local'} (${homeTeamActualTier})`;
            showListForCurrentFocus = true;
        } else if (currentTeamFocus === 'away' && isTierSOrSRed(awayTeamActualTier)) {
            playersToList = analysisData?.awayPlayers;
            listTitle = `Alineación ${analysisData?.awayTeamName || 'Visitante'} (${awayTeamActualTier})`;
            showListForCurrentFocus = true;
        } else if (analysisData) {
            const teamName = currentTeamFocus === 'home' ? analysisData?.homeTeamName : analysisData?.awayTeamName;
            return (
              <View style={styles.playerListContainer}>
                {teamName && <ThemedText type="label" style={styles.playerListTitle}>{teamName}</ThemedText>}
                <ThemedText>Análisis táctico no disponible para este equipo (no es TierS/SRed).</ThemedText>
              </View>
            );
        }
    }
    
    if (!showListForCurrentFocus || !analysisData) return null;

    const placedPlayerKeys = new Set(
      Object.values(placedPlayers) 
        .filter(p => p !== null)
        .map(p => `${p!.name}_${p!.number}`)
    );
    
    const displayablePlayers = (playersToList || []).filter(p => 
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
                disabled={!listIsEnabled}
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
    let boardIsEnabled = true;

    if (isCurrentTierS_vs_TierSred_Match) {
        if (currentTeamFocus !== tierS_TeamFocusInSvsSred) {
            const nonFocusTeamName = currentTeamFocus === 'home' ? analysisData?.homeTeamName : analysisData?.awayTeamName;
            return <ThemedText style={styles.tacticalSchemePlaceholderText}>Análisis táctico solo para el equipo TierS. {nonFocusTeamName} es TierSred.</ThemedText>;
        }
    } else if (!isCurrentTierS_vs_TierS_Match) { // No es S vs SRed NI S vs S
        if (currentTeamFocus === 'home' && !isTierSOrSRed(homeTeamActualTier) && analysisData) {
          return <ThemedText style={styles.tacticalSchemePlaceholderText}>Análisis táctico no disponible para {analysisData?.homeTeamName} (no es TierS/SRed).</ThemedText>;
        }
        if (currentTeamFocus === 'away' && !isTierSOrSRed(awayTeamActualTier) && analysisData) {
          return <ThemedText style={styles.tacticalSchemePlaceholderText}>Análisis táctico no disponible para {analysisData?.awayTeamName} (no es TierS/SRed).</ThemedText>;
        }
        if (!isTierSOrSRed(homeTeamActualTier) && !isTierSOrSRed(awayTeamActualTier) && analysisData) { 
          return <ThemedText style={styles.tacticalSchemePlaceholderText}>Análisis táctico no disponible (ningún equipo es TierS/SRed).</ThemedText>;
        }
    }
    // Para S vs S, el tablero siempre está habilitado para el equipo en foco.

    if (displayMessage) {
      return <ThemedText style={styles.tacticalSchemePlaceholderText}>{displayMessage}</ThemedText>;
    }

    if (!selectedFormation || fieldDimensions.width === 0) { 
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
    const outOfPositionColor = 'rgba(220, 50, 50, 0.7)'; 

    return (
      <View style={styles.fieldContainer}>
        <View style={[styles.fieldBorder, styles.fieldBorderTop]} />
        <View style={[styles.fieldBorder, styles.fieldBorderBottom]} />
        <View style={[styles.fieldBorder, styles.fieldBorderLeft]} />
        <View style={[styles.fieldBorder, styles.fieldBorderRight]} />
        {formationLayout.map((slot) => {
          const playerInSlot = placedPlayers[slot.id];
          let textContent: string | null = null;
          let currentSlotBackgroundColor = getSlotLineColor(slot.line);

          if (playerInSlot) {
            textContent = formatPlayerNameForField(playerInSlot.name) || playerInSlot.number || slot.label;
            if (!playerInSlot.assignedPositions || playerInSlot.assignedPositions.length === 0 || 
                !playerInSlot.assignedPositions.includes(slot.label as ActualPlayerPositionType)) {
              currentSlotBackgroundColor = outOfPositionColor;
            }
          } else { 
            textContent = slot.label;
          }

          const slotStyle = {
            position: 'absolute',
            top: `${slot.topRatio * 100}%`,
            left: `${slot.leftRatio * 100}%`,
            transform: [
              { translateX: -styles.slot.width / 2 },
              { translateY: -styles.slot.height / 2 }
            ],
          };

          return (
            <TouchableOpacity
              key={slot.id}
              style={[ styles.slot, { backgroundColor: currentSlotBackgroundColor }, slotStyle ]}
              onPress={() => boardIsEnabled && handleSelectSlotOnField(slot.id)}
              disabled={!boardIsEnabled}
            >
              {textContent ? (
                <ThemedText style={playerInSlot ? styles.slotPlayerName : styles.slotLabel} numberOfLines={playerInSlot ? 2 : 1} ellipsizeMode="tail">
                  {textContent}
                </ThemedText>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const showPlayerListAndBoard = 
    (isCurrentTierS_vs_TierSred_Match && currentTeamFocus === tierS_TeamFocusInSvsSred) ||
    isCurrentTierS_vs_TierS_Match || // Siempre mostrar para S vs S
    (!isCurrentTierS_vs_TierSred_Match && !isCurrentTierS_vs_TierS_Match && ( // Otros casos
        (currentTeamFocus === 'home' && isTierSOrSRed(homeTeamActualTier)) ||
        (currentTeamFocus === 'away' && isTierSOrSRed(awayTeamActualTier))
    ));


  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: `Análisis: ${matchIdentifier}` }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error && !isLoading && (
          <ThemedView style={styles.centeredError}><ThemedText style={styles.errorText}>{error}</ThemedText></ThemedView>
        )}
        
        <ThemedView style={styles.tacticalSchemeContainer} lightColor="#e0e0e0" darkColor="#1c1c1e" onLayout={onFieldLayout}>
          {isLoading && !analysisData && homeTeamActualTier === undefined ? ( 
             <ActivityIndicator size="small" style={{marginVertical: 20}}/>
          ) : (
            <RenderTacticalBoard />
          )}
        </ThemedView>
        
        {analysisData && !analysisData.error && !isLoading && showPlayerListAndBoard && ( 
          <>{renderPlayerList()}</>
        )}
         {!analysisData && !error && !isLoading && (
            <ThemedText style={{textAlign: 'center', marginTop: 20}}>No hay datos de análisis para mostrar.</ThemedText>
        )}

        {/* --- Botones de Siguiente y Cambiar Equipo --- */}
        {/* Caso TierS vs TierSred: Solo botón Siguiente para el equipo TierS */}
        {selectedFormation && areAllSlotsFilled() && isCurrentTierS_vs_TierSred_Match && currentTeamFocus === tierS_TeamFocusInSvsSred && analysisData && (
            <TouchableOpacity
                onPress={async () => {
                    await determineSaveKeyAndSave(currentTeamFocus, placedPlayers);
                    router.push({
                        pathname: '/tactical-summary',
                        params: {
                            lineup1: JSON.stringify(placedPlayers),
                            team1Name: (currentTeamFocus === 'home' ? analysisData.homeTeamName : analysisData.awayTeamName) || 'Equipo TierS',
                            formation: selectedFormation,
                            matchUrl: params.matchUrl, matchIdentifier: params.matchIdentifier,
                            teamAName: params.teamAName, teamATier: params.teamATier,
                            teamBName: params.teamBName, teamBTier: params.teamBTier,
                        }
                    });
                }}
                style={[styles.switchTeamButton, styles.nextScreenButton]}>
                <ThemedText style={styles.switchTeamButtonText}>Siguiente (Resumen)</ThemedText>
            </TouchableOpacity>
        )}

        {/* Caso TierS vs TierS: Botones de cambio y siguiente */}
        {isCurrentTierS_vs_TierS_Match && selectedFormation && areAllSlotsFilled() && currentTeamFocus === 'home' && analysisData && (
          <TouchableOpacity onPress={handleSwitchToAwayTeam} style={styles.switchTeamButton}>
            <ThemedText style={styles.switchTeamButtonText}>Crear Esquema Visitante (TierS)</ThemedText>
          </TouchableOpacity>
        )}
        {isCurrentTierS_vs_TierS_Match && selectedFormation && currentTeamFocus === 'away' && analysisData && (
          <TouchableOpacity onPress={handleSwitchToHomeTeam} style={styles.switchTeamButton}>
            <ThemedText style={styles.switchTeamButtonText}>Ver Esquema Local (TierS)</ThemedText>
          </TouchableOpacity>
        )}
        {isCurrentTierS_vs_TierS_Match && selectedFormation && areAllSlotsFilled() && currentTeamFocus === 'away' &&
         analysisData && homeLineupSnapshot && homeFormationSnapshot && areAllSlotsFilledForFormation(homeFormationSnapshot, homeLineupSnapshot) && (
          <TouchableOpacity
            onPress={async () => { 
                await determineSaveKeyAndSave('away', placedPlayers); 
                router.push({
                    pathname: '/tactical-summary',
                    params: {
                        homeLineup: JSON.stringify(homeLineupSnapshot),
                        awayLineup: JSON.stringify(placedPlayers),
                        homeTeamName: analysisData.homeTeamName,
                        awayTeamName: analysisData.awayTeamName,
                        formation: homeFormationSnapshot, // O selectedFormation si deben ser iguales
                        matchUrl: params.matchUrl, matchIdentifier: params.matchIdentifier,
                        teamAName: params.teamAName, teamATier: params.teamATier,
                        teamBName: params.teamBName, teamBTier: params.teamBTier,
                    }
                });
            }} style={[styles.switchTeamButton, styles.nextScreenButton]}>
            <ThemedText style={styles.switchTeamButtonText}>Siguiente (Resumen)</ThemedText>
          </TouchableOpacity>
        )}


        {/* Caso SRed vs SRed (u otro S/SRed vs S/SRed que no sea S vs S ni S vs SRed): */}
        {!isCurrentTierS_vs_TierSred_Match && !isCurrentTierS_vs_TierS_Match && 
         selectedFormation && areAllSlotsFilled() && currentTeamFocus === 'home' &&
         isTierSOrSRed(homeTeamActualTier) && isTierSOrSRed(awayTeamActualTier) && 
         analysisData?.awayPlayers && analysisData.awayPlayers.length > 0 && (
          <TouchableOpacity onPress={handleSwitchToAwayTeam} style={styles.switchTeamButton}>
            <ThemedText style={styles.switchTeamButtonText}>Crear Esquema Visitante ({awayTeamActualTier})</ThemedText>
          </TouchableOpacity>
        )}
        {!isCurrentTierS_vs_TierSred_Match && !isCurrentTierS_vs_TierS_Match && 
         selectedFormation && currentTeamFocus === 'away' &&
         isTierSOrSRed(homeTeamActualTier) && isTierSOrSRed(awayTeamActualTier) && 
         analysisData?.homePlayers && analysisData.homePlayers.length > 0 && (
          <TouchableOpacity onPress={handleSwitchToHomeTeam} style={styles.switchTeamButton}>
            <ThemedText style={styles.switchTeamButtonText}>Ver Esquema Local ({homeTeamActualTier})</ThemedText>
          </TouchableOpacity>
        )}
        {!isCurrentTierS_vs_TierSred_Match && !isCurrentTierS_vs_TierS_Match && 
         selectedFormation && areAllSlotsFilled() && currentTeamFocus === 'away' &&
         isTierSOrSRed(homeTeamActualTier) && isTierSOrSRed(awayTeamActualTier) && 
         analysisData && homeLineupSnapshot && homeFormationSnapshot && areAllSlotsFilledForFormation(homeFormationSnapshot, homeLineupSnapshot) && (
          <TouchableOpacity
            onPress={async () => { /* ... (similar a S vs S pero con tiers SRed) */ 
                await determineSaveKeyAndSave('away', placedPlayers);
                router.push({
                    pathname: '/tactical-summary',
                    params: {
                        homeLineup: JSON.stringify(homeLineupSnapshot),
                        awayLineup: JSON.stringify(placedPlayers),
                        homeTeamName: analysisData.homeTeamName,
                        awayTeamName: analysisData.awayTeamName,
                        formation: homeFormationSnapshot,
                        matchUrl: params.matchUrl, matchIdentifier: params.matchIdentifier,
                        teamAName: params.teamAName, teamATier: params.teamATier,
                        teamBName: params.teamBName, teamBTier: params.teamBTier,
                    }
                });
            }} style={[styles.switchTeamButton, styles.nextScreenButton]}>
            <ThemedText style={styles.switchTeamButtonText}>Siguiente (Resumen)</ThemedText>
          </TouchableOpacity>
        )}
        
        {/* Siguiente para S/SRed vs non-S/SRed (home) */}
        {!isCurrentTierS_vs_TierSred_Match && !isCurrentTierS_vs_TierS_Match && 
         selectedFormation && areAllSlotsFilled() && currentTeamFocus === 'home' &&
         isTierSOrSRed(homeTeamActualTier) && !isTierSOrSRed(awayTeamActualTier) && analysisData && (
          <TouchableOpacity
            onPress={async () => { 
                await determineSaveKeyAndSave(currentTeamFocus, placedPlayers);
                router.push({
                    pathname: '/tactical-summary',
                    params: {
                        lineup1: JSON.stringify(placedPlayers),
                        team1Name: analysisData.homeTeamName || 'Equipo Local',
                        formation: selectedFormation,
                        matchUrl: params.matchUrl, matchIdentifier: params.matchIdentifier,
                        teamAName: params.teamAName, teamATier: params.teamATier,
                        teamBName: params.teamBName, teamBTier: params.teamBTier,
                    }
                });
            }} style={[styles.switchTeamButton, styles.nextScreenButton]}>
            <ThemedText style={styles.switchTeamButtonText}>Siguiente (Resumen)</ThemedText>
          </TouchableOpacity>
        )}

        {/* Siguiente para S/SRed vs non-S/SRed (away) */}
        {!isCurrentTierS_vs_TierSred_Match && !isCurrentTierS_vs_TierS_Match && 
         selectedFormation && areAllSlotsFilled() && currentTeamFocus === 'away' &&
         !isTierSOrSRed(homeTeamActualTier) && isTierSOrSRed(awayTeamActualTier) && analysisData && (
          <TouchableOpacity
            onPress={async () => { 
                await determineSaveKeyAndSave(currentTeamFocus, placedPlayers);
                router.push({
                    pathname: '/tactical-summary',
                    params: {
                        lineup1: JSON.stringify(placedPlayers),
                        team1Name: analysisData.awayTeamName || 'Equipo Visitante',
                        formation: selectedFormation,
                        matchUrl: params.matchUrl, matchIdentifier: params.matchIdentifier,
                        teamAName: params.teamAName, teamATier: params.teamATier,
                        teamBName: params.teamBName, teamBTier: params.teamBTier,
                    }
                });
            }} style={[styles.switchTeamButton, styles.nextScreenButton]}>
            <ThemedText style={styles.switchTeamButtonText}>Siguiente (Resumen)</ThemedText>
          </TouchableOpacity>
        )}

        {selectedFormation && Object.values(placedPlayers).some(p => p !== null) && showPlayerListAndBoard && ( 
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
  tacticalSchemeContainer: {
    width: '95%', 
    aspectRatio: 0.75, 
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20, 
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
  fieldBorderTop: { top: '2%', left: '2%', right: '2%', height: 2, },
  fieldBorderBottom: { bottom: '2%', left: '2%', right: '2%', height: 2, },
  fieldBorderLeft: { top: '2%', bottom: '2%', left: '2%', width: 2, },
  fieldBorderRight: { top: '2%', bottom: '2%', right: '2%', width: 2, },
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
  slotLabel: { fontSize: 10, fontWeight: 'bold', color: '#fff', },
  slotPlayerName: { fontSize: 9, color: '#fff', textAlign: 'center', },
  playerListContainer: { marginBottom: 15, paddingHorizontal: 5, },
  playerListTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, },
  playerItemsWrapper: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', },
  playerItemButton: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', margin: 4, backgroundColor: '#f9f9f9' },
  playerItemButtonSelected: { backgroundColor: '#007AFF', borderColor: '#0056b3', },
  playerItemText: { fontSize: 12, color: '#333' },
  playerItemTextSelected: { color: '#fff', },
  clearButton: { marginTop: 20, marginBottom: 10, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#FF3B30', borderRadius: 8, alignSelf: 'center', },
  clearButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', },
  switchTeamButton: { marginTop: 15, marginBottom: 5, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#007AFF', borderRadius: 8, alignSelf: 'center', },
  switchTeamButtonText: { color: '#fff', fontSize: 16, },
  nextScreenButton: { backgroundColor: '#28a745', },
});
