// c/Users/Mauri/Desktop/CCC23/MayI/CCC23/app/(tabs)/matches.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Button, Platform, ActivityIndicator, Alert, ScrollView, Modal, TouchableOpacity, FlatList, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRouter } from 'expo-router';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ScrapedTeamInfo } from '../../api/scraper';
import { scrapeMatchDetails, MatchDetails } from '../../api/matchScraper';
import { applyCorrections } from '../../api/correcciones';
import { processPostScudettoData, PostScudettoMatchInfo } from '../../api/postscudetto';
import { processPositiveNegative } from '../../api/positivonegativo';
import { organizeMatchData, OrganizedMatchInfo } from '../../api/organizador';
// PlayerInfo, ACTUAL_PLAYER_POSITIONS, FORMATION_DEFINITIONS, TacticalFormationType for refresh removed
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useIsFocused } from '@react-navigation/native';

export default function MatchesScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [matchesData, setMatchesData] = useState<MatchDetails[] | null>(null);
  const [organizedData, setOrganizedData] = useState<OrganizedMatchInfo[] | null>(null);
  const [postScudettoData, setPostScudettoData] = useState<PostScudettoMatchInfo[] | null | undefined>(undefined);
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isFocused = useIsFocused();

  const TEAMS_STORAGE_KEY = 'myTeams';
  const SEASON_STORAGE_KEY = 'currentSeason';
  const POST_SCUDETTO_DATA_KEY = 'postScudettoAllMatchData';
  // TACTICAL_LINEUPS_CACHE_KEY_REFRESH removed

  const [isPostScudettoJsonModalVisible, setIsPostScudettoJsonModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyMatchesJson, setDailyMatchesJson] = useState<string | null>(null);

  const [filteredDailyMatches, setFilteredDailyMatches] = useState<PostScudettoMatchInfo[]>([]);
  const [isDailyJsonScrollViewVisible, setIsDailyJsonScrollViewVisible] = useState(false);

  // --- REFRESH LOGIC REMOVED ---
  // areAllSlotsFilledForStatusRefresh removed
  // getLineupTacticalStatusForRefreshAll removed
  // loadTacticalLineupForRefreshAll removed
  // handleRefreshAllTacticalStatuses removed


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
      handleFetchMatchDetails();
    }
  }, [isFocused, matchesData, isLoading]);

  const dateToDDMMYYYY = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    if (isLoading && (!postScudettoData || postScudettoData.length === 0)) {
      setFilteredDailyMatches([]);
      if (isDailyJsonScrollViewVisible) {
        setDailyMatchesJson("Cargando datos de partidos...");
      }
    } else if (postScudettoData && postScudettoData.length > 0) {
      const formattedSelectedDate = dateToDDMMYYYY(selectedDate);

      const rawMatchesForDate = postScudettoData.filter(
        match => match.fecha === formattedSelectedDate && match.Competicion !== "Parón Internacional"
      );

      const finalFilteredMatches: PostScudettoMatchInfo[] = [];
      const dailyProcessedPairKeys = new Set<string>();

      for (const match of rawMatchesForDate) {
        let isSpecialPairWithNegativeStatus = false;
        let pairKey: string | null = null;

        if (match.Competicion === "Competicion" && match.Team && match.equipoContrario) {
          const isTierSPair = (match.tier === "TierS" || match.tier === "TierSred") &&
                              (match.opponentTier === "TierS" || match.opponentTier === "TierSred");
          const isWorldPair = match.tier === "World" && match.opponentTier === "World";

          if ((isTierSPair || isWorldPair) && match.Status === "Negativo") {
            isSpecialPairWithNegativeStatus = true;
            const team1 = match.Team;
            const team2 = match.equipoContrario;
            const sortedTeams = [team1, team2].sort();
            pairKey = `${match.fecha}-${sortedTeams[0]}-${sortedTeams[1]}-${match.Competicion}`;
          }
        }

        if (isSpecialPairWithNegativeStatus && pairKey) {
          if (dailyProcessedPairKeys.has(pairKey)) {
            continue;
          }
          dailyProcessedPairKeys.add(pairKey);
          finalFilteredMatches.push(match);
        } else {
          finalFilteredMatches.push(match);
        }
      }
      setFilteredDailyMatches(finalFilteredMatches);

      if (isDailyJsonScrollViewVisible) {
        if (finalFilteredMatches.length > 0) {
          setDailyMatchesJson(JSON.stringify(finalFilteredMatches, null, 2));
        } else {
          setDailyMatchesJson(`No hay partidos para el ${formattedSelectedDate} (después de filtrar duplicados).`);
        }
      }
    } else {
      setFilteredDailyMatches([]);
      if (isDailyJsonScrollViewVisible) {
        setDailyMatchesJson("No hay datos de partidos cargados o procesados. Por favor, realiza el scrapeo.");
      }
    }
    if (!isDailyJsonScrollViewVisible) {
        setDailyMatchesJson(null);
    }
  }, [postScudettoData, selectedDate, isDailyJsonScrollViewVisible, isLoading]);


  useEffect(() => {
    const saveProcessedData = async () => {
      if (typeof postScudettoData === 'undefined') return;
      if (postScudettoData !== null) {
        try {
          await AsyncStorage.setItem(POST_SCUDETTO_DATA_KEY, JSON.stringify(postScudettoData));
        } catch (e) {
          console.error("Failed to save PostScudettoData to AsyncStorage", e);
        }
      } else {
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

    let currentSavedTeamsFirstNavLinkTexts: string[] = [];
    let previouslyStoredPostScudettoData: PostScudettoMatchInfo[] | null = null;

    try {
      const storedDataJson = await AsyncStorage.getItem(POST_SCUDETTO_DATA_KEY);
      if (storedDataJson) {
        previouslyStoredPostScudettoData = JSON.parse(storedDataJson);
      }
    } catch (e) {
      console.warn("MatchesScreen: Error reading previously stored PostScudettoData from AsyncStorage", e);
    }

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
      currentSavedTeamsFirstNavLinkTexts = savedTeams
        .map(team => team.firstNavLinkText)
        .filter((text): text is string => typeof text === 'string' && text.trim() !== '');

      const allScrapedMatches: MatchDetails[] = [];
      const savedSeason = await AsyncStorage.getItem(SEASON_STORAGE_KEY);

      for (const team of savedTeams) {
        if (team.tier === 'TierA' || team.tier === 'Red') continue;
        if (!team.originalUrl) {
          allScrapedMatches.push({ Team: team.teamName || 'unknown_team_name_in_loop', error: 'URL original no encontrada.' });
          continue;
        }
        let targetUrl = team.originalUrl;
        if (savedSeason) {
          const updatedUrl = targetUrl.replace(/(\/teams\/[^\/]+\/)\d{4}(\/\d+\/?)/, `$1${savedSeason}$2`);
          if (updatedUrl !== targetUrl) targetUrl = updatedUrl;
        }
        let fullUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
        const scrapedDataForTeam = await scrapeMatchDetails(fullUrl, team.teamName || null);
        allScrapedMatches.push(...scrapedDataForTeam);
      }
      setMatchesData(allScrapedMatches);

      if (allScrapedMatches && allScrapedMatches.length > 0 && !allScrapedMatches.some(m => m.error)) {
        const processedData = organizeMatchData(allScrapedMatches, currentSavedTeamsFirstNavLinkTexts, savedTeams);
        setOrganizedData(processedData);
        if (processedData && processedData.length > 0) {
          await handleProcessPostScudetto(processedData, currentSavedTeamsFirstNavLinkTexts, previouslyStoredPostScudettoData);
        } else {
          setPostScudettoData(null);
        }
      } else {
        setOrganizedData(null);
        setPostScudettoData(null);
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
    leagueCompetitionNames: string[],
    previouslyStoredData: PostScudettoMatchInfo[] | null
  ) => {
    if (!currentOrganizedData || currentOrganizedData.length === 0) {
      setPostScudettoData(null);
      return;
    }
    try {
      const finalData = processPostScudettoData(currentOrganizedData, leagueCompetitionNames);
      const dataAfterPositiveNegative = processPositiveNegative(finalData, leagueCompetitionNames);
      const correctedData = applyCorrections(dataAfterPositiveNegative);

      if (previouslyStoredData && correctedData) {
        const finalCorrectedDataWithTacticalStatus = correctedData.map(newMatch => {
          const oldMatch = previouslyStoredData.find(
            om => om.match === newMatch.match &&
                  om.Team === newMatch.Team
          );
          if (oldMatch && (oldMatch.Status === "Neutro" || oldMatch.Status === "Rojo" || oldMatch.Status === "Naranja" || oldMatch.Status === "Verde")) {
            if (newMatch.Status !== "Champion" && newMatch.Status !== "Post scudetto" && newMatch.Status !== "Negativo") {
              return { ...newMatch, Status: oldMatch.Status };
            }
          }
          return newMatch;
        });
        setPostScudettoData(finalCorrectedDataWithTacticalStatus);
      } else {
        setPostScudettoData(correctedData);
      }
    } catch (error: any) {
      Alert.alert("Error de Procesamiento Post Scudetto", error.message || "Ocurrió un error.");
      setPostScudettoData(null);
    }
  };

  const handlePreviousDay = () => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const handleNextDay = () => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  const handlePressMatchItem = (matchItem: PostScudettoMatchInfo) => {
    if (matchItem.match && matchItem.match.trim() !== '') {
      const matchIdentifier = `${matchItem.Team || 'Equipo'} vs ${matchItem.equipoContrario || 'Oponente'} (${matchItem.fecha})`;
      router.push({
        pathname: `/match-analysis`, 
        params: {
          matchUrl: encodeURIComponent(matchItem.match),
          matchIdentifier: encodeURIComponent(matchIdentifier),
          teamAName: matchItem.Team,
          teamATier: matchItem.tier,
          teamBName: matchItem.equipoContrario,
          teamBTier: matchItem.opponentTier,
          isEditing: 'true', // Go directly to editing mode
        },
      });
    } else {
      Alert.alert("Sin Enlace", "Este partido no tiene un enlace de detalles para analizar.");
    }
  };

  const renderDailyMatchItem = ({ item }: { item: PostScudettoMatchInfo }) => {
    const opponentTier = item.opponentTier;
    const shouldShowOpponentEmblemInDaily = (opponentTier === 'TierS' || opponentTier === 'TierSred') && item.opponentEmblemSrc;
    const shouldShowTeamEmblemInHeader = (item.tier === 'TierS' || item.tier === 'TierSred' || item.tier === 'TierA') && item.teamEmblemSrc;

    let opponentDisplayName = item.equipoContrario || 'Oponente N/A';
    if ((item.isMainLeagueCompetition || item.Competicion === 'Competencia' || item.Competicion === 'Competicion') && !item.opponentTier) {
      opponentDisplayName = 'TierD';
    }

    const isWorldWorldCompeticionPairWithNegativeStatus =
      item.tier === "World" &&
      item.opponentTier === "World" &&
      item.Competicion === "Competicion" &&
      item.Status === "Negativo";

    // --- W/L Indicator Logic ---
    let wlIndicator: { text: 'W' | 'L'; styleKey: 'W' | 'L' } | null = null;
    const isTierSMatch = item.tier === "TierS";
    const isLocalCompetition = item.isMainLeagueCompetition === true;
    const isCompeticionComp = item.Competicion === "Competicion";
    const isNotSvsS = !(item.tier === "TierS" && item.opponentTier === "TierS");
    
    const canShowWL = item.Status !== "Post scudetto" && 
                      item.Status !== "Negativo" && 
                      item.Competicion !== "Amistoso" &&
                      !(isCompeticionComp && item.tier === "TierS" && item.opponentTier === "TierS");


    if (canShowWL && isTierSMatch && (isLocalCompetition || isCompeticionComp) && isNotSvsS && item.lugar && item.resultado) {
      const scoreMatch = item.resultado.match(/^(\d+):(\d+)/);
      if (scoreMatch) {
        const score1 = parseInt(scoreMatch[1], 10); // Home score
        const score2 = parseInt(scoreMatch[2], 10); // Away score

        if (!isNaN(score1) && !isNaN(score2)) {
          if (item.lugar === 'A') { // item.Team is the Away team
            if (score2 <= score1) wlIndicator = { text: 'W', styleKey: 'W' }; // Away loses or draws => W
            else if (score2 > score1) wlIndicator = { text: 'L', styleKey: 'L' };    // Away wins => L
          } else if (item.lugar === 'H') { // item.Team is the Home team
            if (score1 < score2) wlIndicator = { text: 'L', styleKey: 'L' };     // Home loses => L
            else if (score1 >= score2) wlIndicator = { text: 'W', styleKey: 'W' }; // Home wins or draws => W
          }
        }
      }
    }
    // --- End W/L Indicator Logic ---


    if (
      item.Competicion === 'Parón Internacional' ||
      item.Status === 'Champion' ||
      item.Status === 'Post scudetto' ||
      (item.Status === 'Negativo' && !isWorldWorldCompeticionPairWithNegativeStatus)
    ) {
      let specialStyle = {};
      let text = '';
      
      if (item.Competicion === 'Parón Internacional') {
        specialStyle = styles.internationalBreakItem; text = 'PARÓN INTERNACIONAL';
      } else {
        switch (item.Status) {
          case 'Champion': specialStyle = styles.championItem; text = 'CAMPEÓN'; break;
          case 'Post scudetto': specialStyle = styles.postScudettoItem; text = 'POST SCUDETTO'; break;
          case 'Negativo':
            specialStyle = styles.negativoItem; text = 'NEGATIVO'; break;
        }
      }
      return (
        <TouchableOpacity onPress={() => handlePressMatchItem(item)} activeOpacity={item.match ? 0.7 : 1}>
          <View style={[styles.dailyMatchItemContainer, styles.statusHighlightItem, specialStyle]}>
            <View style={styles.statusHighlightContent}>
              <ThemedText style={styles.statusHighlightText}>{text}</ThemedText>
              {/* W/L Indicator for special status items - only if canShowWL was true before this block */}
              {wlIndicator && item.lugar && ['H', 'A'].includes(item.lugar) && canShowWL && (
                 <View style={[styles.wlIndicatorCircle, wlIndicator.styleKey === 'W' ? styles.wlIndicatorWBackground : styles.wlIndicatorLBackground]}>
                   <ThemedText style={wlIndicator.styleKey === 'W' ? styles.wlIndicatorTextW : styles.wlIndicatorTextL}>
                     {wlIndicator.text}
                   </ThemedText>
                 </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity onPress={() => handlePressMatchItem(item)} activeOpacity={item.match ? 0.7 : 1}>
        <ThemedView
          style={[
            styles.dailyMatchItemContainer,
            item.Status === "Neutro" && styles.neutralBorder,
            item.Status === "Rojo" && styles.redBorder,
            item.Status === "Naranja" && styles.orangeBorder,
            item.Status === "Verde" && styles.greenBorder
          ]}
          lightColor="#f9f9f9" darkColor="#2C2C2E">
          <View style={styles.matchHeaderRow}>
              <View style={styles.matchHeaderTeamInfo}>
                {shouldShowTeamEmblemInHeader && item.teamEmblemSrc && (
                  <Image source={{ uri: item.teamEmblemSrc }} style={styles.headerTeamEmblem} />
                )}
                <ThemedText style={styles.matchTeamNameHeaderText} numberOfLines={1} ellipsizeMode="tail">{item.Team || 'Equipo N/A'}</ThemedText>
              </View>
              {item.Ronda && <ThemedText style={styles.matchRondaText}>Jda: {item.Ronda}</ThemedText>}
              {item.formato && <ThemedText style={styles.matchRondaText}>{item.formato.charAt(0).toUpperCase() + item.formato.slice(1)}</ThemedText>}
          </View>

          <View style={styles.matchDetailRow}>
              <View style={styles.dailyMatchLeftAndMiddleContainer}>
                  <View style={styles.dailyMatchDateTimeContainer}>
                      <ThemedText style={styles.dailyMatchDateSmall}>{item.fecha || 'Fecha N/A'}</ThemedText>
                      {item.hora && <ThemedText style={styles.dailyMatchTimeSmall}>{item.hora}</ThemedText>}
                  </View>

                  <View style={[styles.dailyMatchVerticalSeparator, { backgroundColor: Colors[colorScheme ?? 'light'].icon }]} />

                  {shouldShowOpponentEmblemInDaily && item.opponentEmblemSrc && (
                      <Image source={{ uri: item.opponentEmblemSrc }} style={styles.dailyMatchOpponentEmblem} />
                  )}
                  <ThemedText style={styles.dailyMatchOpponentName} numberOfLines={2} ellipsizeMode="tail">
                      {opponentDisplayName}
                  </ThemedText>
              </View>

              <View style={styles.locationAndWLContainer}>
                {item.lugar && ['H', 'A', 'N'].includes(item.lugar) && (
                    <ThemedText style={styles.locationTextDaily}>{item.lugar}</ThemedText>
                )}
                {/* W/L Indicator for regular items */}
                {wlIndicator && item.lugar && ['H','A'].includes(item.lugar) ? (
                    <View style={[styles.wlIndicatorCircle, wlIndicator.styleKey === 'W' ? styles.wlIndicatorWBackground : styles.wlIndicatorLBackground]}>
                      <ThemedText style={wlIndicator.styleKey === 'W' ? styles.wlIndicatorTextW : styles.wlIndicatorTextL}>{wlIndicator.text}</ThemedText>
                    </View>
                  ) : null}
              </View>
          </View>
        </ThemedView>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.screenTitle}>Matches</ThemedText>

      {(!isLoading && postScudettoData && postScudettoData.length > 0) && (
        <View style={styles.dailyMatchesSection}>
          <View style={styles.dateNavigationContainer}>
            <TouchableOpacity onPress={handlePreviousDay} style={styles.navTextButton} disabled={isLoading}>
              <ThemedText style={styles.navButtonText}>Back</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.selectedDateText}>{dateToDDMMYYYY(selectedDate)}</ThemedText>
            <TouchableOpacity onPress={handleNextDay} style={styles.navTextButton} disabled={isLoading}>
              <ThemedText style={styles.navButtonText}>Next</ThemedText>
            </TouchableOpacity>
          </View>

          {isLoading && (!postScudettoData || postScudettoData.length === 0) ? (
            <ActivityIndicator size="small" style={{ marginVertical: 20 }}/>
          ) : filteredDailyMatches.length > 0 ? (
            <FlatList
              data={filteredDailyMatches}
              renderItem={renderDailyMatchItem}
              keyExtractor={(item, index) => `${item.Team}-${item.fecha}-${item.equipoContrario}-${item.Competicion}-${index}`}
              style={styles.dailyMatchesFlatList}
              contentContainerStyle={{ paddingBottom: 10 }}
            />
          ) : (
            <ThemedText style={styles.noMatchesForDateText}>
              No hay partidos programados para el {dateToDDMMYYYY(selectedDate)}.
            </ThemedText>
          )}

          <View style={styles.dailyJsonToggleContainer}>
            <Button
              title={isDailyJsonScrollViewVisible ? "Ocultar JSON del Día" : "Mostrar JSON del Día"}
              onPress={() => setIsDailyJsonScrollViewVisible(!isDailyJsonScrollViewVisible)}
              color={Platform.OS === 'ios' ? Colors.light.tint : undefined}
              disabled={isLoading && (!postScudettoData || postScudettoData.length === 0)}
            />
          </View>

          {isDailyJsonScrollViewVisible && (
            <ScrollView style={[styles.dailyJsonScrollView, { borderColor: Colors[colorScheme ?? 'light'].icon }]}>
              <ThemedText style={styles.jsonText}>
                {dailyMatchesJson || (isLoading && (!postScudettoData || postScudettoData.length === 0) ? "Cargando..." : "Selecciona una fecha o no hay datos.")}
              </ThemedText>
            </ScrollView>
          )}
        </View>
      )}

      <View style={styles.content}>
        {isLoading && <ActivityIndicator size="large" style={styles.loader} />}
        {!isLoading && matchesData && (
          <ThemedText style={styles.infoText} numberOfLines={3} ellipsizeMode="tail">
            {matchesData.some(match => match.error)
              ? `Se encontraron errores durante el scrapeo.`
              : matchesData.length > 0
                ? postScudettoData && postScudettoData.length > 0
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
        onRequestClose={() => setIsPostScudettoJsonModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={[styles.modalView, { backgroundColor: colorScheme === 'dark' ? Colors.dark.background : Colors.light.background }]}>
            <ThemedText type="subtitle" style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">
              JSON de Partidos (Post Scudetto)
            </ThemedText>
            <ScrollView style={styles.jsonScrollView}>
              <ThemedText style={styles.jsonText}>
                {postScudettoData ? JSON.stringify(postScudettoData, null, 2) : "Datos no disponibles."}
              </ThemedText>
            </ScrollView>
            <Button title="Cerrar" onPress={() => setIsPostScudettoJsonModalVisible(false)} color={Platform.OS === 'ios' ? Colors.light.tint : undefined} />
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenTitle: {
    position: 'absolute',
    top: 40,
    textAlign: 'center',
    width: '100%',
    zIndex: 1,
  },
  dailyMatchesSection: {
    width: '95%',
    alignSelf: 'center',
    marginTop: 90,
    marginBottom: 10,
  },
  dateNavigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 5,
    marginBottom: 5,
  },
  navTextButton: {
    padding: 10,
  },
  navButtonText: {
    fontSize: 16,
    color: Colors.light.tint,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dailyMatchesFlatList: {
    maxHeight: Platform.OS === 'ios' ? 350 : 320,
    width: '100%',
  },
  noMatchesForDateText: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 15,
    opacity: 0.7,
  },
  dailyJsonToggleContainer: {
    marginTop: 10,
    marginBottom: 5,
    alignItems: 'center',
  },
  dailyJsonScrollView: {
    maxHeight: 150,
    width: '100%',
    borderWidth: 1,
    borderRadius: 5,
    padding: 8,
    marginTop: 5,
  },
  dailyMatchItemContainer: {
    padding: 10,
    marginVertical: 4,
    marginHorizontal: 2,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  matchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchHeaderTeamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: 5,
  },
  headerTeamEmblem: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
    marginRight: 6,
  },
  matchTeamNameHeaderText: {
    fontSize: 13,
    fontWeight: 'bold',
    flexShrink: 1,
    opacity: 0.8,
  },
  matchRondaText: {
    fontSize: 12,
    opacity: 0.7,
    marginLeft: 5,
  },
  matchDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dailyMatchLeftAndMiddleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  dailyMatchDateTimeContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 55,
  },
  dailyMatchDateSmall: {
    fontSize: 11,
    opacity: 0.8,
  },
  dailyMatchTimeSmall: {
    fontSize: 11,
    opacity: 0.8,
  },
  dailyMatchVerticalSeparator: {
    height: '60%',
    width: 1,
    marginHorizontal: 8,
    opacity: 0.3,
  },
  dailyMatchOpponentEmblem: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    marginRight: 8,
  },
  dailyMatchOpponentName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  locationTextDaily: {
    fontSize: 11,
    fontWeight: 'bold',
    opacity: 0.7,
  },
  statusHighlightItem: {
    paddingVertical: 10, 
    minHeight: 60, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  championItem: { backgroundColor: 'red' },
  postScudettoItem: { backgroundColor: 'darkred' },
  negativoItem: { backgroundColor: '#8B0000' },
  internationalBreakItem: { backgroundColor: '#4682B4' },
  statusHighlightContent: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusHighlightText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  locationAndWLContainer: { 
    flexDirection: 'row',
    alignItems: 'center',
  },
  neutralBorder: {
    borderColor: 'white',
    borderWidth: 1,
  },
  redBorder: {
    borderColor: 'red',
    borderWidth: 1,
  },
  orangeBorder: {
    borderColor: 'orange',
    borderWidth: 1,
  },
  greenBorder: {
    borderColor: '#34C759', 
    borderWidth: 1,
  },
  wlIndicatorCircle: { 
    width: 22, 
    height: 22, 
    borderRadius: 11, 
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6, 
  },
  wlIndicatorWBackground: { 
    backgroundColor: 'grey',
  },
  wlIndicatorLBackground: { 
    backgroundColor: '#D3D3D3', // Light grey fill for L
  },
  wlIndicatorTextW: { color: 'white', fontSize: 12, fontWeight: 'bold', lineHeight: 22, textAlign: 'center' }, 
  wlIndicatorTextL: { fontSize: 12, fontWeight: 'bold', lineHeight: 22, textAlign: 'center' }, 
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
  },
  loader: {
    marginTop: 20,
  },
  infoText: {
    marginTop: 10,
    textAlign: 'center',
    marginBottom: 10,
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
    shadowOffset: { width: 0, height: 2 },
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
