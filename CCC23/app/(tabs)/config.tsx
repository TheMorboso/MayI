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
  const [isLoading, setIsLoading] = useState(false); // Para la carga del JSON
  const [isJsonVisible, setIsJsonVisible] = useState(false);
  const textColor = useThemeColor({}, 'text');
  const colorScheme = useColorScheme();

  const [seasonInput, setSeasonInput] = useState('');
  const [currentSeason, setCurrentSeason] = useState<string | null>(null);
  const [isSavingSeason, setIsSavingSeason] = useState(false);

  const SEASON_STORAGE_KEY = 'currentSeason';
  const TEAMS_STORAGE_KEY = 'myTeams';

  // Cargar la temporada guardada al iniciar
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
      // Opcional: podrías limpiar jsonData aquí si no quieres que se mantenga en memoria
      // setJsonData(null);
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
            setJsonData(existingTeamsJson); // Mostrar como texto si no es JSON válido
          }
        } else {
          setJsonData(`No hay datos guardados bajo la clave "${TEAMS_STORAGE_KEY}".`);
        }
      } catch (e) {
        console.error('Error al cargar los datos JSON desde AsyncStorage:', e);
        setJsonData('Error al cargar los datos.');
      } finally {
        setIsLoading(false);
        setIsJsonVisible(true); // Mostrar la sección de JSON (incluso si hay error o no hay datos)
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
      setSeasonInput(''); // Limpiar input
      Alert.alert('Éxito', 'Temporada guardada correctamente.');
    } catch (e) {
      console.error('Error al guardar la temporada:', e);
      Alert.alert('Error', 'No se pudo guardar la temporada.');
    } finally {
      setIsSavingSeason(false);
    }
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
          color={Platform.OS === 'ios' ? Colors.light.tint : undefined} // Color para iOS, Android usa el por defecto del tema
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

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: 'center', // Lo quitamos para que el contenido empiece desde arriba
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 20, // Espacio arriba
  },
  sectionContainer: {
    width: '90%',
    marginBottom: 30, // Espacio entre secciones
    alignItems: 'center', // Centrar contenido de la sección
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
    width: '80%', // Ancho del input
    borderRadius: 5,
    fontSize: 16,
  },
  loader: { // Para el JSON
    marginTop: 20,
  },
  loaderSmall: {
    marginTop: 10,
  },
  jsonContainer: {
    width: '90%',
    marginTop: 10, // Reducido un poco el margen superior
    marginBottom: 20, // Añadido margen inferior
    padding: 10,
    borderWidth: 1,
    // borderColor se establece dinámicamente ahora
    borderRadius: 5,
    maxHeight: 300, 
  },
  jsonText: {
    fontSize: 14,
  },
});
