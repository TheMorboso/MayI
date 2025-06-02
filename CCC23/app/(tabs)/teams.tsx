import React, { useState, useEffect } from 'react';
import { StyleSheet, Modal, View, TextInput, Button, TouchableOpacity, Platform, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { scrapeWorldFootballTeamData, ScrapedTeamInfo } from '../../api/scraper';
import { IconSymbol } from '@/components/ui/IconSymbol';

const TIER_OPTIONS = ["TierS", "TierSred", "TierA", "TierC", "Red", "World"] as const;
type TeamTier = typeof TIER_OPTIONS[number];

export default function TeamsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [savedTeams, setSavedTeams] = useState<ScrapedTeamInfo[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [selectedTier, setSelectedTier] = useState<TeamTier | null>(null);
  const navigation = useNavigation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isFocused = useIsFocused();

  const TEAMS_STORAGE_KEY = 'myTeams';

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            setModalVisible(true);
            setSelectedTier(null);
          }}
          style={{
            backgroundColor: '#4CAF50',
            width: 32,
            height: 32,
            borderRadius: 4,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 15,
          }}
        >
          <IconSymbol name="plus" size={20} color="white" />
        </TouchableOpacity>
      ),
    });
    if (isFocused) {
      loadSavedTeams();
    }
  }, [navigation, isFocused]);

  const loadSavedTeams = async () => {
    setIsLoadingTeams(true);
    try {
      const existingTeamsJson = await AsyncStorage.getItem(TEAMS_STORAGE_KEY);
      const teamsArray: ScrapedTeamInfo[] = existingTeamsJson ? JSON.parse(existingTeamsJson) : [];
      setSavedTeams(teamsArray);
    } catch (e) {
      setSavedTeams([]);
    } finally {
      setIsLoadingTeams(false);
    }
  };


  const handleAddItem = async () => {
    const teamUrl = inputText.trim();
    if (!teamUrl) {
      Alert.alert('Entrada Vacía', 'Por favor, ingresa la URL del equipo.');
      return;
    }
    if (!selectedTier) {
      Alert.alert('Seleccionar Tier', 'Por favor, selecciona un tier para el equipo.');
      return;
    }

    if (teamUrl && selectedTier) {
      try {
        const scrapedData = await scrapeWorldFootballTeamData(teamUrl);
        if (scrapedData.error) {
          Alert.alert('Error de Scraping', scrapedData.error);
          setInputText('');
          return;
        }

        // Para TierA y World, no necesitamos la información de la primera pestaña de navegación (liga/temporada)
        if (selectedTier === "World" || selectedTier === "TierA") {
          scrapedData.firstNavLinkText = null;
          scrapedData.firstNavLinkHref = null;
        }

        const teamWithTier: ScrapedTeamInfo = {
          ...scrapedData,
          tier: selectedTier,
        };
        const existingTeamsJson = await AsyncStorage.getItem(TEAMS_STORAGE_KEY);
        let teamsArray: ScrapedTeamInfo[] = existingTeamsJson ? JSON.parse(existingTeamsJson) : [];

        const existingIndex = teamsArray.findIndex(team => team.originalUrl === teamWithTier.originalUrl);
        if (existingIndex > -1) {
          console.log(`El team con URL ${teamWithTier.originalUrl} ya existe. Actualizando...`);
          teamsArray[existingIndex] = teamWithTier; 
        } else {
          teamsArray.push(teamWithTier);
        }
        await AsyncStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teamsArray));
        setInputText('');
        setSelectedTier(null);
        setSavedTeams(teamsArray);
        setModalVisible(false);

      } catch (e) {
        Alert.alert('Error', 'Ocurrió un error al agregar el equipo.');
      }
    }
  };

  const handleDeleteTeam = (teamUrl: string) => {
    Alert.alert(
      "Confirmar Eliminación",
      "¿Estás seguro de que quieres eliminar este equipo?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar",
          onPress: async () => {
            try {
              const updatedTeams = savedTeams.filter(team => team.originalUrl !== teamUrl);
              setSavedTeams(updatedTeams);
              await AsyncStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(updatedTeams));
            } catch (e) {
              Alert.alert("Error", "No se pudo eliminar el equipo.");
              loadSavedTeams();
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const handlePressTeam = (team: ScrapedTeamInfo) => {
    const teamRouteId = team.originalUrl;
    const displayName = team.teamName;

    if (teamRouteId) {
      // Pass teamName as a query parameter for easy access and display on the next screen
      router.push(`/team-matches/${encodeURIComponent(teamRouteId)}?teamName=${encodeURIComponent(displayName || 'Equipo Desconocido')}`);
    } else {
      Alert.alert("Error de Navegación", "No se puede mostrar los partidos, falta la URL original del equipo.");
    }
  };

  const renderTeamItem = ({ item }: { item: ScrapedTeamInfo }) => (
    <TouchableOpacity
      onPress={() => handlePressTeam(item)} // Added onPress for navigation
      onLongPress={() => handleDeleteTeam(item.originalUrl)} // Kept onLongPress for deletion
      activeOpacity={0.7}>
      <ThemedView style={styles.teamItemContainer} lightColor="#f9f9f9" darkColor="#2C2C2E">
        {item.teamEmblemSrc ? (
          <Image source={{ uri: item.teamEmblemSrc }} style={styles.teamLogo} />
        ) : <View style={styles.teamLogoPlaceholder}><IconSymbol name="questionmark.circle" size={24} color={Colors[colorScheme ?? 'light'].icon} /></View>}
        <View style={styles.teamInfoWrapper}>
          <ThemedText style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">{item.teamName || item.originalUrl}</ThemedText>
          <View style={styles.teamDetailsRow}>
            {item.tier && (
              <ThemedText style={styles.teamTierText}>Tier: {item.tier}</ThemedText>
            )}
            {item.firstNavLinkText && (
              <ThemedText style={[styles.navLinkText, item.tier ? styles.navLinkWithMargin : {}]} numberOfLines={1} ellipsizeMode="tail">
                {item.firstNavLinkText}
              </ThemedText>
            )}
          </View>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Teams Guardados</ThemedText>
      {isLoadingTeams ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : savedTeams.length > 0 ? (
        <FlatList
          data={savedTeams}
          renderItem={renderTeamItem}
          keyExtractor={(item, index) => item.originalUrl + index.toString()}
          style={styles.list}
          contentContainerStyle={styles.listContentContainer}
        />
      ) : (
        <ThemedText style={styles.noTeamsText}>No hay equipos guardados. Agrega uno con el botón '+'</ThemedText>
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setInputText('');
          setSelectedTier(null);
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={[
            styles.modalView,
            { backgroundColor: colorScheme === 'dark' ? Colors.dark.background : Colors.light.background }
          ]}>
            <ThemedText style={styles.modalTitle}>Agregar Nuevo Team</ThemedText>
            <ThemedText style={styles.modalSubtitle}>Seleccionar Tier:</ThemedText>
            <View style={styles.tierSelectionContainer}>
              {TIER_OPTIONS.map((tier) => (
                <TouchableOpacity
                  key={tier}
                  style={[
                    styles.tierButton,
                    { borderColor: Colors[colorScheme ?? 'light'].icon },
                    selectedTier === tier && { backgroundColor: Colors[colorScheme ?? 'light'].tint },
                  ]}
                  onPress={() => setSelectedTier(tier)}
                >
                  <ThemedText style={[
                    styles.tierButtonText,
                    { color: selectedTier === tier ? '#FFFFFF' : Colors[colorScheme ?? 'light'].text }
                  ]}>{tier}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#f0f0f0',
                  color: colorScheme === 'dark' ? Colors.dark.text : Colors.light.text,
                  borderColor: colorScheme === 'dark' ? '#555' : 'gray',
                }
              ]}
              onChangeText={setInputText}
              value={inputText}
              placeholder="Ingresa URL de worldfootball.net..."
              placeholderTextColor={colorScheme === 'dark' ? Colors.dark.icon : Colors.light.icon}
              keyboardType="url"
              autoCapitalize="none"
            />
            <View style={styles.buttonContainer}>
              <Button
                title="Cancelar"
                onPress={() => {
                  setInputText('');
                  setSelectedTier(null);
                  setModalVisible(false);
                }}
                color={Platform.OS === 'ios' 
                        ? (colorScheme === 'dark' ? Colors.dark.tint : '#f44336')
                        : '#f44336'
                      }
              />
              <Button 
                title="Agregar" 
                onPress={handleAddItem} 
                color={Colors.light.tint}
                disabled={!inputText.trim() || !selectedTier}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 20 : 0,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    borderRadius: 10,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  input: {
    height: 40,
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    width: '100%',
    borderRadius: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  tierSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  tierButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    marginHorizontal: 2,
    marginBottom: 5,
    alignItems: 'center',
    minWidth: '22%',
    justifyContent: 'center',
  },
  tierButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    marginTop: 20,
    marginBottom: 20,
  },
  list: {
    width: '95%',
  },
  listContentContainer: {
    paddingBottom: 20,
  },
  teamItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  teamLogo: {
    width: 40,
    height: 40,
    marginRight: 15,
    resizeMode: 'contain',
    borderRadius: 5,
  },
  teamLogoPlaceholder: {
    width: 40,
    height: 40,
    marginRight: 15,
    borderRadius: 5,
    backgroundColor: Colors.light.icon,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamInfoWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  teamDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '600',
    flexShrink: 1,
  },
  teamTierText: {
    fontSize: 12,
    opacity: 0.7,
  },
  navLinkText: {
    fontSize: 11,
    opacity: 0.6,
  },
  navLinkWithMargin: {
    marginLeft: 8,
  },
  noTeamsText: {
    marginTop: 30,
    fontSize: 16,
    textAlign: 'center',
    color: Colors.light.icon,
  },
});
