import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { MEMO_COLORS } from '../constants/calendar';
import { RepeatType } from '../types/calendar';
import { getDateKey } from '../utils/date';

interface SelectionModalProps {
  visible: boolean;
  type: 'color' | 'repeat' | 'date';
  selectedValue: string;
  onSelect: (value: any) => void;
  onClose: () => void;
  holidays?: { [date: string]: string };
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const SelectionModal = ({ visible, type, selectedValue, onSelect, onClose, holidays = {} }: SelectionModalProps) => {
  const [viewDate, setViewDate] = useState(new Date(selectedValue || Date.now()));

  useEffect(() => {
    if (visible) {
      setViewDate(new Date(selectedValue || Date.now()));
    }
  }, [visible, selectedValue]);

  const repeatOptions: { label: string; value: RepeatType }[] = [
    { label: '반복 안함', value: 'none' },
    { label: '매주 반복', value: 'weekly' },
    { label: '매월 반복', value: 'monthly' },
    { label: '매년 반복', value: 'yearly' },
  ];

  const getTitle = () => {
    switch (type) {
      case 'color': return '색상 선택';
      case 'repeat': return '반복 설정';
      case 'date': return '날짜 이동';
      default: return '';
    }
  };

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    
    const result: { date: Date; isCurrentMonth: boolean }[] = [];
    
    for (let i = firstDay - 1; i >= 0; i--) {
      result.push({ date: new Date(year, month - 1, prevMonthLastDate - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDate; i++) {
      result.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    while (result.length < 42) {
      result.push({ date: new Date(year, month + 1, result.length - lastDate - firstDay + 1), isCurrentMonth: false });
    }
    return result;
  }, [viewDate]);

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const onGestureEvent = (event: any) => {
    const { translationX, state } = event.nativeEvent;
    if (state === State.END) {
      if (translationX < -50) changeMonth(1);
      else if (translationX > 50) changeMonth(-1);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableWithoutFeedback>
          <View style={[styles.container, type === 'date' && styles.dateContainer]}>
            <View style={styles.header}>
              <Text style={styles.title}>{getTitle()}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {type === 'color' ? (
              <ScrollView contentContainerStyle={styles.colorGrid} showsVerticalScrollIndicator={false}>
                {MEMO_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: color },
                      color === 'transparent' && { 
                        borderWidth: 1, 
                        borderColor: '#EEE', 
                        elevation: 0, 
                        shadowOpacity: 0,
                        backgroundColor: '#FAFAFA' 
                      },
                      selectedValue === color && styles.selectedCircle,
                    ]}
                    onPress={() => {
                      onSelect(color);
                      onClose();
                    }}
                  >
                    {color === 'transparent' && (
                      <Ionicons name="ban-outline" size={35} color="#CCC" style={{ position: 'absolute' }} />
                    )}
                    {selectedValue === color && <Ionicons name="checkmark" size={20} color={color === 'transparent' ? '#888' : '#555'} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : type === 'repeat' ? (
              <View style={styles.optionList}>
                {repeatOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionItem,
                      selectedValue === option.value && styles.selectedOption,
                    ]}
                    onPress={() => {
                      onSelect(option.value);
                      onClose();
                    }}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedValue === option.value && styles.selectedOptionText
                    ]}>
                      {option.label}
                    </Text>
                    {selectedValue === option.value && <Ionicons name="checkmark" size={20} color="#3f6cbe" />}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.calendarContainer}>
                <View style={styles.calendarNav}>
                  <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={24} color="#8A8A8A" style={{ opacity: 0.5 }} />
                  </TouchableOpacity>
                  <Text style={styles.monthLabel}>{viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월</Text>
                  <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={24} color="#8A8A8A" style={{ opacity: 0.5 }} />
                  </TouchableOpacity>
                </View>

                <View style={styles.weekHeader}>
                  {WEEKDAYS.map((day, idx) => (
                    <Text key={day} style={[styles.weekLabel, idx === 0 && { color: '#E8735A' }, idx === 6 && { color: '#5A8FE8' }]}>
                      {day}
                    </Text>
                  ))}
                </View>

                <PanGestureHandler 
                  onHandlerStateChange={onGestureEvent}
                  activeOffsetX={[-20, 20]}
                >
                  <View style={styles.daysGrid}>
                    {days.map((item, idx) => {
                      const dKey = getDateKey(item.date);
                      const isSelected = dKey === selectedValue;
                      const isHoliday = !!holidays[dKey];
                      const dayOfWeek = item.date.getDay();
                      
                      let textColor = item.isCurrentMonth ? '#333' : '#D0D0D0';
                      if (item.isCurrentMonth) {
                        if (dayOfWeek === 0 || isHoliday) textColor = '#E8735A';
                        else if (dayOfWeek === 6) textColor = '#5A8FE8';
                      }
                      if (isSelected) textColor = '#FFFFFF';

                      return (
                        <TouchableOpacity 
                          key={idx} 
                          style={styles.dayCell}
                          onPress={() => {
                            onSelect(dKey);
                            onClose();
                          }}
                        >
                          <View style={[styles.dayCircle, isSelected && styles.selectedCircleBlue]}>
                            <Text style={[styles.dayText, { color: textColor }, isSelected && styles.selectedDayText]}>
                              {item.date.getDate()}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </PanGestureHandler>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%'
  },
  dateContainer: {
    width: '92%',
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
  },
  calendarContainer: {
    width: '100%',
  },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 5,
  },
  navBtn: {
    padding: 10,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#333',
  },
  weekHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 8,
    marginBottom: 8,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 300,
  },
  dayCell: {
    width: '14.28%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCircleBlue: {
    backgroundColor: '#3f6cbe',
    borderRadius: 18,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedDayText: {
    fontWeight: '800',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
    paddingBottom: 10,
  },
  colorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedCircle: {
    borderWidth: 3,
    borderColor: '#555',
  },
  optionList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  selectedOption: {
    backgroundColor: '#EBF2FF',
  },
  optionText: {
    fontSize: 16,
    color: '#444',
  },
  selectedOptionText: {
    color: '#3f6cbe',
    fontWeight: '700',
  },
});
