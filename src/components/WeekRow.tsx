import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  CALENDAR_ROWS,
  CELL_WIDTH,
  FIXED_ANNIVERSARIES,
  NORMAL_ROW_HEIGHT,
  OFFLINE_HOLIDAYS
} from '../constants/calendar';
import { MemosState } from '../types/calendar';
import { getDateKey } from '../utils/date';
import { getLunarHoliday } from '../utils/holiday';

interface WeekRowProps {
  week: Date[];
  wi: number;
  viewDate: Date;
  selectedDate: string | null;
  todayStr: string;
  memos: MemosState;
  holidays: { [date: string]: string };
  isFocusView?: boolean;
  onDatePress: (date: Date) => void;
}

export const WeekRow = ({
  week,
  wi,
  viewDate,
  selectedDate,
  todayStr,
  memos,
  holidays,
  isFocusView = false,
  onDatePress
}: WeekRowProps) => {
  if (!week) return null;

  return (
    <View 
      style={[
        styles.weekRow, 
        isFocusView ? styles.focusWeekHeight : { height: NORMAL_ROW_HEIGHT }
      ]}
    >
      {week.map((date, di) => {
        const dateStr = getDateKey(date);
        const monthDay = dateStr.slice(5); 
        
        const isSelected = selectedDate === dateStr;
        const isToday = dateStr === todayStr;
        const dayMemos = memos[dateStr] || [];
        const isCurrentMonth = date.getMonth() === viewDate.getMonth();
        
        const holidayName = holidays[dateStr];
        const offlineHolidayName = OFFLINE_HOLIDAYS[monthDay];
        const lunarHolidayName = getLunarHoliday(date);
        const anniversaryName = FIXED_ANNIVERSARIES[monthDay];
        
        const combinedName = holidayName || lunarHolidayName || offlineHolidayName || anniversaryName;
        
        const isSunday = di === 0;
        const isRedDay = !!holidayName || !!lunarHolidayName || !!offlineHolidayName;

        return (
          <TouchableOpacity
            key={di}
            style={[
              styles.dayCell,
              di < 6 && styles.dayBorderRight,
              !isFocusView && wi < CALENDAR_ROWS - 1 && styles.dayBorderBottom,
              isSelected && styles.selectedDayCell,
              isFocusView && { paddingTop: 6 },
              !isCurrentMonth && { opacity: 0.35 }
            ]}
            onPress={() => onDatePress(date)}
            activeOpacity={0.7}
          >
            <View style={[styles.dateNumWrap, isToday && styles.todayBadge]}>
              <Text style={[
                styles.dayNum,
                (isSunday || isRedDay) && { color: '#E8735A' },
                di === 6 && !isRedDay && { color: '#5A8FE8' },
                isToday && { color: '#FFFFFF', fontWeight: '800' },
                isSelected && !isToday && { fontWeight: '800' }
              ]}>
                {date.getDate()}
              </Text>
            </View>

            {combinedName && (
              <Text style={[
                styles.holidayText, 
                !isRedDay && anniversaryName && { color: '#8A8A8A' }
              ]} numberOfLines={1}>
                {combinedName}
              </Text>
            )}

            <View style={styles.memoPreviewArea}>
              {dayMemos.slice(0, isFocusView ? 1 : 2).map((m) => (
                <View key={m.id} style={[styles.memoChip, { backgroundColor: m.color || '#C8F0C4' }]}>
                  <Text style={styles.memoChipText} numberOfLines={1}>{m.title}</Text>
                </View>
              ))}
              {dayMemos.length > (isFocusView ? 1 : 2) && (
                <Text style={styles.moreBadge}>+{dayMemos.length - (isFocusView ? 1 : 2)}</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  weekRow: {
    flexDirection: 'row',
  },
  focusWeekHeight: {
    height: 75,
  },
  dayCell: {
    width: CELL_WIDTH,
    flex: 1,
    paddingTop: 6,
    paddingHorizontal: 4,
    backgroundColor: '#FFFFFF',
  },
  dayBorderRight: {
    borderRightWidth: 1,
    borderRightColor: '#F0F0F0',
  },
  dayBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedDayCell: {
    backgroundColor: '#F5F5F5',
  },
  dateNumWrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  todayBadge: {
    backgroundColor: '#3f6cbe',
    borderRadius: 12,
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
  holidayText: {
    fontSize: 8,
    color: '#E8735A',
    fontWeight: '600',
    marginTop: -2,
    marginBottom: 2,
    textAlign: 'center',
  },
  memoPreviewArea: {
    marginTop: 4,
    gap: 2,
  },
  memoChip: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 0,
    marginBottom: 1,
  },
  memoChipText: {
    fontSize: 9,
    color: '#000000',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  moreBadge: {
    fontSize: 9,
    color: '#8A8A8A',
    fontWeight: '600',
    marginLeft: 2,
  },
});
