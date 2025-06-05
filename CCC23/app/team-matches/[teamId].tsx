import React, { useEffect, useState } from 'react';
import { FlatList, ActivityIndicator, StyleSheet, View, Image, TouchableOpacity, Alert } from 'react-native'; // Importar Image, TouchableOpacity, Alert
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PostScudettoMatchInfo } from '@/api/postscudetto';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

const POST_SCUDETTO_DATA_KEY = 'postScudettoAllMatchData'; // Debe coincidir con la clave en matches.tsx

export default function TeamMatchesScreen() {
  const params = useLocalSearchParams<{ teamId: string; teamName?: string }>();
  const { teamId: encodedTeamId, teamName: encodedTeamNameFromQuery } = params;
  const router = useRouter();

  const teamId = encodedTeamId ? decodeURIComponent(encodedTeamId) : undefined;
  const teamNameForDisplay = encodedTeamNameFromQuery ? decodeURIComponent(encodedTeamNameFromQuery) : 'Equipo Desconocido';
  const teamNameForFilter = encodedTeamNameFromQuery ? decodeURIComponent(encodedTeamNameFromQuery) : undefined;

  const [teamMatches, setTeamMatches] = useState<PostScudettoMatchInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const colorScheme = useColorScheme(); // No se usa directamente aquí, pero podría ser útil para estilos

  useEffect(() => {
    const loadMatches = async () => {
      if (!teamId || !teamNameForFilter) {
        setError("Información del equipo incompleta para cargar partidos.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const storedDataJson = await AsyncStorage.getItem(POST_SCUDETTO_DATA_KEY);
        if (storedDataJson) {
          const allMatches: PostScudettoMatchInfo[] = JSON.parse(storedDataJson);
          const filteredMatches = allMatches.filter(match => match.Team === teamNameForFilter);
          
          if (filteredMatches.length === 0) {
             setError(`No se encontraron partidos para "${teamNameForDisplay}" o los datos generales de partidos no están actualizados. Intenta refrescar en la pestaña 'Matches'.`);
          }
          setTeamMatches(filteredMatches);
        } else {
          setError("No hay datos de partidos procesados. Por favor, ve a la pestaña 'Matches', carga los datos y luego regresa aquí.");
        }
      } catch (e: any) {
        setError(`Error al cargar los partidos: ${e.message}`);
        console.error("Error loading team matches:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadMatches();
  }, [teamId, teamNameForFilter]);

  const handlePressMatchItem = (matchItem: PostScudettoMatchInfo) => {
    if (matchItem.match && matchItem.match.trim() !== '') {
      const matchIdentifier = `${matchItem.Team || 'Equipo'} vs ${matchItem.equipoContrario || 'Oponente'} (${matchItem.fecha})`;
      router.push({
        pathname: `/match-analysis`,
        params: { matchUrl: encodeURIComponent(matchItem.match), matchIdentifier: encodeURIComponent(matchIdentifier) },
      });
    } else {
      Alert.alert("Sin Enlace", "Este partido no tiene un enlace de detalles para analizar.");
    }
  };


  const renderMatchItemRevised = ({ item, index }: { item: PostScudettoMatchInfo, index: number }) => {
    const prevItem = teamMatches[index - 1];
    const showCompetitionHeader = 
      item.Competicion && 
      item.Competicion.trim() !== '' && 
      (index === 0 || item.Competicion !== prevItem?.Competicion);

    const opponentTier = item.opponentTier; // Usar el tier del oponente
    const shouldShowOpponentEmblem = (opponentTier === 'TierS' || opponentTier === 'TierSred') && item.opponentEmblemSrc; // Usar emblema y tier del oponente
    
    let opponentDisplayName = item.equipoContrario || 'Oponente N/A';
    // Modificación: Incluir item.Competicion === 'Competencia' en la condición
    if (
      (item.isMainLeagueCompetition || item.Competicion === 'Competencia' || item.Competicion === 'Competicion') && 
      !item.opponentTier) {
      opponentDisplayName = 'TierD';
    }

    const isWorldWorldCompeticionPairWithNegativeStatus =
      item.tier === "World" &&
      item.opponentTier === "World" &&
      item.Competicion === "Competicion" && // Asumimos que correcciones.ts ya cambió null a "Competicion"
      item.Status === "Negativo";

    // Casos especiales para "Champion", "Post scudetto" y "Negativo"
    // y "Parón Internacional"
    if (
      item.Competicion === 'Parón Internacional' ||
      item.Status === 'Champion' ||
      item.Status === 'Post scudetto' ||
      (item.Status === 'Negativo' && !isWorldWorldCompeticionPairWithNegativeStatus)
    ) {
      let specialStyle = {};
      let text = '';

      if (item.Competicion === 'Parón Internacional') {
        specialStyle = styles.internationalBreakItem; text = 'PARÓN INTERNACIONAL';
      } else if (item.Status === 'Champion') {
        specialStyle = styles.championItem; text = 'CAMPEÓN';
      } else if (item.Status === 'Post scudetto') {
        specialStyle = styles.postScudettoItem; text = 'POST SCUDETTO';
      } else if (item.Status === 'Negativo') { // Solo se alcanza si !isWorldWorldCompeticionPairWithNegativeStatus
        specialStyle = styles.negativoItem; text = 'NEGATIVO';
      }
      return (
        <TouchableOpacity onPress={() => handlePressMatchItem(item)} activeOpacity={item.match ? 0.7 : 1}>
          <View style={[styles.matchItem, styles.statusHighlightItem, specialStyle]}>
            <ThemedText style={styles.statusHighlightText}>{text}</ThemedText>
          </View>
        </TouchableOpacity>
      );
    }

    // NUEVO: Manejar "Parón Internacional"
    // Este chequeo debe ir ANTES del renderizado normal del partido.
    if (item.Competicion === 'Parón Internacional') {
      // Ya manejado arriba, este bloque no debería alcanzarse si la lógica es correcta.
      // Se podría remover o dejar como un fallback si se prefiere.
    }
    // Renderizado normal del partido
    return (
      <TouchableOpacity onPress={() => handlePressMatchItem(item)} activeOpacity={item.match ? 0.7 : 1}>
        <>
          {showCompetitionHeader && (
            <View style={styles.competitionHeaderContainer}>
              <ThemedText style={styles.competitionHeaderText}>
                {item.Competicion}
              </ThemedText>
              {item.formato && item.formato.trim() !== '' && (
                <ThemedText style={styles.competitionFormatText}>
                  {/* Capitalizamos la primera letra del formato */}
                  {` (${item.formato.charAt(0).toUpperCase() + item.formato.slice(1)})`}
                </ThemedText>
              )}
            </View>
          )}
          <ThemedView style={styles.matchItem} lightColor="#f9f9f9" darkColor="#2C2C2E">
            <View style={styles.matchContentRow}>
              <View style={styles.leftAndMiddleContainer}>
                <View style={styles.dateTimeContainer}>
                  <ThemedText style={styles.matchDateSmall}>{item.fecha || 'Fecha N/A'}</ThemedText>
                  {item.hora && <ThemedText style={styles.matchTimeSmall}>{item.hora}</ThemedText>}
                </View>
                <View style={styles.verticalSeparator} />
                {shouldShowOpponentEmblem && ( // Condición basada en el oponente
                  <Image
                    source={{ uri: item.opponentEmblemSrc! }} // Usar el emblema del oponente
                    style={styles.teamEmblemStyle} // El estilo puede ser el mismo
                  />
                )}
                <ThemedText 
                  style={styles.matchOpponentSmall} // Se ajustará el estilo abajo
                  numberOfLines={2} ellipsizeMode="tail">
                  {opponentDisplayName}
                </ThemedText>
              </View>

              <View style={styles.locationContainer}>
                {item.lugar && ['H', 'A', 'N'].includes(item.lugar) && (
                  <ThemedText style={styles.locationText}>{item.lugar}</ThemedText>
                )}
              </View>
            </View>
          </ThemedView>
        </>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
        <ThemedText style={{ marginTop: 10 }}>Cargando partidos de {teamNameForDisplay}...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: `Partidos de ${teamNameForDisplay}` }} />
      {error && (
        <ThemedView style={styles.centered}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
        </ThemedView>
      )}
      {!error && teamMatches.length === 0 && !isLoading && (
         <ThemedView style={styles.centered}>
            <ThemedText>No hay partidos para mostrar para este equipo.</ThemedText>
            <ThemedText style={styles.subtleText}>
                Asegúrate de que los datos de partidos estén actualizados en la pestaña 'Matches'.
            </ThemedText>
         </ThemedView>
      )}
      {!error && teamMatches.length > 0 && (
        <FlatList
          data={teamMatches}
          renderItem={renderMatchItemRevised}
          keyExtractor={(item, index) => item.match ?? `${item.Team}-${item.fecha}-${item.equipoContrario}-${index}`}
          contentContainerStyle={styles.listContentContainer}
          ListHeaderComponent={<ThemedText type="subtitle" style={styles.listHeader}>{teamNameForDisplay}</ThemedText>}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
    paddingHorizontal: 20,
  },
  subtleText: {
    fontSize: 13,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  listContentContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  listHeader: { 
    textAlign: 'center',
    marginVertical: 15,
  },
  competitionHeaderContainer: { // Nuevo estilo para el contenedor de la competición y el formato
    flexDirection: 'row',
    alignItems: 'baseline', // Alinea bien textos de diferentes tamaños
    marginTop: 15,
    marginBottom: 5,
    marginHorizontal: 5,
    paddingLeft: 10,
  },
  competitionHeaderText: { // Estilo para el texto de la competición
    fontSize: 16,
    fontWeight: '600',
  },
  competitionFormatText: { // Estilo para el texto del formato
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.8,
    marginLeft: 6, // Espacio entre la competición y el formato
  },
  matchItem: {
    paddingVertical: 10, 
    paddingHorizontal: 15,
    marginVertical: 4, 
    marginHorizontal: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  matchContentRow: { 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 3, 
  },
  leftAndMiddleContainer: { 
    flex: 1, 
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8, 
  },
  dateTimeContainer: {
    flexDirection: 'column',
    alignItems: 'center', // Cambiado a 'center' para centrar la hora debajo de la fecha
    minWidth: 55, 
  },
  verticalSeparator: { // El backgroundColor se aplicará dinámicamente
    height: '60%',
    width: 1,
    marginHorizontal: 8,
    opacity: 0.6, // Aumentada la opacidad para mayor visibilidad
    // El color del separador se tomará del tema a través de un componente ThemedView o similar si es necesario,
    // o se puede definir aquí si es estático o se pasa como prop.
    // Por ahora, lo dejamos sin color explícito para que herede o se defina en un nivel superior si es necesario.
    // Si se quiere un color específico, se puede añadir:
    // backgroundColor: '#cccccc', // Ejemplo de color claro
    // backgroundColor: '#555555', // Ejemplo de color oscuro
  },
  matchDateSmall: { 
    fontSize: 11, 
    opacity: 0.8,
  },
  matchTimeSmall: { 
    fontSize: 11, 
    opacity: 0.8,
  },
  matchOpponentSmall: { 
    flex: 1, 
    fontSize: 13, 
    fontWeight: '600',
    // marginLeft: 8, // Se elimina este margen, el emblema lo gestionará
  },
  locationContainer: { 
    minWidth: 15, 
    alignItems: 'flex-end', 
  },
  locationText: { 
    fontSize: 12, 
    fontWeight: 'bold',
  },
  // Estilos para los items de estado especial
  statusHighlightItem: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 60, // Altura fija para estos items especiales, ajusta según necesidad
    paddingVertical: 10, // Asegurar que el padding no interfiera con la altura
  },
  championItem: {
    backgroundColor: 'red', // Fondo rojo para campeón
  },
  postScudettoItem: {
    backgroundColor: 'darkred', // Un rojo más oscuro para post scudetto, o el mismo si prefieres
  },
  negativoItem: {
    backgroundColor: '#8B0000', // Maroon, un rojo oscuro diferente para Negativo
  },
  internationalBreakItem: { // Nuevo estilo para el parón internacional
    backgroundColor: '#4682B4', // SteelBlue, o el color que prefieras
  },
  statusHighlightText: {
    color: 'white', // Texto blanco para contraste
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  teamEmblemStyle: {
    width: 20, // Ajusta el tamaño según sea necesario
    height: 20, // Ajusta el tamaño según sea necesario
    resizeMode: 'contain',
    marginRight: 8, // Espacio entre el emblema y el nombre del oponente
    // Alineación vertical ya manejada por alignItems: 'center' en leftAndMiddleContainer
  },
});
