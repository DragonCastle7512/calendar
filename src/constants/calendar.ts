import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const MEMO_STORAGE_KEY = '@calendar_memos_v4';
export const HOLIDAY_CACHE_KEY = '@holiday_cache_v7_';
export const WIDGET_FONT_SIZE_KEY = '@widget_font_size_v1';
export const WIDGET_ALIGNMENT_VERTICAL_KEY = '@widget_alignment_vertical_v1';
export const WIDGET_ALIGNMENT_HORIZONTAL_KEY = '@widget_alignment_horizontal_v1';
export const WIDGET_SHOW_HOLIDAYS_KEY = '@widget_show_holidays_v1';
export const WIDGET_SHOW_OTHER_MONTHS_KEY = '@widget_show_other_months_v1';
export const APP_FONT_SIZE_KEY = '@app_font_size_v1';
export const APP_ALIGNMENT_VERTICAL_KEY = '@app_alignment_vertical_v1';
export const APP_ALIGNMENT_HORIZONTAL_KEY = '@app_alignment_horizontal_v1';
export const APP_SHOW_HOLIDAYS_KEY = '@app_show_holidays_v1';
export const APP_SHOW_OTHER_MONTHS_KEY = '@app_show_other_months_v1';
export const APP_MEMO_HIGHLIGHT_TYPE_KEY = '@app_memo_highlight_type_v1';
export const WIDGET_MEMO_HIGHLIGHT_TYPE_KEY = '@widget_memo_highlight_type_v1';
export const WIDGET_SETTINGS_OPEN_KEY = '@widget_settings_open_v1';
export const WIDGET_DATE_KEY = '@widget_view_date_v1';
export const WIDGET_NAV_TIMESTAMP_KEY = '@widget_nav_timestamp_v1';
export const SYNC_EXPIRY_MS = 1000 * 60 * 60 * 24 * 90; // 90일

export const CELL_WIDTH = SCREEN_WIDTH / 7;
export const HEADER_HEIGHT = 60;
export const WEEKDAY_HEIGHT = 36;
export const CALENDAR_ROWS = 6;

const CALENDAR_CONTENT_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT - WEEKDAY_HEIGHT - (Platform.OS === 'ios' ? 90 : 60);
export const NORMAL_ROW_HEIGHT = CALENDAR_CONTENT_HEIGHT / CALENDAR_ROWS;

export const ITEM_HEIGHT = 64;

export const MEMO_COLORS = [
  'transparent', '#C8F0C4', '#F0E4C4', '#C4D8F0', '#F0C4D4', '#E4C4F0',
  '#FFE5B4', '#FFD1DC', '#E0B0FF', '#B0E0E6', '#9ed19e',
  '#ffffba', '#CCCCFF', '#89CFF0', '#E5E4E2', '#AEC6CF'
];

export const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL || '';
export const PROXY_TOKEN = process.env.EXPO_PUBLIC_PROXY_TOKEN || '';

export const OFFLINE_HOLIDAYS: { [date: string]: string } = {
  '01-01': '신정',
  '03-01': '삼일절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '성탄절',
};

export const FIXED_ANNIVERSARIES: { [date: string]: string } = {
  '04-05': '식목일',
  '05-01': '노동절',
  '05-08': '어버이날',
  '05-15': '스승의 날',
  '07-17': '제헌절',
  '10-01': '국군의 날',
};

export const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'];
