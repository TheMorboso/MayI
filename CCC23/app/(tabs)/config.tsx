import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Button, FlatList, Text, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function ConfigScreen() {
  const [teams, setTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const isFocused = useIsFocused(); // Hook para saber si la pantalla está enfocada

  const loadTeams = async () => {
    setLoading(true);
    try {
      const existingTeamsJson = await AsyncStorage.getItem('myTeams');
      const teamsArray = existingTeamsJson ? JSON.parse(existingTeamsJson) : [];
      setTeams(teamsArray);
    } catch (e) {
      console.error('Error al cargar los teams desde AsyncStorage:', e);
      setTeams([]); // Asegurarse de que teams sea un array vacío en caso de error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) { // Cargar datos solo cuando la pantalla está enfocada
      loadTeams();
    }
  }, [isFocused]); // Recargar cuando la pantalla vuelve a estar enfocada

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Configuración</ThemedText>
      <Button title="Recargar Teams Guardados" onPress={loadTeams} />
      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : teams.length > 0 ? (
        <FlatList
          data={teams}
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={({ item }) => <ThemedText style={styles.teamItem}>{item}</ThemedText>}
          style={styles.list}
        />
      ) : (
        <ThemedText style={styles.noTeamsText}>No hay teams guardados.</ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  loader: {
    marginTop: 20,
  },
  list: {
    width: '90%',
    marginTop: 20,
  },
  teamItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc', // Considerar usar un color del tema aquí
    fontSize: 18,
  },
  noTeamsText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666', // Considerar usar un color del tema aquí
  },
});
