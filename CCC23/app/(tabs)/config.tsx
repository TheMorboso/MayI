// config.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, Button, ActivityIndicator, ScrollView, TextInput, View, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function ConfigScreen() {
  const [jsonData, setJsonData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isJsonVisible, setIsJsonVisible] = useState(false);
  const textColor = useThemeColor({}, 'text');
  const colorScheme = useColorScheme();

  const [seasonInput, setSeasonInput] = useState('');
  const [currentSeason, setCurrentSeason] = useState<string | null>(null);
  const [isSavingSeason, setIsSavingSeason] = useState(false);
  const SEASON_STORAGE_KEY = 'currentSeason';
  const TEAMS_STORAGE_KEY = 'myTeams';

  // Estados para el JSON de jugadores/entrenadores
  const PLAYERS_CACHE_KEY_CONFIG = 'playersGlobalCache';
  const [isPlayersJsonVisible, setIsPlayersJsonVisible] = useState(false);
  const [playersJsonData, setPlayersJsonData] = useState<string | null>(null);
  const [isLoadingPlayersJson, setIsLoadingPlayersJson] = useState(false);


  useEffect(() => {
    const loadSavedSeason = async () => {
      const savedSeason = await AsyncStorage.getItem(SEASON_STORAGE_KEY);
      if (savedSeason) {
        setCurrentSeason(savedSeason);
      }
    };
    loadSavedSeason();
  }, []);

  const handleToggleJsonData = async () => {
    if (isJsonVisible) {
      setIsJsonVisible(false);
    } else {
      setIsLoading(true);
      setJsonData(null); 
      try {
        const existingTeamsJson = await AsyncStorage.getItem(TEAMS_STORAGE_KEY);
        if (existingTeamsJson !== null) {
          try {
            const parsedJson = JSON.parse(existingTeamsJson);
            setJsonData(JSON.stringify(parsedJson, null, 2)); 
          } catch (parseError) {
            setJsonData(existingTeamsJson);
          }
        } else {
          setJsonData(`No hay datos guardados bajo la clave "${TEAMS_STORAGE_KEY}".`);
        }
      } catch (e) {
        setJsonData('Error al cargar los datos de equipos.');
      } finally {
        setIsLoading(false);
        setIsJsonVisible(true);
      }
    }
  };

  const handleTogglePlayersJsonData = async () => {
    if (isPlayersJsonVisible) {
      setIsPlayersJsonVisible(false);
    } else {
      setIsLoadingPlayersJson(true);
      setPlayersJsonData(null);
      try {
        const existingPlayersJson = await AsyncStorage.getItem(PLAYERS_CACHE_KEY_CONFIG);
        if (existingPlayersJson !== null) {
          try {
            const parsedJson = JSON.parse(existingPlayersJson);
            setPlayersJsonData(JSON.stringify(parsedJson, null, 2));
          } catch (parseError) {
            setPlayersJsonData(existingPlayersJson); 
          }
        } else {
          setPlayersJsonData(`No hay datos guardados bajo la clave "${PLAYERS_CACHE_KEY_CONFIG}".`);
        }
      } catch (e) {
        setPlayersJsonData('Error al cargar los datos de jugadores/entrenadores.');
      } finally {
        setIsLoadingPlayersJson(false);
        setIsPlayersJsonVisible(true);
      }
    }
  };

  const handleSaveSeason = async () => {
    if (!seasonInput.match(/^\d{4}$/)) {
      Alert.alert('Error', 'Por favor, ingresa un año válido (4 dígitos).');
      return;
    }
    setIsSavingSeason(true);
    try {
      await AsyncStorage.setItem(SEASON_STORAGE_KEY, seasonInput);
      setCurrentSeason(seasonInput);
      setSeasonInput('');
      Alert.alert('Éxito', 'Temporada guardada correctamente.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la temporada.');
    } finally {
      setIsSavingSeason(false);
    }
  };

  const handleDeletePlayersJson = async () => {
    Alert.alert(
      "Confirmar Eliminación",
      "¿Estás seguro de que quieres eliminar todos los datos de jugadores/entrenadores guardados? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar Todo",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(PLAYERS_CACHE_KEY_CONFIG);
              setPlayersJsonData(`Datos de jugadores/entrenadores eliminados de "${PLAYERS_CACHE_KEY_CONFIG}".`);
              Alert.alert("Éxito", "Todos los datos de jugadores/entrenadores han sido eliminados.");
            } catch (e) {
              Alert.alert("Error", "No se pudieron eliminar los datos de jugadores/entrenadores.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Configuración</ThemedText>

      <View style={styles.sectionContainer}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Temporada</ThemedText>
        {currentSeason && (
          <ThemedText style={styles.infoText}>Temporada Actual Guardada: {currentSeason}</ThemedText>
        )}
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#f0f0f0',
              color: textColor,
              borderColor: colorScheme === 'dark' ? '#555' : 'gray',
            }
          ]}
          value={seasonInput}
          onChangeText={setSeasonInput}
          placeholder="YYYY (ej. 2024)"
          placeholderTextColor={colorScheme === 'dark' ? Colors.dark.icon : Colors.light.icon}
          keyboardType="numeric"
          maxLength={4}
        />
        <Button 
          title="Guardar Temporada" 
          onPress={handleSaveSeason} 
          disabled={isSavingSeason || !seasonInput.trim()}
          color={Platform.OS === 'ios' ? Colors.light.tint : undefined}
        />
        {isSavingSeason && <ActivityIndicator size="small" style={styles.loaderSmall} />}
      </View>

      <View style={styles.sectionContainer}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Datos de Equipos (JSON)</ThemedText>
        <Button 
          title={isJsonVisible ? "Ocultar JSON de Teams" : "Mostrar JSON de Teams Guardados"} 
          onPress={handleToggleJsonData} 
          color={Platform.OS === 'ios' ? Colors.light.tint : undefined}
        />
      </View>

      {isJsonVisible && isLoading && (
        <ActivityIndicator size="large" style={styles.loader} />
      )}
      {isJsonVisible && !isLoading && jsonData !== null && (
        <ScrollView style={[styles.jsonContainer, { borderColor: colorScheme === 'dark' ? '#555' : '#ccc'}]}>
          <ThemedText style={[styles.jsonText, { color: textColor }]}>{jsonData}</ThemedText>
        </ScrollView>
      ) }

      <View style={styles.sectionContainer}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Caché Global (Jugadores/Entrenadores)</ThemedText>
        <View style={styles.playersJsonButtonsContainer}>
          <Button
            title={isPlayersJsonVisible ? "Ocultar JSON" : "Mostrar JSON"}
            onPress={handleTogglePlayersJsonData}
            color={Platform.OS === 'ios' ? Colors.light.tint : undefined}
          />
          <View style={{ width: 10 }} /> 
          <Button
            title="Eliminar JSON"
            onPress={handleDeletePlayersJson}
            color={Platform.OS === 'ios' ? (colorScheme === 'dark' ? Colors.dark.error : '#FF3B30') : '#FF3B30'}
          />
        </View>
      </View>

      {isPlayersJsonVisible && isLoadingPlayersJson && (
        <ActivityIndicator size="large" style={styles.loader} />
      )}
      {isPlayersJsonVisible && !isLoadingPlayersJson && playersJsonData !== null && (
        <ScrollView style={[styles.jsonContainer, { borderColor: colorScheme === 'dark' ? '#555' : '#ccc'}]}>
          <ThemedText style={[styles.jsonText, { color: textColor }]}>{playersJsonData}</ThemedText>
        </ScrollView>
      )}

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 20,
  },
  sectionContainer: {
    width: '90%',
    marginBottom: 15, // Reducido para más secciones
    alignItems: 'center',
  },
  sectionTitle: {
    marginBottom: 10,
  },
  infoText: {
    marginBottom: 10,
    fontSize: 16,
  },
  input: {
    height: 45,
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
    width: '80%',
    borderRadius: 5,
    fontSize: 16,
  },
  loader: {
    marginTop: 20,
  },
  loaderSmall: {
    marginTop: 10,
  },
  jsonContainer: {
    width: '90%',
    marginTop: 10,
    marginBottom: 5, 
    padding: 10,
    borderWidth: 1,
    borderRadius: 5,
    maxHeight: 150, // Reducido para más secciones
  },
  jsonText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', 
  },
  playersJsonButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', 
    width: '100%', 
    marginTop: 5,
  },
});
