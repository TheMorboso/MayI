import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, ScrollView, Alert, View } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { scrapeMatchAnalysis, MatchAnalysisDetails, PlayerInfo } from '@/api/analisis';

export default function MatchAnalysisScreen() {
  const params = useLocalSearchParams<{ matchUrl: string; matchIdentifier?: string }>();
  const router = useRouter();
  const matchUrl = params.matchUrl ? decodeURIComponent(params.matchUrl) : undefined;
  const matchIdentifier = params.matchIdentifier ? decodeURIComponent(params.matchIdentifier) : 'Partido';

  const [analysisData, setAnalysisData] = useState<MatchAnalysisDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (isLoading) {
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
    return (
      <View style={styles.playerListContainer}>
        <ThemedText type="label" style={styles.playerListTitle}>{title}</ThemedText>
        {players.map((player, index) => (
          <ThemedText key={`${title}-player-${index}`} style={styles.playerItem}>
            {player.number ? `${player.number}. ` : ''}{player.name}
          </ThemedText>
        ))}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: `Análisis: ${matchIdentifier}` }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error && (
          <ThemedView style={styles.centeredError}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </ThemedView>
        )}
        {analysisData && !analysisData.error && (
          <>
            <ThemedText type="subtitle">Resultado del Análisis</ThemedText>
            {analysisData.title && (
              <ThemedText style={styles.dataItem}>Título de la Página: {analysisData.title}</ThemedText>
            )}
            <ThemedText style={styles.dataItem}>URL Analizada: {analysisData.sourceUrl}</ThemedText>

            {analysisData.homeTeamName && analysisData.awayTeamName && (
              <ThemedText type="subtitle" style={styles.teamsHeader}>
                {analysisData.homeTeamName} vs {analysisData.awayTeamName}
              </ThemedText>
            )}

            <View style={styles.lineupsContainer}>
              <View style={styles.teamColumn}>
                {renderPlayerList(`Alineación ${analysisData.homeTeamName || 'Local'}`, analysisData.homePlayers)}
                {renderPlayerList(`Suplentes ${analysisData.homeTeamName || 'Local'}`, analysisData.homeSubstitutes)}
              </View>
              <View style={styles.teamColumn}>
                {renderPlayerList(`Alineación ${analysisData.awayTeamName || 'Visitante'}`, analysisData.awayPlayers)}
                {renderPlayerList(`Suplentes ${analysisData.awayTeamName || 'Visitante'}`, analysisData.awaySubstitutes)}
              </View>
            </View>

            {Object.keys(analysisData).filter(k => !['sourceUrl', 'error', 'title', 'homeTeamName', 'awayTeamName', 'homePlayers', 'awayPlayers', 'homeSubstitutes', 'awaySubstitutes'].includes(k) && analysisData[k as keyof MatchAnalysisDetails]).length === 0 &&
             !analysisData.homePlayers?.length && !analysisData.awayPlayers?.length && !analysisData.homeSubstitutes?.length && !analysisData.awaySubstitutes?.length && (
                 <ThemedText style={styles.dataItem}>No se extrajeron datos específicos. Implementa la lógica en `scrapeMatchAnalysis`.</ThemedText>
            )}
          </>
        )}
         {!analysisData && !error && !isLoading && (
            <ThemedText style={styles.dataItem}>No hay datos de análisis para mostrar.</ThemedText>
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
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centeredError: {
    // Similar a centered, pero podrías querer un margen superior si el error se muestra solo
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
  },
  dataItem: {
    fontSize: 16,
    marginVertical: 5,
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
    paddingHorizontal: 5, // Espacio entre columnas
  },
  playerListContainer: {
    marginBottom: 15,
  },
  playerListTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 5,
  },
  playerItem: {
    fontSize: 13,
    marginVertical: 2,
  },
});