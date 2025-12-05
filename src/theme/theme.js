// src/theme/theme.js
import { MD3LightTheme as PaperTheme } from 'react-native-paper';

export const theme = {
  ...PaperTheme,
  colors: {
    ...PaperTheme.colors,
    primary: '#2196F3',
    secondary: '#4CAF50',
    tertiary: '#FF9800',
    surface: '#FFFFFF',
    background: '#F5F5F5',
    error: '#F44336',
    onSurface: '#000000',
    onBackground: '#000000',
    onSurfaceVariant: '#6E6E6E',
  },
  fonts: {
    ...PaperTheme.fonts,
    headlineLarge: { fontSize: 32, fontWeight: 'bold' },
    titleLarge: { fontSize: 24, fontWeight: '600' },
    bodyLarge: { fontSize: 18, fontWeight: '400' },
  },
};

export const elderlyStyles = {
  input: { height: 56, fontSize: 18 },
  button: { height: 56 },
  text: { fontSize: 18, lineHeight: 24 },
  card: { marginVertical: 8, padding: 16 },
};

export default theme;
