import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function ConfigScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Configuración</ThemedText>
      {/* Aquí puedes agregar los componentes y la lógica para tu pantalla de configuración */}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
