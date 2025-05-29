import React, { useState } from 'react';
import { StyleSheet, View, Button, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ScrapedTeamInfo } from '../../api/scraper'; 
import { scrapeMatchDetails, MatchDetails } from '../../api/matchScraper'; // Importar la nueva función y tipo

export default function MatchesScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);

  const TEAMS_STORAGE_KEY = 'myTeams';
  const SEASON_STORAGE_KEY = 'currentSeason'; // Clave para la temporada guardada

  const handleFetchMatchDetails = async () => {
    setIsLoading(true);
    setMatchDetails(null);

    try {
      const teamsJson = await AsyncStorage.getItem(TEAMS_STORAGE_KEY);
      if (!teamsJson) {
        Alert.alert('Error', 'No hay equipos guardados para obtener la URL.');
        setIsLoading(false);
        return;
      }

      const teams: ScrapedTeamInfo[] = JSON.parse(teamsJson);
      if (teams.length === 0 || !teams[0].originalUrl) {
        Alert.alert('Error', 'No se encontró una URL válida en el primer equipo guardado.');
        setIsLoading(false);
        return;
      }

      let targetUrl = teams[0].originalUrl;

      // Intentar obtener la temporada guardada y modificar la URL
      const savedSeason = await AsyncStorage.getItem(SEASON_STORAGE_KEY);
      if (savedSeason) {
        // Reemplazar el año en la URL con la temporada guardada
        // Asume una estructura como /teams/team-name/YYYY/number/
        const updatedUrl = targetUrl.replace(/(\/teams\/[^\/]+\/)\d{4}(\/\d+\/?)/, `$1${savedSeason}$2`);
        if (updatedUrl !== targetUrl) {
          console.log(`URL original: ${targetUrl}, Temporada guardada: ${savedSeason}, URL actualizada: ${updatedUrl}`);
          targetUrl = updatedUrl;
        }
      }

      let fullUrl = targetUrl;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        fullUrl = `https://${targetUrl}`;
      }

      const scrapedData = await scrapeMatchDetails(fullUrl);
      console.log('Detalles del Partido Obtenidos:', scrapedData);
      setMatchDetails(scrapedData);

    } catch (error: any) {
      console.error('Error al obtener detalles del partido:', error);
      Alert.alert('Error', error.message || 'Ocurrió un error al obtener los detalles del partido.');
      setMatchDetails({ error: error.message || 'Error desconocido' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.screenTitle}>Matches</ThemedText>
      <View style={styles.content}>
        <Button
          title="Matches"
          onPress={handleFetchMatchDetails}
          disabled={isLoading}
        />
        {isLoading && <ActivityIndicator size="large" style={styles.loader} />}
        {matchDetails && !isLoading && (
          <ScrollView style={styles.detailsContainer} contentContainerStyle={styles.detailsContentContainer}>
            {matchDetails.error ? (
              <ThemedText style={styles.errorText}>Error: {matchDetails.error}</ThemedText>
            ) : (
              <>
                <ThemedText style={styles.detailItem}>URL: {matchDetails.sourceUrl}</ThemedText>
                <ThemedText style={styles.detailItem}>Jornada: {matchDetails.week || 'No disponible'}</ThemedText>
                <ThemedText style={styles.detailItem}>Fecha: {matchDetails.fecha || 'No disponible'}</ThemedText>
                <ThemedText style={styles.detailItem}>Hora: {matchDetails.hora || 'No disponible'}</ThemedText>
                <ThemedText style={styles.detailItem}>Lugar: {matchDetails.lugar || 'No disponible'}</ThemedText>
                <ThemedText style={styles.detailItem}>Equipo Contrario: {matchDetails.equipoContrario || 'No disponible'}</ThemedText>
                <ThemedText style={styles.detailItem}>Resultado: {matchDetails.resultado || 'No disponible'}</ThemedText>
              </>
            )}
          </ScrollView>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80, // Aumentado para dar espacio al título absoluto
  },
  screenTitle: {
    marginBottom: 20,
    position: 'absolute', // Para que no empuje el contenido
    top: 40, // Ajusta según sea necesario
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%', // Asegurar que el contenido ocupe el ancho
  },
  loader: {
    marginTop: 20,
  },
  detailsContainer: {
    marginTop: 20,
    width: '90%',
    maxHeight: '60%', // Limitar altura para que no se salga de pantalla
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
  },
  detailsContentContainer: {
    alignItems: 'flex-start', // Alinear texto a la izquierda
  },
  detailItem: {
    fontSize: 16,
    marginBottom: 5,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});
