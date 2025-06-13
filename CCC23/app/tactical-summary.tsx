// cabs/Users/Mauri/Desktop/CCC23/MayI/CCC23/app/tactical-summary.tsx
import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, Button, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { PlayerInfo } from '@/api/analisis'; 
import { Colors } from '@/constants/Colors';

// --- COPIADO DE match-analysis.tsx (o idealmente, refactorizado a un archivo compartido) ---
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

// Definiciones de posiciones (consistente con match-analysis.tsx)
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

const formatPlayerNameForField = (fullName?: string | null): string => {
  if (!fullName) return '';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0];
  const firstNameInitial = parts[0].charAt(0).toUpperCase();
  const lastName = parts.slice(1).join(' ');
  return `${firstNameInitial}. ${lastName}`;
};

const getSlotBackgroundColor = (line: FormationSlot['line']) => {
  if (line === 'GK') return 'rgba(255, 235, 150, 0.7)';
  if (line === 'DEF') return 'rgba(170, 210, 255, 0.7)';
  if (line === 'MID') return 'rgba(160, 240, 160, 0.7)';
  if (line === 'FWD') return 'rgba(255, 180, 180, 0.7)';
  return 'rgba(200, 200, 200, 0.7)';
};
const outOfPositionColor = 'rgba(220, 50, 50, 0.7)'; // Rojo para fuera de posición
// --- FIN COPIADO ---

interface EnrichedPlayerInfoForSummary extends PlayerInfo { // Similar a EnrichedPlayerInfo de match-analysis
    assignedPositions?: ActualPlayerPositionType[];
}

interface TacticalBoardDisplayProps {
  lineup: Record<string, EnrichedPlayerInfoForSummary | null>;
  formationType: FormationType;
  teamName: string;
}

const TacticalBoardDisplay: React.FC<TacticalBoardDisplayProps> = ({ lineup, formationType, teamName }) => {
  const [fieldDimensions, setFieldDimensions] = useState({ width: 0, height: 0 });

  const onFieldLayout = useCallback((event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setFieldDimensions({ width, height });
  }, []);

  if (!FORMATION_DEFINITIONS[formationType]) {
    return <ThemedText>Formación desconocida: {formationType}</ThemedText>;
  }
  const formationLayout = FORMATION_DEFINITIONS[formationType];

  return (
    <View style={styles.boardOuterContainer}>
      <ThemedText type="subtitle" style={styles.teamNameHeader}>{teamName}</ThemedText>
      <ThemedView 
        style={styles.tacticalSchemeContainer} 
        lightColor="#e0e0e0" 
        darkColor="#1c1c1e" 
        onLayout={onFieldLayout}
      >
        {fieldDimensions.width === 0 ? (
          <ActivityIndicator size="small" />
        ) : (
          <View style={styles.fieldContainer}>
            <View style={[styles.fieldBorder, styles.fieldBorderTop]} />
            <View style={[styles.fieldBorder, styles.fieldBorderBottom]} />
            <View style={[styles.fieldBorder, styles.fieldBorderLeft]} />
            <View style={[styles.fieldBorder, styles.fieldBorderRight]} />
            {formationLayout.map((slot) => {
              const playerInSlot = lineup[slot.id];
              let textContent: string | null = null;
              let textStyleKey: 'slotPlayerName' | 'slotLabel' = 'slotLabel';
              let currentSlotBackgroundColor = getSlotBackgroundColor(slot.line);

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
                  currentSlotBackgroundColor = outOfPositionColor;
                } else {
                  const isPlayerInCorrectPosition = playerInSlot.assignedPositions.includes(slot.label as ActualPlayerPositionType);
                  if (!isPlayerInCorrectPosition) {
                    currentSlotBackgroundColor = outOfPositionColor;
                  }
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
                <View key={slot.id} style={[styles.slot, { backgroundColor: currentSlotBackgroundColor }, slotStyle]}>
                  {textContent ? (
                    <ThemedText 
                      style={playerInSlot ? styles.slotPlayerName : styles.slotLabel} 
                      numberOfLines={playerInSlot ? 2 : 1} 
                      ellipsizeMode="tail"
                    >
                      {textContent}
                    </ThemedText>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ThemedView>
    </View>
  );
};

export default function TacticalSummaryScreen() {
  const params = useLocalSearchParams<{
    homeLineup?: string; // Para escenario de dos equipos
    awayLineup?: string; // Para escenario de dos equipos
    homeTeamName?: string;
    awayTeamName?: string;
    lineup1?: string;    // Para escenario de un solo equipo
    team1Name?: string;
    formation: string; // Común para ambos escenarios
    // Parámetros para volver a match-analysis
    matchUrl?: string;
    matchIdentifier?: string;
    teamAName?: string;
    teamATier?: string;
    teamBName?: string;
    teamBTier?: string;
  }>();
  const router = useRouter();

  const formation = params.formation as FormationType | undefined;

  // Parsear datos específicos del escenario
  const homeLineupData: Record<string, EnrichedPlayerInfoForSummary | null> | null = params.homeLineup ? JSON.parse(params.homeLineup) : null;
  const awayLineupData: Record<string, EnrichedPlayerInfoForSummary | null> | null = params.awayLineup ? JSON.parse(params.awayLineup) : null;
  const singleLineupData: Record<string, EnrichedPlayerInfoForSummary | null> | null = params.lineup1 ? JSON.parse(params.lineup1) : null;

  const homeTeamName = params.homeTeamName || 'Local'; // Usado si homeLineupData existe
  const awayTeamName = params.awayTeamName || 'Visitante'; // Usado si awayLineupData existe
  const singleTeamName = params.team1Name || 'Equipo'; // Usado si singleLineupData existe

  const handleEditLineup = () => {
    if (params.matchUrl) { 
        router.push({
            pathname: `/match-analysis`,
            // Pasar todos los parámetros necesarios para que match-analysis se recargue
            params: { 
                matchUrl: params.matchUrl,
                matchIdentifier: params.matchIdentifier,
                teamAName: params.teamAName,
                teamATier: params.teamATier,
                teamBName: params.teamBName,
                teamBTier: params.teamBTier,
                isEditing: 'true' 
            }
        });
    } else {
        alert("No se puede volver a editar: falta información del partido original.");
    }
  };

  if (!formation) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Error: Formación no especificada.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      {singleLineupData ? (
        <>
          <Stack.Screen options={{ title: `Resumen: ${singleTeamName}` }} />
          <TacticalBoardDisplay lineup={singleLineupData} formationType={formation} teamName={singleTeamName} />
        </>
      ) : homeLineupData && awayLineupData ? (
        <>
          <Stack.Screen options={{ title: 'Resumen Táctico (Doble)' }} />
          <TacticalBoardDisplay lineup={homeLineupData} formationType={formation} teamName={homeTeamName} />
          <TacticalBoardDisplay lineup={awayLineupData} formationType={formation} teamName={awayTeamName} />
        </>
      ) : (
        <ThemedView style={styles.container}>
          <ThemedText>Error: Faltan datos de alineación para el resumen.</ThemedText>
        </ThemedView>
      )}
      {(singleLineupData || (homeLineupData && awayLineupData)) && params.matchUrl && (
         <View style={styles.editButtonContainer}>
            <Button title="Editar Esquema" onPress={handleEditLineup} color={Colors.light.tint} />
         </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1, 
    alignItems: 'center',
    paddingVertical: 20,
  },
  container: { 
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  boardOuterContainer: {
    marginBottom: 30,
    alignItems: 'center',
    width: '100%',
  },
  teamNameHeader: {
    marginBottom: 10,
    fontSize: 18,
  },
  // --- ESTILOS COPIADOS DE match-analysis.tsx (o idealmente, refactorizados) ---
  tacticalSchemeContainer: {
    width: '90%', 
    aspectRatio: 0.75,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  fieldContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  fieldBorder: {
    position: 'absolute',
    backgroundColor: 'rgba(120, 120, 120, 0.4)', 
  },
  fieldBorderTop: { top: '2%', left: '2%', right: '2%', height: 2, },
  fieldBorderBottom: { bottom: '2%', left: '2%', right: '2%', height: 2, },
  fieldBorderLeft: { top: '2%', bottom: '2%', left: '2%', width: 2, },
  fieldBorderRight: { top: '2%', bottom: '2%', right: '2%', width: 2, },
  slot: {
    width: 60, 
    height: 45,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  slotLabel: { fontSize: 9, fontWeight: 'bold', color: '#fff', },
  slotPlayerName: { fontSize: 8, color: '#fff', textAlign: 'center', fontWeight: '600' },
  // --- FIN ESTILOS COPIADOS ---
  editButtonContainer: {
    marginTop: 10, // Espacio sobre el botón
    width: '80%', // Ancho del botón
  }
});
