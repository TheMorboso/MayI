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
  const LLUVIA_STATUS_CACHE_KEY = 'lluviaStatusCache';

  const normalizeString = (str: string | null | undefined): string => {
    return (str || '').toLowerCase().trim().replace(/\s+/g, '_');
  };

  const isTacticalAnalysisEnabledTier = (tier: TeamTierType | null | undefined): boolean => {
    return tier === "TierS" || tier === "TierSred" || tier === "World";
  };

  const updatePlayersCache = async (
    newPlayers: PlayerInfo[],
    teamName: string | null | undefined,
    teamTier: TeamTierType | null | undefined,
    teamManagerName: string | null | undefined
  ) => {
    if (!isTacticalAnalysisEnabledTier(teamTier)) { // MODIFIED
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

  const saveLluviaSelection = async (matchSaveKey: string, selection: 'SI' | 'NO' | null) => {
    if (!matchSaveKey) return;
    try {
      const existingLluviaJson = await AsyncStorage.getItem(LLUVIA_STATUS_CACHE_KEY);
      const lluviaCache: Record<string, 'SI' | 'NO'> = existingLluviaJson ? JSON.parse(existingLluviaJson) : {};
      if (selection) {
        lluviaCache[matchSaveKey] = selection;
      } else {
        delete lluviaCache[matchSaveKey];
      }
      await AsyncStorage.setItem(LLUVIA_STATUS_CACHE_KEY, JSON.stringify(lluviaCache));
    } catch (error) {
      console.error('Error al guardar la selección de Lluvia:', error);
    }
  };

  const loadLluviaSelection = async (matchSaveKey: string): Promise<'SI' | 'NO' | null> => {
    if (!matchSaveKey) return null;
    const existingLluviaJson = await AsyncStorage.getItem(LLUVIA_STATUS_CACHE_KEY);
    const lluviaCache: Record<string, 'SI' | 'NO'> = existingLluviaJson ? JSON.parse(existingLluviaJson) : {};
    return lluviaCache[matchSaveKey] || null;
  };


  const loadTacticalLineup = async (
    matchId: string,
    teamFocus: 'home' | 'away',
    isTierSvsSredMatch: boolean,
    isTierSvsTierSMatch: boolean,
    isWorldVsWorldMatch: boolean // NEW
  ): Promise<LoadTacticalLineupResult> => {
    if (!matchId) return { formation: null, players: null, loaded: false };

    const homeIsTactical = isTacticalAnalysisEnabledTier(homeTeamActualTier); // MODIFIED
    const awayIsTactical = isTacticalAnalysisEnabledTier(awayTeamActualTier); // MODIFIED
    let loadKey = matchId;

    if (isTierSvsSredMatch) { // S vs SRed (or World vs SRed, S vs World if World is S-like)
        loadKey = matchId;
    } else if (isTierSvsTierSMatch || isWorldVsWorldMatch) { // S vs S OR World vs World
        loadKey = teamFocus === 'home' ? matchId + "_home" : matchId + "_away";
    } else if (homeIsTactical && awayIsTactical) { // Other tactical vs tactical (e.g., SRed vs SRed, World vs S, World vs SRed)
        loadKey = teamFocus === 'home' ? matchId + "_home" : matchId + "_away";
    }
    // If single tactical team, loadKey remains matchId

    try {
      const existingLineupsJson = await AsyncStorage.getItem(TACTICAL_LINEUPS_CACHE_KEY);
      if (existingLineupsJson) {
        const lineupsCache: Record<string, { formation: FormationType; placedPlayers: Record<string, EnrichedPlayerInfo | null> }> = JSON.parse(existingLineupsJson);

        let lineupToLoad = lineupsCache[loadKey];
        if (!lineupToLoad && (isTierSvsTierSMatch || isWorldVsWorldMatch || (homeIsTactical && awayIsTactical && !isTierSvsSredMatch))) {
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
  const [lluviaSelection, setLluviaSelection] = useState<'SI' | 'NO' | null>(null);


  const isEditingMode = params.isEditing === 'true';
  const isFocused = useIsFocused();

  const areAllSlotsFilledForFormation = useCallback((formation: FormationType | null, players: Record<string, EnrichedPlayerInfo | null>): boolean => {
    if (!formation || !players) return false;
    const formationSlots = FORMATION_DEFINITIONS[formation];
    return formationSlots.every(slot => !!players[slot.id]);
  }, []);

  const areAllPlayersInIdealPosition = useCallback((
    lineup: Record<string, EnrichedPlayerInfo | null> | null,
    formation: FormationType | null
  ): boolean => {
    if (!formation || !lineup || !FORMATION_DEFINITIONS[formation] || !areAllSlotsFilledForFormation(formation, lineup)) {
      return false;
    }
    const currentFormationLayout = FORMATION_DEFINITIONS[formation];
    for (const slot of currentFormationLayout) {
      const playerInSlot = lineup[slot.id];
      if (playerInSlot) {
        if (!playerInSlot.assignedPositions || playerInSlot.assignedPositions.length === 0 ||
            !playerInSlot.assignedPositions.includes(slot.label as ActualPlayerPositionType)) {
          return false;
        }
      }
    }
    return true;
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

    if (!isTacticalAnalysisEnabledTier(determinedTierForFocus)) { // MODIFIED
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
      const homeIsWorld_Actual = determinedHomeTier === "World"; // NEW
      const awayIsWorld_Actual = determinedAwayTier === "World"; // NEW

      const isTierSvsSredCurrentMatch = (homeIsS_Actual && awayIsSRed_Actual) || (homeIsSRed_Actual && awayIsS_Actual);
      const isTierSvsTierSCurrentMatch = homeIsS_Actual && awayIsS_Actual;
      const isWorldVsWorldCurrentMatch = homeIsWorld_Actual && awayIsWorld_Actual; // NEW
      // Consider World vs S/SRed as similar to S vs SRed for focus
      const isWorldVsTacticalOtherCurrentMatch = 
        (homeIsWorld_Actual && (awayIsS_Actual || awayIsSRed_Actual)) ||
        (awayIsWorld_Actual && (homeIsS_Actual || homeIsSRed_Actual));


      let initialFocus: 'home' | 'away' = 'home';
      if (isTierSvsSredCurrentMatch) {
        initialFocus = homeIsS_Actual ? 'home' : 'away';
      } else if (isWorldVsTacticalOtherCurrentMatch) { // NEW
        initialFocus = homeIsWorld_Actual ? 'home' : 'away';
      } else if (isTierSvsTierSCurrentMatch || isWorldVsWorldCurrentMatch) { // MODIFIED
        initialFocus = 'home';
      } else if (isTacticalAnalysisEnabledTier(determinedHomeTier) && !isTacticalAnalysisEnabledTier(determinedAwayTier)) { // MODIFIED
        initialFocus = 'home';
      } else if (!isTacticalAnalysisEnabledTier(determinedHomeTier) && isTacticalAnalysisEnabledTier(determinedAwayTier)) { // MODIFIED
        initialFocus = 'away';
      }
      setCurrentTeamFocus(initialFocus);

      const coachDefault = await getCoachDefaultFormation(initialFocus, tempAnalysisData, determinedHomeTier, determinedAwayTier);
      let lineupLoadedFromStorage = false;

      if (matchUrl) {
        const loadResult = await loadTacticalLineup(matchUrl, initialFocus, isTierSvsSredCurrentMatch || isWorldVsTacticalOtherCurrentMatch, isTierSvsTierSCurrentMatch, isWorldVsWorldCurrentMatch); // MODIFIED
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
        }
      }

      if (!lineupLoadedFromStorage) {
        setSelectedFormation(coachDefault.formation);
        setDisplayMessage(coachDefault.message);
      }
      
      if (isTierSvsTierSCurrentMatch || isWorldVsWorldCurrentMatch) { // MODIFIED
        setLluviaSelection(null);
      } else {
        let lluviaKeyForLoad = matchUrl;
        if (isTierSvsSredCurrentMatch || isWorldVsTacticalOtherCurrentMatch) { /* usa clave base */ }
        else if (isTacticalAnalysisEnabledTier(determinedHomeTier) && isTacticalAnalysisEnabledTier(determinedAwayTier)) { // MODIFIED (e.g. SRed vs SRed, World vs SRed)
            lluviaKeyForLoad = initialFocus === 'home' ? matchUrl + "_home" : matchUrl + "_away"; 
        }
        const loadedLluvia = await loadLluviaSelection(lluviaKeyForLoad);
        setLluviaSelection(loadedLluvia);
      }

      const finalAnalysisData = {
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
      setAnalysisData(finalAnalysisData);
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
    const homeIsWorld = homeTeamActualTier === "World"; // NEW
    const awayIsWorld = awayTeamActualTier === "World"; // NEW

    let newFocus = currentTeamFocus;

    if ((homeIsS && awayIsSRed) || (homeIsWorld && awayIsSRed) || (homeIsS && awayIsWorld)) { // S vs SRed, World vs SRed, S vs World
        newFocus = homeIsS || homeIsWorld ? 'home' : 'away';
    } else if ((homeIsSRed && awayIsS) || (homeIsSRed && awayIsWorld) || (homeIsWorld && awayIsS)) { // SRed vs S, SRed vs World, World vs S
        newFocus = homeIsSRed || homeIsWorld ? 'home' : 'away';
    } else if ((homeIsS && awayIsS) || (homeIsWorld && awayIsWorld)) { // S vs S or World vs World
        newFocus = currentTeamFocus; // Keep current or default to home
    } else if (isTacticalAnalysisEnabledTier(homeTeamActualTier) && !isTacticalAnalysisEnabledTier(awayTeamActualTier)) { // MODIFIED
      newFocus = 'home';
    } else if (!isTacticalAnalysisEnabledTier(homeTeamActualTier) && isTacticalAnalysisEnabledTier(awayTeamActualTier)) { // MODIFIED
      newFocus = 'away';
    } else if (!isTacticalAnalysisEnabledTier(homeTeamActualTier) && !isTacticalAnalysisEnabledTier(awayTeamActualTier)) { // MODIFIED
      newFocus = 'home'; // Default if neither is tactical
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

  const determineMatchSaveKey = useCallback((
    teamFocus: 'home' | 'away',
    baseMatchUrl: string | undefined,
    currentHomeTier: TeamTierType | null | undefined,
    currentAwayTier: TeamTierType | null | undefined,
    isSvsSred: boolean, // Includes World vs S/SRed where World is S-like
    isSvsS: boolean,    // TierS vs TierS
    isWorldVsWorld: boolean // NEW
  ): string | null => {
    if (!baseMatchUrl) return null;
    if (isSvsSred) return baseMatchUrl; // Saved for the S-like team (TierS or World)
    if (isSvsS || isWorldVsWorld) return teamFocus === 'home' ? baseMatchUrl + "_home" : baseMatchUrl + "_away";
    // Both are tactical but not SvsSred, SvsS, or WvsW (e.g. SRedvsSRed, WorldvsSRed if World is SRed-like - though current SvsSred covers World as S-like)
    if (isTacticalAnalysisEnabledTier(currentHomeTier) && isTacticalAnalysisEnabledTier(currentAwayTier)) { // MODIFIED
        return teamFocus === 'home' ? baseMatchUrl + "_home" : baseMatchUrl + "_away";
    }
    return baseMatchUrl; // Single tactical team
  }, []);

  const determineSaveKeyAndSave = useCallback(async (teamToSave: 'home' | 'away', lineupToSave: Record<string, EnrichedPlayerInfo | null>) => {
    const homeIsS_Actual = homeTeamActualTier === "TierS";
    const awayIsS_Actual = awayTeamActualTier === "TierS";
    const homeIsSRed_Actual = homeTeamActualTier === "TierSred";
    const awayIsSRed_Actual = awayTeamActualTier === "TierSred";
    const homeIsWorld_Actual = homeTeamActualTier === "World"; // NEW
    const awayIsWorld_Actual = awayTeamActualTier === "World"; // NEW

    const isCurrentTierS_vs_TierS = homeIsS_Actual && awayIsS_Actual;
    const isCurrentTierS_vs_TierSred = (homeIsS_Actual && awayIsSRed_Actual) || (homeIsSRed_Actual && awayIsS_Actual);
    const isCurrentWorld_vs_World = homeIsWorld_Actual && awayIsWorld_Actual; // NEW
    // World vs S/SRed (where World is considered the "primary" tactical team for single save key)
    const isCurrentWorld_vs_TacticalOther = 
        (homeIsWorld_Actual && (awayIsS_Actual || awayIsSRed_Actual)) ||
        (awayIsWorld_Actual && (homeIsS_Actual || homeIsSRed_Actual));


    const keyToSave = determineMatchSaveKey(
        teamToSave, matchUrl, homeTeamActualTier, awayTeamActualTier, 
        isCurrentTierS_vs_TierSred || isCurrentWorld_vs_TacticalOther, // Treat World vs S/SRed like S vs SRed for key
        isCurrentTierS_vs_TierS,
        isCurrentWorld_vs_World
    );

    if (!keyToSave || !selectedFormation || !Object.values(lineupToSave).some(p => p !== null)) {
        return;
    }

    let shouldSave = false;
    if (isCurrentTierS_vs_TierSred) {
        const tierS_TeamIsHome = homeIsS_Actual;
        if ((tierS_TeamIsHome && teamToSave === 'home') || (!tierS_TeamIsHome && teamToSave === 'away')) {
            shouldSave = true;
        }
    } else if (isCurrentWorld_vs_TacticalOther) { // NEW
        const world_TeamIsHome = homeIsWorld_Actual;
         if ((world_TeamIsHome && teamToSave === 'home') || (!world_TeamIsHome && teamToSave === 'away')) {
            shouldSave = true;
        }
    } else if (isCurrentTierS_vs_TierS || isCurrentWorld_vs_World || (isTacticalAnalysisEnabledTier(homeTeamActualTier) && isTacticalAnalysisEnabledTier(awayTeamActualTier))) { // MODIFIED
        shouldSave = true;
    } else if (teamToSave === 'home' && isTacticalAnalysisEnabledTier(homeTeamActualTier)) { // MODIFIED
        shouldSave = true;
    } else if (teamToSave === 'away' && isTacticalAnalysisEnabledTier(awayTeamActualTier)) { // MODIFIED
        shouldSave = true;
    }

    if (shouldSave) {
        await saveTacticalLineup(keyToSave, selectedFormation, lineupToSave);

        let overallTacticalStatus: 'Neutro' | 'Rojo' | 'Naranja' | 'Verde' | null = null;
        const allFilledCurrentSide = areAllSlotsFilledForFormation(selectedFormation, lineupToSave);
        const idealPosCurrentSide = allFilledCurrentSide && areAllPlayersInIdealPosition(lineupToSave, selectedFormation);

        if (isCurrentTierS_vs_TierS || isCurrentWorld_vs_World) { // MODIFIED
            const homeDataKey = matchUrl + "_home";
            const awayDataKey = matchUrl + "_away";
            const homeData = teamToSave === 'home' ? { loaded: true, players: lineupToSave, formation: selectedFormation } : await loadSpecificLineupData(homeDataKey);
            const awayData = teamToSave === 'away' ? { loaded: true, players: lineupToSave, formation: selectedFormation } : await loadSpecificLineupData(awayDataKey);
            const homeComplete = homeData.loaded && homeData.formation && homeData.players && areAllSlotsFilledForFormation(homeData.formation, homeData.players);
            const awayComplete = awayData.loaded && awayData.formation && awayData.players && areAllSlotsFilledForFormation(awayData.formation, awayData.players);

            if (homeComplete && awayComplete) {
                overallTacticalStatus = 'Naranja';
            } else {
                const currentFocusData = teamToSave === 'home' ? homeData : awayData;
                if (currentFocusData.loaded && currentFocusData.formation && currentFocusData.players && areAllSlotsFilledForFormation(currentFocusData.formation, currentFocusData.players)) {
                    overallTacticalStatus = getLineupTacticalStatus(currentFocusData.players, currentFocusData.formation);
                } else {
                     overallTacticalStatus = getLineupTacticalStatus(currentFocusData.players, currentFocusData.formation);
                }
            }
        } else if (isCurrentTierS_vs_TierSred || isCurrentWorld_vs_TacticalOther) { // MODIFIED
            overallTacticalStatus = getLineupTacticalStatus(lineupToSave, selectedFormation);
        } else if (isTacticalAnalysisEnabledTier(homeTeamActualTier) && isTacticalAnalysisEnabledTier(awayTeamActualTier)) { // MODIFIED (e.g. SRed vs SRed)
            const homeData = await loadSpecificLineupData(matchUrl + "_home");
            const awayData = await loadSpecificLineupData(matchUrl + "_away");
            const homeStatus = homeData.loaded ? getLineupTacticalStatus(homeData.players, homeData.formation) : null;
            const awayStatus = awayData.loaded ? getLineupTacticalStatus(awayData.players, awayData.formation) : null;
            if (homeStatus === 'Rojo' || awayStatus === 'Rojo') {
                overallTacticalStatus = 'Rojo';
            } else if (homeStatus === 'Neutro' && awayStatus === 'Neutro') {
                overallTacticalStatus = 'Neutro';
            }
        } else { // Single Tactical Team (S, SRed, or World)
            overallTacticalStatus = getLineupTacticalStatus(lineupToSave, selectedFormation);
        }

        // Apply Lluvia if conditions are ideal, NOT for SvsS/WorldVsWorld and not if Naranja
        if (idealPosCurrentSide && lluviaSelection && overallTacticalStatus !== 'Naranja' && !isCurrentTierS_vs_TierS && !isCurrentWorld_vs_World) { // MODIFIED
            if (lluviaSelection === 'SI') overallTacticalStatus = 'Rojo';
            else if (lluviaSelection === 'NO') overallTacticalStatus = 'Verde';
        }

        const storedDataJson = await AsyncStorage.getItem(POST_SCUDETTO_DATA_KEY);
        if (storedDataJson) {
            let allMatches: PostScudettoMatchInfo[] = JSON.parse(storedDataJson);
            const decodedMatchUrl = decodeURIComponent(matchUrl!);
            const matchIndex = allMatches.findIndex(m => m.match === decodedMatchUrl);

            if (matchIndex !== -1) {
                const currentMatchStatus = allMatches[matchIndex].Status;
                if (currentMatchStatus !== 'Champion' && currentMatchStatus !== 'Post scudetto' && currentMatchStatus !== 'Negativo') {
                    if (overallTacticalStatus) {
                        allMatches[matchIndex].Status = overallTacticalStatus;
                    } else {
                        if (["Neutro", "Rojo", "Naranja", "Verde"].includes(currentMatchStatus || '')) {
                            allMatches[matchIndex].Status = null;
                        }
                    }
                }
                await AsyncStorage.setItem(POST_SCUDETTO_DATA_KEY, JSON.stringify(allMatches));
            }
        }
    }
}, [matchUrl, selectedFormation, homeTeamActualTier, awayTeamActualTier, getLineupTacticalStatus, areAllSlotsFilledForFormation, areAllPlayersInIdealPosition, POST_SCUDETTO_DATA_KEY, lluviaSelection, determineMatchSaveKey]);

  useEffect(() => {
    return () => {
        const performSaveAndStatusUpdate = async () => {
            const isSvsS = homeTeamActualTier === "TierS" && awayTeamActualTier === "TierS";
            const isWvsW = homeTeamActualTier === "World" && awayTeamActualTier === "World";
            const currentSaveKey = determineMatchSaveKey(currentTeamFocus, matchUrl, homeTeamActualTier, awayTeamActualTier, isCurrentTierS_vs_TierSred_Match || (homeTeamActualTier === "World" && isTierSOrSRed(awayTeamActualTier)) || (awayTeamActualTier === "World" && isTierSOrSRed(homeTeamActualTier)), isSvsS, isWvsW);
            
            if (currentSaveKey && lluviaSelection && !isSvsS && !isWvsW) { // MODIFIED: Don't save Lluvia for SvsS or WvsW
                 await saveLluviaSelection(currentSaveKey, lluviaSelection);
            }
            await determineSaveKeyAndSave(currentTeamFocus, placedPlayers);
        };
        performSaveAndStatusUpdate();
    };
  }, [determineSaveKeyAndSave, currentTeamFocus, placedPlayers, matchUrl, homeTeamActualTier, awayTeamActualTier, isCurrentTierS_vs_TierSred_Match, lluviaSelection, determineMatchSaveKey]);


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
    const isSvsS = homeTeamActualTier === "TierS" && awayTeamActualTier === "TierS";
    const isWvsW = homeTeamActualTier === "World" && awayTeamActualTier === "World";

    if (!isSvsS && !isWvsW && lluviaSelection) { // MODIFIED
        const homeSaveKey = determineMatchSaveKey('home', matchUrl, homeTeamActualTier, awayTeamActualTier, isCurrentTierS_vs_TierSred_Match || (homeTeamActualTier === "World" && isTierSOrSRed(awayTeamActualTier)), false, false);
        if (homeSaveKey) await saveLluviaSelection(homeSaveKey, lluviaSelection);
    }
    await determineSaveKeyAndSave('home', placedPlayers);
    setHomeLineupSnapshot(placedPlayers);
    setHomeFormationSnapshot(selectedFormation);
    setCurrentTeamFocus('away');

    const coachDefault = await getCoachDefaultFormation('away', analysisData!, homeTeamActualTier, awayTeamActualTier);
    if (matchUrl) {
      const loadResult = await loadTacticalLineup(matchUrl, 'away', false, isSvsS, isWvsW); // MODIFIED
      if (loadResult.loaded) {
        setDisplayMessage(null);
      } else {
        setSelectedFormation(coachDefault.formation);
        setDisplayMessage(coachDefault.message);
        if (coachDefault.formation) initializeBoardForCurrentFormation(); else setPlacedPlayers({});
      }

      if (isSvsS || isWvsW) { // MODIFIED
        setLluviaSelection(null);
      } else {
        const awaySaveKey = determineMatchSaveKey('away', matchUrl, homeTeamActualTier, awayTeamActualTier, isCurrentTierS_vs_TierSred_Match || (awayTeamActualTier === "World" && isTierSOrSRed(homeTeamActualTier)), false, false);
        if (awaySaveKey) setLluviaSelection(await loadLluviaSelection(awaySaveKey)); else setLluviaSelection(null);
      }
    } else {
        setSelectedFormation(coachDefault.formation);
        setDisplayMessage(coachDefault.message);
        if (coachDefault.formation) initializeBoardForCurrentFormation(); else setPlacedPlayers({});
        setLluviaSelection(null);
    }
  };

  const handleSwitchToHomeTeam = async () => {
    const isSvsS = homeTeamActualTier === "TierS" && awayTeamActualTier === "TierS";
    const isWvsW = homeTeamActualTier === "World" && awayTeamActualTier === "World";

    if (!isSvsS && !isWvsW && lluviaSelection) { // MODIFIED
        const awaySaveKey = determineMatchSaveKey('away', matchUrl, homeTeamActualTier, awayTeamActualTier, isCurrentTierS_vs_TierSred_Match || (awayTeamActualTier === "World" && isTierSOrSRed(homeTeamActualTier)), false, false);
        if (awaySaveKey) await saveLluviaSelection(awaySaveKey, lluviaSelection);
    }
    await determineSaveKeyAndSave('away', placedPlayers);
    setCurrentTeamFocus('home');

    const coachDefault = await getCoachDefaultFormation('home', analysisData!, homeTeamActualTier, awayTeamActualTier);
    if (matchUrl) {
      const loadResult = await loadTacticalLineup(matchUrl, 'home', false, isSvsS, isWvsW); // MODIFIED
      if (loadResult.loaded) {
        setDisplayMessage(null);
      } else {
        setSelectedFormation(coachDefault.formation);
        setDisplayMessage(coachDefault.message);
        if (coachDefault.formation) initializeBoardForCurrentFormation(); else setPlacedPlayers({});
      }
      if (isSvsS || isWvsW) { // MODIFIED
        setLluviaSelection(null);
      } else {
        const homeSaveKey = determineMatchSaveKey('home', matchUrl, homeTeamActualTier, awayTeamActualTier, isCurrentTierS_vs_TierSred_Match || (homeTeamActualTier === "World" && isTierSOrSRed(awayTeamActualTier)), false, false);
        if (homeSaveKey) setLluviaSelection(await loadLluviaSelection(homeSaveKey)); else setLluviaSelection(null);
      }
    } else {
        setSelectedFormation(coachDefault.formation);
        setDisplayMessage(coachDefault.message);
        if (coachDefault.formation) initializeBoardForCurrentFormation(); else setPlacedPlayers({});
        setLluviaSelection(null);
    }
  };

  const handleLluviaSelection = async (selection: 'SI' | 'NO') => {
    const isSvsS = homeTeamActualTier === "TierS" && awayTeamActualTier === "TierS";
    const isWvsW = homeTeamActualTier === "World" && awayTeamActualTier === "World";
    if (isSvsS || isWvsW) return; // MODIFIED

    setLluviaSelection(selection);
    const currentSaveKey = determineMatchSaveKey(
        currentTeamFocus, matchUrl, homeTeamActualTier, awayTeamActualTier,
        isCurrentTierS_vs_TierSred_Match || (homeTeamActualTier === "World" && isTierSOrSRed(awayTeamActualTier)) || (awayTeamActualTier === "World" && isTierSOrSRed(homeTeamActualTier)), 
        isSvsS, 
        isWvsW
    );
    if (currentSaveKey) {
        await saveLluviaSelection(currentSaveKey, selection);
    }
    await determineSaveKeyAndSave(currentTeamFocus, placedPlayers);
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
  const homeIsWorld_Actual = homeTeamActualTier === "World"; // NEW
  const awayIsWorld_Actual = awayTeamActualTier === "World"; // NEW

  const isCurrentTierS_vs_TierSred_Match = (homeIsS_Actual && awayIsSRed_Actual) || (homeIsSRed_Actual && awayIsS_Actual);
  const isCurrentTierS_vs_TierS_Match = homeIsS_Actual && awayIsS_Actual;
  const isCurrentWorld_vs_World_Match = homeIsWorld_Actual && awayIsWorld_Actual; // NEW
  // World vs S/SRed (where World is considered the "primary" tactical team for single save key)
  const isCurrentWorld_vs_TacticalOther_Match =  // NEW
        (homeIsWorld_Actual && (awayIsS_Actual || awayIsSRed_Actual)) ||
        (awayIsWorld_Actual && (homeIsS_Actual || homeIsSRed_Actual));


  const tierS_TeamFocusInSvsSred: 'home' | 'away' | null = // Also applies to World vs S/SRed
      (isCurrentTierS_vs_TierSred_Match || isCurrentWorld_vs_TacticalOther_Match) ? 
      (homeIsS_Actual || homeIsWorld_Actual ? 'home' : 'away') : null;


  const renderPlayerList = () => {
    let playersToList: EnrichedPlayerInfo[] | undefined = [];
    let listTitle = "Jugadores";
    let showListForCurrentFocus = false;
    let listIsEnabled = true;

    if (isCurrentTierS_vs_TierSred_Match || isCurrentWorld_vs_TacticalOther_Match) { // MODIFIED
        if (currentTeamFocus === tierS_TeamFocusInSvsSred) { // tierS_TeamFocusInSvsSred now considers World as the "S-like" team
            playersToList = currentTeamFocus === 'home' ? analysisData?.homePlayers : analysisData?.awayPlayers;
            const focusedTeamName = currentTeamFocus === 'home' ? analysisData?.homeTeamName : analysisData?.awayTeamName;
            const focusedTeamTier = currentTeamFocus === 'home' ? homeTeamActualTier : awayTeamActualTier;
            listTitle = `Alineación ${focusedTeamName} (${focusedTeamTier})`;
            showListForCurrentFocus = true;
        } else {
            const teamName = currentTeamFocus === 'home' ? analysisData?.homeTeamName : analysisData?.awayTeamName;
            const otherTeamTier = currentTeamFocus === 'home' ? awayTeamActualTier : homeTeamActualTier;
            return (
                <View style={styles.playerListContainer}>
                  {teamName && <ThemedText type="label" style={styles.playerListTitle}>{teamName} ({otherTeamTier})</ThemedText>}
                  <ThemedText>Análisis táctico solo para el equipo {homeIsS_Actual || homeIsWorld_Actual ? "local" : "visitante"} en este enfrentamiento.</ThemedText>
                </View>
            );
        }
    } else if (isCurrentTierS_vs_TierS_Match || isCurrentWorld_vs_World_Match) { // MODIFIED
        playersToList = currentTeamFocus === 'home' ? analysisData?.homePlayers : analysisData?.awayPlayers;
        const focusedTeamName = currentTeamFocus === 'home' ? analysisData?.homeTeamName : analysisData?.awayTeamName;
        const focusedTeamTier = currentTeamFocus === 'home' ? homeTeamActualTier : awayTeamActualTier;
        listTitle = `Alineación ${focusedTeamName} (${focusedTeamTier})`;
        showListForCurrentFocus = true;
    } else { // Other cases (SRed vs SRed, single tactical team vs non-tactical)
        if (currentTeamFocus === 'home' && isTacticalAnalysisEnabledTier(homeTeamActualTier)) { // MODIFIED
            playersToList = analysisData?.homePlayers;
            listTitle = `Alineación ${analysisData?.homeTeamName || 'Local'} (${homeTeamActualTier})`;
            showListForCurrentFocus = true;
        } else if (currentTeamFocus === 'away' && isTacticalAnalysisEnabledTier(awayTeamActualTier)) { // MODIFIED
            playersToList = analysisData?.awayPlayers;
            listTitle = `Alineación ${analysisData?.awayTeamName || 'Visitante'} (${awayTeamActualTier})`;
            showListForCurrentFocus = true;
        } else if (analysisData) {
            const teamName = currentTeamFocus === 'home' ? analysisData?.homeTeamName : analysisData?.awayTeamName;
            return (
              <View style={styles.playerListContainer}>
                {teamName && <ThemedText type="label" style={styles.playerListTitle}>{teamName}</ThemedText>}
                <ThemedText>Análisis táctico no disponible para este equipo (no es TierS/SRed/World).</ThemedText>
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

    if (isCurrentTierS_vs_TierSred_Match || isCurrentWorld_vs_TacticalOther_Match) { // MODIFIED
        if (currentTeamFocus !== tierS_TeamFocusInSvsSred) { // tierS_TeamFocusInSvsSred considers World as S-like
            const nonFocusTeamName = currentTeamFocus === 'home' ? analysisData?.homeTeamName : analysisData?.awayTeamName;
            const primaryTacticalTeamName = tierS_TeamFocusInSvsSred === 'home' ? analysisData?.homeTeamName : analysisData?.awayTeamName;
            return <ThemedText style={styles.tacticalSchemePlaceholderText}>Análisis táctico solo para {primaryTacticalTeamName}. {nonFocusTeamName} es el otro equipo.</ThemedText>;
        }
    } else if (!isCurrentTierS_vs_TierS_Match && !isCurrentWorld_vs_World_Match) { // MODIFIED
        if (currentTeamFocus === 'home' && !isTacticalAnalysisEnabledTier(homeTeamActualTier) && analysisData) { // MODIFIED
          return <ThemedText style={styles.tacticalSchemePlaceholderText}>Análisis táctico no disponible para {analysisData?.homeTeamName} (no es TierS/SRed/World).</ThemedText>;
        }
        if (currentTeamFocus === 'away' && !isTacticalAnalysisEnabledTier(awayTeamActualTier) && analysisData) { // MODIFIED
          return <ThemedText style={styles.tacticalSchemePlaceholderText}>Análisis táctico no disponible para {analysisData?.awayTeamName} (no es TierS/SRed/World).</ThemedText>;
        }
        if (!isTacticalAnalysisEnabledTier(homeTeamActualTier) && !isTacticalAnalysisEnabledTier(awayTeamActualTier) && analysisData) { // MODIFIED
          return <ThemedText style={styles.tacticalSchemePlaceholderText}>Análisis táctico no disponible (ningún equipo es TierS/SRed/World).</ThemedText>;
        }
    }

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

  const showPlayerListAndBoard = // MODIFIED
    ( (isCurrentTierS_vs_TierSred_Match || isCurrentWorld_vs_TacticalOther_Match) && currentTeamFocus === tierS_TeamFocusInSvsSred) ||
    isCurrentTierS_vs_TierS_Match || isCurrentWorld_vs_World_Match ||
    (!(isCurrentTierS_vs_TierSred_Match || isCurrentWorld_vs_TacticalOther_Match) && !isCurrentTierS_vs_TierS_Match && !isCurrentWorld_vs_World_Match && (
        (currentTeamFocus === 'home' && isTacticalAnalysisEnabledTier(homeTeamActualTier)) ||
        (currentTeamFocus === 'away' && isTacticalAnalysisEnabledTier(awayTeamActualTier))
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

        {/* Switch buttons for TierS vs TierS OR World vs World */}
        {(isCurrentTierS_vs_TierS_Match || isCurrentWorld_vs_World_Match) && selectedFormation && currentTeamFocus === 'home' && analysisData && ( // MODIFIED
          <TouchableOpacity onPress={handleSwitchToAwayTeam} style={styles.switchTeamButton}>
            <ThemedText style={styles.switchTeamButtonText}>Crear Esquema Visitante ({awayTeamActualTier})</ThemedText>
          </TouchableOpacity>
        )}
        {(isCurrentTierS_vs_TierS_Match || isCurrentWorld_vs_World_Match) && selectedFormation && currentTeamFocus === 'away' && analysisData && ( // MODIFIED
          <TouchableOpacity onPress={handleSwitchToHomeTeam} style={styles.switchTeamButton}>
            <ThemedText style={styles.switchTeamButtonText}>Ver Esquema Local ({homeTeamActualTier})</ThemedText>
          </TouchableOpacity>
        )}

        {/* Switch buttons for other tactical vs tactical (e.g. SRed vs SRed, World vs SRed) */}
        {!(isCurrentTierS_vs_TierSred_Match || isCurrentWorld_vs_TacticalOther_Match) && !isCurrentTierS_vs_TierS_Match && !isCurrentWorld_vs_World_Match && // MODIFIED
         selectedFormation && areAllSlotsFilled() && currentTeamFocus === 'home' &&
         isTacticalAnalysisEnabledTier(homeTeamActualTier) && isTacticalAnalysisEnabledTier(awayTeamActualTier) && // MODIFIED
         analysisData?.awayPlayers && analysisData.awayPlayers.length > 0 && (
          <TouchableOpacity onPress={handleSwitchToAwayTeam} style={styles.switchTeamButton}>
            <ThemedText style={styles.switchTeamButtonText}>Crear Esquema Visitante ({awayTeamActualTier})</ThemedText>
          </TouchableOpacity>
        )}
        {!(isCurrentTierS_vs_TierSred_Match || isCurrentWorld_vs_TacticalOther_Match) && !isCurrentTierS_vs_TierS_Match && !isCurrentWorld_vs_World_Match && // MODIFIED
         selectedFormation && currentTeamFocus === 'away' &&
         isTacticalAnalysisEnabledTier(homeTeamActualTier) && isTacticalAnalysisEnabledTier(awayTeamActualTier) && // MODIFIED
         analysisData?.homePlayers && analysisData.homePlayers.length > 0 && (
          <TouchableOpacity onPress={handleSwitchToHomeTeam} style={styles.switchTeamButton}>
            <ThemedText style={styles.switchTeamButtonText}>Ver Esquema Local ({homeTeamActualTier})</ThemedText>
          </TouchableOpacity>
        )}

        {selectedFormation && Object.values(placedPlayers).some(p => p !== null) && showPlayerListAndBoard && (
          <TouchableOpacity onPress={handleClearBoard} style={styles.clearButton}>
            <ThemedText style={styles.clearButtonText}>Limpiar Esquema</ThemedText>
          </TouchableOpacity>
        )}

        {/* Sección Lluvia (conditionally rendered) */}
        {!(isCurrentTierS_vs_TierS_Match || isCurrentWorld_vs_World_Match) && analysisData && !analysisData.error && !isLoading && showPlayerListAndBoard && areAllSlotsFilled() && ( // MODIFIED
          <View style={styles.lluviaSectionContainer}>
            <ThemedText style={styles.lluviaTitle}>Lluvia:</ThemedText>
            <View style={styles.lluviaButtonsContainer}>
              <TouchableOpacity
                style={[styles.lluviaButton, lluviaSelection === 'SI' && styles.lluviaButtonSelectedSI]}
                onPress={() => handleLluviaSelection('SI')}
              >
                <ThemedText style={[styles.lluviaButtonText, lluviaSelection === 'SI' && styles.lluviaButtonTextSelected]}>
                  SI
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.lluviaButton, lluviaSelection === 'NO' && styles.lluviaButtonSelectedNO]}
                onPress={() => handleLluviaSelection('NO')}
              >
                <ThemedText style={[styles.lluviaButtonText, lluviaSelection === 'NO' && styles.lluviaButtonTextSelected]}>
                  NO
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
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
  lluviaSectionContainer: {
    marginTop: 20,
    marginBottom: 15,
    alignItems: 'center',
  },
  lluviaTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  lluviaButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '60%',
  },
  lluviaButton: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  lluviaButtonSelectedSI: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  lluviaButtonSelectedNO: { backgroundColor: '#34C759', borderColor: '#34C759' },
  lluviaButtonText: { fontSize: 16, color: '#007AFF' },
  lluviaButtonTextSelected: { color: '#fff', fontWeight: 'bold' },
});
