"use no memo";

import React from 'react';
import { FlexWidget, IconWidget, TextWidget } from 'react-native-android-widget';
import { MemosState } from '../types/calendar';

interface MemoWidgetProps {
  year: number;
  month: number;
  days: Date[][];
  memos: MemosState;
  todayStr: string;
  holidays: { [key: string]: string };
  anniversaries: { [key: string]: string };
  renderTime: number;
  fontSizeIndex?: number;
  alignment?: 'top' | 'center';
}

export function MemoWidget({ 
  year, 
  month, 
  days, 
  memos = {},
  todayStr = '',
  holidays = {},
  anniversaries = {},
  renderTime,
  fontSizeIndex = 1,
  alignment = 'top'
}: MemoWidgetProps) {
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const alpha = '4D'; 

  // Font size scaling
  const scales = [0.85, 1, 1.15];
  const scale = scales[fontSizeIndex] || 1;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#ffffff',
        flexDirection: 'column',
      }}
    >
      <FlexWidget style={{ 
        flexDirection: 'row', 
        width: 'match_parent',
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingVertical: 8,
        borderBottomWidth: 1, 
        borderBottomColor: '#F0F0F0' 
      }}>
        <FlexWidget clickAction="OPEN_SETTINGS_APP" style={{ marginLeft: 10, padding: 6, backgroundColor: '#F0F4F8', borderRadius: 20 }}>
          <IconWidget font='material' icon="ic_settings" size={20} />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <FlexWidget clickAction="PREV_MONTH" style={{ paddingHorizontal: 15, paddingVertical: 5 }}>
            <TextWidget text="<" style={{ fontSize: 18, color: '#cacaca', fontWeight: 'bold' }} />
          </FlexWidget>
          <TextWidget 
            text={`${year}년 ${month + 1}월`} 
            style={{ fontSize: 15, fontWeight: 'bold', color: '#000000', marginHorizontal: 15 }} 
          />
          <FlexWidget clickAction="NEXT_MONTH" style={{ paddingHorizontal: 15, paddingVertical: 5 }}>
            <TextWidget text=">" style={{ fontSize: 18, color: '#cacaca', fontWeight: 'bold' }} />
          </FlexWidget>
        </FlexWidget>
        <FlexWidget style={{ width: 42 }} />
      </FlexWidget>

      <FlexWidget style={{ 
        flexDirection: 'row', 
        width: 'match_parent',
        backgroundColor: '#ffffff', 
        borderBottomWidth: 1, 
        borderBottomColor: '#F0F0F0' 
      }}>
        {weekDays.map((d, i) => (
          <FlexWidget key={i} style={{ flex: 1, width: 0, alignItems: 'center', paddingVertical: 4 }}>
            <TextWidget 
              text={d} 
              style={{ fontSize: 9 * scale, fontWeight: 'bold', color: i === 0 ? '#E8735A' : i === 6 ? '#5A8FE8' : '#8A8A8A' }} 
            />
          </FlexWidget>
        ))}
      </FlexWidget>

      <FlexWidget style={{ flex: 1, width: 'match_parent', flexDirection: 'column' }}>
        {days.map((week, wi) => (
          <FlexWidget key={wi} style={{ 
            flexDirection: 'row', 
            flex: 1, 
            width: 'match_parent',
            height: 'match_parent',
            borderBottomWidth: wi < 5 ? 1 : 0,
            borderBottomColor: '#F0F0F0'
          }}>
            {week.map((date, di) => {
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, '0');
              const d = String(date.getDate()).padStart(2, '0');
              const dateKey = `${y}-${m}-${d}`;
              const monthDay = dateKey.slice(5);
              
              const isToday = dateKey === todayStr;
              const isCurrentMonth = date.getMonth() === month;
              const holidayName = holidays[dateKey];
              const anniversaryName = anniversaries[dateKey];
              const dayMemos = memos[dateKey] || [];
              
              const isSunday = di === 0;
              const isSaturday = di === 6;
              const isHoliday = !!holidayName;
              const isRedDay = isSunday || isHoliday;

              let dateColor = '#333333';
              if (isRedDay) dateColor = '#E8735A';
              else if (isSaturday) dateColor = '#5A8FE8';
              if (isToday && isCurrentMonth) dateColor = '#FFFFFF';

              const displayName = holidayName || anniversaryName;
              let textNameColor = isHoliday ? '#E8735A' : '#8A8A8A';

              if (!isCurrentMonth) {
                dateColor = `${dateColor}${alpha}`;
                textNameColor = `${textNameColor}${alpha}`;
              }

              return (
                <FlexWidget
                  key={di}
                  clickAction={`OPEN_DATE:${dateKey}`}
                  clickActionData={{ date: dateKey, renderTime }}
                  style={{
                    flex: 1,
                    width: 0,
                    height: 'match_parent',
                    backgroundColor: '#ffffff',
                    borderRightWidth: di < 6 ? 1 : 0,
                    borderRightColor: '#F0F0F0',
                    paddingTop: 1,
                    paddingHorizontal: 1,
                    flexDirection: 'column',
                    justifyContent: 'flex-start'
                  }}
                >
                  <FlexWidget style={{ width: 'match_parent', justifyContent: 'space-between', flexDirection: 'row' }}>
                    <TextWidget
                      text={String(date.getDate())}
                      style={{
                        fontSize: 11,
                        alignSelf: 'flex-start',
                        fontWeight: 'bold',
                        color: dateColor,
                        backgroundColor: isToday && isCurrentMonth ? '#3f6cbe' : 'transparent',
                        borderRadius: 12,
                        paddingHorizontal: 3,
                        paddingTop: 1,
                      }}
                    />
                    {dayMemos.length > 2 && (
                      <TextWidget 
                        text={`+${dayMemos.length - 2}`} 
                        style={{ fontSize: 9, color: isCurrentMonth ? '#8A8A8A' : `#8A8A8A${alpha}`, textAlign: 'center' }} 
                      />
                    )}
                  </FlexWidget>

                  {/* 기념일 및 공휴일 - 항상 날짜 바로 아래 배치 */}
                  {displayName && (
                    <TextWidget 
                      text={displayName} 
                      style={{ fontSize: 6, color: textNameColor, textAlign: 'left', width: 'match_parent'}} 
                      maxLines={1} 
                    />
                  )}

                  {/* 일정 메모 - 설정에 따라 정렬 */}
                  <FlexWidget style={{ 
                    flex: 1,
                    width: 'match_parent', 
                    flexDirection: 'column',
                    justifyContent: alignment === 'center' ? 'center' : 'flex-start'
                  }}>
                    {dayMemos.slice(0, 2).map((memo) => {
                      const memoBg = memo.color || '#C8F0C4';
                      const finalMemoBg = isCurrentMonth ? memoBg : `${memoBg}${alpha}`;
                      const memoTextColor = isCurrentMonth ? '#000000' : `#000000${alpha}`;
                      return (
                        <FlexWidget 
                          key={memo.id} 
                          style={{ 
                            backgroundColor: finalMemoBg, 
                            paddingHorizontal: 1, 
                            marginBottom: 0.5,
                            borderRadius: 1,
                            width: 'match_parent'
                          }}
                        >
                          <TextWidget 
                            text={memo.title} 
                            style={{ fontSize: 9 * scale, color: memoTextColor, fontWeight: 'bold' }} 
                            maxLines={1} 
                          />
                        </FlexWidget>
                      );
                    })}
                  </FlexWidget>
                </FlexWidget>
              );
            })}
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}
