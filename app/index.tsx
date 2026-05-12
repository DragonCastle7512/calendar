import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  View
} from 'react-native';
import { State } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarGrid } from '../src/components/CalendarGrid';
import { CalendarHeader } from '../src/components/CalendarHeader';
import { FocusView } from '../src/components/FocusView';
import { SettingsModal } from '../src/components/SettingsModal';
import { WeekDaysHeader } from '../src/components/WeekDaysHeader';
import { WidgetModal } from '../src/components/WidgetModal';

import { MEMO_COLORS } from '../src/constants/calendar';
import { MemoEntry, RepeatType } from '../src/types/calendar';
import { getDateKey } from '../src/utils/date';
import { triggerWidgetUpdate } from '../src/utils/widget';

import { useCalendarNavigation } from '../src/hooks/useCalendarNavigation';
import { useHolidays } from '../src/hooks/useHolidays';
import { useMemos } from '../src/hooks/useMemos';
import { useSettings } from '../src/hooks/useSettings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CalendarMemoApp() {
  // 1. Hooks & Basic State
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [widgetSelectedDate, setWidgetSelectedDate] = useState<string | null>(null);
  const [widgetViewDateState, setWidgetViewDateState] = useState(new Date());
  
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isSettingsFromWidget, setIsSettingsFromWidget] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(MEMO_COLORS[0]);
  const [repeat, setRepeat] = useState<RepeatType>('none');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [moveTargetDate, setMoveTargetDate] = useState<string | null>(null);

  const { appSettings, widgetSettings, loadSettings, updateAppSettings, updateWidgetSettings } = useSettings();
  const { holidays, syncHolidays } = useHolidays();
  
  const handleWidgetUpdate = useCallback((latestMemos: any) => {
    triggerWidgetUpdate({
      memos: latestMemos,
      settings: widgetSettings,
      viewDate: widgetViewDateState,
      holidays
    });
  }, [widgetSettings, widgetViewDateState, holidays]);

  const { memos, loadMemos, saveMemo, deleteMemo, moveMemo, updateMemoColor, reorderMemos } = useMemos(handleWidgetUpdate);

  useCalendarNavigation(
    { settingsVisible, isSettingsFromWidget, widgetSelectedDate, modalVisible, selectedDate },
    { setSettingsVisible, setIsSettingsFromWidget, setWidgetSelectedDate, setModalVisible, setSelectedDate, setViewDate, setWidgetViewDateState }
  );

  // 2. Animation & Refs
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const focusAnim = useRef(new Animated.Value(0)).current;
  const itemHeights = useRef<number[]>([]);

  // 3. Lifecycle
  useEffect(() => {
    loadSettings();
    loadMemos();
  }, []);

  useEffect(() => {
    const year = viewDate.getFullYear();
    syncHolidays(year);
    syncHolidays(year + 1);
    syncHolidays(year - 1);
  }, [viewDate.getFullYear()]);

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: selectedDate ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [selectedDate]);

  // 4. Handlers
  const changeMonth = useCallback((offset: number) => {
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
  }, [viewDate]);

  const onGestureEvent = useCallback((event: any) => {
    const { translationX, state } = event.nativeEvent;
    if (state === State.END) {
      if (translationX < -60) changeMonth(1);
      else if (translationX > 60) changeMonth(-1);
    }
  }, [changeMonth]);

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    if (isSettingsFromWidget) {
      await updateWidgetSettings(newSettings);
      triggerWidgetUpdate({
        memos, 
        settings: newSettings, 
        viewDate: widgetViewDateState, 
        holidays
      });
      setTimeout(() => require('react-native').BackHandler.exitApp(), 200);
    } else {
      await updateAppSettings(newSettings);
      setSettingsVisible(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null); setNewTitle(''); setNewContent(''); setSelectedColor(MEMO_COLORS[0]); setRepeat('none'); setMoveTargetDate(null); setModalVisible(true);
  };
  const openEditModal = (item: MemoEntry) => {
    setEditingId(item.id); setNewTitle(item.title); setNewContent(item.content); setSelectedColor(item.color); setRepeat(item.repeat || 'none'); setMoveTargetDate(null); setModalVisible(true);
  };

  const handleSaveMemo = async () => {
    const originalTarget = widgetSelectedDate || selectedDate;
    const finalTarget = moveTargetDate || originalTarget;
    
    if (finalTarget && originalTarget) {
      await saveMemo(finalTarget, editingId, { title: newTitle, content: newContent, color: selectedColor, repeat }, originalTarget);
      setModalVisible(false);
      setMoveTargetDate(null);
    }
  };

  // 5. Memos calculation
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
      style={[styles.container, (widgetSelectedDate || (settingsVisible && isSettingsFromWidget)) ? { backgroundColor: 'transparent' } : { backgroundColor: '#FFFFFF' }]} 
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {showCalendar && (
        <>
          <CalendarHeader viewDate={viewDate} onChangeMonth={changeMonth} onOpenSettings={() => { setIsSettingsFromWidget(false); setSettingsVisible(true); }} />
          <WeekDaysHeader />
        </>
      )}

      <View style={styles.mainArea}>
        {showCalendar && (
          selectedDate && selectedWeekIndex !== -1 ? (
            <FocusView 
              data={{ weeks, selectedWeekIndex, viewDate, selectedDate, todayStr, memos, holidays }}
              settings={appSettings}
              animation={{ focusAnim }}
              itemHeights={itemHeights}
              actions={{
                onDatePress: (d) => {
                  const dKey = getDateKey(d);
                  setSelectedDate(prev => prev === dKey ? null : dKey);
                },
                memoSectionProps: {
                  data: { selectedDate, selectedMemos, holidays },
                  form: { 
                    visible: modalVisible, 
                    title: newTitle, 
                    content: newContent, 
                    color: selectedColor, 
                    repeat, 
                    editingId,
                    currentDate: moveTargetDate || selectedDate
                  },
                  actions: {
                    setModalVisible, setNewTitle, setNewContent, setRepeat,
                    setMoveTargetDate,
                    openAddModal, openEditModal, saveMemo: handleSaveMemo, 
                    deleteMemo: (id: string) => deleteMemo(selectedDate, id), 
                    reorderMemos: (f: number, t: number) => reorderMemos(selectedDate, f, t), 
                    updateMemoColor: (id: string, c: string) => updateMemoColor(selectedDate, id, c)
                  }
                }
              }}
            />
          ) : (
            <CalendarGrid 
              data={{ weeks, viewDate, selectedDate, todayStr, memos, holidays }}
              settings={appSettings}
              animation={{ translateX, opacity }}
              actions={{ onDatePress: (d) => {
                  const dKey = getDateKey(d);
                  setSelectedDate(prev => prev === dKey ? null : dKey);
                }, onGestureEvent }}
            />
          )
        )}

        {widgetSelectedDate && (
          <WidgetModal
            visible={!!widgetSelectedDate}
            dateStr={widgetSelectedDate}
            memos={selectedMemos}
            allMemos={memos}
            holiday={holidays[widgetSelectedDate]}
            holidays={holidays}
            onClose={() => setWidgetSelectedDate(null)}
            onAdd={openAddModal}
            onDelete={(id) => deleteMemo(widgetSelectedDate, id)}
            onEdit={openEditModal}
            onReorder={(f, t) => reorderMemos(widgetSelectedDate, f, t)}
            onUpdateColor={(id, c) => updateMemoColor(widgetSelectedDate, id, c)}
            onDateSelect={setWidgetSelectedDate}
            itemHeights={itemHeights}
            modalVisible={modalVisible}
            newTitle={newTitle}
            setNewTitle={setNewTitle}
            newContent={newContent}
            setNewContent={setNewContent}
            color={selectedColor}
            repeat={repeat}
            setRepeat={setRepeat}
            onSave={handleSaveMemo}
            onCancel={() => setModalVisible(false)}
            editingId={editingId}
            moveTargetDate={moveTargetDate}
            setMoveTargetDate={setMoveTargetDate}
          />
        )}
        
        {settingsVisible && (
          <SettingsModal
            visible={settingsVisible}
            onClose={() => setSettingsVisible(false)}
            settings={isSettingsFromWidget ? widgetSettings : appSettings}
            onSave={handleUpdateSettings}
            isFromWidget={isSettingsFromWidget}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainArea: { flex: 1, position: 'relative' },
});
