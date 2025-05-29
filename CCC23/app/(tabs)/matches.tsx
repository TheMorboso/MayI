import React, { useState } from 'react';
import { StyleSheet, Button, View, ActivityIndicator, Alert, Platform, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image'; // Usar expo-image para mejor rendimiento

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { scrapeWorldFootballTeamMatches, TeamMatchesData, MatchInfo, ScrapedTeamInfo } from '../../api/scraper';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

// Claves de AsyncStorage (idealmente centralizadas)
const TEAMS_STORAGE_KEY = 'myTeams';
const SEASON_STORAGE_KEY = 'currentSeason';

const BLURHASH_PLACEHOLDER = 'L6PZfSi_.AyE_3t7t7Rk~qD%t7WB'; // Un blurhash genérico

export default function MatchesScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [allMatchesData, setAllMatchesData] = useState<TeamMatchesData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const colorScheme = useColorScheme();

  const fetchAllTeamMatches = async () => {
    setIsLoading(true);
    setError(null);
    setAllMatchesData([]);
    setInitialLoadDone(true);

    try {
      const savedSeason = await AsyncStorage.getItem(SEASON_STORAGE_KEY);
      if (!savedSeason) {
        Alert.alert('Temporada no configurada', 'Por favor, configura la temporada actual en la pestaña de Configuración.');
        setIsLoading(false);
        return;
      }

      const teamsJson = await AsyncStorage.getItem(TEAMS_STORAGE_KEY);
      const savedTeams: ScrapedTeamInfo[] = teamsJson ? JSON.parse(teamsJson) : [];

      if (savedTeams.length === 0) {
        Alert.alert('No hay equipos', 'No hay equipos guardados. Agrega equipos en la pestaña "Teams".');
        setIsLoading(false);
        return;
      }

      // Usar Promise.allSettled para manejar errores individuales sin detener todo
      const results = await Promise.allSettled(
        savedTeams.map(teamInfo => scrapeWorldFootballTeamMatches(teamInfo, savedSeason))
      );
      
      const processedResults: TeamMatchesData[] = results.map(result => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          // Tratar de obtener info del equipo aunque haya error en el scrapeo
          // Esto asume que el error ocurrió DENTRO de scrapeWorldFootballTeamMatches
          // y que la estructura de error es compatible o se puede inferir.
          // Si el error es antes (ej. teamInfo no es válido), esto es más complejo.
          // Por ahora, si falla, creamos un objeto de error.
          console.error("Error en scrapeo para un equipo:", result.reason);
          // Necesitamos una forma de identificar el equipo que falló si `result.reason` no lo incluye.
          // Esto es un desafío con Promise.allSettled si no pasamos el teamInfo original al error.
          // La función scrapeWorldFootballTeamMatches YA incluye teamDetails en su payload.
          // Si el error es catastrófico ANTES de eso, es más difícil.
          // Para este caso, asumimos que la función scrapeWorldFootballTeamMatches siempre devuelve
          // una estructura TeamMatchesData, incluso con error.
          return { // Fallback error structure
            teamDetails: { originalUrl: 'Desconocido', name: 'Equipo Desconocido', emblemSrc: null },
            season: savedSeason,
            matches: [],
            error: result.reason?.message || 'Error desconocido en scrapeo individual.',
          };
        }
      });
      setAllMatchesData(processedResults);

    } catch (e: any) {
      console.error('Error al buscar todos los partidos de equipos:', e);
      setError(e.message || 'Ocurrió un error al buscar los partidos.');
      Alert.alert('Error General', e.message || 'Ocurrió un error al buscar los partidos.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMatchItem = ({ item }: { item: MatchInfo }) => (
    <View style={[styles.matchItem, { borderColor: colorScheme === 'dark' ? '#444' : '#ddd' }]}>
      <View style={styles.matchRow}><ThemedText style={styles.matchDetailLabel}>Ronda:</ThemedText><ThemedText style={styles.matchDetailValue} numberOfLines={1}>{item.round || '-'}</ThemedText></View>
      <View style={styles.matchRow}><ThemedText style={styles.matchDetailLabel}>Fecha:</ThemedText><ThemedText style={styles.matchDetailValue}>{item.date}{item.time ? ` - ${item.time}` : ''}</ThemedText></View>
      <View style={styles.matchRow}><ThemedText style={styles.matchDetailLabel}>Rival:</ThemedText><ThemedText style={styles.matchDetailValue} numberOfLines={1}>{item.opponent || '-'}</ThemedText></View>
      <View style={styles.matchRow}><ThemedText style={styles.matchDetailLabel}>Lugar:</ThemedText><ThemedText style={styles.matchDetailValue}>{item.venue === 'H' ? 'Local' : item.venue === 'A' ? 'Visitante' : item.venue === 'N' ? 'Neutral' : '-'}</ThemedText></View>
      <View style={styles.matchRow}><ThemedText style={styles.matchDetailLabel}>Resultado:</ThemedText><ThemedText style={[styles.matchDetailValue, styles.resultText]}>{item.result || '-:-'}</ThemedText></View>
    </View>
  );

  const renderTeamMatches = ({ item }: { item: TeamMatchesData }) => (
    <View style={[styles.teamSection, { backgroundColor: colorScheme === 'dark' ? Colors.dark.card : Colors.light.card }]}>
      <View style={styles.teamHeader}>
        {item.teamDetails.emblemSrc ? (
          <Image source={{ uri: item.teamDetails.emblemSrc }} style={styles.teamEmblemList} placeholder={BLURHASH_PLACEHOLDER} transition={300} />
        ) : (
          <View style={[styles.teamEmblemList, styles.teamEmblemPlaceholder, { backgroundColor: Colors[colorScheme||'light'].icon }]} />
        )}
        <ThemedText type="subtitle" style={styles.teamNameList} numberOfLines={1}>{item.teamDetails.name || item.teamDetails.originalUrl}</ThemedText>
      </View>
      <ThemedText style={styles.seasonText}>Temporada: {item.season}</ThemedText>
      
      {item.error && (
        <View style={styles.errorContainer}><ThemedText style={styles.errorText}>Error: {item.error}</ThemedText>
        {item.fixturesUrl && <ThemedText style={styles.errorTextSmall}>URL: {item.fixturesUrl.substring(0,60)}...</ThemedText>}
        </View>
      )}

      {item.matches.length > 0 ? (
        <FlatList data={item.matches} renderItem={renderMatchItem} keyExtractor={(m, i) => `${m.date}-${m.opponent}-${i}`} scrollEnabled={false} />
      ) : !item.error ? (
        <ThemedText style={styles.noMatchesText}>No se encontraron partidos para este equipo en la temporada {item.season}.</ThemedText>
      ) : null}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.screenTitle}>Partidos por Equipo</ThemedText>
      <Button title="Buscar Partidos de Equipos Guardados" onPress={fetchAllTeamMatches} disabled={isLoading} />

      {isLoading && <ActivityIndicator size="large" style={styles.loader} />}
      
      {error && !isLoading && (<View style={styles.errorContainerGlobal}><ThemedText style={styles.errorTextGlobal}>Error General: {error}</ThemedText></View>)}

      {!isLoading && !error && allMatchesData.length > 0 && (
        <FlatList data={allMatchesData} renderItem={renderTeamMatches} keyExtractor={(td) => td.teamDetails.originalUrl + td.season} style={styles.listContainer} contentContainerStyle={{ paddingBottom: 20 }} />
      )}
      {!isLoading && !error && initialLoadDone && allMatchesData.length === 0 && (
        <ThemedText style={styles.promptText}>No se encontraron datos de partidos o no hay equipos configurados.</ThemedText>
      )}
      {!initialLoadDone && !isLoading && (
         <ThemedText style={styles.promptText}>Presiona "Buscar Partidos..." para ver los encuentros.</ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  screenTitle: { marginBottom: 20 },
  loader: { marginTop: 30, marginBottom: 20 },
  listContainer: { width: '100%', marginTop: 20 },
  teamSection: {
    marginHorizontal: 10, marginVertical: 8, padding: 15, borderRadius: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3,
  },
  teamHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  teamEmblemList: { width: 30, height: 30, marginRight: 10, borderRadius: 15 },
  teamEmblemPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  teamNameList: { fontSize: 18, fontWeight: 'bold', flexShrink: 1 },
  seasonText: { fontSize: 14, marginBottom: 10, opacity: 0.7 },
  matchItem: { paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, marginBottom: 5 },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  matchDetailLabel: { fontSize: 14, fontWeight: '600', flex: 0.4 },
  matchDetailValue: { fontSize: 14, flex: 0.6, textAlign: 'right' },
  resultText: { fontWeight: 'bold' },
  errorContainer: { padding: 10, backgroundColor: 'rgba(255,0,0,0.1)', borderRadius: 4, marginVertical: 5 },
  errorText: { color: Colors.light.errorText, fontSize: 14 }, // Usar Colors.light.errorText o Colors.dark.errorText
  errorTextSmall: { color: Colors.light.errorText, fontSize: 12, marginTop: 4, opacity: 0.8 },
  errorContainerGlobal: { width: '90%', marginTop: 20, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: Colors.light.errorBorder, backgroundColor: Colors.light.errorBackground },
  errorTextGlobal: { color: Colors.light.errorText, fontSize: 15, textAlign: 'center' },
  noMatchesText: { textAlign: 'center', paddingVertical: 15, fontSize: 14, fontStyle: 'italic', opacity: 0.7 },
  promptText: { marginTop: 40, fontSize: 16, textAlign: 'center', paddingHorizontal: 20, opacity: 0.8 },
});

// Asegúrate de tener colores de error definidos en constants/Colors.ts, por ejemplo:
// errorText: '#A00000',
// errorBackground: '#FFEEEE',
// errorBorder: '#FDBEBE',
// card: '#ffffff', // para light
// card: '#1c1c1e', // para dark
