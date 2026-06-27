import { Dimensions, PixelRatio } from 'react-native';

// Portrait-locked app (app.json -> "orientation": "portrait"): window width is fixed
// for the session, so reading it once at module load is safe. If portrait-lock is ever
// removed, convert this to a useResponsive() hook returning memoized styles, because
// StyleSheet.create runs once at module load and won't react to dimension changes.
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BASE_WIDTH = 375; // iPhone X/11 reference width
const RAW_RATIO = SCREEN_WIDTH / BASE_WIDTH;
const RATIO = Math.min(Math.max(RAW_RATIO, 0.85), 1.15); // clamp extremes

// Full clamped scale — spacing, padding, margin, gap, icon/image dims, minHeight, card widths.
export function scale(size: number): number {
  return PixelRatio.roundToNearestPixel(size * RATIO);
}

// Dampened scale — fonts move gently (factor 0.5 -> effective ratio ~[0.925, 1.075]).
export function moderateScale(size: number, factor = 0.5): number {
  return PixelRatio.roundToNearestPixel(size + (size * RATIO - size) * factor);
}

export { SCREEN_WIDTH, RATIO };
