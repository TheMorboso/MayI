import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Button, Platform, ActivityIndicator, Alert, ScrollView, Modal, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ScrapedTeamInfo } from '../../api/scraper';
import { scrapeMatchDetails, MatchDetails } from '../../api/matchScraper';
import { processPostScudettoData, PostScudettoMatchInfo } from '../../api/postscudetto';
import { organizeMatchData, OrganizedMatchInfo } from '../../api/organizador';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useIsFocused } from '@react-navigation/native';
import { Colors } from '@/constants/Colors';

export default function MatchesScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [matchesData, setMatchesData] = useState<MatchDetails[] | null>(null);
  const [organizedData, setOrganizedData] = useState<OrganizedMatchInfo[] | null>(null);
  const [postScudettoData, setPostScudettoData] = useState<PostScudettoMatchInfo[] | null>(null);
  const [isJsonModalVisible, setIsJsonModalVisible] = useState(false);
  const [jsonToShow, setJsonToShow] = useState<'original' | 'organized' | 'postScudetto' | null>(null);
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
              setJsonToShow('original');
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
  }, [navigation, matchesData, isLoading, colorScheme]);

  useEffect(() => {
    if (isFocused && !matchesData && !isLoading) {
      setOrganizedData(null);
      setPostScudettoData(null);
      handleFetchMatchDetails();
    }
  }, [isFocused, matchesData, isLoading]);

  const handleFetchMatchDetails = async () => {
    setIsLoading(true);
    setMatchesData(null);
    setOrganizedData(null);
    setPostScudettoData(null);

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
          allScrapedMatches.push({
            Team: team.teamName || 'unknown_team_name_in_loop',
            error: 'URL original no encontrada para este equipo.'
          });
          continue;
        }

        let targetUrl = team.originalUrl;
        if (savedSeason) {
          const updatedUrl = targetUrl.replace(/(\/teams\/[^\/]+\/)\d{4}(\/\d+\/?)/, `$1${savedSeason}$2`);
          if (updatedUrl !== targetUrl) {
            targetUrl = updatedUrl;
          }
        }

        let fullUrl = targetUrl;
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          fullUrl = `https://${targetUrl}`;
        }

        const scrapedDataForTeam = await scrapeMatchDetails(fullUrl, team.teamName || null);
        allScrapedMatches.push(...scrapedDataForTeam);
      }

      setMatchesData(allScrapedMatches);

      if (allScrapedMatches && allScrapedMatches.length > 0 && !allScrapedMatches.some(m => m.error)) {
        try {
          const teamsJsonForOrg = await AsyncStorage.getItem(TEAMS_STORAGE_KEY);
          let currentSavedTeamsFirstNavLinkTexts: string[] = [];
          if (teamsJsonForOrg) {
            const savedTeamsForOrg: ScrapedTeamInfo[] = JSON.parse(teamsJsonForOrg);
            currentSavedTeamsFirstNavLinkTexts = savedTeamsForOrg
              .map(team => team.firstNavLinkText)
              .filter((text): text is string => typeof text === 'string' && text.trim() !== '');
          }
          const processedData = organizeMatchData(allScrapedMatches, currentSavedTeamsFirstNavLinkTexts);
          setOrganizedData(processedData);
        } catch (orgError: any) {
          Alert.alert("Error de Organización Automática", orgError.message || "Ocurrió un error al organizar los datos automáticamente.");
          setOrganizedData(null);
        }
      } else if (allScrapedMatches && allScrapedMatches.some(m => m.error)) {
        setOrganizedData(null);
      } else {
        setOrganizedData(null);
      }

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Ocurrió un error al obtener los detalles del partido.');
      setMatchesData([{ error: error.message, Team: 'general_error_context' }]);
      setOrganizedData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessPostScudetto = async () => {
    if (!organizedData) {
      Alert.alert("Sin Datos Base", "No hay datos organizados para procesar con Post Scudetto. Asegúrate de que el scrapeo y la organización inicial fueron exitosos.");
      return;
    }
    setIsLoading(true);
    setPostScudettoData(null);
    try {
      const teamsJsonForPoints = await AsyncStorage.getItem(TEAMS_STORAGE_KEY);
      let leagueCompetitionNamesForPoints: string[] = [];
      if (teamsJsonForPoints) {
        const savedTeamsForPoints: ScrapedTeamInfo[] = JSON.parse(teamsJsonForPoints);
        leagueCompetitionNamesForPoints = savedTeamsForPoints
          .map(team => team.firstNavLinkText)
          .filter((text): text is string => typeof text === 'string' && text.trim() !== '');
      }

      const finalData = processPostScudettoData(organizedData, leagueCompetitionNamesForPoints);
      setPostScudettoData(finalData);
      Alert.alert("Éxito", "Los datos han sido procesados con la lógica Post Scudetto.");
    } catch (error: any) {
      Alert.alert("Error de Procesamiento Post Scudetto", error.message || "Ocurrió un error durante el procesamiento Post Scudetto.");
      setPostScudettoData(null);
    } finally {
      setIsLoading(false);
    }
  };


  const openModalWithPostScudettoData = () => {
    if (postScudettoData) {
      setJsonToShow('postScudetto');
      setIsJsonModalVisible(true);
    } else {
      Alert.alert("Sin Datos Post Scudetto", "Primero procesa los datos usando el botón 'Procesar Post Scudetto'.");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.screenTitle}>Matches</ThemedText>
      <View style={styles.content}>
        <Button
          title="Procesar Post Scudetto"
          onPress={handleProcessPostScudetto}
          disabled={isLoading || !organizedData}
        />
        {isLoading && <ActivityIndicator size="large" style={styles.loader} />}
        {!isLoading && matchesData && (
          <ThemedText style={styles.infoText} numberOfLines={3} ellipsizeMode="tail">
            {matchesData.some(match => match.error)
              ? `Se encontraron errores durante el scrapeo. Presiona el ícono 🔎 para ver detalles.`
              : matchesData.length > 0
              ? organizedData
                ? `Se obtuvieron y organizaron ${organizedData.length} partidos. Presiona el ícono 🔎 para ver el JSON original.`
                : `Se obtuvieron ${matchesData.length} partidos. Error en organización automática o sin datos para organizar.`
              : `No se encontraron partidos. Presiona el ícono 🔎 para ver más detalles.`
            }
          </ThemedText>
        )}
        {postScudettoData && !isLoading && (
          <View style={styles.buttonSpacing}>
            <Button
              title="Ver Post Scudetto JSON"
              onPress={openModalWithPostScudettoData}
              color={Platform.OS === 'ios' ? Colors.light.tint : Colors.dark.tint}
            />
          </View>
        )}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isJsonModalVisible}
        onRequestClose={() => {
          setJsonToShow(null);
          setIsJsonModalVisible(!isJsonModalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={[
            styles.modalView,
            { backgroundColor: colorScheme === 'dark' ? Colors.dark.background : Colors.light.background }
          ]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {jsonToShow === 'original' && "JSON de Partidos Originales"}
              {jsonToShow === 'organized' && "JSON de Partidos Organizados"}
              {jsonToShow === 'postScudetto' && "JSON de Partidos Post Scudetto"}
              {!jsonToShow && "JSON Data"}
            </ThemedText>
            <ScrollView style={styles.jsonScrollView}>
              <ThemedText style={styles.jsonText}>
                {jsonToShow === 'original' && matchesData && JSON.stringify(matchesData, null, 2)}
                {jsonToShow === 'organized' && organizedData && JSON.stringify(organizedData, null, 2)}
                {jsonToShow === 'postScudetto' && postScudettoData && JSON.stringify(postScudettoData, null, 2)}
                {(!jsonToShow ||
                  (jsonToShow === 'original' && !matchesData) ||
                  (jsonToShow === 'organized' && !organizedData) ||
                  (jsonToShow === 'postScudetto' && !postScudettoData)
                  ) &&
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
    paddingTop: 80,
  },
  screenTitle: {
    marginBottom: 20,
    position: 'absolute',
    top: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
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
    marginTop: 15,
  },
  detailItem: {
    fontSize: 16,
    marginBottom: 5,
  },
  detailItemSmall: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  centeredView: {
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
    maxHeight: '70%',
  },
  jsonText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
