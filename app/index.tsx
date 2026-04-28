import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  BackHandler,
  Dimensions,
  InteractionManager,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarHeader } from '../src/components/CalendarHeader';
import { DraggableMemoItem } from '../src/components/DraggableMemoItem';
import { MemoForm } from '../src/components/MemoForm';
import { WeekRow } from '../src/components/WeekRow';
import { WidgetModal } from '../src/components/WidgetModal';
import {
  CELL_WIDTH,
  FIXED_ANNIVERSARIES,
  HOLIDAY_CACHE_KEY,
  MEMO_COLORS,
  MEMO_STORAGE_KEY,
  OFFLINE_HOLIDAYS,
  PROXY_TOKEN,
  PROXY_URL,
  WEEKDAY_HEIGHT,
  WIDGET_FONT_SIZE_KEY,
  WIDGET_ALIGNMENT_KEY
} from '../src/constants/calendar';
import { MemoEntry, MemosState } from '../src/types/calendar';
import { getDateKey } from '../src/utils/date';
import { getLunarHoliday } from '../src/utils/holiday';

import { SettingsModal } from '@/src/components/SettingsModal';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { MemoWidget } from '../src/widgets/MemoWidget';

// 시스템 루트 뷰 배경 투명화
if (Platform.OS === 'android') {
  SystemUI.setBackgroundColorAsync('rgba(0,0,0,0)');
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CalendarMemoApp() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [memos, setMemos] = useState<MemosState>({});
  const [holidays, setHolidays] = useState<{ [date: string]: string }>({});
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(1);
  const [alignment, setAlignment] = useState<'top' | 'center'>('top');
  
  // 위젯 전용 상태
  const [widgetSelectedDate, setWidgetSelectedDate] = useState<string | null>(null);

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const focusAnim = useRef(new Animated.Value(0)).current;
  const itemHeights = useRef<number[]>([]);
  const syncedYears = useRef<Set<number>>(new Set());
  const lastBackPressed = useRef<number>(0);
  const appState = useRef(AppState.currentState);

  // 위젯 업데이트 통합 함수
  const triggerWidgetUpdate = async () => {
    if (Platform.OS !== 'android') return;
    try {
      const savedWidgetDate = await AsyncStorage.getItem('@widget_view_date');
      const widgetViewDate = savedWidgetDate ? new Date(savedWidgetDate) : new Date();
      const year = widgetViewDate.getFullYear();
      const month = widgetViewDate.getMonth();
      const todayStr = getDateKey(new Date());

      const firstDay = new Date(year, month, 1).getDay();
      const lastDate = new Date(year, month + 1, 0).getDate();
      const prevMonthLastDate = new Date(year, month, 0).getDate();
      const days: Date[] = [];
      for (let i = firstDay - 1; i >= 0; i--) days.push(new Date(year, month - 1, prevMonthLastDate - i));
      for (let i = 1; i <= lastDate; i++) days.push(new Date(year, month, i));
      while (days.length < 42) days.push(new Date(year, month + 1, days.length - lastDate - firstDay + 2));
      const rows: Date[][] = [];
      for (let i = 0; i < 42; i += 7) rows.push(days.slice(i, i + 7));

      const widgetHolidays: { [key: string]: string } = {};
      const widgetAnniversaries: { [key: string]: string } = {};
      days.forEach(d => {
        const dKey = getDateKey(d);
        const mDay = dKey.slice(5);
        const hName = holidays[dKey] || getLunarHoliday(d) || OFFLINE_HOLIDAYS[mDay];
        if (hName) widgetHolidays[dKey] = hName;
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
            renderTime={Date.now()}
            fontSizeIndex={fontSizeIndex}
            alignment={alignment}
          />
        ),
        widgetNotFound: () => {}
      });
    } catch (e) {}
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        triggerWidgetUpdate();
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [memos, holidays, fontSizeIndex, alignment]);

  // 딥링크 파라미터 처리
  useEffect(() => {
    const urlDate = params.date as string;
    const urlSource = params.source as string;

    if (urlSource === 'settings' || params.settings === 'true') {
      setSettingsVisible(true);
      InteractionManager.runAfterInteractions(() => {
        router.setParams({ source: undefined, settings: undefined });
      });
    } else if (urlDate) {
      const targetDate = new Date(urlDate);
      if (!isNaN(targetDate.getTime())) {
        InteractionManager.runAfterInteractions(() => {
          console.log(`[DeepLink] Applying state for date: ${urlDate}`);
          setViewDate(targetDate);
          if (urlSource === 'widget') {
            setWidgetSelectedDate(urlDate);
            setSelectedDate(null);
          } else {
            setSelectedDate(urlDate);
            setWidgetSelectedDate(null);
          }
          setModalVisible(false);

          // 파라미터 제거하여 무한 루프 방지
          console.log(`[DeepLink] Clearing params`);
          router.setParams({ date: undefined, source: undefined });
        });
      }
    }
  }, [params.date, params.source]);

  useEffect(() => { 
    loadMemos();
    const currentYear = viewDate.getFullYear();
    syncHolidays(currentYear - 1);
    syncHolidays(currentYear);
    syncHolidays(currentYear + 1);
  }, [viewDate.getFullYear()]);

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
      if (settingsVisible) {
        setSettingsVisible(false);
        return true;
      }
      if (widgetSelectedDate) {
        if (modalVisible) {
          setModalVisible(false);
          return true;
        }
        setWidgetSelectedDate(null);
        BackHandler.exitApp(); 
        return true;
      }
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
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selectedDate, modalVisible, widgetSelectedDate, settingsVisible]);

  const loadMemos = async () => {
    try {
      const [savedMemos, savedFontSize, savedAlignment] = await Promise.all([
        AsyncStorage.getItem(MEMO_STORAGE_KEY),
        AsyncStorage.getItem(WIDGET_FONT_SIZE_KEY),
        AsyncStorage.getItem(WIDGET_ALIGNMENT_KEY)
      ]);
      if (savedMemos) setMemos(JSON.parse(savedMemos));
      if (savedFontSize) setFontSizeIndex(parseInt(savedFontSize, 10));
      if (savedAlignment) setAlignment(savedAlignment as 'top' | 'center');
    } catch (e) {}
  };

  const updateSettings = async (index: number, align: 'top' | 'center') => {
    setFontSizeIndex(index);
    setAlignment(align);
    await Promise.all([
      AsyncStorage.setItem(WIDGET_FONT_SIZE_KEY, index.toString()),
      AsyncStorage.setItem(WIDGET_ALIGNMENT_KEY, align)
    ]);
    setSettingsVisible(false);
    // 상태가 업데이트된 후 위젯 업데이트를 트리거하기 위해 InteractionManager 사용 또는 직접 호출
    InteractionManager.runAfterInteractions(() => {
      triggerWidgetUpdate();
    });
  };

  const syncHolidays = async (year: number) => {
    if (syncedYears.current.has(year)) return;
    syncedYears.current.add(year);
    const cacheKey = `${HOLIDAY_CACHE_KEY}${year}`;
    try {
      const saved = await AsyncStorage.getItem(cacheKey);
      if (saved) {
        const { data } = JSON.parse(saved);
        if (data) {
          setHolidays(prev => ({ ...prev, ...data }));
          return;
        }
      }
      if (!PROXY_URL) return;
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
            if (item.isHoliday === 'Y') {
              const strDate = String(item.locdate);
              const formattedDate = `${strDate.slice(0, 4)}-${strDate.slice(4, 6)}-${strDate.slice(6, 8)}`;
              holidayMap[formattedDate] = item.dateName;
            }
          });
        }
        setHolidays(prev => ({ ...prev, ...holidayMap }));
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: holidayMap, timestamp: Date.now() }));
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
    const target = widgetSelectedDate || selectedDate;
    if (!newTitle.trim() || !target) return;
    const updated = { ...memos };
    const dateMemos = updated[target] || [];
    if (editingId) {
      updated[target] = dateMemos.map(m => m.id === editingId ? { ...m, title: newTitle, content: newContent } : m);
    } else {
      const colorIdx = dateMemos.length % MEMO_COLORS.length;
      updated[target] = [...dateMemos, { id: Date.now().toString(), title: newTitle, content: newContent, color: MEMO_COLORS[colorIdx] }];
    }
    setMemos(updated);
    await AsyncStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(updated));
    setModalVisible(false); setNewTitle(''); setNewContent(''); setEditingId(null);
  };

  const deleteMemo = async (id: string) => {
    const target = widgetSelectedDate || selectedDate;
    if (!target) return;
    const updated = { ...memos };
    updated[target] = updated[target].filter(m => m.id !== id);
    if (updated[target].length === 0) delete updated[target];
    setMemos(updated);
    await AsyncStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(updated));
  };

  const reorderMemos = async (from: number, to: number) => {
    const target = widgetSelectedDate || selectedDate;
    if (!target || from === to) return;
    const dateMemos = [...(memos[target] || [])];
    const [movedItem] = dateMemos.splice(from, 1);
    dateMemos.splice(to, 0, movedItem);
    const updated = { ...memos, [target]: dateMemos };
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
    while (days.length < 42) days.push(new Date(year, month + 1, days.length - lastDate - firstDay + 2));
    const rows: Date[][] = [];
    for (let i = 0; i < 42; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [viewDate]);

  const onDatePress = (date: Date) => {
    const dateStr = getDateKey(date);
    setSelectedDate(prev => prev === dateStr ? null : dateStr);
    setWidgetSelectedDate(null);
    setModalVisible(false);
  };

  const changeMonth = (offset: number) => {
    const targetX = offset > 0 ? -SCREEN_WIDTH * 0.3 : SCREEN_WIDTH * 0.3;
    Animated.parallel([
      Animated.timing(translateX, { toValue: targetX, duration: 150, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true })
    ]).start(() => {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
      setSelectedDate(null);
      setWidgetSelectedDate(null);
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
  const targetForMemos = widgetSelectedDate || selectedDate || '';
  const selectedMemos = targetForMemos ? (memos[targetForMemos] || []) : [];

  return (
    <SafeAreaView style={[styles.container, widgetSelectedDate ? { backgroundColor: 'rgba(0,0,0,0)' } : { backgroundColor: '#FFFFFF' }]} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {!widgetSelectedDate && !settingsVisible && (
        <>
          <CalendarHeader viewDate={viewDate} onChangeMonth={changeMonth} />
          <View style={styles.weekDaysRow}>
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <View key={d} style={styles.weekDayCell}><Text style={[styles.weekDayText, i === 0 && { color: '#E8735A' }, i === 6 && { color: '#5A8FE8' }]}>{d}</Text></View>
            ))}
          </View>
        </>
      )}

      <View style={styles.mainArea}>
        {!widgetSelectedDate && !settingsVisible && (
          <PanGestureHandler onHandlerStateChange={onGestureEvent} activeOffsetX={[-30, 30]}>
            <Animated.View style={[{ flex: 1 }, { transform: [{ translateX }], opacity }]}>
              {selectedDate && selectedWeekIndex !== -1 ? (
                <Animated.View style={[styles.focusContainer, { opacity: focusAnim }]}>
                  <WeekRow week={weeks[selectedWeekIndex]} wi={selectedWeekIndex} viewDate={viewDate} selectedDate={selectedDate} todayStr={todayStr} memos={memos} holidays={holidays} onDatePress={onDatePress} isFocusView />
                  <View style={styles.focusMemoArea}>
                    <View style={styles.memoPanelHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap:3 }}>
                          <Text style={styles.memoPanelDate}>{(() => { 
                            const [y, m, d] = selectedDate.split('-');
                            return `${parseInt(m)}월 ${parseInt(d)}일`; })()}</Text>
                          <Text style={styles.memoPanelHoliday}>{(() => {
                            const [y, m, d] = selectedDate.split('-');
                            const monthDay = `${m}-${d}`;
                            const hName = holidays[selectedDate] || getLunarHoliday(new Date(selectedDate)) || OFFLINE_HOLIDAYS[monthDay] || FIXED_ANNIVERSARIES[monthDay];
                            return hName;
                            })()}
                          </Text>
                        </View>
                        <Text style={styles.memoPanelCount}>{selectedMemos.length > 0 ? `일정 ${selectedMemos.length}개` : '일정 없음'}</Text>

                      </View>
                      {!modalVisible && <TouchableOpacity style={styles.addBtn} onPress={openAddModal}><Ionicons name="add" size={22} color="#8A8A8A" /></TouchableOpacity>}
                    </View>
                    {modalVisible && <MemoForm newTitle={newTitle} setNewTitle={setNewTitle} newContent={newContent} setNewContent={setNewContent} onCancel={() => setModalVisible(false)} onSave={saveMemo} editingId={editingId} />}
                    <ScrollView style={styles.memoList} showsVerticalScrollIndicator={false}>
                      {selectedMemos.length === 0 ? <View style={styles.emptyState}><Text style={styles.emptyText}>+ 버튼으로 일정을 추가하세요</Text></View> : selectedMemos.map((item, idx) => <DraggableMemoItem key={item.id} item={item} index={idx} totalCount={selectedMemos.length} itemHeights={itemHeights} onDelete={deleteMemo} onEdit={openEditModal} onReorder={reorderMemos} />)}
                    </ScrollView>
                  </View>
                  {selectedWeekIndex < 5 ? <WeekRow week={weeks[selectedWeekIndex + 1]} wi={selectedWeekIndex + 1} viewDate={viewDate} selectedDate={selectedDate} todayStr={todayStr} memos={memos} holidays={holidays} onDatePress={onDatePress} isFocusView /> : <View style={[styles.weekRow, { height: 75, backgroundColor: '#FAFAFA' }]} />}
                </Animated.View>
              ) : (
                <View style={styles.calendarGrid}>
                  {weeks.map((week, wi) => <WeekRow key={wi} week={week} wi={wi} viewDate={viewDate} selectedDate={selectedDate} todayStr={todayStr} memos={memos} holidays={holidays} onDatePress={onDatePress} />)}
                </View>
              )}
            </Animated.View>
          </PanGestureHandler>
        )}

        {widgetSelectedDate && (
          <WidgetModal
            visible={!!widgetSelectedDate}
            dateStr={widgetSelectedDate}
            memos={selectedMemos}
            allMemos={memos}
            holiday={(() => { const [y, m, d] = widgetSelectedDate.split('-'); const monthDay = `${m}-${d}`; return holidays[widgetSelectedDate] || getLunarHoliday(new Date(widgetSelectedDate)) || OFFLINE_HOLIDAYS[monthDay] || FIXED_ANNIVERSARIES[monthDay]; })() || undefined}
            holidays={holidays}
            onClose={() => setWidgetSelectedDate(null)}
            onAdd={openAddModal}
            onDelete={deleteMemo}
            onEdit={openEditModal}
            onReorder={reorderMemos}
            onDateSelect={(date) => setWidgetSelectedDate(date)}
            itemHeights={itemHeights}
            modalVisible={modalVisible}
            newTitle={newTitle}
            setNewTitle={setNewTitle}
            newContent={newContent}
            setNewContent={setNewContent}
            onSave={saveMemo}
            onCancel={() => setModalVisible(false)}
            editingId={editingId}
          />
        )}
        {settingsVisible && (
          <SettingsModal
            visible={settingsVisible}
            onClose={() => setSettingsVisible(false)}
            fontSizeIndex={fontSizeIndex}
            alignment={alignment}
            onSave={updateSettings}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  weekDaysRow: { height: WEEKDAY_HEIGHT, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', backgroundColor: '#FFFFFF' },
  weekDayCell: { width: CELL_WIDTH, alignItems: 'center', justifyContent: 'center' },
  weekDayText: { fontSize: 10, fontWeight: '700', color: '#8A8A8A', letterSpacing: 1.5 },
  mainArea: { flex: 1, position: 'relative' },
  calendarGrid: { flex: 1, backgroundColor: '#FFFFFF' },
  weekRow: { flexDirection: 'row' },
  focusContainer: { flex: 1 },
  focusWeekHeight: { height: 75 },
  focusMemoArea: { flex: 1, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F0F0F0' },
  memoPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 7, paddingBottom: 7, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  memoPanelDate: { fontSize: 18, fontWeight: '800', color: '#000000' },
  memoPanelHoliday: { fontSize: 10, fontWeight: '600', color: '#E8735A' },
  memoPanelCount: { fontSize: 11, color: '#8A8A8A', marginTop: 2 },
  addBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  memoList: { paddingHorizontal: 20, paddingTop: 8 },
  emptyState: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { color: '#BBBBBB', fontSize: 13 },
});
