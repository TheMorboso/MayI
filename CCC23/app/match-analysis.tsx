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

  const [selectedFormation, setSelectedFormation] = useState<FormationType | null>(null);
  
  const [playerToPlace, setPlayerToPlace] = useState<PlayerInfo | null>(null);
  const [placedPlayers, setPlacedPlayers] = useState<Record<string, PlayerInfo | null>>({});
  const [fieldDimensions, setFieldDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (selectedFormation) {
      const initialSlots: Record<string, PlayerInfo | null> = {};
      FORMATION_DEFINITIONS[selectedFormation].forEach(slot => {
        initialSlots[slot.id] = null;
      });
      setPlacedPlayers(initialSlots);
      setPlayerToPlace(null);
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

  const handleClearBoard = () => {
    if (selectedFormation) {
      const initialSlots: Record<string, PlayerInfo | null> = {};
      FORMATION_DEFINITIONS[selectedFormation].forEach(slot => {
        initialSlots[slot.id] = null;
      });
      setPlacedPlayers(initialSlots);
    } else {
      setPlacedPlayers({});
    }
    setPlayerToPlace(null);
  };

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

  // --- NUEVA FUNCIÓN HELPER ---
  const formatPlayerNameForField = (fullName?: string | null): string => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0]; // Si solo hay un nombre/apellido
    const firstNameInitial = parts[0].charAt(0).toUpperCase();
    const lastName = parts.slice(1).join(' '); // Tomar el resto como apellido
    return `${firstNameInitial}. ${lastName}`;
  };
  // --- FIN NUEVA FUNCIÓN HELPER ---



  if (isLoading && !analysisData) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
        <ThemedText style={{ marginTop: 10 }}>Cargando análisis para {matchIdentifier}...</ThemedText>
      </ThemedView>
    );
  }

  const renderPlayerList = (title: string, players?: PlayerInfo[]) => {
    if (!players || players.length === 0) {
      return null;
    }

    const placedPlayerKeys = new Set(
      Object.values(placedPlayers)
        .filter(p => p !== null)
        .map(p => `${p!.name}_${p!.number}`)
    );

    const availablePlayers = players.filter(p => {
      const playerKey = `${p.name}_${p.number}`;
      return !placedPlayerKeys.has(playerKey);
    });

    return (
      <View style={styles.playerListContainer}>
        <ThemedText type="label" style={styles.playerListTitle}>{title}</ThemedText>
        <View style={styles.playerItemsWrapper}>
          {availablePlayers.map((player, index) => {
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
                <ThemedText style={[styles.playerItemText, isSelected && styles.playerItemTextSelected]} numberOfLines={1} ellipsizeMode="tail">
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
      if (line === 'GK') return 'rgba(255, 235, 150, 0.7)'; // Amarillo claro
      if (line === 'DEF') return 'rgba(170, 210, 255, 0.7)'; // Azul claro
      if (line === 'MID') return 'rgba(160, 240, 160, 0.7)'; // Verde claro
      if (line === 'FWD') return 'rgba(255, 180, 180, 0.7)'; // Rojo claro
      return 'rgba(200, 200, 200, 0.7)'; // Gris claro por defecto
    };

    return (
      <View style={styles.fieldContainer}>
        {/* <View style={styles.midfieldLine} /> */} {/* Líneas centrales eliminadas */}
        {/* <View style={styles.centerCircle} /> */} {/* Círculo central eliminado */}
        {/* Bordes del campo */}
        <View style={[styles.fieldBorder, styles.fieldBorderTop]} />
        <View style={[styles.fieldBorder, styles.fieldBorderBottom]} />
        <View style={[styles.fieldBorder, styles.fieldBorderLeft]} />
        <View style={[styles.fieldBorder, styles.fieldBorderRight]} />
        {formationLayout.map((slot) => {
          const playerInSlot = placedPlayers[slot.id];
          const slotStyle = {
            position: 'absolute',
            top: `${slot.topRatio * 100}%`,
            left: `${slot.leftRatio * 100}%`,
            transform: [{ translateX: -styles.slot.width! / 2 }, { translateY: -styles.slot.height! / 2 }] // Añadido '!' para asegurar que width/height existen
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
              {/* Renderiza ThemedText para el nombre del jugador solo si hay un jugador y el nombre formateado no está vacío */}
              {playerInSlot && formatPlayerNameForField(playerInSlot.name) ? (
                <ThemedText style={styles.slotPlayerName} numberOfLines={2} ellipsizeMode="tail">
                  {formatPlayerNameForField(playerInSlot.name)}
                </ThemedText>
              ) : null}
              {/* Renderiza ThemedText para la etiqueta del slot solo si no hay jugador y la etiqueta no está vacía */}
              {!playerInSlot && slot.label ? (
                <ThemedText style={styles.slotLabel}>
                  {slot.label}
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
            {renderPlayerList(
              `Alineación ${analysisData.homeTeamName || 'Local'}`,
              analysisData.homePlayers
            )}
          </>
        )}
         {!analysisData && !error && !isLoading && (
            <ThemedText style={{textAlign: 'center', marginTop: 20}}>No hay datos de análisis para mostrar.</ThemedText>
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
    width: '95%', // Reducido para que no ocupe todo el ancho
    aspectRatio: 0.75, // Ligeramente más alto para acomodar slots más grandes y juntos
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'center', // Centra el contenedor en su padre
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
    // backgroundColor: 'rgba(107, 142, 35, 0.1)', // Verde campo muy sutil si se desea
  },
  fieldBorder: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.4)', // Color de las líneas de borde
  },
  fieldBorderTop: {
    top: '2%', // Un pequeño margen
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
  // midfieldLine: { // Eliminado
  //   position: 'absolute',
  //   top: '50%',
  //   left: '5%',
  //   right: '5%',
  //   height: 2,
  //   backgroundColor: 'rgba(255, 255, 255, 0.5)',
  // },
  // centerCircle: { // Eliminado
  //   position: 'absolute',
  //   top: '50%',
  //   left: '50%',
  //   width: 60,
  //   height: 60,
  //   borderRadius: 30,
  //   borderWidth: 2,
  //   borderColor: 'rgba(255, 255, 255, 0.5)',
  //   transform: [{ translateX: -30 }, { translateY: -30 }],
  // },
  slot: {
    width: 65, // Más grandes
    height: 50, // Más grandes
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
    // backgroundColor se asignará dinámicamente
  },
  slotFilled: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  slotLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333', // Texto oscuro para mejor contraste con fondos claros
  },
  slotPlayerName: {
    fontSize: 9,
    color: '#333', // Texto oscuro
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
  // Estilos no utilizados directamente ahora, pero mantenidos por si acaso
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
