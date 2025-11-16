module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        alias: {
          '@': './',
          '@app': './app',
          '@assets': './assets',
          '@contexts': './contexts',
          '@hooks': './hooks',
          '@lib': './lib',
          // ⚠️ ne PAS utiliser '@supabase': './supabase'
          '@db': './supabase', // <- si tu veux un alias pour TON dossier local
          '@types': './types',
        },
      }],
      'react-native-reanimated/plugin',
    ],
  };
};
