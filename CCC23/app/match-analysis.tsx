import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, ScrollView, Alert, View, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { scrapeMatchAnalysis, MatchAnalysisDetails, PlayerInfo } from '@/api/analisis';

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
    { id: 'gk', label: 'POR', line: 'GK', topRatio: 0.92, leftRatio: 0.5 }, // GK más abajo para dar espacio
    { id: 'rb', label: 'LD', line: 'DEF', topRatio: 0.75, leftRatio: 0.88 }, // Laterales más abiertos
    { id: 'rcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.63 },
    { id: 'lcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.37 },
    { id: 'lb', label: 'LI', line: 'DEF', topRatio: 0.75, leftRatio: 0.12 }, // Laterales más abiertos
    { id: 'rm', label: 'MD', line: 'MID', topRatio: 0.5, leftRatio: 0.88 },
    { id: 'rcm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.63 },
    { id: 'lcm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.37 },
    { id: 'lm', label: 'MI', line: 'MID', topRatio: 0.5, leftRatio: 0.12 },
    { id: 'rs', label: 'DC', line: 'FWD', topRatio: 0.22, leftRatio: 0.6 }, // Delanteros un poco más abajo
    { id: 'ls', label: 'DC', line: 'FWD', topRatio: 0.22, leftRatio: 0.4 },
  ],
  "4-2-3-1": [
    { id: 'gk', label: 'POR', line: 'GK', topRatio: 0.92, leftRatio: 0.5 },
    { id: 'rb', label: 'LD', line: 'DEF', topRatio: 0.75, leftRatio: 0.88 },
    { id: 'rcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.63 },
    { id: 'lcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.37 },
    { id: 'lb', label: 'LI', line: 'DEF', topRatio: 0.75, leftRatio: 0.12 },
    { id: 'rdm', label: 'MCD', line: 'MID', topRatio: 0.58, leftRatio: 0.63 }, // MCDs
    { id: 'ldm', label: 'MCD', line: 'MID', topRatio: 0.58, leftRatio: 0.37 },
    { id: 'ram', label: 'MPD', line: 'MID', topRatio: 0.38, leftRatio: 0.85 }, // MPs
    { id: 'cam', label: 'MCO', line: 'MID', topRatio: 0.38, leftRatio: 0.5 },
    { id: 'lam', label: 'MPI', line: 'MID', topRatio: 0.38, leftRatio: 0.15 },
    { id: 'st', label: 'DC', line: 'FWD', topRatio: 0.15, leftRatio: 0.5 }, // DC
  ],
  "4-3-3": [
    { id: 'gk', label: 'POR', line: 'GK', topRatio: 0.92, leftRatio: 0.5 },
    { id: 'rb', label: 'LD', line: 'DEF', topRatio: 0.75, leftRatio: 0.88 },
    { id: 'rcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.63 },
    { id: 'lcb', label: 'DFC', line: 'DEF', topRatio: 0.75, leftRatio: 0.37 },
    { id: 'lb', label: 'LI', line: 'DEF', topRatio: 0.75, leftRatio: 0.12 },
    { id: 'rcm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.78 }, // MCs más abiertos
    { id: 'cm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.5 },
    { id: 'lcm', label: 'MC', line: 'MID', topRatio: 0.5, leftRatio: 0.22 }, // MCs más abiertos
    { id: 'rw', label: 'ED', line: 'FWD', topRatio: 0.22, leftRatio: 0.88 },
    { id: 'st', label: 'DC', line: 'FWD', topRatio: 0.22, leftRatio: 0.5 },
    { id: 'lw', label: 'EI', line: 'FWD', topRatio: 0.22, leftRatio: 0.12 },
  ],
};
// --- FIN DEFINICIONES ---

export default function MatchAnalysisScreen() {
  const params = useLocalSearchParams<{ matchUrl: string; matchIdentifier?: string }>();
  const router = useRouter();
  const matchUrl = params.matchUrl ? decodeURIComponent(params.matchUrl) : undefined;
  const matchIdentifier = params.matchIdentifier ? decodeURIComponent(params.matchIdentifier) : 'Partido';

  const [analysisData, setAnalysisData] = useState<MatchAnalysisDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedFormation, setSelectedFormation] = useState<FormationType>("4-2-3-1"); // Establecer 4-2-3-1 por defecto
  
  const [playerToPlace, setPlayerToPlace] = useState<PlayerInfo | null>(null);
  const [placedPlayers, setPlacedPlayers] = useState<Record<string, PlayerInfo | null>>({});
  const [fieldDimensions, setFieldDimensions] = useState({ width: 0, height: 0 });
  const [currentTeamFocus, setCurrentTeamFocus] = useState<'home' | 'away'>('home');
  const [homeLineupSnapshot, setHomeLineupSnapshot] = useState<Record<string, PlayerInfo | null> | null>(null);

  useEffect(() => {
    if (selectedFormation) {
      const initialSlots: Record<string, PlayerInfo | null> = {};
      FORMATION_DEFINITIONS[selectedFormation].forEach(slot => {
        initialSlots[slot.id] = null;
      });
      setPlacedPlayers(initialSlots);
      setPlayerToPlace(null);
      setCurrentTeamFocus('home'); // Siempre resetear a 'home' al cambiar formación
      setHomeLineupSnapshot(null); // Limpiar snapshot al cambiar formación
    } else {
      setPlacedPlayers({});
    }
  }, [selectedFormation]);

  useEffect(() => {
    if (!matchUrl) {
      setError("No se proporcionó la URL del partido para el análisis.");
      setIsLoading(false);
      Alert.alert("Error", "No se pudo cargar el análisis: URL del partido no encontrada.", [
        { text: "OK", onPress: () => router.back() }
      ]);
      return;
    }

    const fetchAnalysis = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await scrapeMatchAnalysis(matchUrl);
        if (data.error) {
          setError(data.error);
          Alert.alert("Error de Análisis", data.error, [
            { text: "OK", onPress: () => router.back() }
          ]);
        }
        setAnalysisData(data);
      } catch (e: any) {
        const errorMessage = `Error al obtener el análisis del partido: ${e.message}`;
        setError(errorMessage);
        Alert.alert("Error Crítico", errorMessage, [
          { text: "OK", onPress: () => router.back() }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, [matchUrl, router]);

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
    setCurrentTeamFocus('away');
    setHomeLineupSnapshot(placedPlayers); // Guardar la alineación local actual
    initializeBoardForCurrentFormation();
  };

  const handleSwitchToHomeTeam = () => {
    setCurrentTeamFocus('home');
    initializeBoardForCurrentFormation();
  };

  const areAllSlotsFilled = useCallback(() => {
    if (!selectedFormation) return false;
    const formationSlots = FORMATION_DEFINITIONS[selectedFormation];
    return formationSlots.every(slot => !!placedPlayers[slot.id]);
  }, [selectedFormation, placedPlayers]); 

  const handleSelectPlayerFromList = (player: PlayerInfo) => {
    if (playerToPlace && playerToPlace.name === player.name && playerToPlace.number === player.number) {
      setPlayerToPlace(null); // Deseleccionar si se vuelve a tocar el mismo jugador seleccionado
    } else {
      // Si el jugador seleccionado de la lista ya estaba en el campo (porque fue levantado del campo),
      // esta lógica lo quita de su slot anterior.
      const slotIdOfSelectedPlayer = Object.keys(placedPlayers).find(
        slotId => placedPlayers[slotId]?.name === player.name && placedPlayers[slotId]?.number === player.number
      );
      if (slotIdOfSelectedPlayer) {
        setPlacedPlayers(prev => ({ ...prev, [slotIdOfSelectedPlayer]: null }));
      }
      setPlayerToPlace(player); // Seleccionar el nuevo jugador
    }
  };

  const handleSelectSlotOnField = (slotId: string) => {
    if (playerToPlace) { // Si hay un jugador "en mano" para colocar
      let newPlacedPlayers = { ...placedPlayers };
      // Quitar cualquier instancia previa del jugador que se va a colocar (si se está moviendo)
      Object.keys(newPlacedPlayers).forEach(sId => {
        if (newPlacedPlayers[sId]?.name === playerToPlace.name && newPlacedPlayers[sId]?.number === playerToPlace.number) {
          newPlacedPlayers[sId] = null;
        }
      });
      
      newPlacedPlayers[slotId] = playerToPlace; // Colocar el jugador en el slot seleccionado
      setPlacedPlayers(newPlacedPlayers);
      setPlayerToPlace(null); // Limpiar el jugador "en mano"
    } else { // Si no hay jugador "en mano", se está intentando levantar uno del campo
      if (placedPlayers[slotId]) { // Si hay un jugador en el slot clickeado
        setPlayerToPlace(placedPlayers[slotId]); // Ponerlo "en mano"
        setPlacedPlayers(prev => ({ ...prev, [slotId]: null })); // Quitarlo del slot
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

  if (isLoading && !analysisData) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
        <ThemedText style={{ marginTop: 10 }}>Cargando análisis para {matchIdentifier}...</ThemedText>
      </ThemedView>
    );
  }

  const renderPlayerList = () => {
    const actualPlayers = currentTeamFocus === 'home' ? analysisData?.homePlayers : analysisData?.awayPlayers;
    const actualTitle = currentTeamFocus === 'home' 
      ? `Alineación ${analysisData?.homeTeamName || 'Local'}`
      : `Alineación ${analysisData?.awayTeamName || 'Visitante'}`;

    if (!actualPlayers || actualPlayers.length === 0) {
      return null;
    }

    const placedPlayerKeys = new Set(
      Object.values(placedPlayers)
        .filter(p => p !== null)
        .map(p => `${p!.name}_${p!.number}`)
    );

    // Filtrar jugadores: mostrar si no están en el campo O si es el jugador actualmente seleccionado (playerToPlace)
    const displayablePlayers = actualPlayers.filter(p => 
        !placedPlayerKeys.has(`${p.name}_${p.number}`) || 
        (playerToPlace && playerToPlace.name === p.name && playerToPlace.number === p.number)
    );

    return (
      <View style={styles.playerListContainer}>
        <ThemedText type="label" style={styles.playerListTitle}>{actualTitle}</ThemedText>
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
    if (!selectedFormation || fieldDimensions.width === 0) {
      return (
        <ThemedText style={styles.tacticalSchemePlaceholderText}>
          {selectedFormation ? "Calculando campo..." : "Selecciona una formación"}
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
              onPress={() => setSelectedFormation(formation)}
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
          {isLoading && !analysisData ? (
             <ActivityIndicator size="small" />
          ) : (
            <RenderTacticalBoard />
          )}
        </ThemedView>
        
        {analysisData && !analysisData.error && !isLoading && (
          <>
            {renderPlayerList()}
          </>
        )}
         {!analysisData && !error && !isLoading && (
            <ThemedText style={{textAlign: 'center', marginTop: 20}}>No hay datos de análisis para mostrar.</ThemedText>
        )}

        {selectedFormation && areAllSlotsFilled() && currentTeamFocus === 'home' && 
         analysisData?.awayPlayers && analysisData.awayPlayers.length > 0 && (
          <TouchableOpacity onPress={handleSwitchToAwayTeam} style={styles.switchTeamButton}>
            <ThemedText style={styles.switchTeamButtonText}>Crear Esquema Visitante</ThemedText>
          </TouchableOpacity>
        )}

        {selectedFormation && currentTeamFocus === 'away' && 
         analysisData?.homePlayers && analysisData.homePlayers.length > 0 && (
          <TouchableOpacity onPress={handleSwitchToHomeTeam} style={styles.switchTeamButton}>
            <ThemedText style={styles.switchTeamButtonText}>Ver Esquema Local</ThemedText>
          </TouchableOpacity>
        )}
        
        {/* Botón para ir a la siguiente pantalla después de completar ambos esquemas */}
        {selectedFormation && areAllSlotsFilled() && currentTeamFocus === 'away' && analysisData && homeLineupSnapshot && (
          <TouchableOpacity 
            onPress={() => {
              router.push({
                pathname: '/tactical-summary',
                params: {
                  homeLineup: JSON.stringify(homeLineupSnapshot),
                  awayLineup: JSON.stringify(placedPlayers), // placedPlayers es la alineación visitante en este punto
                  formation: selectedFormation,
                  homeTeamName: analysisData.homeTeamName || 'Local',
                  awayTeamName: analysisData.awayTeamName || 'Visitante',
                }
              });
            }} 
            style={[styles.switchTeamButton, styles.nextScreenButton]}>
            <ThemedText style={styles.switchTeamButtonText}>Siguiente</ThemedText>
          </TouchableOpacity>
        )}


        {selectedFormation && Object.values(placedPlayers).some(p => p !== null) && (
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
