import { Text, View } from "@/components/Themed";
import { supabase } from "@/utils/supabase";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import React, { useState } from "react";

const ABOUT_DATA = [
  {
    title: null,
    items: [
      { id: "feedback", label: "Send Feedback", detail: null, action: "modal" },
      { id: "bug", label: "Report a Bug", detail: null, action: "modal" },
      { id: "review", label: "Leave Review", detail: null, action: "review" },
    ],
  },
  {
    title: null,
    items: [
      { id: "website", label: "Website", detail: "energe.ia", action: "link" },
      { id: "twitter", label: "Twitter", detail: "@ThatsMyChad", action: "link" },
      { id: "linkedin", label: "LinkedIn", detail: "chad-zimmerman-codes", action: "link" },
      { id: "github", label: "Github", detail: "@chadzimmerman", action: "link" },
    ],
  },
];

interface AboutItem {
  id: string;
  label: string;
  detail: string | null;
  action: string;
}

interface AboutSectionData {
  title: string | null;
  items: AboutItem[];
}

// ── Feedback Modal ────────────────────────────────────────────────────────────
const FeedbackModal = ({
  visible,
  type,
  onClose,
}: {
  visible: boolean;
  type: "feedback" | "bug";
  onClose: () => void;
}) => {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const placeholder =
    type === "bug"
      ? "Describe the bug...\n\nSteps to reproduce:\n\nDevice / iOS version:"
      : "Share your thoughts, ideas, or suggestions...";

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert("Empty", "Please write something before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from("feedback").insert({
        user_id: session?.user.id ?? null,
        type,
        message: message.trim(),
      });

      if (error) throw error;

      Alert.alert(
        type === "bug" ? "Bug Reported" : "Feedback Sent",
        "Thank you! Your message has been received.",
        [{ text: "OK", onPress: () => { setMessage(""); onClose(); } }],
      );
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={modalStyles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} disabled={submitting}>
            <Text style={modalStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={modalStyles.title}>
            {type === "bug" ? "Report a Bug" : "Send Feedback"}
          </Text>
          <TouchableOpacity onPress={handleSubmit} disabled={submitting}>
            {submitting
              ? <ActivityIndicator color="#A737FD" />
              : <Text style={modalStyles.submitText}>Send</Text>
            }
          </TouchableOpacity>
        </View>

        <TextInput
          style={modalStyles.input}
          multiline
          placeholder={placeholder}
          placeholderTextColor="#AAAAAA"
          value={message}
          onChangeText={setMessage}
          autoFocus
          textAlignVertical="top"
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ── Section List ──────────────────────────────────────────────────────────────
const AboutSection = ({
  section,
  onOpenModal,
}: {
  section: AboutSectionData;
  onOpenModal: (type: "feedback" | "bug") => void;
}) => {
  const handlePress = (item: AboutItem) => {
    if (item.action === "modal") {
      onOpenModal(item.id as "feedback" | "bug");
      return;
    }

    if (item.action === "link" && item.detail) {
      let url = "";
      if (item.id === "website") url = `https://${item.detail}`;
      if (item.id === "twitter") url = `https://twitter.com/${item.detail.replace("@", "")}`;
      if (item.id === "github") url = `https://github.com/${item.detail.replace("@", "")}`;
      if (item.id === "linkedin") url = `https://www.linkedin.com/in/${item.detail}`;
      if (url) Linking.openURL(url).catch(() => {});
      return;
    }

    if (item.id === "review") {
      Alert.alert("Coming Soon", "App Store review link will be added once we're live!");
    }
  };

  return (
    <View style={aboutStyles.sectionContainer}>
      <View style={aboutStyles.list}>
        {section.items.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              aboutStyles.item,
              index < section.items.length - 1 && aboutStyles.separator,
            ]}
            onPress={() => handlePress(item)}
          >
            <Text style={aboutStyles.label}>{item.label}</Text>
            {item.detail && (
              <Text style={aboutStyles.detailText}>{item.detail}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export const options = {
  title: "About",
  headerBackTitle: "Settings",
  headerBackTitleVisible: true,
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AboutScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"feedback" | "bug">("feedback");

  const openModal = (type: "feedback" | "bug") => {
    setModalType(type);
    setModalVisible(true);
  };

  return (
    <View style={aboutStyles.container}>
      <ScrollView style={aboutStyles.scrollView}>
        <View style={aboutStyles.banner}>
          <Text style={aboutStyles.logo}>
            <Text style={{ fontSize: 40 }}>🐉</Text>
          </Text>
          <Text style={aboutStyles.versionText}>Version **0.0.2**</Text>
        </View>

        {ABOUT_DATA.map((section, index) => (
          <AboutSection key={index} section={section} onOpenModal={openModal} />
        ))}
      </ScrollView>

      <FeedbackModal
        visible={modalVisible}
        type={modalType}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F0F0",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DCDCDC",
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  cancelText: {
    fontSize: 16,
    color: "#888888",
  },
  submitText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#A737FD",
  },
  input: {
    flex: 1,
    margin: 16,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    fontSize: 15,
    color: "#000000",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#DCDCDC",
  },
});

const aboutStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F0F0",
  },
  scrollView: {
    flex: 1,
  },
  banner: {
    backgroundColor: "#A737FD",
    paddingVertical: 30,
    alignItems: "center",
    marginBottom: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  logo: {
    color: "#FFFFFF",
    marginBottom: 10,
  },
  versionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionContainer: {
    width: "100%",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  list: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#DCDCDC",
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: "#FFFFFF",
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DCDCDC",
  },
  label: {
    fontSize: 16,
    flex: 1,
    color: "#000000",
  },
  detailText: {
    fontSize: 16,
    color: "#A9A9A9",
    fontWeight: "500",
  },
});
