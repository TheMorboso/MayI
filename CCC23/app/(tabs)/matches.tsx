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
import { Colors } from '@/constants/Colors';
import { useIsFocused } from '@react-navigation/native';

export default function MatchesScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [matchesData, setMatchesData] = useState<MatchDetails[] | null>(null);
  const [organizedData, setOrganizedData] = useState<OrganizedMatchInfo[] | null>(null);
  const [postScudettoData, setPostScudettoData] = useState<PostScudettoMatchInfo[] | null>(null);

  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isFocused = useIsFocused();

  const TEAMS_STORAGE_KEY = 'myTeams';
  const SEASON_STORAGE_KEY = 'currentSeason'; // Clave para la temporada guardada
  const POST_SCUDETTO_DATA_KEY = 'postScudettoAllMatchData';
  const [isPostScudettoJsonModalVisible, setIsPostScudettoJsonModalVisible] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            if (postScudettoData) {
              setIsPostScudettoJsonModalVisible(true);
            } else {
              Alert.alert("Sin datos", "No hay datos Post Scudetto para mostrar. Realiza el scrapeo primero.");
            }
          }}
          style={{ marginRight: 15 }}
          disabled={isLoading || !postScudettoData}
        >
          <IconSymbol name="doc.text.magnifyingglass" size={24} color={Colors[colorScheme ?? 'light'].tint} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, postScudettoData, isLoading, colorScheme]);
  
  useEffect(() => {
    if (isFocused && !matchesData && !isLoading) {
      setOrganizedData(null);
      setPostScudettoData(null);
      handleFetchMatchDetails();
    }
  }, [isFocused, matchesData, isLoading]);

  useEffect(() => {
    const saveProcessedData = async () => {
      // Avoid action if postScudettoData is undefined (e.g., initial state before any processing attempt)
      if (typeof postScudettoData === 'undefined') return;

      if (postScudettoData !== null) { // If there is data (even an empty array means data was processed)
        try {
          await AsyncStorage.setItem(POST_SCUDETTO_DATA_KEY, JSON.stringify(postScudettoData));
        } catch (e) {
          console.error("Failed to save PostScudettoData to AsyncStorage", e);
        }
      } else { // If postScudettoData is explicitly null (e.g. error, cleared, or no data after processing)
        try {
          await AsyncStorage.removeItem(POST_SCUDETTO_DATA_KEY);
        } catch (e) {
          console.error("Failed to remove PostScudettoData from AsyncStorage", e);
        }
      }
    };
    saveProcessedData();
  }, [postScudettoData]);

  const handleFetchMatchDetails = async () => {
    setIsLoading(true);
    setMatchesData(null);
    setOrganizedData(null);
    setPostScudettoData(null);

    let currentSavedTeamsFirstNavLinkTexts: string[] = []; // Define here to be accessible in the whole function scope

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

      // Populate currentSavedTeamsFirstNavLinkTexts once
      currentSavedTeamsFirstNavLinkTexts = savedTeams
        .map(team => team.firstNavLinkText)
        .filter((text): text is string => typeof text === 'string' && text.trim() !== '');

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
          // No need to re-fetch TEAMS_STORAGE_KEY, use currentSavedTeamsFirstNavLinkTexts
          const processedData = organizeMatchData(allScrapedMatches, currentSavedTeamsFirstNavLinkTexts);
          setOrganizedData(processedData);
        } catch (orgError: any) {
          setPostScudettoData(null);
          Alert.alert("Error de Organización Automática", orgError.message || "Ocurrió un error al organizar los datos automáticamente.");
          setOrganizedData(null);
        }
      } else if (allScrapedMatches && allScrapedMatches.some(m => m.error)) {
        setOrganizedData(null);
      } else {
        setOrganizedData(null);
      }

      if (allScrapedMatches && allScrapedMatches.length > 0 && !allScrapedMatches.some(m => m.error)) {
        // Re-organize to ensure we have the latest data for PostScudetto, or use the state if confident
        // For robustness, re-organizing or ensuring organizedData state is up-to-date is good.
        // Here, we'll re-organize to pass the most current data directly.
        const currentOrganizedData = organizeMatchData(allScrapedMatches, currentSavedTeamsFirstNavLinkTexts);
        if (currentOrganizedData && currentOrganizedData.length > 0) {
          await handleProcessPostScudetto(currentOrganizedData, currentSavedTeamsFirstNavLinkTexts);
        }
      }

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Ocurrió un error al obtener los detalles del partido.');
      setMatchesData([{ error: error.message, Team: 'general_error_context' }]);
      setOrganizedData(null);
      setPostScudettoData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessPostScudetto = async (
    currentOrganizedData: OrganizedMatchInfo[],
    leagueCompetitionNames: string[]
  ) => {
    if (!currentOrganizedData || currentOrganizedData.length === 0) {
      console.log("handleProcessPostScudetto fue llamado sin currentOrganizedData válidos, omitiendo.");
      return;
    }
    setPostScudettoData(null);
    try {
      const finalData = processPostScudettoData(currentOrganizedData, leagueCompetitionNames);
      setPostScudettoData(finalData);
    } catch (error: any) {
      Alert.alert("Error de Procesamiento Post Scudetto", error.message || "Ocurrió un error durante el procesamiento Post Scudetto.");
      setPostScudettoData(null);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.screenTitle}>Matches</ThemedText>
      <View style={styles.content}>
        {isLoading && <ActivityIndicator size="large" style={styles.loader} />}
        {!isLoading && matchesData && (
          <ThemedText style={styles.infoText} numberOfLines={3} ellipsizeMode="tail">
            {matchesData.some(match => match.error)
              ? `Se encontraron errores durante el scrapeo.`
              : matchesData.length > 0
                ? postScudettoData
                  ? `Se obtuvieron, organizaron y procesaron (Post Scudetto) ${postScudettoData.length} partidos.`
                  : organizedData
                    ? `Se obtuvieron y organizaron ${organizedData.length} partidos. Procesando Post Scudetto...`
                    : `Se obtuvieron ${matchesData.length} partidos. Error en organización o sin datos para organizar.`
              : `No se encontraron partidos.`
            }
          </ThemedText>
        )}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isPostScudettoJsonModalVisible}
        onRequestClose={() => {
          setIsPostScudettoJsonModalVisible(false);
        }}
      >
        <View style={styles.centeredView}>
          <View style={[
            styles.modalView,
            { backgroundColor: colorScheme === 'dark' ? Colors.dark.background : Colors.light.background }
          ]}>
            <ThemedText type="subtitle" style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">
              JSON de Partidos (Post Scudetto)
            </ThemedText>
            
            <ScrollView style={styles.jsonScrollView}>
              <ThemedText style={styles.jsonText}>
                {postScudettoData 
                  ? JSON.stringify(postScudettoData, null, 2) 
                  : "Datos Post Scudetto no disponibles."
                }
              </ThemedText>
            </ScrollView>
            <Button
              title="Cerrar"
              onPress={() => setIsPostScudettoJsonModalVisible(false)}
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
    paddingTop: 80, // Adjusted for potential overlap with absolute positioned title
  },
  screenTitle: {
    marginBottom: 20, // This might be overridden by absolute positioning
    position: 'absolute',
    top: 40, // Ensure it's below status bar / notch
    // Consider adding left/right to center it if needed, or alignSelf: 'center' if parent allows
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
    // Consider adding a border or different background for the scroll view itself
    // borderColor: Colors.light.icon, // Example
    // borderWidth: 1, // Example
  },
  jsonText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', 
  },
});
