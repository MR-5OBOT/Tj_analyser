const backendUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://your-backend.koyeb.app";

export default {
  expo: {
    name: "TJ Analyser",
    slug: "tj-analyser-mobile",
    version: "0.1.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    platforms: ["android"],
    android: {
      package: "com.tjanalyser.mobile",
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#000000",
      },
    },
    extra: {
      apiBaseUrl: backendUrl,
      eas: {
        projectId: "1ce6a3a2-e219-4022-a7e8-a49fa82d6d39",
      },
    },
  },
};
