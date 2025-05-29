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

export default function TeamsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [savedTeams, setSavedTeams] = useState<ScrapedTeamInfo[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isFocused = useIsFocused();

  const TEAMS_STORAGE_KEY = 'myTeams';

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
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
    if (teamUrl) {
      try {
        // Podrías añadir un indicador de carga aquí
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

        // 1. Obtener los teams existentes
        const existingTeamsJson = await AsyncStorage.getItem(TEAMS_STORAGE_KEY);
        let teamsArray: ScrapedTeamInfo[] = existingTeamsJson ? JSON.parse(existingTeamsJson) : [];

        // Opcional: Verificar si ya existe un team con la misma URL para evitar duplicados
        const existingIndex = teamsArray.findIndex(team => team.originalUrl === scrapedData.originalUrl);
        if (existingIndex > -1) {
          console.log(`El team con URL ${scrapedData.originalUrl} ya existe. Actualizando...`);
          teamsArray[existingIndex] = scrapedData; // Actualizar el existente
        } else {
          teamsArray.push(scrapedData);
        }

        // 2. Guardar el array actualizado
        await AsyncStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teamsArray));

        console.log('Datos del team scrapeados y guardados:', scrapedData);
        console.log('Todos los teams guardados:', teamsArray);

        setInputText('');
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
          <Image source={{ uri: item.teamEmblemSrc }} style={styles.teamLogo} onError={(e) => console.log("Error cargando imagen:", item.teamEmblemSrc, e.nativeEvent.error)} />
        ) : <View style={styles.teamLogoPlaceholder}><IconSymbol name="questionmark.circle" size={24} color={Colors[colorScheme ?? 'light'].icon} /></View>}
        <ThemedText style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">{item.teamName || item.originalUrl}</ThemedText>
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
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={[
            styles.modalView,
            { backgroundColor: colorScheme === 'dark' ? Colors.dark.background : Colors.light.background }
          ]}>
            <ThemedText style={styles.modalTitle}>Agregar Nuevo Team</ThemedText>
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
                onPress={() => setModalVisible(false)}
                color={Platform.OS === 'ios' 
                        ? (colorScheme === 'dark' ? Colors.dark.tint : '#f44336') // iOS: Texto blanco en oscuro, texto rojo en claro
                        : '#f44336' // Android: Fondo rojo (texto blanco por defecto)
                      }
              />
              <Button 
                title="Agregar" 
                onPress={handleAddItem} 
                color={Colors.light.tint} // iOS: texto azul. Android: fondo azul (texto blanco).
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
  teamName: {
    fontSize: 18,
    flexShrink: 1, // Permite que el texto se encoja si es necesario
  },
  noTeamsText: {
    marginTop: 30,
    fontSize: 16,
    textAlign: 'center',
    color: '#666', // Considerar usar un color del tema
  },
});
