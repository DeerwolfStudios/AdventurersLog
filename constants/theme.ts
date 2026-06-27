import { scale, moderateScale } from './responsive';

export const theme = {
  colors: {
    background: '#0d0900',
    backgroundMid: '#1a1005',
    panel: '#1e1408',
    panelLight: '#2a1e0f',
    border: '#6b4f1a',
    borderGold: '#c8a030',
    borderLight: '#e8c84a',
    gold: '#c8a030',
    goldLight: '#f0d060',
    goldDim: '#8a6b1a',
    parchment: '#f0dea8',
    parchmentDim: '#c8b47a',
    parchmentDark: '#8a7048',
    red: '#8b1a1a',
    redLight: '#cc2222',
    green: '#2a5a18',
    greenLight: '#3a8a24',
    white: '#ffffff',
    textMuted: '#9a8060',
  },
  fonts: {
    display: 'IMFellEnglish_400Regular',
  },
  // Pre-scaled font sizes (dampened). Collapses the ~78 scattered fontSize literals
  // into a semantic scale. Always pair with a scaled lineHeight where one is set.
  fontSize: {
    hero: moderateScale(38),
    title: moderateScale(34),
    heading: moderateScale(24),
    bodyLg: moderateScale(20),
    body: moderateScale(18),
    sm: moderateScale(15),
    xs: moderateScale(13),
    caption: moderateScale(11),
    micro: moderateScale(10),
  },
  // Pre-scaled 4-based spacing scale for padding/margin/gap.
  spacing: {
    xs: scale(4),
    sm: scale(8),
    md: scale(12),
    lg: scale(16),
    xl: scale(24),
    xxl: scale(32),
  },
};
