import { Text, View } from "@/components/Themed"; // Assuming Themed components handle dark/light mode
import { useNavigation } from "@react-navigation/native";
import { Image, ScrollView, StyleSheet, TouchableOpacity } from "react-native";

// --- EXPORT THE STACK OPTIONS HERE ---
export const options = {
  title: "Settings",
  headerShown: false,
};

// --- Your MOCK_USER and settingsSections remain the same ---
const MOCK_USER = {
  name: "Novice Seraphim",
  username: "@NoviceSeraphim",
  level: 2,
  title: "Novice",
  avatarUrl: "https://placehold.co/100x100/6A5ACD/ffffff?text=W", // Placeholder for your avatar
  currentUsername: "NoviceSeraphim",
  currentPassword: "•".repeat(10),
};

const settingsSections = [
  {
    title: null, // Corresponds to Skills, Stats, Achievements in the image
    items: [
      {
        id: "achievements",
        label: "Achievements",
        action: "navigate",
      },
      { id: "monastery", label: "Monastery", action: "navigate" },
      { id: "journey", label: "Journey", action: "navigate" },
    ],
  },
  {
    title: "Town",
    items: [
      { id: "market", label: "Market", action: "navigate" },
      {
        id: "challenges",
        label: "Challenges",
        badge: "Winter",
        action: "navigate",
      },
      { id: "cathedral", label: "Cathedral", action: "navigate" },
    ],
  },
  {
    title: "Settings",
    items: [
      { id: "about", label: "About", action: "navigate" },
      { id: "subscription", label: "Subscription", action: "navigate" },
      { id: "username", label: "Username", action: "navigate" },
      { id: "password", label: "Password", action: "navigate" },
    ],
  },
];

const cautionSection = [
  {
    title: "Caution",
    items: [
      { id: "logout", label: "Logout", action: "navigate" },
      { id: "deleteAccount", label: "Delete Account", action: "navigate" },
    ],
  },
];

// --- Component 1: User Header ---
const UserHeader = ({ user }) => (
  <View style={headerStyles.headerContainer}>
    <View style={headerStyles.userInfo}>
      <Image source={{ uri: user.avatarUrl }} style={headerStyles.avatar} />
      <View style={headerStyles.textContainer}>
        <Text style={headerStyles.name}>{user.name}</Text>
        <Text style={headerStyles.username}>{user.username}</Text>
      </View>
    </View>
    <View style={headerStyles.iconRow}>
      <Text style={headerStyles.name}>Level 2. Novice</Text>{" "}
    </View>
  </View>
);

// --- Component 2: Settings Section (Grouped List) ---
const SettingsSection = ({ section, navigation }) => {
  const handlePress = (itemId) => {
    if (itemId === "about") {
      navigation.navigate("about");
    } else if (itemId == "market") {
      navigation.navigate("market");
    } else {
      console.log(`Navigating to ${itemId}`);
      // Add other navigation logic here (e.g., navigation.navigate(itemId))
    }
  };

  return (
    <View style={sectionStyles.sectionContainer}>
      {section.title && (
        <Text style={sectionStyles.sectionTitle}>{section.title}</Text>
      )}
      <View style={sectionStyles.list}>
        {section.items.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              sectionStyles.item,
              index < section.items.length - 1 && sectionStyles.separator,
            ]}
            onPress={() => handlePress(item.id)}
          >
            <Text style={sectionStyles.label}>{item.label}</Text>
            {item.badge && (
              <View style={sectionStyles.badge}>
                <Text style={sectionStyles.badgeText}>{item.badge}</Text>
              </View>
            )}
            <Text style={sectionStyles.arrow}>&gt;</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// --- Component 3: Caution Section ---
const CautionSection = ({ section }) => {
  return (
    <View style={sectionStyles.sectionContainer}>
      {/* Renders "Caution" title with normal section title styling */}
      {section.title && (
        <Text style={sectionStyles.sectionTitle}>{section.title}</Text>
      )}
      <View style={sectionStyles.list}>
        {section.items.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              sectionStyles.cautionItem,
              index < section.items.length - 1 && sectionStyles.separator,
            ]}
            onPress={() => console.log(`Action for ${item.id}`)}
          >
            {/* Use the new red text style, and do NOT include flex: 1 */}
            <Text style={sectionStyles.cautionLabel}>{item.label}</Text>
            {/* Note: The arrow and badge are intentionally omitted here */}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// --- Main Screen Component ---
export default function SettingsTabScreen() {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <UserHeader user={MOCK_USER} />
      <ScrollView style={styles.listContainer}>
        {settingsSections.map((section, index) => (
          <SettingsSection
            key={index}
            section={section}
            navigation={navigation}
          />
        ))}
        {cautionSection.map((section, index) => (
          <CautionSection key={`caution-${index}`} section={section} />
        ))}
      </ScrollView>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  headerContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    paddingTop: 40, // Adjust for status bar/notch
    backgroundColor: "#6A5ACD", // Your desired purple background
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#ffffff",
    marginRight: 10,
  },
  textContainer: {
    // Add background color here if not using Themed.View for this section
    backgroundColor: "transparent",
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
  },
  username: {
    fontSize: 14,
    color: "#DCDCDC",
  },
  iconRow: {
    flexDirection: "row",
    backgroundColor: "transparent",
  },
  icon: {
    fontSize: 20,
    color: "#ffffff",
    marginLeft: 15,
  },
});

const sectionStyles = StyleSheet.create({
  sectionContainer: {
    width: "100%",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#A9A9A9", // Light gray for section titles
    marginBottom: 5,
    textTransform: "uppercase",
  },
  list: {
    backgroundColor: "#FFFFFF", // White background for the grouped list items
    borderRadius: 10,
    overflow: "hidden", // Ensures separator respects border radius
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#DCDCDC",
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: "#FFFFFF", // Item background
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DCDCDC",
  },
  label: {
    fontSize: 16,
    flex: 1, // Allows it to take up available space
    color: "#000000",
  },
  badge: {
    backgroundColor: "#9370DB", // Purple color for the Winter badge
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 10,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  arrow: {
    fontSize: 16,
    color: "#A9A9A9",
    marginLeft: 10,
  },
  cautionItem: {
    // Override the default item styling for centering
    flexDirection: "row",
    justifyContent: "center", // Centers the text horizontally
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: "#FFFFFF",
  },
  cautionLabel: {
    fontSize: 16,
    fontWeight: "bold", // Make text bold for emphasis
    color: "#FF0000", // Bright Red text color
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F0F0", // Light gray background for the whole screen
  },
  listContainer: {
    flex: 1,
    paddingTop: 5,
  },
});
