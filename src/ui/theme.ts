export const FONT = {
  regular: 'Orbitron_500Medium',
  bold: 'Orbitron_700Bold',
  black: 'Orbitron_900Black',
};

export const UI = {
  cyan: '#2ef2ff',
  pink: '#ff2bd6',
  orange: '#ff8a1f',
  gold: '#ffd23f',
  red: '#ff4d6d',
  green: '#7dff5a',
  text: '#f2ecff',
  dim: '#9a8cc8',
  panel: 'rgba(10, 6, 34, 0.88)',
  scrim: 'rgba(4, 2, 16, 0.6)',
};

export const glow = (color: string, radius = 10) => ({
  textShadowColor: color,
  textShadowRadius: radius,
  textShadowOffset: { width: 0, height: 0 },
});
