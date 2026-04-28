import React from "react";
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getSeasonalColor } from "@/utils/seasons";

// TODO: Replace with your App Store numeric ID once the app is live
// Format: https://apps.apple.com/app/id<YOUR_NUMERIC_APP_ID>
const APP_STORE_URL = "https://apps.apple.com/app/id000000000";

export default function ForceUpdateModal({ visible }: { visible: boolean }) {
  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Update Required</Text>
          <Text style={styles.body}>
            A new version of Energe.ia is available. Please update to continue your journey.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: getSeasonalColor() }]}
            onPress={() => Linking.openURL(APP_STORE_URL)}
          >
            <Text style={styles.buttonText}>Update Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 28,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
