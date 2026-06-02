/** @type {import('expo/config').ExpoConfig} */
const base = require('./app.json');

module.exports = () => ({
  expo: {
    ...base.expo,
    owner: 'rgittelman',
    scheme: 'meridian',
    plugins: [
      ...(base.expo.plugins ?? []),
      'expo-font',
      'expo-secure-store',
      'expo-web-browser',
    ],
    extra: {
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
      // Phase H.1 — Traffic-Aware Routing. Restrict to Distance Matrix API only.
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    },
  },
});
