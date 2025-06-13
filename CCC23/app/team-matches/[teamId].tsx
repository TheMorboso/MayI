// c/Users/Mauri/Desktop/CCC23/MayI/CCC23/app/team-matches/[teamId].tsx
import React, { useEffect, useState, useCallback } from 'react';
import { FlatList, ActivityIndicator, StyleSheet, View, Image, TouchableOpacity, Alert, Modal, Button, Platform, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, Stack, useRouter, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PostScudettoMatchInfo } from '@/api/postscudetto';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { PlayerInfo, scrapeMatchAnalysis } from '@/api/analisis'; // Removed VALID_POSITIONS_FOR_STATUS, ALL_FORMATION_DEFINITIONS, TacticalFormationType
import { ScrapedTeamInfo } from '@/api/scraper';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
// IconSymbol might be removed if not used elsewhere, but keeping it for now in case other floating buttons are added.
// If it's confirmed to be unused after this change, it can be removed.
import { IconSymbol } from '@/components/ui/IconSymbol';


const POST_SCUDETTO_DATA_KEY = 'postScudettoAllMatchData';
const TEAMS_STORAGE_KEY = 'myTeams';
const PLAYERS_GLOBAL_CACHE_KEY = 'playersGlobalCache';
// TACTICAL_LINEUPS_CACHE_KEY is removed as loadTacticalLineupForRefresh is removed

const COACH_TACTICAL_SCHEMES = ["4-2-3-1", "4-4-2", "3-4-2-1", "4-3-3", "3-5-2", "4-3-1-2", "No Definido"] as const;
type CoachTacticalSchemeType = typeof COACH_TACTICAL_SCHEMES[number];
const DEFAULT_SCHEME_PLACEHOLDER: CoachTacticalSchemeType = "No Definido";

const ACTUAL_PLAYER_POSITIONS = [ 
  "POR", "DFC", "LD", "LI", "MC", "MCO", "MD", "MI", "ED", "EI", "DC", "SD", "PIV"
] as const;
type ActualPlayerPositionType = typeof ACTUAL_PLAYER_POSITIONS[number];

interface SquadPlayerDisplayInfo extends PlayerInfo { 
    assignedPositions?: ActualPlayerPositionType[] | null; 
}
interface SquadInfo {
  teamLogo: string | null;
  teamName: string;
  coachName: string | null;
  coachOriginalScheme?: CoachTacticalSchemeType | null;
  players: SquadPlayerDisplayInfo[];
}

interface PlayerCacheEntry {
    name: string | null;
    isManager?: boolean;
    equipo?: string | null;
    tacticalScheme?: CoachTacticalSchemeType | null;
    positions?: ActualPlayerPositionType[] | null; 
}

// StoredPlayerInfoTacticalCache and LoadedTacticalLineupForRefresh types removed as they were for refresh logic

export default function TeamMatchesScreen() {
  const params = useLocalSearchParams<{ teamId: string; teamName?: string }>();
  const { teamId: encodedTeamId, teamName: encodedTeamNameFromQuery } = params;
  const router = useRouter();
  const navigation = useNavigation();

  const teamId = encodedTeamId ? decodeURIComponent(encodedTeamId) : undefined;
  const teamNameForDisplay = encodedTeamNameFromQuery ? decodeURIComponent(encodedTeamNameFromQuery) : 'Equipo Desconocido';
  const teamNameForFilter = encodedTeamNameFromQuery ? decodeURIComponent(encodedTeamNameFromQuery) : undefined;

  const [teamMatches, setTeamMatches] = useState<PostScudettoMatchInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSquadModalVisible, setIsSquadModalVisible] = useState(false);
  const [squadData, setSquadData] = useState<SquadInfo | null>(null);
  const [isLoadingSquad, setIsLoadingSquad] = useState(false);
  const [selectedCoachScheme, setSelectedCoachScheme] = useState<CoachTacticalSchemeType>(DEFAULT_SCHEME_PLACEHOLDER);
  const colorScheme = useColorScheme();

  const [isPlayerPositionModalVisible, setIsPlayerPositionModalVisible] = useState(false);
  const [playerForPositionEditing, setPlayerForPositionEditing] = useState<SquadPlayerDisplayInfo | null>(null);
  const [tempSelectedPositions, setTempSelectedPositions] = useState<ActualPlayerPositionType[]>([]);

  // --- REFRESH LOGIC REMOVED ---
  // areAllSlotsFilledForStatus removed
  // getLineupTacticalStatusForRefresh removed
  // loadTacticalLineupForRefresh removed
  // handleRefreshTacticalStatus removed

  useEffect(() => {
    // This useEffect can be removed if no other header options are set here.
    // For now, keeping it empty.
  }, [navigation, isLoading, colorScheme]);


  useEffect(() => {
    const loadMatches = async () => {
      if (!teamId || !teamNameForFilter) {
        setError("Información del equipo incompleta para cargar partidos.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const storedDataJson = await AsyncStorage.getItem(POST_SCUDETTO_DATA_KEY);
        if (storedDataJson) {
          const allMatches: PostScudettoMatchInfo[] = JSON.parse(storedDataJson);
          const filteredMatches = allMatches.filter(match => match.Team === teamNameForFilter);
          
          if (filteredMatches.length === 0) {
             setError(`No se encontraron partidos para "${teamNameForDisplay}" o los datos generales de partidos no están actualizados. Intenta refrescar en la pestaña 'Matches'.`);
          }
          setTeamMatches(filteredMatches);
        } else {
          setError("No hay datos de partidos procesados. Por favor, ve a la pestaña 'Matches', carga los datos y luego regresa aquí.");
        }
      } catch (e: any) {
        setError(`Error al cargar los partidos: ${e.message}`);
        console.error("Error loading team matches:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadMatches();
  }, [teamId, teamNameForFilter, teamNameForDisplay]);

  const handlePressMatchItem = (matchItem: PostScudettoMatchInfo) => {
    if (matchItem.match && matchItem.match.trim() !== '') {
      const matchIdentifier = `${matchItem.Team || 'Equipo'} vs ${matchItem.equipoContrario || 'Oponente'} (${matchItem.fecha})`;
      router.push({
        pathname: `/match-analysis`,
        params: {
          matchUrl: encodeURIComponent(matchItem.match),
          matchIdentifier: encodeURIComponent(matchIdentifier),
          teamAName: matchItem.Team,
          teamATier: matchItem.tier,
          teamBName: matchItem.equipoContrario,
          teamBTier: matchItem.opponentTier,
        },
      });
    } else {
      Alert.alert("Sin Enlace", "Este partido no tiene un enlace de detalles para analizar.");
    }
  };

  const parseDateString = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; 
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month, day);
  };

  const handleOpenSquadModal = async () => {
    if (!teamNameForFilter) {
      Alert.alert("Error", "Nombre del equipo no disponible.");
      return;
    }
    setIsLoadingSquad(true);
    setSquadData(null);
    setIsSquadModalVisible(true);

    try {
      const teamsJson = await AsyncStorage.getItem(TEAMS_STORAGE_KEY);
      const allSavedTeams: ScrapedTeamInfo[] = teamsJson ? JSON.parse(teamsJson) : [];
      const currentTeamInfo = allSavedTeams.find(t => t.teamName === teamNameForFilter);

      if (!currentTeamInfo || !currentTeamInfo.teamName) {
        Alert.alert("Error", "No se encontró información detallada del equipo.");
        setIsLoadingSquad(false); setIsSquadModalVisible(false); return;
      }
      const teamLogo = currentTeamInfo.teamEmblemSrc;
      const actualTeamName = currentTeamInfo.teamName;

      const storedAllMatchesJson = await AsyncStorage.getItem(POST_SCUDETTO_DATA_KEY);
      const allMatches: PostScudettoMatchInfo[] = storedAllMatchesJson ? JSON.parse(storedAllMatchesJson) : [];
      const teamSpecificMatchesFromStorage = allMatches
        .filter(m => m.Team === actualTeamName)
        .sort((a, b) => {
          const dateA = parseDateString(a.fecha); const dateB = parseDateString(b.fecha);
          if (!dateA && !dateB) return 0; if (!dateA) return 1; if (!dateB) return -1;
          return dateB.getTime() - dateA.getTime();
        });

      let mostRecentCoachName: string | null = null;
      for (const match of teamSpecificMatchesFromStorage) {
        if (match.match) {
          const analysisResult = await scrapeMatchAnalysis(match.match);
          if (!analysisResult.error) {
            const isHome = analysisResult.homeTeamName?.includes(actualTeamName);
            const isAway = !isHome && analysisResult.awayTeamName?.includes(actualTeamName);
            if (isHome && analysisResult.homeManager) { mostRecentCoachName = analysisResult.homeManager; break; }
            if (isAway && analysisResult.awayManager) { mostRecentCoachName = analysisResult.awayManager; break; }
          }
        }
      }

      const playersCacheJson = await AsyncStorage.getItem(PLAYERS_GLOBAL_CACHE_KEY);
      const globalPlayerData: Record<string, PlayerCacheEntry> = playersCacheJson ? JSON.parse(playersCacheJson) : {};
      
      const teamPlayers: SquadPlayerDisplayInfo[] = [];
      let initialCoachScheme: CoachTacticalSchemeType | null = null;

      Object.values(globalPlayerData).forEach(person => {
        if (person.equipo === actualTeamName) {
          if (mostRecentCoachName && person.isManager && person.name === mostRecentCoachName) {
            if (person.tacticalScheme) initialCoachScheme = person.tacticalScheme;
          } else if (!person.isManager && person.name) {
            teamPlayers.push({ 
              name: person.name, 
              number: undefined, 
              assignedPositions: person.positions || [] 
            });
          }
        }
      });

      const sortedPlayers = teamPlayers.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

      setSquadData({
        teamLogo, teamName: actualTeamName, coachName: mostRecentCoachName,
        coachOriginalScheme: initialCoachScheme, players: sortedPlayers,
      });
      setSelectedCoachScheme(initialCoachScheme || DEFAULT_SCHEME_PLACEHOLDER);

    } catch (e: any) {
      Alert.alert("Error al cargar datos del Squad", e.message || "Ocurrió un error desconocido.");
      setIsSquadModalVisible(false);
    } finally {
      setIsLoadingSquad(false);
    }
  };

  const handleSaveCoachScheme = async (newScheme: CoachTacticalSchemeType) => {
    if (!squadData || !squadData.coachName || !squadData.teamName) {
      Alert.alert("Error", "Info de entrenador/equipo incompleta."); return;
    }
    setSelectedCoachScheme(newScheme);

    try {
      const playersCacheJson = await AsyncStorage.getItem(PLAYERS_GLOBAL_CACHE_KEY);
      const globalPlayerData: Record<string, PlayerCacheEntry> = playersCacheJson ? JSON.parse(playersCacheJson) : {};
      let coachKeyToUpdate: string | null = null;
      for (const key in globalPlayerData) {
        const person = globalPlayerData[key];
        if (person.isManager && person.name === squadData.coachName && person.equipo === squadData.teamName) {
          coachKeyToUpdate = key; break;
        }
      }
      if (coachKeyToUpdate) {
        globalPlayerData[coachKeyToUpdate].tacticalScheme = newScheme === DEFAULT_SCHEME_PLACEHOLDER ? null : newScheme;
        await AsyncStorage.setItem(PLAYERS_GLOBAL_CACHE_KEY, JSON.stringify(globalPlayerData));
        Alert.alert("Éxito", `Esquema '${newScheme}' guardado para ${squadData.coachName}.`);
      } else {
        Alert.alert("Error", `Entrenador ${squadData.coachName} no encontrado en caché.`);
      }
    } catch (error: any) {
      Alert.alert("Error al Guardar", `No se pudo guardar: ${error.message}`);
    }
  };

  const handleSavePlayerPositions = async (playerName: string, newPositions: ActualPlayerPositionType[]) => {
    if (!squadData || !squadData.teamName || !playerName) {
      Alert.alert("Error", "Info de jugador/equipo incompleta."); return;
    }

    setSquadData(prevSquadData => {
        if (!prevSquadData) return null;
        return {
            ...prevSquadData,
            players: prevSquadData.players.map(p =>
                p.name === playerName ? { ...p, assignedPositions: newPositions } : p
            )
        };
    });

    try {
      const playersCacheJson = await AsyncStorage.getItem(PLAYERS_GLOBAL_CACHE_KEY);
      const globalPlayerData: Record<string, PlayerCacheEntry> = playersCacheJson ? JSON.parse(playersCacheJson) : {};
      let playerKeyToUpdate: string | null = null;

      for (const key in globalPlayerData) {
        const person = globalPlayerData[key];
        if (!person.isManager && person.name === playerName && person.equipo === squadData.teamName) {
          playerKeyToUpdate = key; break;
        }
      }

      if (playerKeyToUpdate) {
        globalPlayerData[playerKeyToUpdate].positions = newPositions; 
        await AsyncStorage.setItem(PLAYERS_GLOBAL_CACHE_KEY, JSON.stringify(globalPlayerData));
        console.log(`Posiciones '${newPositions.join(', ')}' guardadas para ${playerName}.`);
      } else {
        Alert.alert("Error", `Jugador ${playerName} no encontrado en caché para el equipo ${squadData.teamName}.`);
      }
    } catch (error: any) {
      Alert.alert("Error al Guardar Posición", `No se pudo guardar: ${error.message}`);
    }
  };

  const openPlayerPositionModal = (player: SquadPlayerDisplayInfo) => {
    setPlayerForPositionEditing(player);
    setTempSelectedPositions(player.assignedPositions || []);
    setIsPlayerPositionModalVisible(true);
  };

  const onSavePlayerPositionsFromModal = () => {
    if (playerForPositionEditing?.name) handleSavePlayerPositions(playerForPositionEditing.name, tempSelectedPositions);
    setIsPlayerPositionModalVisible(false);
  };


  const renderMatchItemRevised = ({ item, index }: { item: PostScudettoMatchInfo, index: number }) => {
    const prevItem = teamMatches[index - 1];
    const showCompetitionHeader = 
      item.Competicion && 
      item.Competicion.trim() !== '' && 
      (index === 0 || item.Competicion !== prevItem?.Competicion);

    const opponentTier = item.opponentTier; 
    const shouldShowOpponentEmblem = (opponentTier === 'TierS' || opponentTier === 'TierSred') && item.opponentEmblemSrc; 
    
    let opponentDisplayName = item.equipoContrario || 'Oponente N/A';
    if (
      (item.isMainLeagueCompetition || item.Competicion === 'Competencia' || item.Competicion === 'Competicion') && 
      !item.opponentTier) {
      opponentDisplayName = 'TierD';
    }

    const isWorldWorldCompeticionPairWithNegativeStatus =
      item.tier === "World" &&
      item.opponentTier === "World" &&
      item.Competicion === "Competicion" && 
      item.Status === "Negativo";

    if (
      item.Competicion === 'Parón Internacional' ||
      item.Status === 'Champion' ||
      item.Status === 'Post scudetto' ||
      (item.Status === 'Negativo' && !isWorldWorldCompeticionPairWithNegativeStatus)
    ) {
      let specialStyle = {};
      let text = '';

      if (item.Competicion === 'Parón Internacional') {
        specialStyle = styles.internationalBreakItem; text = 'PARÓN INTERNACIONAL';
      } else if (item.Status === 'Champion') {
        specialStyle = styles.championItem; text = 'CAMPEÓN';
      } else if (item.Status === 'Post scudetto') {
        specialStyle = styles.postScudettoItem; text = 'POST SCUDETTO';
      } else if (item.Status === 'Negativo') { 
        specialStyle = styles.negativoItem; text = 'NEGATIVO';
      }
      return (
        <TouchableOpacity onPress={() => handlePressMatchItem(item)} activeOpacity={item.match ? 0.7 : 1}>
          <View style={[styles.matchItem, styles.statusHighlightItem, specialStyle]}>
            <ThemedText style={styles.statusHighlightText}>{text}</ThemedText>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity onPress={() => handlePressMatchItem(item)} activeOpacity={item.match ? 0.7 : 1}>
        <>
          {showCompetitionHeader && (
            <View style={styles.competitionHeaderContainer}>
              <ThemedText style={styles.competitionHeaderText}>
                {item.Competicion}
              </ThemedText>
              {item.formato && item.formato.trim() !== '' && (
                <ThemedText style={styles.competitionFormatText}>
                  {` (${item.formato.charAt(0).toUpperCase() + item.formato.slice(1)})`}
                </ThemedText>
              )}
            </View>
          )}
          <ThemedView 
            style={[
              styles.matchItem,
              item.Status === "Neutro" && styles.neutralBorder,
              item.Status === "Rojo" && styles.redBorder,
              item.Status === "Naranja" && styles.orangeBorder 
            ]} 
            lightColor="#f9f9f9" darkColor="#2C2C2E">
            <View style={styles.matchContentRow}>
              <View style={styles.leftAndMiddleContainer}>
                <View style={styles.dateTimeContainer}>
                  <ThemedText style={styles.matchDateSmall}>{item.fecha || 'Fecha N/A'}</ThemedText>
                  {item.hora && <ThemedText style={styles.matchTimeSmall}>{item.hora}</ThemedText>}
                </View>
                <View style={styles.verticalSeparator} />
                {shouldShowOpponentEmblem && ( 
                  <Image
                    source={{ uri: item.opponentEmblemSrc! }} 
                    style={styles.teamEmblemStyle} 
                  />
                )}
                <ThemedText 
                  style={styles.matchOpponentSmall} 
                  numberOfLines={2} ellipsizeMode="tail">
                  {opponentDisplayName}
                </ThemedText>
              </View>

              <View style={styles.locationContainer}>
                {item.lugar && ['H', 'A', 'N'].includes(item.lugar) && (
                  <ThemedText style={styles.locationText}>{item.lugar}</ThemedText>
                )}
              </View>
            </View>
          </ThemedView>
        </>
      </TouchableOpacity>
    );
  };

  const renderSquadPlayerItem = ({ item }: { item: SquadPlayerDisplayInfo }) => {
    const displayPositions = (item.assignedPositions && item.assignedPositions.length > 0)
      ? item.assignedPositions.join(', ')
      : "No Definida";

    return (
      <TouchableOpacity onPress={() => openPlayerPositionModal(item)}>
        <ThemedView style={styles.squadPlayerItemRow} lightColor="#f0f0f0" darkColor="#3a3a3a">
          <ThemedText style={styles.squadPlayerNameText} numberOfLines={1} ellipsizeMode="tail">
            {item.name || 'Nombre Desconocido'}
          </ThemedText>
          <ThemedText style={styles.squadPlayerPositionText} numberOfLines={2} ellipsizeMode="tail">
            {displayPositions}
          </ThemedText>
        </ThemedView>
      </TouchableOpacity>
    );
  };


  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
        <ThemedText style={{ marginTop: 10 }}>Cargando partidos de {teamNameForDisplay}...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: `Partidos de ${teamNameForDisplay}` }} />
      {error && (
        <ThemedView style={styles.centered}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
        </ThemedView>
      )}
      {!error && teamMatches.length === 0 && !isLoading && (
         <ThemedView style={styles.centered}>
            <ThemedText>No hay partidos para mostrar para este equipo.</ThemedText>
            <ThemedText style={styles.subtleText}>
                Asegúrate de que los datos de partidos estén actualizados en la pestaña 'Matches'.
            </ThemedText>
         </ThemedView>
      )}
      {!error && teamMatches.length > 0 && (
        <FlatList
          data={teamMatches}
          renderItem={renderMatchItemRevised}
          keyExtractor={(item, index) => item.match ?? `${item.Team}-${item.fecha}-${item.equipoContrario}-${index}`}
          contentContainerStyle={styles.listContentContainer}
          ListHeaderComponent={<ThemedText type="subtitle" style={styles.listHeader}>{teamNameForDisplay}</ThemedText>}
        />
      )}
      {/* Contenedor para los botones flotantes */}
      {!isLoading && !error && teamMatches.length > 0 && (
        <View style={styles.floatingButtonsContainer}>
          {/* Refresh button removed */}
          <TouchableOpacity
            style={[styles.floatingButton, styles.squadButton, isLoadingSquad && styles.squadButtonDisabled]}
            onPress={handleOpenSquadModal}
            disabled={isLoadingSquad}
          >
            <ThemedText style={styles.squadButtonText}>Squad</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {isSquadModalVisible && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isSquadModalVisible}
          onRequestClose={() => setIsSquadModalVisible(false)}
        >
          <View style={styles.centeredModalView}>
            <ThemedView style={styles.modalView} lightColor={Colors.light.background} darkColor={Colors.dark.background}>
              {isLoadingSquad ? (
                <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
              ) : squadData ? (
                <>
                  {squadData.teamLogo && (
                    <Image source={{ uri: squadData.teamLogo }} style={styles.squadTeamLogo} />
                  )}
                  <ThemedText type="title" style={styles.squadTeamName}>{squadData.teamName}</ThemedText>
                  {squadData.coachName ? (
                    <ThemedText style={styles.squadCoachName}>Entrenador: {squadData.coachName}</ThemedText>
                  ) : (
                    <ThemedText style={styles.squadCoachName}>Entrenador: No disponible</ThemedText>
                  )}

                  {squadData.coachName && (
                    <View style={styles.pickerContainer}>
                      <ThemedText style={styles.pickerLabel}>Esquema Táctico Principal:</ThemedText>
                      <Picker
                        selectedValue={selectedCoachScheme}
                        style={[styles.picker, { color: Colors[colorScheme ?? 'light'].text }]}
                        dropdownIconColor={Colors[colorScheme ?? 'light'].icon}
                        onValueChange={(itemValue) => {
                           const scheme = itemValue as CoachTacticalSchemeType;
                           setSelectedCoachScheme(scheme);
                           handleSaveCoachScheme(scheme);
                        }}
                      >
                        {COACH_TACTICAL_SCHEMES.map((scheme) => (
                          <Picker.Item key={scheme} label={scheme} value={scheme} />
                        ))}
                      </Picker>
                    </View>
                  )}
                  <ThemedText type="subtitle" style={styles.squadPlayerListTitle}>Jugadores:</ThemedText>
                  {squadData.players.length > 0 ? (
                    <FlatList
                      data={squadData.players}
                      renderItem={renderSquadPlayerItem} 
                      keyExtractor={(player, idx) => `${player.name}-${idx}`} 
                      style={styles.squadPlayerList}
                    />
                  ) : (
                    <ThemedText style={{ marginVertical: 10 }}>No se encontraron jugadores para este equipo en el caché.</ThemedText>
                  )}
                </>
              ) : (
                 <ThemedText>No hay datos del squad para mostrar o no se encontraron en el caché.</ThemedText>
              )}
               <Button title="Cerrar" onPress={() => setIsSquadModalVisible(false)} color={Platform.OS === 'ios' ? Colors.light.tint : undefined} />
            </ThemedView>
          </View>
        </Modal>
      )}

      {isPlayerPositionModalVisible && playerForPositionEditing && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={isPlayerPositionModalVisible}
          onRequestClose={() => setIsPlayerPositionModalVisible(false)}
        >
          <View style={styles.centeredModalView}>
            <ThemedView style={[styles.modalView, styles.playerPositionModalView]} lightColor={Colors.light.background} darkColor={Colors.dark.background}>
              <ThemedText type="subtitle" style={{ marginBottom: 5 }}>Editar Posiciones para:</ThemedText>
              <ThemedText style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 15 }}>{playerForPositionEditing.name}</ThemedText>
              <ScrollView style={styles.positionsScrollView}>
                <View style={styles.positionsContainer}>
                  {ACTUAL_PLAYER_POSITIONS.map(pos => {
                    const isSelected = tempSelectedPositions.includes(pos);
                    return (
                      <TouchableOpacity
                        key={pos}
                        style={[
                          styles.positionChip,
                          { borderColor: Colors[colorScheme ?? 'light'].icon },
                          isSelected && { backgroundColor: Colors[colorScheme ?? 'light'].tint }
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            setTempSelectedPositions(tempSelectedPositions.filter(p => p !== pos));
                          } else {
                            setTempSelectedPositions([...tempSelectedPositions, pos]);
                          }
                        }}
                      >
                        <ThemedText style={[styles.positionChipText, isSelected && { color: '#fff' }]}>{pos}</ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
              <View style={styles.modalButtonContainer}>
                <Button title="Cancelar" onPress={() => setIsPlayerPositionModalVisible(false)} color={Platform.OS === 'ios' ? (colorScheme === 'dark' ? Colors.dark.tint : '#FF3B30') : '#FF3B30'} />
                <Button title="Guardar" onPress={onSavePlayerPositionsFromModal} color={Colors.light.tint} />
              </View>
            </ThemedView>
          </View>
        </Modal>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
    paddingHorizontal: 20,
  },
  subtleText: {
    fontSize: 13,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  listContentContainer: {
    paddingHorizontal: 10,
    paddingBottom: 80, 
  },
  listHeader: { 
    textAlign: 'center',
    marginVertical: 15,
  },
  competitionHeaderContainer: { 
    flexDirection: 'row',
    alignItems: 'baseline', 
    marginTop: 15,
    marginBottom: 5,
    marginHorizontal: 5,
    paddingLeft: 10,
  },
  competitionHeaderText: { 
    fontSize: 16,
    fontWeight: '600',
  },
  competitionFormatText: { 
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.8,
    marginLeft: 6, 
  },
  matchItem: {
    paddingVertical: 10, 
    paddingHorizontal: 15,
    marginVertical: 4, 
    marginHorizontal: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  matchContentRow: { 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 3, 
  },
  leftAndMiddleContainer: { 
    flex: 1, 
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8, 
  },
  dateTimeContainer: {
    flexDirection: 'column',
    alignItems: 'center', 
    minWidth: 55, 
  },
  verticalSeparator: { 
    height: '60%',
    width: 1,
    marginHorizontal: 8,
    opacity: 0.6, 
    backgroundColor: '#cccccc', 
  },
  matchDateSmall: { 
    fontSize: 11, 
    opacity: 0.8,
  },
  matchTimeSmall: { 
    fontSize: 11, 
    opacity: 0.8,
  },
  matchOpponentSmall: { 
    flex: 1, 
    fontSize: 13, 
    fontWeight: '600',
  },
  locationContainer: { 
    minWidth: 15, 
    alignItems: 'flex-end', 
  },
  locationText: { 
    fontSize: 12, 
    fontWeight: 'bold',
  },
  statusHighlightItem: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 60, 
    paddingVertical: 10, 
  },
  championItem: {
    backgroundColor: 'red', 
  },
  postScudettoItem: {
    backgroundColor: 'darkred', 
  },
  negativoItem: {
    backgroundColor: '#8B0000', 
  },
  internationalBreakItem: { 
    backgroundColor: '#4682B4', 
  },
  statusHighlightText: {
    color: 'white', 
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  neutralBorder: { 
    borderColor: 'white',
    borderWidth: 1,
  },
  redBorder: { 
    borderColor: 'red',
    borderWidth: 1,
  },
  orangeBorder: { 
    borderColor: 'orange',
    borderWidth: 1,
  },
  teamEmblemStyle: {
    width: 20, 
    height: 20, 
    resizeMode: 'contain',
    marginRight: 8, 
  },
  squadButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  squadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  squadButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  floatingButtonsContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingButton: { 
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    marginLeft: 10, 
  },
  refreshButton: { // This style is no longer used by a visible element but kept for structure if needed later
    backgroundColor: Colors.light.tint, 
    padding: 12, 
    borderRadius: 25, 
  },
  centeredModalView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalView: {
    margin: 20,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '85%',
  },
  squadTeamLogo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  squadTeamName: {
    marginBottom: 5,
    textAlign: 'center',
  },
  squadCoachName: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
    opacity: 0.8,
  },
  squadPlayerListTitle: {
    marginTop: 10,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  squadPlayerList: {
    width: '100%',
    marginBottom: 15,
  },
  squadPlayerItemRow: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8, 
    paddingHorizontal: 8,
    borderRadius: 6,
    marginVertical: 3, 
  },
  squadPlayerNameText: { 
    fontSize: 15,
    flex: 1, 
    marginRight: 8, 
    fontWeight: '600',
  },
  squadPlayerPositionText: { 
    fontSize: 13,
    opacity: 0.8,
    textAlign: 'right',
    flexShrink: 1, 
  },
  pickerContainer: { 
    width: '90%',
    marginVertical: 10,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 14,
    marginBottom: 5,
    opacity: 0.8,
  },
  picker: { 
    width: '100%',
    height: Platform.OS === 'ios' ? 120 : 50,
  },
  playerPositionModalView: { 
    maxHeight: '70%', 
  },
  positionsScrollView: {
    width: '100%',
    maxHeight: 250, 
    marginBottom: 15,
  },
  positionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  positionChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    margin: 4,
  },
  positionChipText: {
    fontSize: 14,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  }
});
