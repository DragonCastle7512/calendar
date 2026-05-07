import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CELL_WIDTH, WEEKDAY_HEIGHT } from '../constants/calendar';

export const WeekDaysHeader = () => {
  return (
    <View style={styles.weekDaysRow}>
      {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
        <View key={d} style={styles.weekDayCell}>
          <Text style={[
            styles.weekDayText, 
            i === 0 && { color: '#E8735A' }, 
            i === 6 && { color: '#5A8FE8' }
          ]}>
            {d}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  weekDaysRow: { 
    height: WEEKDAY_HEIGHT, 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: '#dfdfdf', 
    backgroundColor: '#FFFFFF' 
  },
  weekDayCell: { 
    width: CELL_WIDTH, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  weekDayText: { 
    fontSize: 10, 
    fontWeight: '700', 
    color: '#8A8A8A', 
    letterSpacing: 1.5 
  },
});
