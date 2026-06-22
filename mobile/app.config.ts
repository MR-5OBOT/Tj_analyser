const defaultBackendUrl = "https://inquisitive-lottie-fsocietyt-f7a26bff.koyeb.app";
const backendUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultBackendUrl).replace(/\s+/g, "");

export default {
  expo: {
    name: "TJ Analyser",
    slug: "tj-analyser-mobile",
    version: "0.1.0",
    runtimeVersion: { policy: "appVersion" },
    updates: {
      url: "https://u.expo.dev/1ce6a3a2-e219-4022-a7e8-a49fa82d6d39",
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
    plugins: ["expo-router"],
    extra: {
      apiBaseUrl: backendUrl,
      eas: {
        projectId: "1ce6a3a2-e219-4022-a7e8-a49fa82d6d39",
      },
    },
  },
};
