const defaultBackendUrl = "https://inquisitive-lottie-fsocietyt-f7a26bff.koyeb.app";
const backendUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultBackendUrl).replace(/\s+/g, "");

export default {
  expo: {
    name: "TJ Analyser",
    slug: "tj-analyser-mobile",
    owner: "ys92",
    version: "0.1.0",
    runtimeVersion: { policy: "appVersion" },
    updates: {
      url: "https://u.expo.dev/89b1be0c-46e6-4050-80ae-6c61695128f7",
    },
    orientation: "portrait",
    userInterfaceStyle: "dark",
    scheme: "tjanalyser",
    backgroundColor: "#000000",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },
    platforms: ["android"],
    androidStatusBar: {
      backgroundColor: "#000000",
      barStyle: "light-content",
      translucent: false,
    },
    androidNavigationBar: {
      backgroundColor: "#000000",
      barStyle: "light-content",
    },
    android: {
      package: "com.tjanalyser.mobile",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#000000",
      },
    },
    plugins: ["expo-router", "expo-sqlite", "expo-font", "expo-sharing", "expo-status-bar"],
    extra: {
      apiBaseUrl: backendUrl,
      eas: {
        projectId: "89b1be0c-46e6-4050-80ae-6c61695128f7",
      },
    },
  },
};
