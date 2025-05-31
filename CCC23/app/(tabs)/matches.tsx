import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Button, Platform, ActivityIndicator, Alert, ScrollView, Modal, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { useNavigation } from 'expo-router';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ScrapedTeamInfo } from '../../api/scraper'; 
import { scrapeMatchDetails, MatchDetails } from '../../api/matchScraper'; // Importar la nueva función y tipo
import { organizeMatchData, OrganizedMatchInfo } from '../../api/organizador'; // Importar el organizador
import { IconSymbol } from '@/components/ui/IconSymbol'; // Para el ícono del header
import { useColorScheme } from '@/hooks/useColorScheme'; // Para colores del modal
import { useIsFocused } from '@react-navigation/native'; // Para detectar foco en la pantalla
import { Colors } from '@/constants/Colors'; // Para colores del modal

export default function MatchesScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [matchesData, setMatchesData] = useState<MatchDetails[] | null>(null);
  const [organizedData, setOrganizedData] = useState<OrganizedMatchInfo[] | null>(null);
  const [isJsonModalVisible, setIsJsonModalVisible] = useState(false);
  const [jsonToShow, setJsonToShow] = useState<'original' | 'organized' | null>(null);
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isFocused = useIsFocused();

  const TEAMS_STORAGE_KEY = 'myTeams';
  const SEASON_STORAGE_KEY = 'currentSeason'; // Clave para la temporada guardada

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            if (matchesData) {
              setJsonToShow('original'); // Por defecto, el ícono del header muestra el original
              setIsJsonModalVisible(true);
            } else {
              Alert.alert("Sin datos", "Primero realiza el scrapeo de partidos para ver el JSON.");
            }
          }}
          style={{ marginRight: 15 }}
          disabled={isLoading} // Deshabilitar si está cargando
        >
          <IconSymbol name="doc.text.magnifyingglass" size={24} color={Colors[colorScheme ?? 'light'].tint} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, matchesData, isLoading, colorScheme]); // No es necesario jsonToShow aquí

  useEffect(() => {
    // Realizar el scrapeo automáticamente si la pantalla está enfocada,
    // no hay datos cargados y no se está cargando actualmente.
    if (isFocused && !matchesData && !isLoading) {
      console.log("MatchesScreen focused and no data, initiating automatic scrape.");
      setOrganizedData(null); // Limpiar datos organizados si se vuelve a scrapear
      handleFetchMatchDetails();
    }
    // No incluir handleFetchMatchDetails en las dependencias para evitar bucles si la función no está memoizada.
  }, [isFocused, matchesData, isLoading]); 

  const handleFetchMatchDetails = async () => {
    setIsLoading(true);
    setMatchesData(null);
    setOrganizedData(null); // Limpiar datos organizados al iniciar nuevo scrapeo

    try {
      const teamsJson = await AsyncStorage.getItem(TEAMS_STORAGE_KEY);
      if (!teamsJson) {
        Alert.alert('Error', 'No hay equipos guardados para obtener la URL.');
        setIsLoading(false);
        return;
      }

      const savedTeams: ScrapedTeamInfo[] = JSON.parse(teamsJson);
      if (savedTeams.length === 0) {
        Alert.alert('Información', 'No hay equipos guardados para scrapear.');
        setIsLoading(false);
        return;
      }

      const allScrapedMatches: MatchDetails[] = [];
      const savedSeason = await AsyncStorage.getItem(SEASON_STORAGE_KEY);

      for (const team of savedTeams) {
        if (!team.originalUrl) {
          console.warn(`Equipo omitido por no tener URL: ${team.teamName || 'Nombre desconocido'}`);
          allScrapedMatches.push({
            Team: team.teamName || 'unknown_team_name_in_loop', // Usar teamName para el contexto
            error: 'URL original no encontrada para este equipo.'
          });
          continue;
        }

        let targetUrl = team.originalUrl;
        if (savedSeason) {
          const updatedUrl = targetUrl.replace(/(\/teams\/[^\/]+\/)\d{4}(\/\d+\/?)/, `$1${savedSeason}$2`);
          if (updatedUrl !== targetUrl) {
            console.log(`Para ${team.teamName || targetUrl}: URL original: ${targetUrl}, Temporada guardada: ${savedSeason}, URL actualizada: ${updatedUrl}`);
            targetUrl = updatedUrl;
          }
        }

        let fullUrl = targetUrl;
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          fullUrl = `https://${targetUrl}`;
        }

        console.log(`Scrapeando partidos para: ${team.teamName || fullUrl}`);
        const scrapedDataForTeam = await scrapeMatchDetails(fullUrl, team.teamName || null); // Pasar team.teamName como contexto
        allScrapedMatches.push(...scrapedDataForTeam); // Agrega los partidos de este equipo al array general
      }

      console.log('Todos los Detalles de Partidos Obtenidos:', allScrapedMatches);
      setMatchesData(allScrapedMatches);

    } catch (error: any) {
      console.error('Error al obtener detalles del partido:', error);
      Alert.alert('Error', error.message || 'Ocurrió un error al obtener los detalles del partido.');
      setMatchesData([{ error: error.message, Team: 'general_error_context' }]); // Usar Team para el contexto genérico
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrganizeData = () => {
    if (!matchesData) {
      Alert.alert("Sin Datos", "No hay datos de partidos para organizar. Realiza el scrapeo primero.");
      return;
    }
    console.log("Iniciando proceso de organización de datos...");
    setIsLoading(true); // Podrías tener un loader específico para la organización
    try {
      const processedData = organizeMatchData(matchesData);
      setOrganizedData(processedData);
      Alert.alert("Éxito", "Los datos de los partidos han sido organizados.");
    } catch (error: any) {
      console.error("Error al organizar los datos:", error);
      Alert.alert("Error de Organización", error.message || "Ocurrió un error al organizar los datos.");
      setOrganizedData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const openModalWithOrganizedData = () => {
    if (organizedData) {
      setJsonToShow('organized');
      setIsJsonModalVisible(true);
    } else {
      Alert.alert("Sin Datos Organizados", "Primero organiza los datos usando el botón 'Procesar Partidos'.");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.screenTitle}>Matches</ThemedText>
      <View style={styles.content}>
        <Button
          title="Procesar Partidos" // Cambiado el título del botón
          onPress={handleOrganizeData}
          disabled={isLoading || !matchesData} // Deshabilitado si está cargando o si no hay datos originales
        />
        {isLoading && <ActivityIndicator size="large" style={styles.loader} />}
        {!isLoading && matchesData && (
          <ThemedText style={styles.infoText} numberOfLines={3} ellipsizeMode="tail">
            {matchesData.some(match => match.error) // Verifica si algún objeto de partido tiene un error
              ? `Se encontraron errores durante el scrapeo. Presiona el ícono 🔎 para ver detalles.`
              : matchesData.length > 0 
              ? `Se ${
                  matchesData.length === 1 
                    ? 'obtuvo 1 partido' 
                    : 'obtuvieron ' + matchesData.length + ' partidos'
                } de todos los equipos. Presiona el ícono 🔎 para ver el JSON.`
              : `No se encontraron partidos. Presiona el ícono 🔎 para ver más detalles.`
            }
          </ThemedText>
        )}
        {organizedData && !isLoading && (
          <View style={styles.buttonSpacing}>
            <Button
              title="Ver Organizado"
              onPress={openModalWithOrganizedData}
              color={Platform.OS === 'ios' ? Colors.light.tint : Colors.dark.tint} // Un color diferente para distinguirlo
            />
          </View>
        )}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isJsonModalVisible}
        onRequestClose={() => {
          setJsonToShow(null); // Limpiar al cerrar
          setIsJsonModalVisible(!isJsonModalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={[
            styles.modalView,
            { backgroundColor: colorScheme === 'dark' ? Colors.dark.background : Colors.light.background }
          ]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {jsonToShow === 'organized' ? "JSON de Partidos Organizados" : "JSON de Partidos Originales"}
            </ThemedText>
            <ScrollView style={styles.jsonScrollView}>
              <ThemedText style={styles.jsonText}>
                {jsonToShow === 'original' && matchesData && JSON.stringify(matchesData, null, 2)}
                {jsonToShow === 'organized' && organizedData && JSON.stringify(organizedData, null, 2)}
                {(!jsonToShow || (jsonToShow === 'original' && !matchesData) || (jsonToShow === 'organized' && !organizedData)) &&
                  "No hay datos para mostrar."
                }
              </ThemedText>
            </ScrollView>
            <Button
              title="Cerrar"
              onPress={() => setIsJsonModalVisible(false)}
              color={Platform.OS === 'ios' ? Colors.light.tint : undefined}
            />
          </View>
        </View>
      </Modal>
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
  infoText: {
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonSpacing: {
    marginTop: 15, // Espacio entre el botón "Procesar" y "Ver Organizado"
  },
  detailItem: {
    fontSize: 16,
    marginBottom: 5,
  },
  detailItemSmall: {
    fontSize: 12,
    color: '#666', // Un color más tenue para información secundaria
    marginBottom: 8,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  // Estilos para el Modal
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', // Fondo semitransparente
  },
  modalView: {
    margin: 20,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
  },
  jsonScrollView: {
    width: '100%',
    marginBottom: 20,
    maxHeight: '70%', // Limitar altura del scrollview dentro del modal
  },
  jsonText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', // Fuente monoespaciada para JSON
  },
});
