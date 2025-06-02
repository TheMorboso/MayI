import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Button, Platform, ActivityIndicator, Alert, ScrollView, Modal, TouchableOpacity, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ScrapedTeamInfo } from '../../api/scraper';
import { scrapeMatchDetails, MatchDetails } from '../../api/matchScraper';
import { processPostScudettoData, PostScudettoMatchInfo } from '../../api/postscudetto';
import { organizeMatchData, OrganizedMatchInfo } from '../../api/organizador';
import { processPositiveNegative, PositiveNegativeTeamInfo } from '../../api/positivonegativo'; // Importar
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useIsFocused } from '@react-navigation/native';
import { Colors } from '@/constants/Colors';

export default function MatchesScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [matchesData, setMatchesData] = useState<MatchDetails[] | null>(null);
  const [organizedData, setOrganizedData] = useState<OrganizedMatchInfo[] | null>(null);
  const [postScudettoData, setPostScudettoData] = useState<PostScudettoMatchInfo[] | null>(null);
  const [positiveNegativeData, setPositiveNegativeData] = useState<PositiveNegativeTeamInfo[] | null>(null);
  const [isJsonModalVisible, setIsJsonModalVisible] = useState(false);
  const [jsonToShow, setJsonToShow] = useState<'original' | 'organized' | 'postScudetto' | 'positiveNegative' | null>(null);

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
            if (matchesData || organizedData || postScudettoData || positiveNegativeData) {
              setIsJsonModalVisible(true);
            } else {
              Alert.alert("Sin datos", "Primero realiza el scrapeo de partidos para ver el JSON.");
            }
          }}
          style={{ marginRight: 15 }}
          disabled={isLoading} // Deshabilitar si está cargando
          // disabled={isLoading || (!matchesData && !organizedData && !postScudettoData && !positiveNegativeData)}
        >
          <IconSymbol name="doc.text.magnifyingglass" size={24} color={Colors[colorScheme ?? 'light'].tint} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, matchesData, organizedData, postScudettoData, positiveNegativeData, isLoading, colorScheme]);

  useEffect(() => {
    if (isFocused && !matchesData && !isLoading) {
      setOrganizedData(null);
      setPostScudettoData(null);
      setPositiveNegativeData(null);
      handleFetchMatchDetails();
    }
  }, [isFocused, matchesData, isLoading]);

  const handleFetchMatchDetails = async () => {
    setIsLoading(true);
    setMatchesData(null);
    setOrganizedData(null);
    setPostScudettoData(null);
    setPositiveNegativeData(null);

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

        // Automatically process Positive/Negative for teams
        try {
          const teamsJsonForPN = await AsyncStorage.getItem(TEAMS_STORAGE_KEY);
          if (teamsJsonForPN) {
            const savedTeamsForPN: ScrapedTeamInfo[] = JSON.parse(teamsJsonForPN);
            if (savedTeamsForPN.length > 0) {
              const pnResult = processPositiveNegative(savedTeamsForPN);
              setPositiveNegativeData(pnResult);
              console.log("Procesamiento Positivo/Negativo automático completado.");
            } else {
              console.log("P/N: No hay equipos guardados para procesar.");
              setPositiveNegativeData(null);
            }
          } else {
            console.log("P/N: No se encontró TEAMS_STORAGE_KEY.");
            setPositiveNegativeData(null);
          }
        } catch (pnError: any) {
          console.error("Error en procesamiento Positivo/Negativo automático:", pnError);
          // Alert.alert("Error P/N Automático", `Ocurrió un error: ${pnError.message || 'Error desconocido'}`);
          setPositiveNegativeData(null);
        }
      }

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Ocurrió un error al obtener los detalles del partido.');
      setMatchesData([{ error: error.message, Team: 'general_error_context' }]);
      setOrganizedData(null);
      setPostScudettoData(null);
      setPositiveNegativeData(null);
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
              ? `Se encontraron errores durante el scrapeo. Presiona el ícono 🔎 para ver detalles.`
              : matchesData.length > 0
                ? postScudettoData
                  ? `Se obtuvieron, organizaron y procesaron (Post Scudetto) ${postScudettoData.length} partidos. Presiona el ícono 🔎 para ver JSON.`
                  : organizedData
                    ? `Se obtuvieron y organizaron ${organizedData.length} partidos. Procesando Post Scudetto...`
                    : `Se obtuvieron ${matchesData.length} partidos. Error en organización o sin datos para organizar.`
              : `No se encontraron partidos. Presiona el ícono 🔎 para ver más detalles.`
            }
          </ThemedText>
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
            <ThemedText type="subtitle" style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">
              {jsonToShow === 'original' && "JSON de Partidos Originales"}
              {jsonToShow === 'organized' && "JSON de Partidos Organizados"}
              {jsonToShow === 'postScudetto' && "JSON de Partidos Post Scudetto"}
              {jsonToShow === 'positiveNegative' && "JSON Positivo/Negativo (Teams)"}
              {!jsonToShow && "Seleccionar JSON para Visualizar"}
            </ThemedText>

            <View style={styles.jsonSelectorContainer}>
              {matchesData && (
                <Button title="Original" onPress={() => setJsonToShow('original')} disabled={jsonToShow === 'original' || !matchesData} color={Colors[colorScheme ?? 'light'].tint}/>
              )}
              {organizedData && (
                <Button title="Organizado" onPress={() => setJsonToShow('organized')} disabled={jsonToShow === 'organized' || !organizedData} color={Colors[colorScheme ?? 'light'].tint}/>
              )}
              {postScudettoData && (
                <Button title="Post Scudetto" onPress={() => setJsonToShow('postScudetto')} disabled={jsonToShow === 'postScudetto' || !postScudettoData} color={Colors[colorScheme ?? 'light'].tint}/>
              )}
              {positiveNegativeData && (
                <Button title="P/N Teams" onPress={() => setJsonToShow('positiveNegative')} disabled={jsonToShow === 'positiveNegative' || !positiveNegativeData} color={Colors[colorScheme ?? 'light'].tint}/>
              )}
            </View>
            
            <ScrollView style={styles.jsonScrollView}>
              <ThemedText style={styles.jsonText}>
                {jsonToShow === 'original' && matchesData && JSON.stringify(matchesData, null, 2)}
                {jsonToShow === 'organized' && organizedData && JSON.stringify(organizedData, null, 2)}
                {jsonToShow === 'postScudetto' && postScudettoData && JSON.stringify(postScudettoData, null, 2)}
                {jsonToShow === 'positiveNegative' && positiveNegativeData && JSON.stringify(positiveNegativeData, null, 2)}
                {(!jsonToShow ||
                  (jsonToShow === 'original' && !matchesData) ||
                  (jsonToShow === 'organized' && !organizedData) ||
                  (jsonToShow === 'postScudetto' && !postScudettoData)
                  (jsonToShow === 'positiveNegative' && !positiveNegativeData)
                  ) && (
                    jsonToShow ? "Datos no disponibles para esta selección." : "Selecciona un tipo de JSON para visualizar."
                  )
                }
              </ThemedText>
            </ScrollView>
            <Button
              title="Cerrar"
              onPress={() => {
                setIsJsonModalVisible(false);
                // setJsonToShow(null); // Optionally reset selection on close
              }}
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
  // buttonSpacing: { // No longer used
  //   marginTop: 15,
  // },
  // detailItem, detailItemSmall, errorText are not used, consider removing
  // detailItem: {
  //   fontSize: 16,
  //   marginBottom: 5,
  // },
  // detailItemSmall: {
  //   fontSize: 12,
  //   color: '#666',
  //   marginBottom: 8,
  // },
  // errorText: {
  //   color: 'red',
  //   fontSize: 16,
  // },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', // Darker overlay for better contrast
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
    maxHeight: '80%', // Ensure modal doesn't take full screen height
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
  },
  jsonScrollView: {
    width: '100%',
    marginBottom: 20,
    maxHeight: '70%', // Constrain scroll view height within modal
    // Consider adding a border or different background for the scroll view itself
    // borderColor: Colors.light.icon, // Example
    // borderWidth: 1, // Example
  },
  jsonText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', // Monospaced font for JSON
  },
  // actionSection: { // No longer used
  //   marginTop: 20,
  //   flexDirection: 'row',
  //   alignItems: 'center',
  // }
  jsonSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
});
