// lib/theme.ts

// Palette Resaura
export const COLORS = {
  background: '#001f3b',         // fond app (marine profond)
  azure: '#0de7f4',              // liens + CTA + états sélectionnés
  text: '#FFFFFF',               // texte principal
  textMuted: 'rgba(255,255,255,0.72)',
  textOnLight: '#0b2a45',        // texte foncé pour fonds clairs
  textOnLightMuted: 'rgba(11,42,69,0.7)',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(13,231,244,0.45)', // liseré azur doux (inputs, cartes)
  outline: '#0de7f4',            // bordures actives (alert, focus)
  darkText: '#003642',           // texte foncé sur fonds clairs
  success: '#23d18b',
  danger: '#ff6b6b',
  pickupAccent: '#23d18b',
  dropoffAccent: '#ff6b6b',
  dividerOnLight: 'rgba(11,42,69,0.15)',
  commentBgOnLight: 'rgba(11,42,69,0.05)',
  actionButtonBg: '#001f3b',
  actionButtonBorder: '#0de7f4',
  actionButtonText: '#ffffff',
};

// Rayons historiques (si du code existant les utilise encore)
export const RADIUS = {
  md: 12,
  lg: 16,
  xl: 18,
  '2xl': 24,
};

// Rayons recommandés par type d’élément
export const RADII = {
  input: 12,
  button: 24,
  card: 24,
};

// Ombres
export const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
};
