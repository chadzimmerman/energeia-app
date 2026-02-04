import { Text, View } from "@/components/Themed";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

// MOCK DATA for the About page
const ABOUT_DATA = [
  {
    title: null,
    items: [
      {
        id: "feedback",
        label: "Send Feedback",
        detail: null,
        action: "navigate",
      },
      { id: "bug", label: "Report a Bug", detail: null, action: "navigate" },
      { id: "review", label: "Leave Review", detail: null, action: "navigate" },
    ],
  },
  {
    title: null,
    items: [
      {
        id: "website",
        label: "Website",
        detail: "energe.ia",
        action: "link",
      },
      {
        id: "twitter",
        label: "Twitter",
        detail: "@ThatsMyChad",
        action: "link",
      },
      {
        id: "linkedin",
        label: "LinkedIn",
        detail: "chad-zimmerman-codes",
        action: "link",
      },
      {
        id: "github",
        label: "Github",
        detail: "@chadzimmerman",
        action: "link",
      },
    ],
  },
];

// Helper component for the list sections (similar to SettingsSection)
const AboutSection = ({ section }) => {
  const handlePress = (item) => {
    // 1. Handle Email/Support actions
    if (item.id === "feedback" || item.id === "bug") {
      handleContactSupport(item.id);
      return;
    }

    // 2. Handle External Links (Website, Socials)
    if (item.action === "link" && item.detail) {
      let url = "";
      if (item.id === "website") url = `https://${item.detail}`;
      if (item.id === "twitter")
        url = `https://twitter.com/${item.detail.replace("@", "")}`;
      if (item.id === "github")
        url = `https://github.com/${item.detail.replace("@", "")}`;
      if (item.id === "linkedin")
        url = `https://www.linkedin.com/in/${item.detail}`;

      if (url) {
        Linking.openURL(url).catch((err) =>
          console.error("Couldn't load page", err),
        );
      }
      return;
    }

    // 3. Handle Leave Review (Placeholder)
    if (item.id === "review") {
      Alert.alert(
        "Coming Soon",
        "App Store review link will be added once we're live!",
      );
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
            onPress={() => handlePress(item)} // 🔥 Now calls our routing logic
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

// --- Use the static options export ---
export const options = {
  title: "About",
  // ✅ This uses the previous screen's title ("Settings")
  headerBackTitle: "Settings",
  headerBackTitleVisible: true,
};

const handleContactSupport = (type: "feedback" | "bug") => {
  const email = "chadzimmerman.codes@gmail.com";
  const subject =
    type === "bug"
      ? "🐛 Bug Report - Energe.ia App"
      : "✨ Feedback - Energe.ia App";

  const body =
    type === "bug"
      ? "Describe the bug:\n\nSteps to reproduce:\n\nDevice/OS:"
      : "Your feedback:";

  const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  Linking.canOpenURL(url)
    .then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Error", "No email app found on this device.");
      }
    })
    .catch((err) => console.error("An error occurred", err));
};

export default function AboutScreen() {
  return (
    <View style={aboutStyles.container}>
      <ScrollView style={aboutStyles.scrollView}>
        {/* Banner Section */}
        <View style={aboutStyles.banner}>
          <Text style={aboutStyles.logo}>
            {/* Placeholder for the Griffin icon */}
            {/* You would replace this with an actual Image component */}
            <Text style={{ fontSize: 40 }}>🐉</Text>
          </Text>
          <Text style={aboutStyles.versionText}>Version **0.0.2**</Text>
        </View>

        {/* Dynamic List Sections */}
        {ABOUT_DATA.map((section, index) => (
          <AboutSection key={index} section={section} />
        ))}
      </ScrollView>
    </View>
  );
}

const aboutStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F0F0", // Light gray background
  },
  scrollView: {
    flex: 1,
  },

  // Banner Styles
  banner: {
    backgroundColor: "#A737FD", // Gradient start purple (approx)
    paddingVertical: 30,
    alignItems: "center",
    marginBottom: 10,
    // Add a border radius to mimic the top corners of the card
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

  // List Section Styles
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
    flex: 1, // Allows it to push detail text to the right
    color: "#000000",
  },
  detailText: {
    fontSize: 16,
    color: "#A9A9A9", // Gray for detail text
    fontWeight: "500",
  },

  // Source Code Button Style
  sourceCodeButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#DCDCDC",
    marginTop: 10,
  },
  sourceCodeText: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "bold",
  },
});
