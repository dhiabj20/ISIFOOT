export const COLORS = {
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
  textTertiary: '#5A7A9A',
  red: '#FF4D4D',
  redDim: 'rgba(255, 77, 77, 0.12)',
  redBorder: 'rgba(255, 77, 77, 0.25)',
  yellow: '#FFB800',
  yellowDim: 'rgba(255, 184, 0, 0.14)',
  orange: '#96FF67',
  inputBg: 'rgba(10, 28, 18, 0.4)',
  inputText: '#E0EFE6',
  fieldLabel: '#8AACCC',
  placeholder: '#4A5D4F',
  headerSub: '#7D9C8E',
  composerBg: 'rgba(10, 28, 18, 0.7)',
  glowPrimary: 'rgba(43, 230, 123, 0.10)',
  glowSecondary: 'rgba(150, 255, 103, 0.07)',
  panelHighlight: 'rgba(43, 230, 123, 0.25)',
};

export const GLASS = {
  panel: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: 20,
    padding: 16,
  },
  panelAlt: {
    backgroundColor: COLORS.bgCardAlt,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: 16,
    padding: 12,
  },
};

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
