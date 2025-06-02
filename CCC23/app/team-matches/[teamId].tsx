import React, { useEffect, useState } from 'react';
import { FlatList, ActivityIndicator, StyleSheet, Alert, View } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PostScudettoMatchInfo } from '@/api/postscudetto';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const POST_SCUDETTO_DATA_KEY = 'postScudettoAllMatchData'; // Debe coincidir con la clave en matches.tsx

export default function TeamMatchesScreen() {
  const params = useLocalSearchParams<{ teamId: string; teamName?: string }>();
  const { teamId: encodedTeamId, teamName: encodedTeamNameFromQuery } = params;

  const teamId = encodedTeamId ? decodeURIComponent(encodedTeamId) : undefined;
  const teamNameForDisplay = encodedTeamNameFromQuery ? decodeURIComponent(encodedTeamNameFromQuery) : 'Equipo Desconocido';
  const teamNameForFilter = encodedTeamNameFromQuery ? decodeURIComponent(encodedTeamNameFromQuery) : undefined;

  const [teamMatches, setTeamMatches] = useState<PostScudettoMatchInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme(); // colorScheme está disponible aquí

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
  }, [teamId, teamNameForFilter]);

  const renderMatchItemRevised = ({ item, index }: { item: PostScudettoMatchInfo, index: number }) => {
    const prevItem = teamMatches[index - 1];
    const showCompetitionHeader = 
      item.Competicion && 
      item.Competicion.trim() !== '' && 
      (index === 0 || item.Competicion !== prevItem?.Competicion);

    // Determinar el color del separador basado en el tema actual
    const separatorColor = colorScheme === 'dark' ? Colors.dark.text : Colors.light.text;

    // Casos especiales para "Champion", "Post scudetto" y "Negativo"
    if (item.Status === 'Champion') {
      return (
        <View style={[styles.matchItem, styles.statusHighlightItem, styles.championItem]}>
          <ThemedText style={styles.statusHighlightText}>CAMPEÓN</ThemedText>
        </View>
      );
    }

    if (item.Status === 'Post scudetto') {
      return (
        <View style={[styles.matchItem, styles.statusHighlightItem, styles.postScudettoItem]}>
          <ThemedText style={styles.statusHighlightText}>POST SCUDETTO</ThemedText>
        </View>
      );
    }

    if (item.Status === 'Negativo') {
      return (
        <View style={[styles.matchItem, styles.statusHighlightItem, styles.negativoItem]}>
          <ThemedText style={styles.statusHighlightText}>NEGATIVO</ThemedText>
        </View>
      );
    }

    // Renderizado normal del partido si no es Champion ni Post Scudetto

    return (
      <>
        {showCompetitionHeader && (
          <View style={styles.competitionHeaderContainer}>
            <ThemedText style={styles.competitionHeaderText}>
              {item.Competicion}
            </ThemedText>
            {item.formato && item.formato.trim() !== '' && (
              <ThemedText style={styles.competitionFormatText}>
                {/* Capitalizamos la primera letra del formato */}
                {` (${item.formato.charAt(0).toUpperCase() + item.formato.slice(1)})`}
              </ThemedText>
            )}
          </View>
        )}
        <ThemedView style={styles.matchItem} lightColor="#f9f9f9" darkColor="#2C2C2E">
          <View style={styles.matchContentRow}>
            <View style={styles.leftAndMiddleContainer}>
              <View style={styles.dateTimeContainer}>
                <ThemedText style={styles.matchDateSmall}>{item.fecha || 'Fecha N/A'}</ThemedText>
                {item.hora && <ThemedText style={styles.matchTimeSmall}>{item.hora}</ThemedText>}
              </View>
              {/* Aplicar el color dinámico al separador */}
              <View style={[styles.verticalSeparator, { backgroundColor: separatorColor }]} />
              <ThemedText style={styles.matchOpponentSmall} numberOfLines={2} ellipsizeMode="tail">
                {item.equipoContrario || 'Oponente N/A'}
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
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
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
    paddingBottom: 20,
  },
  listHeader: { 
    textAlign: 'center',
    marginVertical: 15,
  },
  competitionHeaderContainer: { // Nuevo estilo para el contenedor de la competición y el formato
    flexDirection: 'row',
    alignItems: 'baseline', // Alinea bien textos de diferentes tamaños
    marginTop: 15,
    marginBottom: 5,
    marginHorizontal: 5,
    paddingLeft: 10,
  },
  competitionHeaderText: { // Estilo para el texto de la competición
    fontSize: 16,
    fontWeight: '600',
  },
  competitionFormatText: { // Estilo para el texto del formato
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.8,
    marginLeft: 6, // Espacio entre la competición y el formato
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
    alignItems: 'center', // Cambiado a 'center' para centrar la hora debajo de la fecha
    minWidth: 55, 
  },
  verticalSeparator: { // El backgroundColor se aplicará dinámicamente
    height: '60%', 
    width: 1,
    marginHorizontal: 8, 
    opacity: 0.6, // Aumentada la opacidad para mayor visibilidad
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
  // Estilos para los items de estado especial
  statusHighlightItem: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 60, // Altura fija para estos items especiales, ajusta según necesidad
    paddingVertical: 10, // Asegurar que el padding no interfiera con la altura
  },
  championItem: {
    backgroundColor: 'red', // Fondo rojo para campeón
  },
  postScudettoItem: {
    backgroundColor: 'darkred', // Un rojo más oscuro para post scudetto, o el mismo si prefieres
  },
  negativoItem: {
    backgroundColor: '#8B0000', // Maroon, un rojo oscuro diferente para Negativo
  },
  statusHighlightText: {
    color: 'white', // Texto blanco para contraste
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
