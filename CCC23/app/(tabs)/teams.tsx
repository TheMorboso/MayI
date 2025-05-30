import React, { useState, useEffect } from 'react';
import { StyleSheet, Modal, View, TextInput, Button, TouchableOpacity, Platform, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native'; // Para recargar al enfocar
import { scrapeWorldFootballTeamData, ScrapedTeamInfo } from '../../api/scraper'; // Actualizado para la nueva función y tipo
import { IconSymbol } from '@/components/ui/IconSymbol';

const TIER_OPTIONS = ["TierS", "TierSred", "TierA", "TierC", "Red"] as const;
type TeamTier = typeof TIER_OPTIONS[number];

export default function TeamsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [savedTeams, setSavedTeams] = useState<ScrapedTeamInfo[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [selectedTier, setSelectedTier] = useState<TeamTier | null>(null);
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isFocused = useIsFocused();

  const TEAMS_STORAGE_KEY = 'myTeams';

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            setModalVisible(true);
            setSelectedTier(null); // Reset tier selection when opening modal
          }}
          style={{
            backgroundColor: '#4CAF50', // Color verde del botón
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
    // Cargar equipos cuando el componente se monta o la pantalla se enfoca
    if (isFocused) {
      loadSavedTeams();
    }
  }, [navigation, isFocused]); // Quitado modalVisible, isFocused es mejor para recargar

  const loadSavedTeams = async () => {
    setIsLoadingTeams(true);
    try {
      const existingTeamsJson = await AsyncStorage.getItem(TEAMS_STORAGE_KEY);
      const teamsArray: ScrapedTeamInfo[] = existingTeamsJson ? JSON.parse(existingTeamsJson) : [];
      setSavedTeams(teamsArray);
    } catch (e) {
      console.error('Error al cargar los teams desde AsyncStorage:', e);
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
        console.log(`Iniciando scraping para: ${teamUrl}`);
        const scrapedData = await scrapeWorldFootballTeamData(teamUrl);
        if (scrapedData.error) {
          console.error('Error de scraping:', scrapedData.error);
          // Aquí podrías mostrar un Alert al usuario con scrapedData.error
          // Por ahora, no guardaremos si hay un error de scraping.
          // O podrías decidir guardar la URL con el mensaje de error.
          setInputText(''); // Limpiar input incluso si hay error
          setModalVisible(false);
          return;
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

        console.log('Datos del team scrapeados y guardados (con tier):', teamWithTier);
        console.log('Todos los teams guardados:', teamsArray);

        setInputText('');
        setSelectedTier(null); // Reset selected tier
        setSavedTeams(teamsArray); // Actualizar estado local para reflejar el cambio inmediatamente
        setModalVisible(false);

      } catch (e) {
        console.error('Error en handleAddItem (posiblemente al interactuar con AsyncStorage):', e);
        // Aquí podrías mostrar un mensaje de error al usuario
      }
    } else {
      console.log('Input vacío, no se agrega team.');
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
              console.log('Equipo eliminado:', teamUrl);
            } catch (e) {
              console.error('Error al eliminar el team de AsyncStorage:', e);
              Alert.alert("Error", "No se pudo eliminar el equipo.");
              // Opcional: recargar los equipos para asegurar consistencia si la eliminación falló
              loadSavedTeams();
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const renderTeamItem = ({ item }: { item: ScrapedTeamInfo }) => (
    <TouchableOpacity onLongPress={() => handleDeleteTeam(item.originalUrl)} activeOpacity={0.7}>
      <ThemedView style={styles.teamItemContainer} lightColor="#f9f9f9" darkColor="#2C2C2E">
        {item.teamEmblemSrc ? (
          <Image source={{ uri: item.teamEmblemSrc }} style={styles.teamLogo} onError={(e) => console.log("Error cargando imagen:", item.teamEmblemSrc, e.nativeEvent.error)} /> // eslint-disable-line @typescript-eslint/no-unused-vars
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
          keyExtractor={(item, index) => item.originalUrl + index}
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
                  backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#f0f0f0', // Un gris oscuro para el fondo del input en dark mode
                  color: colorScheme === 'dark' ? Colors.dark.text : Colors.light.text,
                  borderColor: colorScheme === 'dark' ? '#555' : 'gray',
                }
              ]}
              onChangeText={setInputText}
              value={inputText}
              placeholder="Ingresa URL de worldfootball.net..."
              placeholderTextColor={colorScheme === 'dark' ? Colors.dark.icon : Colors.light.icon}
              keyboardType="url"
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
                        ? (colorScheme === 'dark' ? Colors.dark.tint : '#f44336') // iOS: Texto blanco en oscuro, texto rojo en claro
                        : '#f44336' // Android: Fondo rojo (texto blanco por defecto)
                      }
              />
              <Button 
                title="Agregar" 
                onPress={handleAddItem} 
                color={Colors.light.tint} // iOS: texto azul. Android: fondo azul (texto blanco).
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
    paddingTop: Platform.OS === 'android' ? 20 : 0, // Ajuste para el header en Android
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', // Fondo semitransparente para el overlay
  },
  modalView: {
    margin: 20,
    // backgroundColor se establece dinámicamente ahora
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
    width: '80%', // Ancho del modal
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
    // color: Colors[colorScheme ?? 'light'].text, // Handled by ThemedText
  },
  input: {
    height: 40,
    // borderColor se establece dinámicamente ahora
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    width: '100%',
    borderRadius: 5,
    // color y backgroundColor se establecen dinámicamente ahora
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  tierSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Distribute space evenly
    width: '100%',
    marginBottom: 20,
    flexWrap: 'wrap', // Allow wrapping if too many items for one line
  },
  tierButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    marginHorizontal: 2, // Add some horizontal margin
    marginBottom: 5, // Add some bottom margin for wrapped items
    alignItems: 'center',
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
    paddingBottom: 20, // Espacio al final de la lista
  },
  teamItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginVertical: 5, // Espacio vertical entre ítems
    // backgroundColor se maneja con ThemedView
    // Sombras sutiles para dar profundidad
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, // Sombra muy sutil
    shadowRadius: 2,
    elevation: 1, // Para Android
  },
  teamLogo: {
    width: 40,
    height: 40,
    marginRight: 15,
    resizeMode: 'contain',
    borderRadius: 5, // Bordes redondeados para el logo
  },
  teamLogoPlaceholder: {
    width: 40,
    height: 40,
    marginRight: 15,
    borderRadius: 5,
    backgroundColor: Colors.light.icon, // Un color de fondo para el placeholder
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamInfoWrapper: {
    flex: 1, // Take remaining space
    justifyContent: 'center',
  },
  teamDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2, // Espacio entre el nombre del equipo y esta fila de detalles
  },
  teamName: {
    fontSize: 18,
    flexShrink: 1, // Permite que el texto se encoja si es necesario
  },
  teamTierText: {
    fontSize: 12,
    opacity: 0.7,
    marginRight: 5, // Espacio si hay un navLinkText después
  },
  navLinkText: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
  noTeamsText: {
  navLinkWithMargin: { // Estilo para añadir margen izquierdo si el tier está presente
    marginLeft: 5,
  },
  noTeamsText: {
    marginTop: 30,
    fontSize: 16,
    textAlign: 'center',
    color: '#666', // Considerar usar un color del tema
  },
});
