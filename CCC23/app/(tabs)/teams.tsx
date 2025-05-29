import React, { useState, useEffect } from 'react';
import { StyleSheet, Modal, View, TextInput, Button, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/IconSymbol'; // Necesario para el botón del header

export default function TeamsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const navigation = useNavigation();
  const colorScheme = useColorScheme();

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
  }, [navigation]);

  const handleAddItem = () => {
    if (inputText.trim()) {
      console.log('Team a agregar:', inputText);
      // Aquí puedes agregar la lógica para manejar el nuevo team
      setInputText('');
      setModalVisible(false);
    } else {
      // Opcional: manejar input vacío
      console.log('Input vacío, no se agrega team.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Teams</ThemedText>
      {/* Aquí puedes agregar el contenido principal de tu pantalla Teams */}

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
              placeholder="Nombre del Team..."
              placeholderTextColor={colorScheme === 'dark' ? Colors.dark.icon : Colors.light.icon}
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
    justifyContent: 'center',
    alignItems: 'center',
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
});
