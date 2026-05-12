import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { AppSettings } from '../hooks/useSettings';
import { MemosState } from '../types/calendar';
import { WeekRow } from './WeekRow';

interface CalendarGridProps {
  data: {
    weeks: Date[][];
    viewDate: Date;
    selectedDate: string | null;
    todayStr: string;
    memos: MemosState;
    holidays: { [key: string]: string };
  };
  settings: AppSettings;
  actions: {
    onDatePress: (date: Date) => void;
    onGestureEvent: (event: any) => void;
  };
  animation: {
    translateX: Animated.Value;
    opacity: Animated.Value;
  };
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  data,
  settings,
  actions,
  animation
}) => {
  const { weeks, viewDate, selectedDate, todayStr, memos, holidays } = data;
  const { onDatePress, onGestureEvent } = actions;
  const { translateX, opacity } = animation;

  return (
    <PanGestureHandler onHandlerStateChange={onGestureEvent} activeOffsetX={[-30, 30]}>
      <Animated.View style={[styles.container, { transform: [{ translateX }], opacity }]}>
        <View style={styles.calendarGrid}>
          {weeks.map((week, wi) => (
            <WeekRow 
              key={wi} 
              week={week} 
              wi={wi} 
              viewDate={viewDate} 
              selectedDate={selectedDate} 
              todayStr={todayStr} 
              memos={memos} 
              holidays={holidays} 
              onDatePress={onDatePress} 
              settings={settings}
            />
          ))}
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  calendarGrid: { flex: 1, backgroundColor: '#FFFFFF' },
});
