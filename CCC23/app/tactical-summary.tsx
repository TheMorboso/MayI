// cabs/Users/Mauri/Desktop/CCC23/MayI/CCC23/app/tactical-summary.tsx
import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { PlayerInfo } from '@/api/analisis'; // Asumiendo que PlayerInfo está exportada

// --- COPIADO DE match-analysis.tsx (o idealmente, refactorizado a un archivo compartido) ---
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
// --- FIN COPIADO ---

interface TacticalBoardDisplayProps {
  lineup: Record<string, PlayerInfo | null>;
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
                <View key={slot.id} style={[styles.slot, { backgroundColor: getSlotBackgroundColor(slot.line) }, slotStyle]}>
                  {textContent ? (
                    <ThemedText style={styles[textStyleKey]} numberOfLines={textStyleKey === 'slotPlayerName' ? 2 : 1} ellipsizeMode="tail">
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
  }>();

  const formation = params.formation as FormationType | undefined;

  // Parsear datos específicos del escenario
  const homeLineupData = params.homeLineup ? JSON.parse(params.homeLineup) : null;
  const awayLineupData = params.awayLineup ? JSON.parse(params.awayLineup) : null;
  const singleLineupData = params.lineup1 ? JSON.parse(params.lineup1) : null;

  const homeTeamName = params.homeTeamName || 'Local'; // Usado si homeLineupData existe
  const awayTeamName = params.awayTeamName || 'Visitante'; // Usado si awayLineupData existe
  const singleTeamName = params.team1Name || 'Equipo'; // Usado si singleLineupData existe

  if (!formation) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Error: Formación no especificada.</ThemedText>
      </ThemedView>
    );
  }

  if (singleLineupData) { // Escenario de un solo equipo
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Stack.Screen options={{ title: `Resumen: ${singleTeamName}` }} />
        <TacticalBoardDisplay lineup={singleLineupData} formationType={formation} teamName={singleTeamName} />
      </ScrollView>
    );
  } else if (homeLineupData && awayLineupData) { // Escenario de dos equipos
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Stack.Screen options={{ title: 'Resumen Táctico (Doble)' }} />
        <TacticalBoardDisplay lineup={homeLineupData} formationType={formation} teamName={homeTeamName} />
        <TacticalBoardDisplay lineup={awayLineupData} formationType={formation} teamName={awayTeamName} />
      </ScrollView>
    );
  } else { // No hay datos suficientes para ningún escenario
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Error: Faltan datos de alineación para el resumen.</ThemedText>
      </ThemedView>
    );
  }
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1, // Cambiado a flexGrow para permitir el scroll si el contenido excede
    alignItems: 'center',
    paddingVertical: 20,
  },
  container: { // Para el caso de error
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
    width: '90%', // Ajustar según necesidad para dos tableros
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
    backgroundColor: 'rgba(120, 120, 120, 0.4)', // Color de borde más oscuro para contraste
  },
  fieldBorderTop: { top: '2%', left: '2%', right: '2%', height: 2, },
  fieldBorderBottom: { bottom: '2%', left: '2%', right: '2%', height: 2, },
  fieldBorderLeft: { top: '2%', bottom: '2%', left: '2%', width: 2, },
  fieldBorderRight: { top: '2%', bottom: '2%', right: '2%', width: 2, },
  slot: {
    width: 60, // Ligeramente más pequeños para que quepan dos tableros
    height: 45,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  slotLabel: { fontSize: 9, fontWeight: 'bold', color: '#fff', },
  slotPlayerName: { fontSize: 8, color: '#fff', textAlign: 'center', },
  // --- FIN ESTILOS COPIADOS ---
});
