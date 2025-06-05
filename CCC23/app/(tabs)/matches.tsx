import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Button, Platform, ActivityIndicator, Alert, ScrollView, Modal, TouchableOpacity, FlatList, Image } from 'react-native'; // Agregado FlatList e Image
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ScrapedTeamInfo } from '../../api/scraper';
import { scrapeMatchDetails, MatchDetails } from '../../api/matchScraper';
import { applyCorrections } from '../../api/correcciones';
import { processPostScudettoData, PostScudettoMatchInfo } from '../../api/postscudetto';
import { processPositiveNegative } from '../../api/positivonegativo';
import { organizeMatchData, OrganizedMatchInfo } from '../../api/organizador';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useIsFocused } from '@react-navigation/native';

export default function MatchesScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [matchesData, setMatchesData] = useState<MatchDetails[] | null>(null);
  const [organizedData, setOrganizedData] = useState<OrganizedMatchInfo[] | null>(null);
  const [postScudettoData, setPostScudettoData] = useState<PostScudettoMatchInfo[] | null | undefined>(undefined);
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isFocused = useIsFocused();

  const TEAMS_STORAGE_KEY = 'myTeams';
  const SEASON_STORAGE_KEY = 'currentSeason';
  const POST_SCUDETTO_DATA_KEY = 'postScudettoAllMatchData';

  const [isPostScudettoJsonModalVisible, setIsPostScudettoJsonModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyMatchesJson, setDailyMatchesJson] = useState<string | null>(null);

  // Nuevo estado para los partidos filtrados del día (para la FlatList estilizada)
  const [filteredDailyMatches, setFilteredDailyMatches] = useState<PostScudettoMatchInfo[]>([]);
  // Este estado controla la visibilidad del JSON en el ScrollView de la sección de partidos del día
  const [isDailyJsonScrollViewVisible, setIsDailyJsonScrollViewVisible] = useState(false);


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
      setPostScudettoData(undefined);
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
      const matchesForDate = postScudettoData.filter(
        match => match.fecha === formattedSelectedDate && match.Competicion !== "Parón Internacional"
      );
      setFilteredDailyMatches(matchesForDate);

      if (isDailyJsonScrollViewVisible) {
        if (matchesForDate.length > 0) {
          setDailyMatchesJson(JSON.stringify(matchesForDate, null, 2));
        } else {
          setDailyMatchesJson(`No hay partidos para el ${formattedSelectedDate}.`);
        }
      }
    } else { // No hay postScudettoData o está vacío (y no está cargando)
      setFilteredDailyMatches([]);
      if (isDailyJsonScrollViewVisible) {
        setDailyMatchesJson("No hay datos de partidos cargados o procesados. Por favor, realiza el scrapeo.");
      }
    }
    // Si el JSON scroll view no está visible, limpiar el JSON.
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
    setPostScudettoData(undefined);

    let currentSavedTeamsFirstNavLinkTexts: string[] = [];

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
        if (team.tier === 'TierA') continue;
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
          await handleProcessPostScudetto(processedData, currentSavedTeamsFirstNavLinkTexts);
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
    leagueCompetitionNames: string[]
  ) => {
    if (!currentOrganizedData || currentOrganizedData.length === 0) {
      setPostScudettoData(null);
      return;
    }
    try {
      const finalData = processPostScudettoData(currentOrganizedData, leagueCompetitionNames);
      const dataAfterPositiveNegative = processPositiveNegative(finalData, leagueCompetitionNames);
      const correctedData = applyCorrections(dataAfterPositiveNegative);
      setPostScudettoData(correctedData);
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

  const renderDailyMatchItem = ({ item }: { item: PostScudettoMatchInfo }) => {
    const opponentTier = item.opponentTier;
    const shouldShowOpponentEmblemInDaily = (opponentTier === 'TierS' || opponentTier === 'TierSred') && item.opponentEmblemSrc;
    const shouldShowTeamEmblemInHeader = (item.tier === 'TierS' || item.tier === 'TierSred' || item.tier === 'TierA') && item.teamEmblemSrc;

    let opponentDisplayName = item.equipoContrario || 'Oponente N/A';
    if ((item.isMainLeagueCompetition || item.Competicion === 'Competencia' || item.Competicion === 'Competicion') && !item.opponentTier) {
      opponentDisplayName = 'TierD';
    }

    // Esta condición ahora es manejada por el filtro en el useEffect,
    // por lo que los items de "Parón Internacional" no deberían llegar aquí.
    // Se mantiene por si acaso o para otros usos.
    if (item.Status === 'Champion' || item.Status === 'Post scudetto' || item.Status === 'Negativo' || item.Competicion === 'Parón Internacional') {
      let specialStyle = {};
      let text = '';
      if (item.Competicion === 'Parón Internacional') { // No debería mostrarse
        specialStyle = styles.internationalBreakItem; text = 'PARÓN INTERNACIONAL';
      } else {
        switch (item.Status) {
          case 'Champion': specialStyle = styles.championItem; text = 'CAMPEÓN'; break;
          case 'Post scudetto': specialStyle = styles.postScudettoItem; text = 'POST SCUDETTO'; break;
          case 'Negativo': specialStyle = styles.negativoItem; text = 'NEGATIVO'; break;
        }
      }
      return (
        <View style={[styles.dailyMatchItemContainer, styles.statusHighlightItem, specialStyle]}>
          <ThemedText style={styles.statusHighlightText}>{text}</ThemedText>
        </View>
      );
    }

    return (
      <ThemedView style={styles.dailyMatchItemContainer} lightColor="#f9f9f9" darkColor="#2C2C2E">
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
            {/* Similar to team-matches: Date/Time on left, then Opponent, then Location */}
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

            {item.lugar && ['H', 'A', 'N'].includes(item.lugar) && (
                <ThemedText style={styles.locationTextDaily}>{item.lugar}</ThemedText>
            )}
        </View>
      </ThemedView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.screenTitle}>Matches</ThemedText>

      {/* SECCIÓN DE PARTIDOS DEL DÍA */}
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

          {/* Muestra ActivityIndicator si los datos principales están cargando pero aún no hay postScudettoData */}
          {isLoading && (!postScudettoData || postScudettoData.length === 0) ? (
            <ActivityIndicator size="small" style={{ marginVertical: 20 }}/>
          ) : filteredDailyMatches.length > 0 ? (
            <FlatList
              data={filteredDailyMatches}
              renderItem={renderDailyMatchItem}
              keyExtractor={(item, index) => `${item.Team}-${item.fecha}-${item.equipoContrario}-${item.Competicion}-${index}`}
              style={styles.dailyMatchesFlatList}
              contentContainerStyle={{ paddingBottom: 10 }} // Espacio al final de la lista
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

      {/* SECCIÓN DE INFO GENERAL */}
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
  // Estilos para la sección de partidos del día
  dailyMatchesSection: {
    width: '95%',
    alignSelf: 'center',
    marginTop: 90, // Debajo del título
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
  navTextButton: { // Estilo para los botones de texto de navegación
    padding: 10,
    // Podrías añadir más estilos aquí si quieres, como un borde o fondo
  },
  navButtonText: { // Estilo para el texto dentro de los botones de navegación
    fontSize: 16,
    color: Colors.light.tint, // O usa useThemeColor para el color del texto
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dailyMatchesFlatList: {
    maxHeight: Platform.OS === 'ios' ? 350 : 320, // Ajustar altura máxima para la lista
    width: '100%',
  },
  noMatchesForDateText: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 15,
    opacity: 0.7,
  },
  dailyJsonToggleContainer: {
    marginTop: 10, // Espacio sobre el botón de JSON
    marginBottom: 5,
    alignItems: 'center',
  },
  dailyJsonScrollView: {
    maxHeight: 150, // Reducido para dar más espacio a la FlatList
    width: '100%',
    borderWidth: 1,
    borderRadius: 5,
    padding: 8,
    marginTop: 5,
  },
  // Estilos para cada item en la FlatList de Partidos del Día (renderDailyMatchItem)
  dailyMatchItemContainer: { // Renombrado de matchItemBase para evitar confusión con team-matches
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
  matchHeaderTeamInfo: { // Contenedor para el logo y nombre del equipo en la cabecera
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1, // Para que se encoja si no hay espacio
    marginRight: 5, // Espacio antes de la ronda/formato
  },
  headerTeamEmblem: {
    width: 18, // Tamaño pequeño para la cabecera
    height: 18,
    resizeMode: 'contain',
    marginRight: 6,
  },
  matchTeamNameHeaderText: { // Estilo para el nombre del equipo en la cabecera
    fontSize: 13,
    fontWeight: 'bold',
    flexShrink: 1, // Para que el texto se acorte si es muy largo
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
  dailyMatchLeftAndMiddleContainer: { // Contenedor para Fecha/Hora, Separador, Emblema Oponente, Nombre Oponente
    flex: 1, // Ocupa el espacio disponible menos el del 'lugar'
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8, // Espacio antes del indicador de 'lugar'
  },
  dailyMatchDateTimeContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 55, // Ancho mínimo para fecha y hora
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
    height: '60%', // Altura del separador
    width: 1,
    marginHorizontal: 8, // Espacio alrededor del separador
    opacity: 0.3,
  },
  dailyMatchOpponentEmblem: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    marginRight: 8, // Espacio entre emblema y nombre del oponente
  },
  dailyMatchOpponentName: {
    flex: 1, // Para que el nombre ocupe el espacio restante y permita ellipsize
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  locationTextDaily: {
    fontSize: 11,
    fontWeight: 'bold',
    opacity: 0.7,
  },
  // Estilos para items especiales (Champion, Post Scudetto, etc.)
  statusHighlightItem: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 60, // Ajustado para consistencia con team-matches
  },
  championItem: { backgroundColor: 'red' },
  postScudettoItem: { backgroundColor: 'darkred' },
  negativoItem: { backgroundColor: '#8B0000' }, // Maroon
  internationalBreakItem: { backgroundColor: '#4682B4' }, // SteelBlue
  statusHighlightText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Estilos para la sección de info general y modal (mayormente sin cambios)
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10, // Añadir padding para que no se pegue a la sección de arriba
  },
  loader: {
    marginTop: 20,
  },
  infoText: {
    marginTop: 10, // Reducido porque ahora está debajo de la sección de partidos
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
  jsonScrollView: { // Para el modal de JSON completo
    width: '100%',
    marginBottom: 20,
    maxHeight: '70%',
  },
  jsonText: { // Para ambos JSON (modal y diario)
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
