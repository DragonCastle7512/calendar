import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarHeader } from '../src/components/CalendarHeader';
import { DraggableMemoItem } from '../src/components/DraggableMemoItem';
import { MemoForm } from '../src/components/MemoForm';
import { WeekRow } from '../src/components/WeekRow';
import {
  CELL_WIDTH,
  FIXED_ANNIVERSARIES,
  HOLIDAY_CACHE_KEY,
  MEMO_COLORS,
  MEMO_STORAGE_KEY,
  OFFLINE_HOLIDAYS,
  PROXY_TOKEN,
  PROXY_URL,
  SYNC_EXPIRY_MS,
  WEEKDAY_HEIGHT
} from '../src/constants/calendar';
import { MemoEntry, MemosState } from '../src/types/calendar';
import { getDateKey } from '../src/utils/date';
import { getLunarHoliday } from '../src/utils/holiday';

import * as Linking from 'expo-linking';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { MemoWidget } from '../src/widgets/MemoWidget';
import { useLocalSearchParams } from 'expo-router';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CalendarMemoApp() {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [memos, setMemos] = useState<MemosState>({});
  const [holidays, setHolidays] = useState<{ [date: string]: string }>({});
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // 애니메이션 상태
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const focusAnim = useRef(new Animated.Value(0)).current; // 포커스 전환용
  const itemHeights = useRef<number[]>([]);
  const syncedYears = useRef<Set<number>>(new Set());
  const lastBackPressed = useRef<number>(0);

  const params = useLocalSearchParams();
  const urlDate = params.date as string;

  useEffect(() => {
    if (urlDate) {
      const targetDate = new Date(urlDate);
      if (!isNaN(targetDate.getTime())) {
        setViewDate(targetDate);
        setSelectedDate(urlDate);
        setModalVisible(true);
      }
    }
  }, [urlDate]);

  useEffect(() => { 
    loadMemos();
    const currentYear = viewDate.getFullYear();
    syncHolidays(currentYear - 1);
    syncHolidays(currentYear);
    syncHolidays(currentYear + 1);
  }, [viewDate.getFullYear()]);

  // 날짜 선택 시 포커스 애니메이션 트리거
  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: selectedDate ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [selectedDate]);

  useEffect(() => {
    const backAction = () => {
      if (modalVisible) {
        setModalVisible(false);
        return true;
      }
      if (selectedDate) {
        setSelectedDate(null);
        return true;
      }
      
      const currentTime = Date.now();
      if (currentTime - lastBackPressed.current < 2000) {
        BackHandler.exitApp();
        return true;
      }
      
      lastBackPressed.current = currentTime;
      if (Platform.OS === 'android') {
        ToastAndroid.show('뒤로 가기 버튼을 한 번 더 누르면 종료됩니다.', ToastAndroid.SHORT);
      }
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [selectedDate, modalVisible]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const updateWidget = async () => {
        try {
          // 위젯이 현재 보고 있는 날짜 확인
          const savedWidgetDate = await AsyncStorage.getItem('@widget_view_date');
          const viewDate = savedWidgetDate ? new Date(savedWidgetDate) : new Date();
          
          const year = viewDate.getFullYear();
          const month = viewDate.getMonth();
          const todayStr = getDateKey(new Date());

          // 달력 데이터 생성
          const firstDay = new Date(year, month, 1).getDay();
          const lastDate = new Date(year, month + 1, 0).getDate();
          const prevMonthLastDate = new Date(year, month, 0).getDate();
          const days: Date[] = [];
          for (let i = firstDay - 1; i >= 0; i--) days.push(new Date(year, month - 1, prevMonthLastDate - i));
          for (let i = 1; i <= lastDate; i++) days.push(new Date(year, month, i));
          let nextDate = 1;
          while (days.length < 42) days.push(new Date(year, month + 1, nextDate++));
          const rows: Date[][] = [];
          for (let i = 0; i < 42; i += 7) rows.push(days.slice(i, i + 7));

          // 공휴일 및 기념일 정보 구분 (앱 로직과 동기화, 42일 전체에 대해 수행)
          const widgetHolidays: { [key: string]: string } = {};
          const widgetAnniversaries: { [key: string]: string } = {};

          days.forEach(d => {
            const dKey = getDateKey(d);
            const mDay = dKey.slice(5);
            
            // 휴일 (빨간날): API 데이터 | 음력 | 오프라인 휴일
            const hName = holidays[dKey] || getLunarHoliday(d) || OFFLINE_HOLIDAYS[mDay];
            if (hName) widgetHolidays[dKey] = hName;

            // 기념일 (검은날): FIXED_ANNIVERSARIES
            const aName = FIXED_ANNIVERSARIES[mDay];
            if (aName) widgetAnniversaries[dKey] = aName;
          });

          requestWidgetUpdate({
            widgetName: 'Memo',
            renderWidget: () => (
              <MemoWidget 
                year={year} 
                month={month} 
                days={rows} 
                memos={memos}
                todayStr={todayStr}
                holidays={widgetHolidays}
                anniversaries={widgetAnniversaries}
              />
            ),
            widgetNotFound: () => {}
          });
        } catch (e) {
          // "keep awake" 에러 등 무시
        }
      };
      updateWidget();
    }
  }, [memos, holidays]);

  const loadMemos = async () => {
    try {
      const saved = await AsyncStorage.getItem(MEMO_STORAGE_KEY);
      if (saved) setMemos(JSON.parse(saved));
    } catch (e) { console.warn('Load Error', e); }
  };

  const syncHolidays = async (year: number) => {
    const now = new Date();
    const currentRealYear = now.getFullYear();
    const isOutOfRange = year < currentRealYear - 1 || year > currentRealYear + 1;
    if (syncedYears.current.has(year)) return;
    syncedYears.current.add(year);
    const cacheKey = `${HOLIDAY_CACHE_KEY}${year}`;
    try {
      const saved = await AsyncStorage.getItem(cacheKey);
      if (saved) {
        const { data, timestamp } = JSON.parse(saved);
        const isExpired = !timestamp || (Date.now() - timestamp > SYNC_EXPIRY_MS);
        if (data) {
          setHolidays(prev => ({ ...prev, ...data }));
          if (isOutOfRange || !isExpired) return;
        }
      }
      if (isOutOfRange || !PROXY_URL) return;
      const response = await fetch(`${PROXY_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, appId: PROXY_TOKEN }),
      });
      if (response.ok) {
        const resData = await response.json();
        const holidayMap: { [key: string]: string } = {};
        const items = resData?.response?.body?.items?.item;
        if (items) {
          const itemList = Array.isArray(items) ? items : [items];
          itemList.forEach((item: any) => {
            if (item.isHoliday === 'Y' && item.locdate) {
              const strDate = String(item.locdate);
              const formattedDate = `${strDate.slice(0, 4)}-${strDate.slice(4, 6)}-${strDate.slice(6, 8)}`;
              holidayMap[formattedDate] = item.dateName;
            }
          });
        }
        if (Object.keys(holidayMap).length > 0) {
          setHolidays(prev => ({ ...prev, ...holidayMap }));
          await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: holidayMap, timestamp: Date.now() }));
        }
      }
    } catch (e) { syncedYears.current.delete(year); }
  };

  const openAddModal = () => {
    setEditingId(null); setNewTitle(''); setNewContent(''); setModalVisible(true);
  };

  const openEditModal = (item: MemoEntry) => {
    setEditingId(item.id); setNewTitle(item.title); setNewContent(item.content); setModalVisible(true);
  };

  const saveMemo = async () => {
    if (!newTitle.trim() || !selectedDate) return;
    const updated = { ...memos };
    const dateMemos = updated[selectedDate] || [];
    const colorIdx = dateMemos.length % MEMO_COLORS.length;
    if (editingId) {
      updated[selectedDate] = dateMemos.map(m => m.id === editingId ? { ...m, title: newTitle, content: newContent } : m);
    } else {
      updated[selectedDate] = [...dateMemos, { id: Date.now().toString(), title: newTitle, content: newContent, color: MEMO_COLORS[colorIdx] }];
    }
    setMemos(updated);
    await AsyncStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(updated));
    setModalVisible(false); setNewTitle(''); setNewContent(''); setEditingId(null);
  };

  const deleteMemo = async (id: string) => {
    if (!selectedDate) return;
    const updated = { ...memos };
    updated[selectedDate] = updated[selectedDate].filter(m => m.id !== id);
    if (updated[selectedDate].length === 0) delete updated[selectedDate];
    setMemos(updated);
    await AsyncStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(updated));
  };

  const reorderMemos = async (fromIndex: number, toIndex: number) => {
    if (!selectedDate || fromIndex === toIndex) return;
    const dateMemos = [...(memos[selectedDate] || [])];
    const [movedItem] = dateMemos.splice(fromIndex, 1);
    dateMemos.splice(toIndex, 0, movedItem);
    const updated = { ...memos, [selectedDate]: dateMemos };
    setMemos(updated);
    await AsyncStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(updated));
  };

  const weeks = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    const days: Date[] = [];
    for (let i = firstDay - 1; i >= 0; i--) days.push(new Date(year, month - 1, prevMonthLastDate - i));
    for (let i = 1; i <= lastDate; i++) days.push(new Date(year, month, i));
    let nextDate = 1;
    while (days.length < 42) days.push(new Date(year, month + 1, nextDate++));
    const rows = [];
    for (let i = 0; i < 42; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [viewDate]);

  const onDatePress = (date: Date) => {
    const dateStr = getDateKey(date);
    setSelectedDate(prev => prev === dateStr ? null : dateStr);
    setModalVisible(false);
    setEditingId(null); setNewTitle(''); setNewContent('');
  };

  const changeMonth = (offset: number) => {
    const targetX = offset > 0 ? -SCREEN_WIDTH * 0.3 : SCREEN_WIDTH * 0.3;
    Animated.parallel([
      Animated.timing(translateX, { toValue: targetX, duration: 150, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true })
    ]).start(() => {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
      setSelectedDate(null);
      translateX.setValue(-targetX);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true })
      ]).start();
    });
  };

  const onGestureEvent = (event: any) => {
    const { translationX, state } = event.nativeEvent;
    if (state === State.END) {
      if (translationX < -60) changeMonth(1);
      else if (translationX > 60) changeMonth(-1);
    }
  };

  const selectedWeekIndex = useMemo(() => {
    if (!selectedDate) return -1;
    return weeks.findIndex(week => week.some(d => getDateKey(d) === selectedDate));
  }, [weeks, selectedDate]);

  const todayStr = getDateKey(new Date());
  
  const todayHoliday = useMemo(() => {
    const [y, m, d] = todayStr.split('-');
    const monthDay = `${m}-${d}`;
    return holidays[todayStr] || getLunarHoliday(new Date()) || OFFLINE_HOLIDAYS[monthDay] || FIXED_ANNIVERSARIES[monthDay];
  }, [todayStr, holidays]);

  const selectedMemos = selectedDate ? (memos[selectedDate] || []) : [];

  const focusViewStyle = {
    opacity: focusAnim,
    transform: [{ scale: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }]
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <CalendarHeader viewDate={viewDate} onChangeMonth={changeMonth} />

      <View style={styles.weekDaysRow}>
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <View key={d} style={styles.weekDayCell}>
            <Text style={[styles.weekDayText, i === 0 && { color: '#E8735A' }, i === 6 && { color: '#5A8FE8' }]}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={styles.mainArea}>
        <PanGestureHandler onHandlerStateChange={onGestureEvent} activeOffsetX={[-30, 30]}>
          <Animated.View style={[{ flex: 1 }, { transform: [{ translateX }], opacity }]}>
            {selectedDate && selectedWeekIndex !== -1 ? (
              <Animated.View style={[styles.focusContainer, focusViewStyle]}>
                <WeekRow 
                  week={weeks[selectedWeekIndex]} wi={selectedWeekIndex} viewDate={viewDate} 
                  selectedDate={selectedDate} todayStr={todayStr} memos={memos} holidays={holidays} 
                  onDatePress={onDatePress} isFocusView 
                />
                <View style={styles.focusMemoArea}>
                  <View style={styles.memoPanelHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                        <Text style={styles.memoPanelDate}>
                          {(() => {
                            const [y, m, d] = selectedDate.split('-');
                            return `${parseInt(m)}월 ${parseInt(d)}일`;
                          })()}
                        </Text>
                        {(() => {
                          const [y, m, d] = selectedDate.split('-');
                          const monthDay = `${m}-${d}`;
                          const hName = holidays[selectedDate] || getLunarHoliday(new Date(selectedDate)) || OFFLINE_HOLIDAYS[monthDay] || FIXED_ANNIVERSARIES[monthDay];
                          return hName ? <Text style={styles.memoPanelHoliday}>{hName}</Text> : null;
                        })()}
                      </View>
                      <Text style={styles.memoPanelCount}>{selectedMemos.length > 0 ? `일정 ${selectedMemos.length}개` : '일정 없음'}</Text>
                    </View>
                    {!modalVisible && (
                      <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
                        <Ionicons name="add" size={22} color="#8A8A8A" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {modalVisible && (
                    <MemoForm 
                      newTitle={newTitle} setNewTitle={setNewTitle} newContent={newContent} 
                      setNewContent={setNewContent} onCancel={() => setModalVisible(false)} 
                      onSave={saveMemo} editingId={editingId} 
                    />
                  )}

                  <ScrollView style={styles.memoList} showsVerticalScrollIndicator={false}>
                    {selectedMemos.length === 0 ? (
                      <View style={styles.emptyState}><Text style={styles.emptyText}>+ 버튼으로 일정을 추가하세요</Text></View>
                    ) : (
                      selectedMemos.map((item, idx) => (
                        <DraggableMemoItem 
                          key={item.id} item={item} index={idx} totalCount={selectedMemos.length} 
                          itemHeights={itemHeights} onDelete={deleteMemo} onEdit={openEditModal} onReorder={reorderMemos} 
                        />
                      ))
                    )}
                    <View style={{ height: 20 }} />
                  </ScrollView>
                </View>
                {selectedWeekIndex < 5 ? (
                  <WeekRow 
                    week={weeks[selectedWeekIndex + 1]} wi={selectedWeekIndex + 1} viewDate={viewDate} 
                    selectedDate={selectedDate} todayStr={todayStr} memos={memos} holidays={holidays} 
                    onDatePress={onDatePress} isFocusView 
                  />
                ) : (
                  <View style={[styles.weekRow, styles.focusWeekHeight, { backgroundColor: '#FAFAFA' }]} />
                )}
              </Animated.View>
            ) : (
              <View style={styles.calendarGrid}>
                {weeks.map((week, wi) => (
                  <WeekRow 
                    key={wi} week={week} wi={wi} viewDate={viewDate} 
                    selectedDate={selectedDate} todayStr={todayStr} memos={memos} holidays={holidays} 
                    onDatePress={onDatePress} 
                  />
                ))}
              </View>
            )}
          </Animated.View>
        </PanGestureHandler>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  weekDaysRow: { height: WEEKDAY_HEIGHT, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  weekDayCell: { width: CELL_WIDTH, alignItems: 'center', justifyContent: 'center' },
  weekDayText: { fontSize: 10, fontWeight: '700', color: '#8A8A8A', letterSpacing: 1.5 },
  mainArea: { flex: 1 },
  calendarGrid: { flex: 1 },
  weekRow: { flexDirection: 'row' },
  focusContainer: { flex: 1 },
  focusWeekHeight: { height: 75 },
  focusMemoArea: { flex: 1, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F0F0F0' },
  memoPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 7, paddingBottom: 7, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  memoPanelDate: { fontSize: 18, fontWeight: '800', color: '#000000' },
  memoPanelHoliday: { fontSize: 10, fontWeight: '600', color: '#E8735A' },
  memoPanelCount: { fontSize: 11, color: '#8A8A8A', marginTop: 2, letterSpacing: 1 },
  addBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  memoList: { paddingHorizontal: 20, paddingTop: 8 },
  emptyState: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { color: '#BBBBBB', fontSize: 13, letterSpacing: 0.5 },
});
