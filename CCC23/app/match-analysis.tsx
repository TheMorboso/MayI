// match-analysis.tsx
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

const FORMATIONS_ARRAY = ["4-2-3-1", "4-4-2", "4-3-3"] as const;
type FormationType = typeof FORMATIONS_ARRAY[number];

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
    { id: 'rdm', label: 'MCD', line: 'MID', topRatio: 0.58, leftRatio: 0.63 },
    { id: 'ldm', label: 'MCD', line: 'MID', topRatio: 0.58, leftRatio: 0.37 },
    { id: 'ram', label: 'MPD', line: 'MID', topRatio: 0.38, leftRatio: 0.85 },
    { id: 'cam', label: 'MCO', line: 'MID', topRatio: 0.38, leftRatio: 0.5 },
    { id: 'lam', label: 'MPI', line: 'MID', topRatio: 0.38, leftRatio: 0.15 },
    { id: 'st', label: 'DC', line: 'FWD', topRatio: 0.15, leftRatio: 0.5 },
  ],
  "4-3-3": [
    { id: 'gk', label: 'POR', line: 'GK', topRatio: 0.92, leftRatio: 0.5 },
    { id: 'rb', label: 'LD', line: 'DEF', topRatio: 0.75, leftRatio: 0.88 },
    { id: 'rcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.63 },
    { id: 'lcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.37 },
    { id: 'lb', label: 'LI', line: 'DEF', topRatio: 0.75, leftRatio: 0.12 },
    { id: 'rcm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.78 },
    { id: 'cm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.5 },
    { id: 'lcm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.22 },
    { id: 'rw', label: 'ED', line: 'FWD', topRatio: 0.22, leftRatio: 0.88 },
    { id: 'st', label: 'DC', line: 'FWD', topRatio: 0.22, leftRatio: 0.5 },
    { id: 'lw', label: 'EI', line: 'FWD', topRatio: 0.22, leftRatio: 0.12 },
  ],
};
// --- FIN DEFINICIONES ---

export default function MatchAnalysisScreen() {
  const PLAYERS_CACHE_KEY = 'playersGlobalCache';
  const TACTICAL_LINEUPS_CACHE_KEY = 'tacticalLineupsCache';

  const normalizeString = (str: string | null | undefined): string => {
    return (str || '').toLowerCase().trim().replace(/\s+/g, '_');
  };

  const updatePlayersCache = async (
    newPlayers: PlayerInfo[],
    teamTier: TeamTierType | null | undefined,
    teamManagerName: string | null | undefined
  ) => {
    if (!isTierSOrSRed(teamTier)) {
      return;
    }
    try {
      const existingCacheJson = await AsyncStorage.getItem(PLAYERS_CACHE_KEY);
      const cache: Record<string, { name: string | null; isManager?: boolean }> = existingCacheJson
        ? JSON.parse(existingCacheJson)
        : {};
      let cacheWasUpdated = false;

      if (newPlayers && newPlayers.length > 0) {
        for (const player of newPlayers) {
          if (!player.name) continue;
          const playerId = normalizeString(player.name);
          if (!cache[playerId]) {
            cache[playerId] = { name: player.name };
            cacheWasUpdated = true;
            console.log(`[CacheGlobal] Jugador Agregado: ${playerId}`);
          }
        }
      }

      if (teamManagerName) {
        const managerId = normalizeString(teamManagerName);
        if (!cache[managerId]) {
          cache[managerId] = { name: teamManagerName, isManager: true };
          cacheWasUpdated = true;
          console.log(`[CacheGlobal] Entrenador Agregado: ${managerId}`);
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
    // Solo guardar si hay al menos un jugador colocado (además del GK si se autocompleta)
    const hasPlacedPlayers = Object.values(lineup).some(p => p !== null);
    if (!hasPlacedPlayers) {
        console.log(`[TacticalLineup] No se guardó para ${matchId} porque no hay jugadores colocados.`);
        return;
    }

    try {
      const existingLineupsJson = await AsyncStorage.getItem(TACTICAL_LINEUPS_CACHE_KEY);
      const lineupsCache: Record<string, { formation: FormationType; placedPlayers: Record<string, PlayerInfo | null> }> = existingLineupsJson
        ? JSON.parse(existingLineupsJson)
        : {};

      lineupsCache[matchId] = { formation, placedPlayers: lineup };
      await AsyncStorage.setItem(TACTICAL_LINEUPS_CACHE_KEY, JSON.stringify(lineupsCache));
      console.log(`[TacticalLineup] Alineación guardada para ${matchId}`);
    } catch (error) {
      console.error('Error al guardar la alineación táctica:', error);
    }
  };

  const loadTacticalLineup = async (matchId: string, teamFocus: 'home' | 'away') => {
    if (!matchId) return;
    // Determinar la clave correcta para cargar basada en el foco actual y si es un partido de dos TierS
    const homeIsS = isTierSOrSRed(homeTeamActualTier); // Necesita los tiers actuales, puede ser problemático si se llama antes de que se establezcan
    const awayIsS = isTierSOrSRed(awayTeamActualTier);
    let loadKey = matchId;

    // Esta lógica de carga diferenciada es compleja aquí porque los tiers pueden no estar listos.
    // Simplificación: Cargar la clave base. Si se guardaron diferenciadas, el usuario las verá al cambiar de equipo.
    // O, si se quiere una carga más inteligente, `loadTacticalLineup` debería llamarse DESPUÉS de que los tiers estén definidos.
    // Por ahora, cargaremos la clave base o la específica del foco si es relevante.
    if (homeIsS && awayIsS) { // Si ambos son TierS, la clave guardada podría ser específica del equipo
        loadKey = teamFocus === 'home' ? matchId + "_home" : matchId + "_away";
    }


    try {
      const existingLineupsJson = await AsyncStorage.getItem(TACTICAL_LINEUPS_CACHE_KEY);
      if (existingLineupsJson) {
        const lineupsCache: Record<string, { formation: FormationType; placedPlayers: Record<string, PlayerInfo | null> }> = JSON.parse(existingLineupsJson);
        
        let lineupToLoad = lineupsCache[loadKey];
        // Fallback a la clave base si la específica no se encuentra (ej. primera carga del partido)
        if (!lineupToLoad && (homeIsS && awayIsS)) {
            lineupToLoad = lineupsCache[matchId];
        }

        if (lineupToLoad) {
          const { formation, placedPlayers: loadedPlacedPlayers } = lineupToLoad;
          setSelectedFormation(formation); 
          setPlacedPlayers(loadedPlacedPlayers); 
          console.log(`[TacticalLineup] Alineación cargada para ${loadKey}: Formación ${formation}`);
          return true; // Indicar que se cargó una alineación
        }
      }
      return false; // Indicar que no se cargó nada
    } catch (error) {
      console.error('Error al cargar la alineación táctica:', error);
      return false;
    }
  };


  const params = useLocalSearchParams<{
    matchUrl: string;
    matchIdentifier?: string;
    teamAName?: string;
    teamATier?: string;
    teamBName?: string;
    teamBTier?: string;
  }>();
  const router = useRouter();
  const matchUrl = params.matchUrl ? decodeURIComponent(params.matchUrl) : undefined;
  const matchIdentifier = params.matchIdentifier ? decodeURIComponent(params.matchIdentifier) : 'Partido';

  const [analysisData, setAnalysisData] = useState<MatchAnalysisDetails | null>(null);
  const [homeTeamActualTier, setHomeTeamActualTier] = useState<TeamTierType | null | undefined>(undefined);
  const [awayTeamActualTier, setAwayTeamActualTier] = useState<TeamTierType | null | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedFormation, setSelectedFormation] = useState<FormationType>("4-2-3-1");
  
  const [playerToPlace, setPlayerToPlace] = useState<PlayerInfo | null>(null);
  const [placedPlayers, setPlacedPlayers] = useState<Record<string, PlayerInfo | null>>({});
  const [fieldDimensions, setFieldDimensions] = useState({ width: 0, height: 0 });
  const [currentTeamFocus, setCurrentTeamFocus] = useState<'home' | 'away'>('home');
  const [homeLineupSnapshot, setHomeLineupSnapshot] = useState<Record<string, PlayerInfo | null> | null>(null);

  const isTierSOrSRed = (tier: TeamTierType | null | undefined): boolean => {
    return tier === "TierS" || tier === "TierSred";
  };

  // Efecto para inicializar el tablero cuando cambia la formación
  // Este efecto ahora es más simple, solo inicializa si no se cargó nada.
  useEffect(() => {
    if (selectedFormation) {
        // Si placedPlayers está vacío (o no tiene la estructura de la formación actual), inicializar.
        // Esto permite que loadTacticalLineup establezca los jugadores primero.
        const currentFormationSlots = FORMATION_DEFINITIONS[selectedFormation].map(s => s.id);
        const placedPlayerKeysMatchFormation = currentFormationSlots.every(slotId => slotId in placedPlayers);

        if (Object.keys(placedPlayers).length === 0 || !placedPlayerKeysMatchFormation) {
            const initialSlots: Record<string, PlayerInfo | null> = {};
            FORMATION_DEFINITIONS[selectedFormation].forEach(slot => {
                initialSlots[slot.id] = null;
            });
            setPlacedPlayers(initialSlots);
        }
        setPlayerToPlace(null);
        setHomeLineupSnapshot(null);
    } else {
      setPlacedPlayers({});
    }
  }, [selectedFormation]);


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

      // Ahora cargar la alineación táctica
      if (matchUrl) {
        await loadTacticalLineup(matchUrl, initialFocus);
      }
      
      // Finalmente, establecer los datos del análisis y actualizar caché de jugadores
      setAnalysisData(tempAnalysisData);
      if (tempAnalysisData.homePlayers) {
        await updatePlayersCache(tempAnalysisData.homePlayers, determinedHomeTier, tempAnalysisData.homeManager);
      }
      if (tempAnalysisData.awayPlayers) {
        await updatePlayersCache(tempAnalysisData.awayPlayers, determinedAwayTier, tempAnalysisData.awayManager);
      }
      setIsLoading(false);
    };

    fetchAndLoad();
  }, [matchUrl, params.teamAName, params.teamATier, params.teamBName, params.teamBTier]); // Dependencias clave para la carga inicial


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


  // Guardar alineación al desmontar el componente
  useEffect(() => {
    return () => {
      if (matchUrl && selectedFormation && Object.keys(placedPlayers).length > 0) {
        const homeIsS = isTierSOrSRed(homeTeamActualTier);
        const awayIsS = isTierSOrSRed(awayTeamActualTier);
        let keyToSave = matchUrl;

        if (homeIsS && awayIsS) { // Si ambos son TierS, guardar con clave específica del foco
            keyToSave = currentTeamFocus === 'home' ? matchUrl + "_home" : matchUrl + "_away";
        } else if (!homeIsS && !awayIsS) { // No guardar si ninguno es TierS
            return;
        }
        // Si solo uno es TierS, se guarda con la clave base (matchUrl),
        // y el currentTeamFocus ya debería estar en ese equipo TierS.
        
        // Solo guardar si el equipo en foco es TierS o TierSred
        const currentFocusIsTierS = (currentTeamFocus === 'home' && homeIsS) || (currentTeamFocus === 'away' && awayIsS);
        if (currentFocusIsTierS) {
            saveTacticalLineup(keyToSave, selectedFormation, placedPlayers);
        }
      }
    };
  }, [matchUrl, selectedFormation, placedPlayers, homeTeamActualTier, awayTeamActualTier, currentTeamFocus]);


  const initializeBoardForCurrentFormation = useCallback(() => {
    if (selectedFormation) {
        const initialSlots: Record<string, PlayerInfo | null> = {};
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

  const handleSwitchToAwayTeam = () => {
    const homeIsS = isTierSOrSRed(homeTeamActualTier);
    if (matchUrl && selectedFormation && homeIsS) {
        saveTacticalLineup(matchUrl + "_home", selectedFormation, placedPlayers);
    }
    setCurrentTeamFocus('away');
    setHomeLineupSnapshot(placedPlayers); 
    // Intentar cargar la alineación del equipo visitante si existe
    if (matchUrl) loadTacticalLineup(matchUrl, 'away').then(loaded => {
        if (!loaded) initializeBoardForCurrentFormation(); // Inicializar si no se cargó nada
    });
    else initializeBoardForCurrentFormation();
  };

  const handleSwitchToHomeTeam = () => {
    const awayIsS = isTierSOrSRed(awayTeamActualTier);
    if (matchUrl && selectedFormation && awayIsS && homeLineupSnapshot) { 
        saveTacticalLineup(matchUrl + "_away", selectedFormation, placedPlayers);
    }
    setCurrentTeamFocus('home');
    // Intentar cargar la alineación del equipo local si existe
    if (matchUrl) loadTacticalLineup(matchUrl, 'home').then(loaded => {
        if (!loaded) initializeBoardForCurrentFormation();
    });
    else initializeBoardForCurrentFormation();
  };

  const areAllSlotsFilled = useCallback(() => {
    if (!selectedFormation) return false;
    const formationSlots = FORMATION_DEFINITIONS[selectedFormation];
    return formationSlots.every(slot => !!placedPlayers[slot.id]);
  }, [selectedFormation, placedPlayers]); 

  const handleSelectPlayerFromList = (player: PlayerInfo) => {
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

    let playersToList: PlayerInfo[] | undefined = [];
    let listTitle = "";
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
                  {player.number ? `${player.number}. ` : ''}{formatPlayerNameForField(player.name)}
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

    if (!homeIsS && !awayIsS && analysisData) { 
      return <ThemedText style={styles.tacticalSchemePlaceholderText}>Análisis táctico no disponible (ningún equipo es TierS/SRed).</ThemedText>;
    }
    if (currentTeamFocus === 'home' && !homeIsS && analysisData) {
      return <ThemedText style={styles.tacticalSchemePlaceholderText}>Análisis táctico no disponible para {analysisData?.homeTeamName} (no es TierS/SRed).</ThemedText>;
    }
    if (currentTeamFocus === 'away' && !awayIsS && analysisData) {
      return <ThemedText style={styles.tacticalSchemePlaceholderText}>Análisis táctico no disponible para {analysisData?.awayTeamName} (no es TierS/SRed).</ThemedText>;
    }

    if (!selectedFormation || fieldDimensions.width === 0) {
      return (
        <ThemedText style={styles.tacticalSchemePlaceholderText}>
          {selectedFormation ? (isLoading ? "Cargando..." : "Calculando campo...") : "Selecciona una formación"}
        </ThemedText>
      );
    }

    const formationLayout = FORMATION_DEFINITIONS[selectedFormation];

    const getSlotBackgroundColor = (line: FormationSlot['line']) => {
      if (line === 'GK') return 'rgba(255, 235, 150, 0.7)'; 
      if (line === 'DEF') return 'rgba(170, 210, 255, 0.7)'; 
      if (line === 'MID') return 'rgba(160, 240, 160, 0.7)'; 
      if (line === 'FWD') return 'rgba(255, 180, 180, 0.7)'; 
      return 'rgba(200, 200, 200, 0.7)'; 
    };

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
                { backgroundColor: getSlotBackgroundColor(slot.line) },
                slotStyle,
                playerInSlot && styles.slotFilled]}
              onPress={() => handleSelectSlotOnField(slot.id)}
            >
              {textContent ? (
                <ThemedText style={styles[textStyleKey]} numberOfLines={textStyleKey === 'slotPlayerName' ? 2 : 1} ellipsizeMode="tail">
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
        
        <View style={styles.formationSelectorContainer}>
          {FORMATIONS_ARRAY.map((formation) => (
            <TouchableOpacity
              key={formation}
              style={[
                styles.formationButton,
                selectedFormation === formation && styles.formationButtonSelected,
              ]}
              onPress={() => setSelectedFormation(formation)} // Esto ahora solo cambia la formación, la carga se maneja en useEffect
            >
              <ThemedText
                style={[
                  styles.formationButtonText,
                  selectedFormation === formation && styles.formationButtonTextSelected,
                ]}
              >
                {formation}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <ThemedView 
          style={styles.tacticalSchemeContainer} 
          lightColor="#e0e0e0"
          darkColor="#1c1c1e"
          onLayout={onFieldLayout}
        >
          {isLoading && !analysisData && homeTeamActualTier === undefined ? ( 
             <ActivityIndicator size="small" />
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
              if (matchUrl) { 
                saveTacticalLineup(matchUrl, selectedFormation, placedPlayers);
              }
              router.push({
                pathname: '/tactical-summary',
                params: {
                  lineup1: JSON.stringify(placedPlayers), 
                  team1Name: analysisData.homeTeamName || 'Local',
                  formation: selectedFormation,
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
              if (matchUrl) { 
                saveTacticalLineup(matchUrl, selectedFormation, placedPlayers);
              }
              router.push({
                pathname: '/tactical-summary',
                params: {
                  lineup1: JSON.stringify(placedPlayers), 
                  team1Name: analysisData.awayTeamName || 'Visitante',
                  formation: selectedFormation,
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
              if (matchUrl) { 
                saveTacticalLineup(matchUrl + "_away", selectedFormation, placedPlayers);
                // La del local ya se guardó al cambiar a visitante
              }
              router.push({
                pathname: '/tactical-summary',
                params: {
                  homeLineup: JSON.stringify(homeLineupSnapshot),
                  awayLineup: JSON.stringify(placedPlayers),
                  formation: selectedFormation,
                  homeTeamName: analysisData.homeTeamName || 'Local',
                  awayTeamName: analysisData.awayTeamName || 'Visitante',
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
  formationSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 15,
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
    marginBottom: 20,
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
  slotFilled: {
    borderColor: '#fff', 
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  slotLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff', 
  },
  slotPlayerName: {
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
