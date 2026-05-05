import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { AppSettings } from '../hooks/useSettings';
import { MemosState } from '../types/calendar';
import { MemoSection } from './MemoSection';
import { WeekRow } from './WeekRow';

interface FocusViewProps {
  data: {
    weeks: Date[][];
    selectedWeekIndex: number;
    viewDate: Date;
    selectedDate: string;
    todayStr: string;
    memos: MemosState;
    holidays: { [key: string]: string };
  };
  settings: AppSettings;
  actions: {
    onDatePress: (date: Date) => void;
    memoSectionProps: any; // Simplified for now, will pass through
  };
  animation: {
    focusAnim: Animated.Value;
  };
  itemHeights: React.MutableRefObject<number[]>;
}

export const FocusView: React.FC<FocusViewProps> = ({
  data,
  settings,
  actions,
  animation,
  itemHeights
}) => {
  const { weeks, selectedWeekIndex, viewDate, selectedDate, todayStr, memos, holidays } = data;
  const { onDatePress, memoSectionProps } = actions;
  const { focusAnim } = animation;

  return (
    <Animated.View style={[styles.focusContainer, { opacity: focusAnim }]}>
      <WeekRow 
        week={weeks[selectedWeekIndex]} 
        wi={selectedWeekIndex} 
        viewDate={viewDate} 
        selectedDate={selectedDate} 
        todayStr={todayStr} 
        memos={memos} 
        holidays={holidays} 
        onDatePress={onDatePress} 
        isFocusView 
        fontSizeIndex={settings.fontSizeIndex}
        alignment={settings.alignment}
        showHolidays={settings.showHolidays}
        showOtherMonths={settings.showOtherMonths}
      />
      
      <MemoSection 
        {...memoSectionProps}
        itemHeights={itemHeights}
      />

      {selectedWeekIndex < 5 ? (
        <WeekRow 
          week={weeks[selectedWeekIndex + 1]} 
          wi={selectedWeekIndex + 1} 
          viewDate={viewDate} 
          selectedDate={selectedDate} 
          todayStr={todayStr} 
          memos={memos} 
          holidays={holidays} 
          onDatePress={onDatePress} 
          isFocusView 
          fontSizeIndex={settings.fontSizeIndex}
          alignment={settings.alignment}
          showHolidays={settings.showHolidays}
          showOtherMonths={settings.showOtherMonths}
        />
      ) : (
        <View style={styles.emptyWeekRow} />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  focusContainer: { flex: 1 },
  emptyWeekRow: { height: 75, backgroundColor: '#FAFAFA' },
});
