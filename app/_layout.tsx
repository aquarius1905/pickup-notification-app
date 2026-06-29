import { useCallback, useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { FacilityCodeSetup } from "@/components/FacilityCodeSetup";
import { clearApiKey, loadStoredApiKey } from "@/lib/facilityAuth";
import { FacilityAuthContext } from "@/lib/facilityAuthContext";
import { colors } from "@/lib/theme";

type AuthStatus = "loading" | "unauthenticated" | "authenticated";

export default function RootLayout() {
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    loadStoredApiKey().then((key) => {
      setStatus(key ? "authenticated" : "unauthenticated");
    });
  }, []);

  const logout = useCallback(() => {
    clearApiKey().then(() => setStatus("unauthenticated"));
  }, []);

  if (status === "loading") {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (status === "unauthenticated") {
    return (
      <FacilityCodeSetup onRegistered={() => setStatus("authenticated")} />
    );
  }

  return (
    <FacilityAuthContext.Provider value={{ logout }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="user-form"
          options={{ presentation: "modal", headerShown: false }}
        />
      </Stack>
      <StatusBar style="auto" />
    </FacilityAuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.white,
  },
});
