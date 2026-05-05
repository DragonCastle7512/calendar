import React from 'react';
import { InteractionManager, Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { FIXED_ANNIVERSARIES, OFFLINE_HOLIDAYS } from '../constants/calendar';
import { MemosState } from '../types/calendar';
import { getDateKey } from '../utils/date';
import { getLunarHoliday } from '../utils/holiday';
import { MemoWidget } from '../widgets/MemoWidget';

interface WidgetUpdateData {
  memos: MemosState;
  fontSizeIndex: number;
  alignment: 'top' | 'center';
  showHolidays: boolean;
  showOtherMonths: boolean;
  viewDate: Date;
  holidays: { [key: string]: string };
}

export const triggerWidgetUpdate = async (data: WidgetUpdateData) => {
  if (Platform.OS !== 'android') return;

  InteractionManager.runAfterInteractions(() => {
    setTimeout(async () => {
      try {
        const { memos, fontSizeIndex, alignment, showHolidays, showOtherMonths, viewDate, holidays } = data;
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const todayStr = getDateKey(new Date());

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
          renderWidget: (widgetInfo) => (
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
              showHolidays={showHolidays}
              showOtherMonths={showOtherMonths}
              widgetHeight={widgetInfo.height}
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
