import React, { useState } from 'react';
import { StyleSheet, Button, ActivityIndicator, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function ConfigScreen() {
  const [jsonData, setJsonData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const textColor = useThemeColor({}, 'text');

  const handleShowJsonData = async () => {
    setIsLoading(true);
    setJsonData(null); // Limpiar datos anteriores
    try {
      const existingTeamsJson = await AsyncStorage.getItem('myTeams');
      if (existingTeamsJson !== null) {
        // Intentar formatear el JSON para mejor legibilidad
        try {
          const parsedJson = JSON.parse(existingTeamsJson);
          setJsonData(JSON.stringify(parsedJson, null, 2)); // El '2' es para la indentación
        } catch (parseError) {
          // Si no se puede parsear (ej. no es JSON válido), mostrar el string crudo
          setJsonData(existingTeamsJson);
        }
      } else {
        setJsonData('No hay datos guardados bajo la clave "myTeams".');
      }
    } catch (e) {
      console.error('Error al cargar los datos JSON desde AsyncStorage:', e);
      setJsonData('Error al cargar los datos.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Configuración</ThemedText>
      <Button title="Mostrar JSON de Teams Guardados" onPress={handleShowJsonData} />
      {isLoading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : jsonData !== null && (
        <ScrollView style={styles.jsonContainer}>
          <ThemedText style={[styles.jsonText, { color: textColor }]}>{jsonData}</ThemedText>
        </ScrollView>
      ) }
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center', // Centra el contenido verticalmente
    alignItems: 'center',     // Mantiene el contenido centrado horizontalmente
    paddingHorizontal: 10,
  },
  loader: {
    marginTop: 20,
  },
  jsonContainer: {
    width: '90%',
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc', // Considerar usar un color del tema aquí
    borderRadius: 5,
    maxHeight: '70%', // Para evitar que ocupe toda la pantalla si es muy largo
  },
  jsonText: {
    fontSize: 14,
    // El color se aplica dinámicamente
  },
});
