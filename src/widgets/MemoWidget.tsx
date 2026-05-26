"use no memo";

import React from 'react';
import { FlexWidget, OverlapWidget, SvgWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import { AppSettings } from '../hooks/useSettings';
import { MemosState } from '../types/calendar';

const SETTINGS_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#8A8A8A"><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z"/></svg>`;

interface MemoWidgetProps {
  year: number;
  month: number;
  days: Date[][];
  memos: MemosState;
  todayStr: string;
  holidays: { [key: string]: string };
  anniversaries: { [key: string]: string };
  renderTime: number;
  settings: AppSettings;
  widgetHeight?: number;
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
  settings,
  widgetHeight = 250
}: MemoWidgetProps) {
  const { fontSizeIndex, alignmentVertical, alignmentHorizontal, showHolidays, showOtherMonths, memoHighlightType } = settings;
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const alpha = '4D';
  const transparentColor: ColorProp = '#00000000';

  // Font size scaling
  const scales = [0.85, 1, 1.15];
  const scale = scales[fontSizeIndex] || 1;

  const HEADER_HEIGHT = 56;
  const WEEKDAYS_HEIGHT = 22;
  const GRID_ROWS = 6;
  const DATE_INFO_HEIGHT = 18;
  const MEMO_BAR_HEIGHT = 16 * scale;

  const cellHeight = (widgetHeight - HEADER_HEIGHT - WEEKDAYS_HEIGHT) / GRID_ROWS;
  const availableHeight = cellHeight - DATE_INFO_HEIGHT;
  const dayMemoLimit = Math.max(1, Math.floor(availableHeight / MEMO_BAR_HEIGHT));

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
        borderBottomColor: '#dfdfdf'
      }}>
        <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'calendarapp://?source=settings' }} style={{ marginLeft: 10, padding: 6, borderRadius: 20 }}>
          <SvgWidget
            svg={SETTINGS_ICON_SVG}
            style={{ height: 22, width: 22 }}
          />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <FlexWidget
            clickAction="PREV_MONTH"
            clickActionData={{ baseYear: year, baseMonth: month, renderTime }}
            style={{ paddingHorizontal: 15, paddingVertical: 5 }}
          >
            <TextWidget text="<" style={{ fontSize: 18, color: '#cacaca', fontWeight: 'bold' }} />
          </FlexWidget>
          <TextWidget 
            text={`${year}년 ${month + 1}월`} 
            style={{ fontSize: 15, fontWeight: 'bold', color: '#000000', marginHorizontal: 15 }} 
          />
          <FlexWidget
            clickAction="NEXT_MONTH"
            clickActionData={{ baseYear: year, baseMonth: month, renderTime }}
            style={{ paddingHorizontal: 15, paddingVertical: 5 }}
          >
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
        borderBottomColor: '#dfdfdf' 
      }}>
        {weekDays.map((d, i) => (
          <FlexWidget key={i} style={{ flex: 1, width: 0, alignItems: 'center', paddingVertical: 4 }}>
            <TextWidget 
              text={d} 
              style={{ fontSize: 9, fontWeight: 'bold', color: i === 0 ? '#E8735A' : i === 6 ? '#5A8FE8' : '#8A8A8A' }} 
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
            borderBottomColor: '#dfdfdf'
          }}>
            {week.map((date, di) => {
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, '0');
              const d = String(date.getDate()).padStart(2, '0');
              const dateKey = `${y}-${m}-${d}`;
              
              const isToday = dateKey === todayStr;
              const isCurrentMonth = date.getMonth() === month;
              const holidayName = holidays[dateKey];
              const anniversaryName = anniversaries[dateKey];
              const dayMemos = memos[dateKey] || [];
              
              const isSunday = di === 0;
              const isHoliday = !!holidayName;
              const isRedDay = isSunday || isHoliday;

              let dateColor = '#333333';
              if (isRedDay) dateColor = '#E8735A'; 
              else if (di === 6) dateColor = '#5A8FE8'; 
              if (isToday && isCurrentMonth) dateColor = '#FFFFFF';

              const displayName = showHolidays ? (holidayName || anniversaryName) : null;
              let textNameColor = isHoliday && showHolidays ? '#E8735A' : '#8A8A8A';

              if (!isCurrentMonth) {
                dateColor = `${dateColor}${alpha}`;
                textNameColor = `${textNameColor}${alpha}`;
              }

              const showDateContent = isCurrentMonth || showOtherMonths;

              return (
                <FlexWidget
                  key={di}
                  clickAction={showDateContent ? 'OPEN_URI' : undefined}
                  clickActionData={showDateContent ? { uri: `calendarapp://?date=${dateKey}&source=widget` } : undefined}
                  style={{
                    flex: 1,
                    width: 'match_parent',
                    height: 'match_parent',
                    backgroundColor: '#ffffff',
                    borderRightWidth: di < 6 ? 1 : 0,
                    borderRightColor: '#dfdfdf',
                    paddingTop: 1,
                    paddingHorizontal: 1,
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                  }}
                >
                  {showDateContent && (
                    <FlexWidget style={{ flex: 1, width: 'match_parent', flexDirection: 'column' }}>
                      <OverlapWidget style={{ width: 'match_parent' }}>
                        <FlexWidget style={{ width: 'match_parent', justifyContent: 'center', flexDirection: 'row' }}>
                          <TextWidget
                            text={String(date.getDate())}
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              width: 24,
                              color: dateColor as ColorProp,
                              backgroundColor: isToday && isCurrentMonth ? '#3f6cbe' : transparentColor,
                              borderRadius: 12,
                              paddingHorizontal: 5,
                              paddingTop: 1,
                              textAlign: 'center'
                            }}
                          />
                        </FlexWidget>

                        <FlexWidget style={{ width: 'match_parent', justifyContent: 'flex-end', flexDirection: 'row' }}>
                          {dayMemos.length > dayMemoLimit && (
                            <TextWidget 
                              text={`+${dayMemos.length - dayMemoLimit}`} 
                              style={{ fontSize: 9, color: (isCurrentMonth ? '#8A8A8A' : `#8A8A8A${alpha}`) as ColorProp, textAlign: 'right' }} 
                            />
                          )}
                        </FlexWidget>
                      </OverlapWidget>

                      {displayName && (
                        <TextWidget 
                          text={displayName} 
                          style={{ fontSize: 6, color: textNameColor as ColorProp, textAlign: 'center', width: 'match_parent'}} 
                          maxLines={1} 
                        />
                      )}

                      <FlexWidget style={{ 
                        flex: 1,
                        width: 'match_parent', 
                        flexDirection: 'column',
                        justifyContent: alignmentVertical === 'center' ? 'center' : 'flex-start',
                        alignItems: alignmentHorizontal === 'center' ? 'center' : 'flex-start'
                      }}>
                        {dayMemos.slice(0, dayMemoLimit).map((memo) => {
                          const memoBg = memo.color || '#C8F0C4';
                          const isBgColorHex = memoBg.startsWith('#');
                          const finalMemoBg = memoBg === 'transparent'
                            ? transparentColor
                            : ((isCurrentMonth || !isBgColorHex) ? memoBg : `${memoBg}${alpha}`) as ColorProp;
                          const memoTextColor = isCurrentMonth ? '#000000' : `#000000${alpha}`;
                          return (
                            <FlexWidget 
                              key={memo.id} 
                              style={{ 
                                backgroundColor: finalMemoBg, 
                                paddingHorizontal: memoHighlightType === 'full' ? 1 : 2, 
                                marginBottom: 0.5,
                                borderRadius: 4,
                                width: memoHighlightType === 'full' ? 'match_parent' : 'wrap_content',
                                alignItems: alignmentHorizontal === 'center' ? 'center' : 'flex-start'
                              }}
                            >
                              <TextWidget 
                                text={memo.title} 
                                style={{ 
                                  fontSize: 9 * scale, 
                                  color: memoTextColor as ColorProp, 
                                  fontWeight: '500',
                                  textAlign: alignmentHorizontal === 'center' ? 'center' : 'left'
                                }} 
                                maxLines={1} 
                              />
                            </FlexWidget>
                          );
                        })}
                      </FlexWidget>
                    </FlexWidget>
                  )}
                </FlexWidget>
              );
            })}
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}
