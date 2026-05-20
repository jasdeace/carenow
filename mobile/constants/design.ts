/**
 * Design tokens ported from redesign/README.md.
 * Use these for places NativeWind classes can't reach (SVG stroke/fill,
 * navigation chrome, animated styles). For markup, prefer Tailwind classes —
 * they map to the same values via tailwind.config.js.
 */

export const COLORS = {
  teal: {
    50: '#EDFAF8',
    100: '#DDF4F1',
    200: '#BFEDE9',
    300: '#8FDDD7',
    400: '#4EC4BD',
    500: '#20A39A',
    600: '#14857C',
    700: '#0F766E',
    800: '#0E5C5A',
    900: '#0B3F3D',
  },
  ink: {
    300: '#B3BFC1',
    400: '#87979A',
    500: '#5C6F71',
    700: '#2E4547',
    900: '#0F2C2E',
  },
  cream: { 50: '#FAF7F1', 100: '#F3EEE3', 200: '#E8E0CD' },
  line: '#EBE5D6',
  lineSoft: '#F1ECDF',
  paper: '#FFFFFF',
  coral: { 100: '#FBE5DC', 300: '#F3BFAE', 500: '#E8927C' },
  sand: { 100: '#FBF1D9', 200: '#F4E3BD', 500: '#D6A85F' },
  rose: { 100: '#FBE3E5', 500: '#D85B66' },
  sky: { 100: '#E2E8F8', 500: '#4B6FD1' },
  ok: { 100: '#DDF1E7', 500: '#1F9A6E' },
  warn: { 100: '#F8EBCC', 500: '#C99339' },
  danger: '#C84A4A',
} as const;

export const RADII = { xs: 8, sm: 12, md: 16, lg: 20, xl: 28, pill: 9999 } as const;

export const SHADOW_CARD = {
  shadowColor: '#0F2C2E',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;
