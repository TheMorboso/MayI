import React, { useState, useEffect } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { ThemedText } from '../../components/ThemedText'; // Ajustada la ruta
import { ThemedView } from '../../components/ThemedView'; // Ajustada la ruta
import { PostScudettoMatchInfo } from '../../api/postscudetto'; // Ajustada la ruta

interface TeamTodayMatchesProps {
  matchesForThisTeam: PostScudettoMatchInfo[] | null;
  teamName: string;
}

const getFormattedDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export function TodayMatches({ matchesForThisTeam, teamName }: TeamTodayMatchesProps) {
  const [matchesTodayFiltered, setMatchesTodayFiltered] = useState<PostScudettoMatchInfo[]>([]);

  useEffect(() => {
    if (!matchesForThisTeam || matchesForThisTeam.length === 0) {
      setMatchesTodayFiltered([]);
      return;
    }
    const todayStr = getFormattedDate(new Date());
    const todaySGames = matchesForThisTeam.filter(match =>
      match.fecha === todayStr &&
      match.hora !== 'FT' && // No mostrar partidos finalizados
      !['Negativo', 'Post scudetto', 'Champion', 'Parón Internacional'].includes(match.Status || '')
      // No es necesario filtrar por Amistoso aquí si `matchesForThisTeam` ya los excluye o si se quieren mostrar
    );
    setMatchesTodayFiltered(todaySGames);
  }, [matchesForThisTeam]);

  const renderTodaysMatchItem = ({ item }: { item: PostScudettoMatchInfo }) => (
    <ThemedView style={styles.todaysMatchItemContainer} lightColor="#f0f0f0" darkColor="#333333">
      <View style={styles.todaysMatchInfo}>
        <ThemedText style={styles.todaysMatchTeamText} numberOfLines={1} ellipsizeMode="tail">
          {item.Team}
        </ThemedText>
        <ThemedText style={styles.todaysMatchVsText}>vs</ThemedText>
        <ThemedText style={styles.todaysMatchOpponentText} numberOfLines={1} ellipsizeMode="tail">
          {item.equipoContrario || 'Oponente Desc.'}
        </ThemedText>
      </View>
      <View style={styles.todaysMatchDetails}>
        <ThemedText style={styles.todaysMatchCompetitionText} numberOfLines={1} ellipsizeMode="tail">
          {item.Competicion || 'Comp. Desc.'}
        </ThemedText>
        <ThemedText style={styles.todaysMatchTimeText}>
          {item.hora || 'N/A'}
        </ThemedText>
      </View>
    </ThemedView>
  );

  if (!matchesForThisTeam || matchesForThisTeam.length === 0) {
    return null; 
  }

  if (matchesTodayFiltered.length === 0) {
    return (
      <View style={styles.todaysMatchesSection}>
        <ThemedText type="subtitle" style={styles.todaysMatchesTitle}>
          Partidos de Hoy para {teamName} ({getFormattedDate(new Date())})
        </ThemedText>
        <ThemedText style={styles.noMatchesTodayText}>No hay partidos programados para hoy para este equipo.</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.todaysMatchesSection}>
      <ThemedText type="subtitle" style={styles.todaysMatchesTitle}>
        Partidos de Hoy para {teamName} ({getFormattedDate(new Date())})
      </ThemedText>
      <FlatList
        data={matchesTodayFiltered}
        renderItem={renderTodaysMatchItem}
        keyExtractor={(item, index) => `today-team-${item.Team}-${item.fecha}-${item.equipoContrario}-${item.hora}-${index}`}
        style={styles.todaysMatchesList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  todaysMatchesSection: {
    width: '95%',
    marginTop: 15,
    marginBottom: 15,
    padding: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  todaysMatchesTitle: {
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 16,
  },
  todaysMatchesList: {
    maxHeight: 180,
  },
  todaysMatchItemContainer: {
    paddingVertical: 10, paddingHorizontal: 12, marginVertical: 4, borderRadius: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  todaysMatchInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  todaysMatchTeamText: { fontSize: 14, fontWeight: '600', flex: 1 },
  todaysMatchVsText: { fontSize: 12, marginHorizontal: 4, opacity: 0.8 },
  todaysMatchOpponentText: { fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },
  todaysMatchDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  todaysMatchCompetitionText: { fontSize: 11, opacity: 0.7, flexShrink: 1 },
  todaysMatchTimeText: { fontSize: 11, opacity: 0.9, fontWeight: '500' },
  noMatchesTodayText: { textAlign: 'center', marginTop: 10, fontSize: 15, opacity: 0.7 },
});