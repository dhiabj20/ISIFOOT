const DARK_COLORS = {
  bg: '#06120C',
  bgCard: 'rgba(12, 29, 20, 0.45)',
  bgCardSolid: '#0C1D14',
  bgCardAlt: 'rgba(14, 32, 23, 0.55)',
  green: '#2BE67B',
  greenMuted: '#8AA59A',
  greenDim: 'rgba(43, 230, 123, 0.12)',
  greenDimStrong: 'rgba(43, 230, 123, 0.22)',
  greenBorder: 'rgba(43, 230, 123, 0.2)',
  greenBorderActive: 'rgba(43, 230, 123, 0.45)',
  white: '#F4FFF8',
  whiteMuted: '#C7DDD2',
  textSecondary: '#8AA59A',
  textTertiary: '#6F8E80',
  red: '#FF4D4D',
  redDim: 'rgba(255, 77, 77, 0.12)',
  redBorder: 'rgba(255, 77, 77, 0.25)',
  yellow: '#FFB800',
  yellowDim: 'rgba(255, 184, 0, 0.14)',
  orange: '#96FF67',
  inputBg: 'rgba(10, 28, 18, 0.4)',
  inputText: '#E0EFE6',
  fieldLabel: '#9AB8AC',
  placeholder: '#4A5D4F',
  headerSub: '#7D9C8E',
  composerBg: 'rgba(10, 28, 18, 0.7)',
  glowPrimary: 'rgba(43, 230, 123, 0.10)',
  glowSecondary: 'rgba(150, 255, 103, 0.07)',
  panelHighlight: 'rgba(43, 230, 123, 0.25)',
  ballTint: '#E6FFF2',
};

const LIGHT_COLORS = {
  bg: '#F4FFF8',
  bgCard: 'rgba(255, 255, 255, 0.78)',
  bgCardSolid: '#FFFFFF',
  bgCardAlt: 'rgba(225, 244, 234, 0.75)',
  green: '#179B52',
  greenMuted: '#4A7D63',
  greenDim: 'rgba(23, 155, 82, 0.12)',
  greenDimStrong: 'rgba(23, 155, 82, 0.20)',
  greenBorder: 'rgba(23, 155, 82, 0.22)',
  greenBorderActive: 'rgba(23, 155, 82, 0.45)',
  white: '#0B1F14',
  whiteMuted: '#3E6651',
  textSecondary: '#4F7662',
  textTertiary: '#6B8B7B',
  red: '#D73A49',
  redDim: 'rgba(215, 58, 73, 0.12)',
  redBorder: 'rgba(215, 58, 73, 0.25)',
  yellow: '#B27A00',
  yellowDim: 'rgba(178, 122, 0, 0.14)',
  orange: '#4FAF35',
  inputBg: 'rgba(255, 255, 255, 0.95)',
  inputText: '#113222',
  fieldLabel: '#3C6351',
  placeholder: '#8CA79A',
  headerSub: '#5B7E6C',
  composerBg: 'rgba(240, 251, 245, 0.95)',
  glowPrimary: 'rgba(23, 155, 82, 0.08)',
  glowSecondary: 'rgba(70, 190, 120, 0.07)',
  panelHighlight: 'rgba(23, 155, 82, 0.20)',
  ballTint: '#162E21',
};

function createGlass(colors) {
  return {
    panel: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.greenBorder,
      borderRadius: 20,
      padding: 16,
    },
    panelAlt: {
      backgroundColor: colors.bgCardAlt,
      borderWidth: 1,
      borderColor: colors.greenBorder,
      borderRadius: 16,
      padding: 12,
    },
  };
}

export const THEME_MODES = {
  dark: 'dark',
  light: 'light',
};

export const THEMES = {
  [THEME_MODES.dark]: {
    mode: THEME_MODES.dark,
    colors: DARK_COLORS,
    glass: createGlass(DARK_COLORS),
  },
  [THEME_MODES.light]: {
    mode: THEME_MODES.light,
    colors: LIGHT_COLORS,
    glass: createGlass(LIGHT_COLORS),
  },
};

export const DEFAULT_THEME_MODE = THEME_MODES.dark;
export const COLORS = THEMES[DEFAULT_THEME_MODE].colors;
export const GLASS = THEMES[DEFAULT_THEME_MODE].glass;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00',
];

export const STATUS = {
  pending: 'pending_confirmation',
  confirmed: 'confirmed',
  cancelled: 'cancelled',
};

export const VISIBILITY = {
  private: 'private',
  public: 'public',
};
