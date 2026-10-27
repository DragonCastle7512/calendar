import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FONT_MAX_SCALE, FONT_MIN_SCALE } from '../constants/calendar';
import { AppSettings, normalizeFontSizeScale } from '../hooks/useSettings';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MIN_SCALE = FONT_MIN_SCALE;
const MAX_SCALE = FONT_MAX_SCALE;
const THUMB_SIZE = 22;

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  isFromWidget?: boolean;
}

interface FontSizeRangeSliderProps {
  scale: number;
  onChange: (val: number) => void;
}

const FontSizeRangeSlider = ({ scale, onChange }: FontSizeRangeSliderProps) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  trackWidthRef.current = trackWidth;
  const startXRef = useRef(0);

  const currentScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));

  const handleTouchAt = (currentX: number) => {
    const width = trackWidthRef.current;
    if (width <= THUMB_SIZE) return;
    const effectiveWidth = width - THUMB_SIZE;
    const effectiveX = Math.max(0, Math.min(effectiveWidth, currentX - THUMB_SIZE / 2));
    const ratio = effectiveX / effectiveWidth;
    const rawVal = MIN_SCALE + ratio * (MAX_SCALE - MIN_SCALE);
    const stepped = Math.round(rawVal * 100) / 100;
    onChange(stepped);
  };

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        startXRef.current = evt.nativeEvent.locationX;
        handleTouchAt(startXRef.current);
      },
      onPanResponderMove: (_evt, gestureState) => {
        handleTouchAt(startXRef.current + gestureState.dx);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        handleTouchAt(startXRef.current + gestureState.dx);
      },
    });
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const progressRatio = (currentScale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE);
  const percentage = Math.round(currentScale * 100);
  const defaultRatio = (1.0 - MIN_SCALE) / (MAX_SCALE - MIN_SCALE);

  const thumbLeft = trackWidth > THUMB_SIZE ? progressRatio * (trackWidth - THUMB_SIZE) : 0;
  const activeWidth = trackWidth > THUMB_SIZE ? thumbLeft + THUMB_SIZE / 2 : 0;

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.settingsLabel}>글자 크기</Text>
        <View style={styles.sliderValueWrap}>
          <View style={styles.percentageBadge}>
            <Text style={styles.sliderValueText}>{percentage}%</Text>
          </View>
          {percentage !== 100 && (
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => onChange(1.0)}
              activeOpacity={0.7}
            >
              <Text style={styles.resetBtnText}>기본 크기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabelSmall}>가</Text>
        <View
          style={styles.trackContainer}
          onLayout={onLayout}
          {...panResponder.panHandlers}
        >
          {/* 비활성 트랙 */}
          <View style={styles.trackBackground} pointerEvents="none" />

          {/* 기본값 (100%) 마커 */}
          {trackWidth > THUMB_SIZE && (
            <View
              style={[
                styles.defaultMarker,
                { left: defaultRatio * (trackWidth - THUMB_SIZE) + THUMB_SIZE / 2 - 1 }
              ]}
              pointerEvents="none"
            />
          )}

          {/* 활성 트랙 */}
          <View
            style={[
              styles.trackActive,
              { width: activeWidth }
            ]}
            pointerEvents="none"
          />

          {/* 썸 (Thumb) */}
          {trackWidth > THUMB_SIZE && (
            <View
              style={[
                styles.thumb,
                { left: thumbLeft }
              ]}
              pointerEvents="none"
            >
              <View style={styles.thumbInner} />
            </View>
          )}
        </View>
        <Text style={styles.sliderLabelLarge}>가</Text>
      </View>

      {/* 실시간 미리보기 */}
      <View style={styles.previewBox}>
        <Text style={styles.previewLabel}>미리보기</Text>
        <View style={styles.previewChip}>
          <Text
            style={[
              styles.previewChipText,
              { fontSize: Math.round(9 * currentScale * 10) / 10 }
            ]}
            numberOfLines={1}
          >
            테스트용 텍스트
          </Text>
        </View>
      </View>
    </View>
  );
};

export const SettingsModal = ({
  visible,
  onClose,
  settings: initialSettings,
  onSave,
  isFromWidget = false,
}: SettingsModalProps) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(initialSettings);

  useEffect(() => {
    if (visible) {
      setLocalSettings({
        ...initialSettings,
        fontSizeIndex: normalizeFontSizeScale(initialSettings.fontSizeIndex, MAX_SCALE),
      });
    }
  }, [visible, initialSettings]);

  const updateLocalSetting = (update: Partial<AppSettings>) => {
    setLocalSettings(prev => ({ ...prev, ...update }));
  };

  const handleBack = () => {
    if (isFromWidget) {
      BackHandler.exitApp();
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    onSave(localSettings);
  };

  const alignmentsVertical = [
    { label: '상단', value: 'top' as const },
    { label: '중앙', value: 'center' as const },
  ];

  const alignmentsHorizontal = [
    { label: '왼쪽', value: 'left' as const },
    { label: '중앙', value: 'center' as const },
  ];

  const highlightTypes = [
    { label: '전체 강조', value: 'full' as const },
    { label: '글자만 강조', value: 'text' as const },
  ];

  const currentScale = normalizeFontSizeScale(localSettings.fontSizeIndex, MAX_SCALE);

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={handleBack}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={handleBack}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          
          <View style={styles.cardContainer}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={26} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>설정</Text>
              <TouchableOpacity onPress={handleSave} style={styles.iconBtn}>
                <Ionicons name="checkmark-outline" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.scrollArea}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* 글자 크기 Range 드래그 조절기 */}
              <FontSizeRangeSlider
                scale={currentScale}
                onChange={(val: number) => updateLocalSetting({ fontSizeIndex: val })}
              />

              <View style={styles.alignContainer}>
                <View style={styles.align}>
                  <Text style={styles.settingsLabel}>메모 정렬(수직)</Text>
                  <View style={styles.optionRow}>
                    {alignmentsVertical.map((align) => (
                      <TouchableOpacity
                        key={align.value}
                        style={[
                          styles.optionBtn,
                          localSettings.alignmentVertical === align.value && styles.optionBtnActive
                        ]}
                        onPress={() => updateLocalSetting({ alignmentVertical: align.value })}
                      >
                        <Text style={[
                          styles.optionBtnText,
                          localSettings.alignmentVertical === align.value && styles.optionBtnTextActive
                        ]}>
                          {align.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.align}>
                  <Text style={styles.settingsLabel}>메모 정렬(수평)</Text>
                  <View style={styles.optionRow}>
                    {alignmentsHorizontal.map((align) => (
                      <TouchableOpacity
                        key={align.value}
                        style={[
                          styles.optionBtn,
                          localSettings.alignmentHorizontal === align.value && styles.optionBtnActive
                        ]}
                        onPress={() => updateLocalSetting({ alignmentHorizontal: align.value })}
                      >
                        <Text style={[
                          styles.optionBtnText,
                          localSettings.alignmentHorizontal === align.value && styles.optionBtnTextActive
                        ]}>
                          {align.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.settingsLabel}>공휴일 표시</Text>
              <View style={styles.optionRow}>
                {[
                  { label: '표시함', value: true },
                  { label: '표시 안함', value: false },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.optionBtn,
                      localSettings.showHolidays === option.value && styles.optionBtnActive
                    ]}
                    onPress={() => updateLocalSetting({ showHolidays: option.value })}
                  >
                    <Text style={[
                      styles.optionBtnText,
                      localSettings.showHolidays === option.value && styles.optionBtnTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.settingsLabel}>이전/다음 달 표시</Text>
              <View style={styles.optionRow}>
                {[
                  { label: '표시함', value: true },
                  { label: '표시 안함', value: false },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.optionBtn,
                      localSettings.showOtherMonths === option.value && styles.optionBtnActive
                    ]}
                    onPress={() => updateLocalSetting({ showOtherMonths: option.value })}
                  >
                    <Text style={[
                      styles.optionBtnText,
                      localSettings.showOtherMonths === option.value && styles.optionBtnTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.settingsLabel}>메모 강조 스타일</Text>
              <View style={styles.optionRow}>
                {highlightTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.optionBtn,
                      localSettings.memoHighlightType === type.value && styles.optionBtnActive
                    ]}
                    onPress={() => updateLocalSetting({ memoHighlightType: type.value })}
                  >
                    <Text style={[
                      styles.optionBtnText,
                      localSettings.memoHighlightType === type.value && styles.optionBtnTextActive
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#ffffff7c', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContainer: {
    width: SCREEN_WIDTH * 0.9,
    maxHeight: SCREEN_HEIGHT * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  header: {
    height: 60,
    backgroundColor: '#5A9FE8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  settingsLabel: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#444', 
    marginBottom: 10 
  },
  // Slider Styles
  sliderContainer: {
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sliderValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  percentageBadge: {
    backgroundColor: '#EBF3FC',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  sliderValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5A9FE8',
  },
  resetBtn: {
    backgroundColor: '#F1F3F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#777',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  sliderLabelSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    width: 18,
    textAlign: 'center',
  },
  sliderLabelLarge: {
    fontSize: 18,
    fontWeight: '800',
    color: '#555',
    width: 22,
    textAlign: 'center',
  },
  trackContainer: {
    flex: 1,
    height: 38,
    justifyContent: 'center',
    marginHorizontal: 8,
    position: 'relative',
  },
  trackBackground: {
    height: 6,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    width: '100%',
  },
  defaultMarker: {
    position: 'absolute',
    width: 2,
    height: 12,
    backgroundColor: '#CCD0D5',
    borderRadius: 1,
    top: 13,
  },
  trackActive: {
    position: 'absolute',
    height: 6,
    backgroundColor: '#5A9FE8',
    borderRadius: 3,
    left: 0,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#5A9FE8',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  thumbInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5A9FE8',
  },
  previewBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    padding: 10,
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8A8A8A',
    marginBottom: 6,
  },
  previewChip: {
    backgroundColor: '#C8F0C4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  previewChipText: {
    color: '#000000',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  // End Slider Styles
  optionRow: { 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 20 
  },
  optionBtn: { 
    flex: 1, 
    height: 44, 
    backgroundColor: '#F8F9FA', 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1.5, 
    borderColor: '#EEE' 
  },
  optionBtnActive: { 
    backgroundColor: '#5A9FE8', 
    borderColor: '#5A9FE8' 
  },
  optionBtnText: { 
    fontSize: 13, 
    color: '#666', 
    fontWeight: '700' 
  },
  optionBtnTextActive: { 
    color: '#FFF' 
  },
  alignContainer: {
    flexDirection: 'row',
    gap: 10
  },
  align: {
    flex: 1,
    flexDirection: 'column'
  }
});
