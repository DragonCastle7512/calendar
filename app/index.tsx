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
  APP_ALIGNMENT_KEY,
  APP_FONT_SIZE_KEY,
  CELL_WIDTH,
  FIXED_ANNIVERSARIES,
  HOLIDAY_CACHE_KEY,
  MEMO_COLORS,
  MEMO_STORAGE_KEY,
  OFFLINE_HOLIDAYS,
  PROXY_TOKEN,
  PROXY_URL,
  WEEKDAY_HEIGHT,
  WIDGET_ALIGNMENT_KEY,
  WIDGET_FONT_SIZE_KEY
} from '../src/constants/calendar';
import { MemoEntry, MemosState, RepeatType } from '../src/types/calendar';
import { getDateKey } from '../src/utils/date';
import { getLunarHoliday } from '../src/utils/holiday';

import { SettingsModal } from '@/src/components/SettingsModal';
import { MemoWidget } from '@/src/widgets/MemoWidget';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { requestWidgetUpdate } from 'react-native-android-widget';

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
  const [selectedColor, setSelectedColor] = useState(MEMO_COLORS[0]);
  const [repeat, setRepeat] = useState<RepeatType>('none');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isSettingsFromWidget, setIsSettingsFromWidget] = useState(false);
  
  // 위젯 설정 상태
  const [widgetFontSizeIndex, setWidgetFontSizeIndex] = useState(1);
  const [widgetAlignment, setWidgetAlignment] = useState<'top' | 'center'>('top');

  // 앱 설정 상태
  const [appFontSizeIndex, setAppFontSizeIndex] = useState(1);
  const [appAlignment, setAppAlignment] = useState<'top' | 'center'>('top');
  
  // 위젯 전용 상태
  const [widgetSelectedDate, setWidgetSelectedDate] = useState<string | null>(null);
  const [widgetViewDateState, setWidgetViewDateState] = useState(new Date());

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const focusAnim = useRef(new Animated.Value(0)).current;
  const itemHeights = useRef<number[]>([]);
  const syncedYears = useRef<Set<number>>(new Set());
  const lastBackPressed = useRef<number>(0);
  const appState = useRef(AppState.currentState);

  const triggerWidgetUpdate = async (
    latestMemos?: MemosState,
    latestFontSize?: number,
    latestAlignment?: 'top' | 'center',
    latestWidgetDate?: Date,
    force: boolean = false
  ) => {
    if (Platform.OS !== 'android') return;
    
    InteractionManager.runAfterInteractions(() => {
      setTimeout(async () => {
        try {
          const widgetViewDate = latestWidgetDate || widgetViewDateState;
          const year = widgetViewDate.getFullYear();
          const month = widgetViewDate.getMonth();
          const todayStr = getDateKey(new Date());

          const targetMemos = latestMemos || memos;
          const targetFontSize = latestFontSize !== undefined ? latestFontSize : widgetFontSizeIndex;
          const targetAlignment = latestAlignment !== undefined ? latestAlignment : widgetAlignment;

          const firstDay = new Date(year, month, 1).getDay();
          const lastDate = new Date(year, month + 1, 0).getDate();
          const prevMonthLastDate = new Date(year, month, 0).getDate();
          const days: Date[] = [];
          for (let i = firstDay - 1; i >= 0; i--) days.push(new Date(year, month - 1, prevMonthLastDate - i));
          for (let i = 1; i <= lastDate; i++) days.push(new Date(year, month, i));
          while (days.length < 42) days.push(new Date(year, month + 1, days.length - lastDate - firstDay + 1));
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
                memos={targetMemos} 
                todayStr={todayStr} 
                holidays={widgetHolidays} 
                anniversaries={widgetAnniversaries} 
                renderTime={Date.now()}
                fontSizeIndex={targetFontSize}
                alignment={targetAlignment}
              />
            ),
            widgetNotFound: () => {}
          });
          
        } catch (e) {
          console.log('[DEBUG] Widget Update Error:', e);
        }
      }, 50);
    });
  };

  // 딥링크 파라미터 처리
  useEffect(() => {
    const urlDate = params.date as string;
    const urlSource = params.source as string;

    if (urlSource === 'settings' || params.settings === 'true') {
      setIsSettingsFromWidget(true);
      setSettingsVisible(true);
      InteractionManager.runAfterInteractions(() => {
        router.setParams({ source: undefined, settings: undefined });
      });
    } else if (urlDate) {
      const targetDate = new Date(urlDate);
      if (!isNaN(targetDate.getTime())) {
        InteractionManager.runAfterInteractions(() => {
          setViewDate(targetDate);
          if (urlSource === 'widget') {
            setWidgetSelectedDate(urlDate);
            setSelectedDate(null);
            setWidgetViewDateState(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1));
          } else {
            setSelectedDate(urlDate);
            setWidgetSelectedDate(null);
          }
          setModalVisible(false);
          router.setParams({ date: undefined, source: undefined });
        });
      }
    }
  }, [params.date, params.source, params.settings]);

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
        if (isSettingsFromWidget) {
          BackHandler.exitApp();
        } else {
          setSettingsVisible(false);
        }
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
  }, [selectedDate, modalVisible, widgetSelectedDate, settingsVisible, isSettingsFromWidget]);

  const loadMemos = async () => {
    try {
      const [
        savedMemos, 
        savedWidgetFontSize, 
        savedWidgetAlignment,
        savedAppFontSize,
        savedAppAlignment,
        savedWidgetDate
      ] = await Promise.all([
        AsyncStorage.getItem(MEMO_STORAGE_KEY),
        AsyncStorage.getItem(WIDGET_FONT_SIZE_KEY),
        AsyncStorage.getItem(WIDGET_ALIGNMENT_KEY),
        AsyncStorage.getItem(APP_FONT_SIZE_KEY),
        AsyncStorage.getItem(APP_ALIGNMENT_KEY),
        AsyncStorage.getItem('@widget_view_date')
      ]);
      if (savedMemos) setMemos(JSON.parse(savedMemos));
      if (savedWidgetFontSize) setWidgetFontSizeIndex(parseInt(savedWidgetFontSize, 10));
      if (savedWidgetAlignment) setWidgetAlignment(savedWidgetAlignment as 'top' | 'center');
      if (savedAppFontSize) setAppFontSizeIndex(parseInt(savedAppFontSize, 10));
      if (savedAppAlignment) setAppAlignment(savedAppAlignment as 'top' | 'center');
      if (savedWidgetDate) setWidgetViewDateState(new Date(savedWidgetDate));
    } catch (e) {}
  };

  const updateSettings = async (index: number, align: 'top' | 'center') => {
    if (isSettingsFromWidget) {
      setWidgetFontSizeIndex(index);
      setWidgetAlignment(align);
      await Promise.all([
        AsyncStorage.setItem(WIDGET_FONT_SIZE_KEY, index.toString()),
        AsyncStorage.setItem(WIDGET_ALIGNMENT_KEY, align)
      ]);
      triggerWidgetUpdate(memos, index, align, undefined, true);
      setTimeout(() => {
        BackHandler.exitApp();
      }, 200);
    } else {
      setAppFontSizeIndex(index);
      setAppAlignment(align);
      await Promise.all([
        AsyncStorage.setItem(APP_FONT_SIZE_KEY, index.toString()),
        AsyncStorage.setItem(APP_ALIGNMENT_KEY, align)
      ]);
      setSettingsVisible(false);
    }
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
    const randomColor = MEMO_COLORS[Math.floor(Math.random() * MEMO_COLORS.length)];
    setEditingId(null); setNewTitle(''); setNewContent(''); setSelectedColor(randomColor); setRepeat('none'); setModalVisible(true);
  };
  const openEditModal = (item: MemoEntry) => {
    setEditingId(item.id); setNewTitle(item.title); setNewContent(item.content); setSelectedColor(item.color); setRepeat(item.repeat || 'none'); setModalVisible(true);
  };

  const updateMemoColor = async (id: string, color: string) => {
    const target = widgetSelectedDate || selectedDate;
    if (!target) return;
    const updated = { ...memos };
    
    const currentMemo = updated[target]?.find(m => m.id === id);
    const groupId = currentMemo?.repeatGroupId;

    if (groupId) {
      Object.keys(updated).forEach(date => {
        updated[date] = updated[date].map(m => 
          m.repeatGroupId === groupId ? { ...m, color } : m
        );
      });
    } else if (updated[target]) {
      updated[target] = updated[target].map(m => m.id === id ? { ...m, color } : m);
    }
    
    setMemos(updated);
    await AsyncStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(updated));
    triggerWidgetUpdate(updated);
  };

  const saveMemo = async () => {
    const target = widgetSelectedDate || selectedDate;
    if (!newTitle.trim() || !target) return;
    const updated = { ...memos };
    
    if (editingId) {
      const currentMemo = updated[target]?.find(m => m.id === editingId);
      const oldRepeat = currentMemo?.repeat || 'none';
      const oldGroupId = currentMemo?.repeatGroupId;

      if (oldRepeat !== 'none' && oldGroupId && repeat === 'none') {
        Object.keys(updated).forEach(date => {
          updated[date] = updated[date].filter(m => m.repeatGroupId !== oldGroupId || (date === target && m.id === editingId));
          if (updated[date].length === 0) delete updated[date];
        });
      }

      if (oldRepeat === 'none' && repeat !== 'none') {
        const repeatGroupId = `group_${Date.now()}`;
        const startDate = new Date(target);
        const limit = repeat === 'weekly' ? 104 : repeat === 'monthly' ? 24 : 10;
        
        for (let i = 0; i < limit; i++) {
          const d = new Date(startDate);
          if (repeat === 'weekly') d.setDate(startDate.getDate() + i * 7);
          else if (repeat === 'monthly') d.setMonth(startDate.getMonth() + i);
          else if (repeat === 'yearly') d.setFullYear(startDate.getFullYear() + i);
          
          const dKey = getDateKey(d);
          if (i === 0) {
            updated[target] = (updated[target] || []).map(m => 
              m.id === editingId ? { ...m, title: newTitle, content: newContent, color: selectedColor, repeat, repeatGroupId } : m
            );
          } else {
            const newMemo: MemoEntry = { 
              id: `${Date.now()}_${i}`, 
              title: newTitle, 
              content: newContent, 
              color: selectedColor, 
              repeat, 
              repeatGroupId 
            };
            updated[dKey] = [...(updated[dKey] || []), newMemo];
          }
        }
      } else if (oldRepeat !== 'none' && repeat !== 'none' && oldGroupId) {
        Object.keys(updated).forEach(date => {
          updated[date] = updated[date].map(m => 
            m.repeatGroupId === oldGroupId ? { ...m, title: newTitle, content: newContent, color: selectedColor, repeat } : m
          );
        });
      } else {
        updated[target] = (updated[target] || []).map(m => 
          m.id === editingId ? { ...m, title: newTitle, content: newContent, color: selectedColor, repeat } : m
        );
      }
    } else {
      const repeatGroupId = repeat !== 'none' ? `group_${Date.now()}` : undefined;
      
      if (repeat === 'none') {
        updated[target] = [...(updated[target] || []), { id: Date.now().toString(), title: newTitle, content: newContent, color: selectedColor, repeat: 'none' }];
      } else {
        const startDate = new Date(target);
        const limit = repeat === 'weekly' ? 104 : repeat === 'monthly' ? 24 : 10;
        for (let i = 0; i < limit; i++) {
          const d = new Date(startDate);
          if (repeat === 'weekly') d.setDate(startDate.getDate() + i * 7);
          else if (repeat === 'monthly') d.setMonth(startDate.getMonth() + i);
          else if (repeat === 'yearly') d.setFullYear(startDate.getFullYear() + i);
          
          const dKey = getDateKey(d);
          const newMemo: MemoEntry = { 
            id: `${Date.now()}_${i}`, 
            title: newTitle, 
            content: newContent, 
            color: selectedColor, 
            repeat, 
            repeatGroupId 
          };
          updated[dKey] = [...(updated[dKey] || []), newMemo];
        }
      }
    }
    setMemos(updated);
    await AsyncStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(updated));
    triggerWidgetUpdate(updated);
    setModalVisible(false); setNewTitle(''); setNewContent(''); setSelectedColor(MEMO_COLORS[0]); setRepeat('none'); setEditingId(null);
  };

  const performDelete = async (date: string, id: string) => {
    const updated = { ...memos };
    if (updated[date]) {
      updated[date] = updated[date].filter(m => m.id !== id);
      if (updated[date].length === 0) delete updated[date];
      setMemos(updated);
      await AsyncStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(updated));
      triggerWidgetUpdate(updated);
    }
  };

  const performDeleteAll = async (groupId: string) => {
    const updated = { ...memos };
    Object.keys(updated).forEach(date => {
      updated[date] = updated[date].filter(m => m.repeatGroupId !== groupId);
      if (updated[date].length === 0) delete updated[date];
    });
    setMemos(updated);
    await AsyncStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(updated));
    triggerWidgetUpdate(updated);
  };

  const deleteMemo = async (id: string) => {
    const target = widgetSelectedDate || selectedDate;
    if (!target) return;
    
    const memoToDelete = memos[target]?.find(m => m.id === id);
    if (memoToDelete?.repeatGroupId) {
      performDeleteAll(memoToDelete.repeatGroupId!);
    } else {
      performDelete(target, id);
    }
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
    while (days.length < 42) days.push(new Date(year, month + 1, days.length - lastDate - firstDay + 1));
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

  const showCalendar = !widgetSelectedDate && (!settingsVisible || !isSettingsFromWidget);

  return (
    <SafeAreaView 
      style={[
        styles.container, 
        (widgetSelectedDate || (settingsVisible && isSettingsFromWidget)) 
          ? { backgroundColor: 'rgba(0,0,0,0)' } 
          : { backgroundColor: '#FFFFFF' }
      ]} 
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {showCalendar && (
        <>
          <CalendarHeader 
            viewDate={viewDate} 
            onChangeMonth={changeMonth} 
            onOpenSettings={() => {
              setIsSettingsFromWidget(false);
              setSettingsVisible(true);
            }}
          />
          <View style={styles.weekDaysRow}>
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <View key={d} style={styles.weekDayCell}><Text style={[styles.weekDayText, i === 0 && { color: '#E8735A' }, i === 6 && { color: '#5A8FE8' }]}>{d}</Text></View>
            ))}
          </View>
        </>
      )}

      <View style={styles.mainArea}>
        {showCalendar && (
          <PanGestureHandler onHandlerStateChange={onGestureEvent} activeOffsetX={[-30, 30]}>
            <Animated.View style={[{ flex: 1 }, { transform: [{ translateX }], opacity }]}>
              {selectedDate && selectedWeekIndex !== -1 ? (
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
                    fontSizeIndex={appFontSizeIndex} // 앱 폰트 크기 적용
                    alignment={appAlignment} // 앱 배치 적용
                  />
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
                    {modalVisible && (
                      <MemoForm 
                        newTitle={newTitle} 
                        setNewTitle={setNewTitle} 
                        newContent={newContent} 
                        setNewContent={setNewContent} 
                        color={selectedColor}
                        repeat={repeat}
                        setRepeat={setRepeat}
                        onCancel={() => setModalVisible(false)} 
                        onSave={saveMemo} 
                        editingId={editingId} 
                      />
                    )}
                    <ScrollView style={styles.memoList} showsVerticalScrollIndicator={false}>
                      {selectedMemos.length === 0 ? (
                        <View style={styles.emptyState}>
                          <Text style={styles.emptyText}>+ 버튼으로 일정을 추가하세요</Text>
                        </View>
                      ) : (
                        selectedMemos.map((item, idx) => (
                          <DraggableMemoItem
                            key={item.id} 
                            item={item} 
                            index={idx} 
                            totalCount={selectedMemos.length} 
                            itemHeights={itemHeights}
                            onDelete={deleteMemo} 
                            onEdit={openEditModal} 
                            onReorder={reorderMemos} 
                            onUpdateColor={updateMemoColor}
                          />
                        ))
                      )}
                    </ScrollView>
                  </View>
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
                      fontSizeIndex={appFontSizeIndex}
                      alignment={appAlignment}
                    />
                  ) : <View style={[styles.weekRow, { height: 75, backgroundColor: '#FAFAFA' }]} />}
                </Animated.View>
              ) : (
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
                      fontSizeIndex={appFontSizeIndex}
                      alignment={appAlignment}
                    />
                  ))}
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
            onUpdateColor={updateMemoColor}
            onDateSelect={(date) => setWidgetSelectedDate(date)}
            itemHeights={itemHeights}
            modalVisible={modalVisible}
            newTitle={newTitle}
            setNewTitle={setNewTitle}
            newContent={newContent}
            setNewContent={setNewContent}
            color={selectedColor}
            repeat={repeat}
            setRepeat={setRepeat}
            onSave={saveMemo}
            onCancel={() => setModalVisible(false)}
            editingId={editingId}
          />
        )}
        {settingsVisible && (
          <SettingsModal
            visible={settingsVisible}
            onClose={() => setSettingsVisible(false)}
            fontSizeIndex={isSettingsFromWidget ? widgetFontSizeIndex : appFontSizeIndex}
            alignment={isSettingsFromWidget ? widgetAlignment : appAlignment}
            onSave={updateSettings}
            isFromWidget={isSettingsFromWidget}
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
