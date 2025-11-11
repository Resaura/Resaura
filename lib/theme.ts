// lib/theme.ts

// Palette Resaura
export const COLORS = {
  background: '#001f3b',         // fond app (marine profond)
  azure: '#0de7f4',              // liens + CTA + états sélectionnés
  text: '#FFFFFF',               // texte principal
  textMuted: 'rgba(255,255,255,0.72)',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(13,231,244,0.45)', // liseré azur doux (inputs, cartes)
  outline: '#0de7f4',            // bordures actives (alert, focus)
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
  input: 12,     // ← petits coins “carré à bord arrondi”
  button: 24,    // gros arrondi pour CTA
  card: 24,      // cartes / popups
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
