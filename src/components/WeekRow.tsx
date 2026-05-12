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
import { AppSettings } from '../hooks/useSettings';
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
  settings: AppSettings;
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
  onDatePress,
  settings,
}: WeekRowProps) => {
  if (!week) return null;

  const { fontSizeIndex, alignmentVertical, alignmentHorizontal, showHolidays, showOtherMonths, memoHighlightType } = settings;

  // Font size scaling
  const scales = [0.85, 1, 1.15];
  const scale = scales[fontSizeIndex] || 1;

  // --- 높이 기반 동적 메모 개수 계산 (MemoWidget.tsx와 동일한 로직 기준 수정) ---
  const DATE_INFO_HEIGHT = 20;
  const MEMO_BAR_HEIGHT = 17 * scale;
  const rowHeight = isFocusView ? 75 : NORMAL_ROW_HEIGHT;
  const sliceSize = Math.max(1, Math.floor((rowHeight - DATE_INFO_HEIGHT) / MEMO_BAR_HEIGHT));

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
        
        const combinedName = showHolidays ? (holidayName || lunarHolidayName || offlineHolidayName || anniversaryName) : null;
        
        const isSunday = di === 0;
        const isRedDay = !!holidayName || !!lunarHolidayName || !!offlineHolidayName;
        
        // --- 높이 기반 동적 메모 개수 계산 ---
        let daySliceSize = sliceSize;
        if (showHolidays && combinedName) {
          daySliceSize = Math.max(1, sliceSize - 1);
        }

        const showDateContent = isCurrentMonth || showOtherMonths;

        return (
          <TouchableOpacity
            key={di}
            style={[
              styles.dayCell,
              di < 6 && styles.dayBorderRight,
              !isFocusView && wi < CALENDAR_ROWS - 1 && styles.dayBorderBottom,
              isSelected && styles.selectedDayCell,
              isFocusView && { paddingTop: 6 },
            ]}
            onPress={() => onDatePress(date)}
            activeOpacity={0.7}
            disabled={!showDateContent}
          >
            {showDateContent && (
              <View style={{ flex: 1, position: 'relative', alignItems: 'center', opacity: isCurrentMonth ? 1 : 0.35 }}>
                <View style={styles.topArea}>
                  <View style={[styles.dateNumWrap, isToday && styles.todayBadge]}>
                    <Text style={[
                      styles.dayNum,
                      { fontSize: 13 },
                      (isSunday || isRedDay) && { color: '#E8735A' },
                      di === 6 && !isRedDay && { color: '#5A8FE8' },
                      isToday && { color: '#FFFFFF', fontWeight: '800' },
                      isSelected && !isToday && { fontWeight: '800' }
                    ]}>
                      {date.getDate()}
                    </Text>
                  </View>
                </View>
                {dayMemos.length > daySliceSize && (
                  <Text style={[styles.moreBadge]}>+{dayMemos.length - daySliceSize}</Text>
                )}

                {combinedName && (
                  <Text style={[
                    styles.holidayText, 
                    { fontSize: 8 },
                    !isRedDay && anniversaryName && { color: '#8A8A8A' }
                  ]} numberOfLines={1}>
                    {combinedName}
                  </Text>
                )}

                <View style={[
                  styles.memoPreviewArea, 
                  { 
                    flex: 1, 
                    justifyContent: alignmentVertical === 'center' ? 'center' : 'flex-start',
                    alignItems: memoHighlightType === 'full' ? 'stretch' : (alignmentHorizontal === 'center' ? 'center' : 'flex-start')
                  }
                ]}>
                  {dayMemos.slice(0, daySliceSize).map((m) => (
                    <View 
                      key={m.id} 
                      style={[
                        styles.memoChip, 
                        { 
                          backgroundColor: m.color || '#C8F0C4',
                          alignItems: alignmentHorizontal === 'center' ? 'center' : 'flex-start',
                          paddingHorizontal: memoHighlightType === 'full' ? 2 : 4,
                        }
                      ]}
                    >
                      <Text 
                        style={[
                          styles.memoChipText, 
                          { 
                            fontSize: 9 * scale,
                            textAlign: alignmentHorizontal === 'center' ? 'center' : 'left'
                          }
                        ]} 
                        numberOfLines={1}
                      >
                        {m.title}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
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
    position: 'relative',
    flex: 1,
    paddingTop: 1,
    paddingHorizontal: 4,
    backgroundColor: '#FFFFFF',
    flexDirection: 'column',
  },
  dayBorderRight: {
    borderRightWidth: 1,
    borderRightColor: '#dfdfdf',
  },
  topArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#dfdfdf',
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
    width: '100%',
    marginTop: 2,
    gap: 2,
  },
  memoChip: {
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 1,
  },
  memoChipText: {
    fontSize: 9,
    color: '#000000',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  moreBadge: {
    fontSize: 7,
    right: 0,
    top: 0,
    position: 'absolute',
    color: '#8A8A8A',
    fontWeight: '600',
  },
});
