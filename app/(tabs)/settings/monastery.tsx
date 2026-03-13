import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { resolveCharacterImage } from "@/utils/resolveCharacterImage";
import { resolveItemImage } from "@/utils/resolveItemImage";
import { useFocusEffect } from "expo-router";

const CLASS_HUB_LABEL: Record<string, string> = {
  monk: "Monastery",
  noble: "Court",
  fighter: "Barracks",
};

const CLASS_HUB_DESCRIPTION: Record<string, string> = {
  monk: "A community of monks walking together in prayer and discipline.",
  noble: "A court of nobles bound together by honor and purpose.",
  fighter: "A company of warriors standing together in battle.",
};

const MAX_MEMBERS = 4;

interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
}

interface Member {
  id: string;
  handle: string;
  player_class: string;
  level: number;
  current_health: number;
  max_health: number;
  current_energeia: number;
  character_image_path: string;
}

interface ActiveQuest {
  progress_id: string;
  quest_id: number;
  current_count: number;
  title: string;
  quest_type: string;
  required_count: number;
  required_item_name: string;
  boss_difficulty: number | null;
  part_number: number;
  quest_image: string | null;
}

const QUEST_IMAGE_MAP: Record<string, ImageSourcePropType> = {
  "spring-cleaning-temp": require("@/assets/sprites/quests/spring-cleaning-temp.jpg"),
  "temp-witch":            require("@/assets/sprites/quests/temp-witch.jpg"),
  "quest-placeholder":     require("@/assets/sprites/quests/quest-placeholder.png"),
};

interface QuestScrollItem {
  inventoryId: string;
  quantity: number;
  itemName: string;
  imagePath: string;
  quest: { id: number; title: string };
}

// ── Mini stat bar ──────────────────────────────────────────────────────────
const MiniBar = ({ value, max, color }: { value: number; max: number; color: string }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <View style={barStyles.track}>
      <View style={[barStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      <Text style={barStyles.label}>{value}/{max}</Text>
    </View>
  );
};

// ── Member card ────────────────────────────────────────────────────────────
const MemberCard = ({ member }: { member: Member }) => {
  const maxEnergy = 100 + (member.level - 1) * 20;
  const charImg = resolveCharacterImage(member.character_image_path, member.level);
  const classLabel = member.player_class
    ? member.player_class.charAt(0).toUpperCase() + member.player_class.slice(1)
    : "—";

  return (
    <View style={cardStyles.card}>
      <Image source={charImg} style={cardStyles.portrait} resizeMode="contain" />
      <View style={cardStyles.info}>
        <Text style={cardStyles.handle}>{member.handle ?? "Pilgrim"}</Text>
        <Text style={cardStyles.meta}>{classLabel} · Lv {member.level ?? 1}</Text>
        <View style={cardStyles.barRow}>
          <Image
            source={require("@/assets/sprites/ui-elements/pixel-heart-icon.png")}
            style={cardStyles.barIcon}
          />
          <MiniBar value={member.current_health ?? 0} max={member.max_health ?? 20} color="#C81E32" />
        </View>
        <View style={cardStyles.barRow}>
          <Image
            source={require("@/assets/sprites/ui-elements/pixel-energy-icon.png")}
            style={cardStyles.barIcon}
          />
          <MiniBar value={member.current_energeia ?? 0} max={maxEnergy} color="#FFD700" />
        </View>
      </View>
    </View>
  );
};

// ── Main screen ────────────────────────────────────────────────────────────
export default function MonasteryScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [playerClass, setPlayerClass] = useState<string>("monk");
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeQuest, setActiveQuest] = useState<ActiveQuest | null>(null);
  const [questScrolls, setQuestScrolls] = useState<QuestScrollItem[]>([]);
  const [questPickerVisible, setQuestPickerVisible] = useState(false);

  const hubLabel = CLASS_HUB_LABEL[playerClass?.toLowerCase()] ?? "Monastery";
  const hubDesc =
    CLASS_HUB_DESCRIPTION[playerClass?.toLowerCase()] ?? CLASS_HUB_DESCRIPTION.monk;

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("group_id, player_class")
      .eq("id", user.id)
      .single();

    if (!profile) { setLoading(false); return; }
    setPlayerClass(profile.player_class ?? "monk");

    if (profile.group_id) {
      const { data: groupData } = await supabase
        .from("groups").select("*").eq("id", profile.group_id).single();

      const { data: membersData } = await supabase
        .from("profiles")
        .select("id, handle, player_class, level, current_health, max_health, current_energeia, character_image_path")
        .eq("group_id", profile.group_id);

      setGroup(groupData ?? null);
      setMembers(membersData ?? []);

      // Active group quest
      const { data: progressRow } = await supabase
        .from("group_story_progress")
        .select("id, quest_id, current_count, group_quests(title, quest_type, required_count, required_item_name, boss_difficulty, part_number, quest_image)")
        .eq("group_id", profile.group_id)
        .eq("is_completed", false)
        .order("quest_id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (progressRow) {
        const q = progressRow.group_quests as any;
        setActiveQuest({
          progress_id: progressRow.id,
          quest_id: progressRow.quest_id,
          current_count: progressRow.current_count,
          title: q.title,
          quest_type: q.quest_type,
          required_count: q.required_count,
          required_item_name: q.required_item_name,
          boss_difficulty: q.boss_difficulty,
          part_number: q.part_number,
          quest_image: q.quest_image ?? null,
        });
      } else {
        setActiveQuest(null);
      }
    } else {
      setGroup(null);
      setMembers([]);
      setActiveQuest(null);
    }

    // Load quest scrolls from inventory.
    // Quest scrolls are identified by image_path prefix "help-wanted".
    // Each scroll can start any available part-1 quest.
    const { data: scrollMaster } = await supabase
      .from("items_master")
      .select("id, name, image_path")
      .eq("image_path", "help-wanted-scroll")
      .maybeSingle();

    if (scrollMaster) {
      const { data: invItem } = await supabase
        .from("user_inventory")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("item_master_id", scrollMaster.id)
        .maybeSingle();

      if (invItem && invItem.quantity > 0) {
        const { data: part1Quests } = await supabase
          .from("group_quests")
          .select("id, title")
          .eq("part_number", 1)
          .is("previous_part_id", null);

        const scrolls: QuestScrollItem[] = (part1Quests ?? []).map((q) => ({
          inventoryId: invItem.id,
          quantity: invItem.quantity,
          itemName: scrollMaster.name,
          imagePath: scrollMaster.image_path,
          quest: { id: q.id, title: q.title },
        }));
        setQuestScrolls(scrolls);
      } else {
        setQuestScrolls([]);
      }
    } else {
      setQuestScrolls([]);
    }

    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadData();
  }, [loadData]));

  async function handleCreate() {
    if (!groupName.trim()) {
      Alert.alert("Name Required", "Please enter a name for your group.");
      return;
    }
    setSaving(true);
    const { data: newGroup, error } = await supabase
      .from("groups")
      .insert({ name: groupName.trim(), created_by: userId })
      .select().single();

    if (error || !newGroup) {
      Alert.alert("Error", "Could not create group. Please try again.");
      setSaving(false);
      return;
    }
    await supabase.from("profiles").update({ group_id: newGroup.id }).eq("id", userId);
    setSaving(false);
    setCreateModalVisible(false);
    setGroupName("");
    loadData();
  }

  async function handleJoin() {
    const code = inviteCodeInput.trim().toUpperCase();
    if (!code) {
      Alert.alert("Code Required", "Enter the invite code from your friend.");
      return;
    }
    setSaving(true);
    const { data: foundGroup, error } = await supabase
      .from("groups").select("id").eq("invite_code", code).single();

    if (error || !foundGroup) {
      Alert.alert("Not Found", "No group found with that code. Check and try again.");
      setSaving(false);
      return;
    }
    const { count } = await supabase
      .from("profiles").select("id", { count: "exact", head: true }).eq("group_id", foundGroup.id);

    if ((count ?? 0) >= MAX_MEMBERS) {
      Alert.alert("Group Full", "This group already has 4 members.");
      setSaving(false);
      return;
    }
    await supabase.from("profiles").update({ group_id: foundGroup.id }).eq("id", userId);
    setSaving(false);
    setJoinModalVisible(false);
    setInviteCodeInput("");
    loadData();
  }

  async function handleStartQuest(scroll: QuestScrollItem) {
    if (!group) return;
    setQuestPickerVisible(false);
    Alert.alert(
      "Start Quest",
      `Use your ${scroll.itemName} to begin "${scroll.quest.title}"? The scroll will be consumed and cannot be recovered.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Begin Quest", onPress: async () => {
            // Create shared progress row for the group
            const { error } = await supabase.from("group_story_progress").insert({
              group_id: group.id,
              quest_id: scroll.quest.id,
              current_count: 0,
              is_completed: false,
            });

            if (error) {
              Alert.alert("Error", "Could not start quest. Please try again.");
              return;
            }

            // Consume the scroll
            if (scroll.quantity > 1) {
              await supabase
                .from("user_inventory")
                .update({ quantity: scroll.quantity - 1 })
                .eq("id", scroll.inventoryId);
            } else {
              await supabase.from("user_inventory").delete().eq("id", scroll.inventoryId);
            }

            loadData();
          },
        },
      ]
    );
  }

  async function handleAbandonQuest() {
    Alert.alert(
      "Abandon Quest",
      "End this quest for the whole group? Progress will be lost and the scroll will not be returned.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Abandon", style: "destructive", onPress: async () => {
            if (!activeQuest) return;
            await supabase
              .from("group_story_progress")
              .delete()
              .eq("id", activeQuest.progress_id);
            setActiveQuest(null);
          },
        },
      ]
    );
  }

  async function handleLeave() {
    Alert.alert("Leave Group", `Are you sure you want to leave ${group?.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave", style: "destructive",
        onPress: async () => {
          await supabase.from("profiles").update({ group_id: null }).eq("id", userId);
          setGroup(null);
          setMembers([]);
        },
      },
    ]);
  }

  async function handleShare() {
    if (!group) return;
    await Share.share({
      message: `Join my ${hubLabel} in Energe.ia!\nInvite code: ${group.invite_code}`,
    });
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.screenTitle}>{hubLabel}</Text>
      <Text style={s.description}>{hubDesc}</Text>

      {!group ? (
        <View style={s.noGroupContainer}>
          <Text style={s.noGroupText}>
            You are not part of a group yet. Create one or join a friend's to work on quests together.
          </Text>
          <TouchableOpacity style={s.primaryBtn} onPress={() => setCreateModalVisible(true)}>
            <Text style={s.primaryBtnText}>Create a Group</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={() => setJoinModalVisible(true)}>
            <Text style={s.secondaryBtnText}>Join with Invite Code</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {/* Group info card */}
          <View style={s.groupCard}>
            <Text style={s.groupName}>{group.name}</Text>
            <Text style={s.inviteLabel}>Invite Code</Text>
            <Text style={s.inviteCode}>{group.invite_code}</Text>
            <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
              <Text style={s.shareBtnText}>Share Invite</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.sectionHeader}>Members ({members.length}/{MAX_MEMBERS})</Text>
          {members.map((m) => <MemberCard key={m.id} member={m} />)}

          {/* Quest section */}
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeader}>Group Quest</Text>
            {!activeQuest && questScrolls.length > 0 && (
              <TouchableOpacity style={s.addQuestBtn} onPress={() => setQuestPickerVisible(true)}>
                <Text style={s.addQuestBtnText}>+ Add Quest</Text>
              </TouchableOpacity>
            )}
          </View>
          {activeQuest ? (
            <View style={s.questCard}>
              {activeQuest.quest_image && QUEST_IMAGE_MAP[activeQuest.quest_image] && (
                <Image
                  source={QUEST_IMAGE_MAP[activeQuest.quest_image]}
                  style={s.questImage}
                  resizeMode="contain"
                />
              )}
              <Text style={s.questTitle}>{activeQuest.title}</Text>
              <Text style={s.questMeta}>
                Part {activeQuest.part_number} ·{" "}
                {activeQuest.quest_type === "fight"
                  ? `Boss Fight (Difficulty ${activeQuest.boss_difficulty})`
                  : "Collection"}
              </Text>
              <Text style={s.questItemLabel}>
                {activeQuest.required_item_name}: {activeQuest.current_count}/{activeQuest.required_count}
              </Text>
              <View style={s.questBarTrack}>
                <View
                  style={[
                    s.questBarFill,
                    {
                      width: `${Math.min((activeQuest.current_count / activeQuest.required_count) * 100, 100)}%`,
                      backgroundColor: activeQuest.quest_type === "fight" ? "#C81E32" : "#9370DB",
                    },
                  ]}
                />
              </View>
              <TouchableOpacity style={s.abandonBtn} onPress={handleAbandonQuest}>
                <Text style={s.abandonBtnText}>Abandon Quest</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.questPlaceholder}>
              <Text style={s.questPlaceholderTitle}>No Active Quest</Text>
              <Text style={s.questPlaceholderText}>
                {questScrolls.length > 0
                  ? "You have quest notices in your inventory. Tap \"+ Add Quest\" to begin one."
                  : `Complete positive habits to find a Help Wanted Notice. When someone in your ${hubLabel} finds one, they can start a quest for the whole group.`}
              </Text>
            </View>
          )}

          <TouchableOpacity style={s.leaveBtn} onPress={handleLeave}>
            <Text style={s.leaveBtnText}>Leave Group</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Name Your {hubLabel}</Text>
            <TextInput
              style={s.input}
              placeholder='e.g. "The Desert Fathers"'
              placeholderTextColor="#aaa"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={40}
            />
            <TouchableOpacity style={[s.primaryBtn, saving && s.disabledBtn]} onPress={handleCreate} disabled={saving}>
              <Text style={s.primaryBtnText}>{saving ? "Creating..." : "Create"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => { setCreateModalVisible(false); setGroupName(""); }}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Join Modal */}
      <Modal visible={joinModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Join a Group</Text>
            <Text style={s.modalSubtext}>Enter the 6-character invite code from a friend.</Text>
            <TextInput
              style={[s.input, s.codeInput]}
              placeholder="ABC123"
              placeholderTextColor="#aaa"
              value={inviteCodeInput}
              onChangeText={(t) => setInviteCodeInput(t.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={[s.primaryBtn, saving && s.disabledBtn]} onPress={handleJoin} disabled={saving}>
              <Text style={s.primaryBtnText}>{saving ? "Joining..." : "Join"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => { setJoinModalVisible(false); setInviteCodeInput(""); }}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Quest Picker Modal */}
      <Modal visible={questPickerVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Choose a Quest</Text>
            <Text style={s.modalSubtext}>Select a notice from your inventory to begin a quest for your group.</Text>
            {questScrolls.map((scroll) => (
              <TouchableOpacity
                key={scroll.inventoryId}
                style={s.scrollPickerRow}
                onPress={() => handleStartQuest(scroll)}
              >
                <Image
                  source={resolveItemImage(scroll.imagePath)}
                  style={s.scrollPickerImage}
                  resizeMode="contain"
                />
                <View style={s.scrollPickerInfo}>
                  <Text style={s.scrollPickerName}>{scroll.itemName}</Text>
                  <Text style={s.scrollPickerQuest}>{scroll.quest.title}</Text>
                  <Text style={s.scrollPickerQty}>x{scroll.quantity} in inventory</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.cancelBtn} onPress={() => setQuestPickerVisible(false)}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ── Member card styles ─────────────────────────────────────────────────────
const cardStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ddd",
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  portrait: {
    width: 72,
    height: 72,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#ccc",
    marginRight: 12,
  },
  info: { flex: 1, gap: 4 },
  handle: { fontSize: 15, fontWeight: "700", color: "#333" },
  meta: { fontSize: 12, color: "#888", marginBottom: 2 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  barIcon: { width: 16, height: 16, resizeMode: "contain" },
});

const barStyles = StyleSheet.create({
  track: {
    flex: 1,
    height: 16,
    backgroundColor: "#e8e8e8",
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ccc",
    justifyContent: "center",
  },
  fill: {
    position: "absolute",
    left: 0, top: 0, bottom: 0,
    borderRadius: 3,
  },
  label: {
    fontSize: 9,
    color: "#333",
    textAlign: "center",
    fontWeight: "600",
    zIndex: 1,
  },
});

// ── Screen styles ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F0F0" },
  content: { padding: 16, paddingBottom: 60 },
  screenTitle: { fontSize: 26, fontWeight: "bold", color: "#333", marginBottom: 4 },
  description: { fontSize: 14, color: "#888", marginBottom: 20, lineHeight: 20 },
  noGroupContainer: { gap: 12 },
  noGroupText: { fontSize: 15, color: "#555", marginBottom: 8, lineHeight: 22 },
  primaryBtn: {
    backgroundColor: "#9370DB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  disabledBtn: { opacity: 0.5 },
  primaryBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  secondaryBtn: {
    borderColor: "#9370DB",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#9370DB", fontWeight: "bold", fontSize: 15 },
  groupCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ddd",
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  groupName: { fontSize: 20, fontWeight: "bold", color: "#333", marginBottom: 10 },
  inviteLabel: {
    fontSize: 11,
    color: "#888",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  inviteCode: {
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 8,
    color: "#9370DB",
    marginBottom: 12,
  },
  shareBtn: {
    backgroundColor: "#9370DB",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  shareBtnText: { color: "#fff", fontWeight: "600" },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#888",
    textTransform: "uppercase",
  },
  addQuestBtn: {
    backgroundColor: "#9370DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addQuestBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  questPlaceholder: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  questPlaceholderTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#aaa",
    marginBottom: 6,
  },
  questPlaceholderText: {
    color: "#aaa",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  leaveBtn: {
    borderColor: "#E74C3C",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  leaveBtnText: { color: "#E74C3C", fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#333", marginBottom: 4 },
  modalSubtext: { color: "#888", fontSize: 14, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f9f9f9",
  },
  codeInput: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 6,
  },
  cancelBtn: { paddingVertical: 12, alignItems: "center" },
  cancelBtnText: { color: "#aaa", fontSize: 14 },
  questCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ddd",
    padding: 16,
    marginBottom: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  questTitle: { fontSize: 17, fontWeight: "700", color: "#333", textAlign: "center" },
  questMeta: { fontSize: 12, color: "#888", textAlign: "center" },
  questItemLabel: { fontSize: 13, color: "#555", textAlign: "center" },
  questBarTrack: {
    height: 14,
    backgroundColor: "#e8e8e8",
    borderRadius: 7,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  questBarFill: {
    position: "absolute",
    left: 0, top: 0, bottom: 0,
    borderRadius: 6,
  },
  abandonBtn: {
    borderColor: "#E74C3C",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  abandonBtnText: { color: "#E74C3C", fontWeight: "600", fontSize: 14 },
  questImage: {
    width: 180,
    height: 180,
    borderRadius: 8,
    marginBottom: 4,
    alignSelf: "center",
  },
  scrollPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    gap: 12,
  },
  scrollPickerImage: { width: 56, height: 56, borderRadius: 6 },
  scrollPickerInfo: { flex: 1 },
  scrollPickerName: { fontSize: 15, fontWeight: "700", color: "#333" },
  scrollPickerQuest: { fontSize: 12, color: "#9370DB", marginTop: 2 },
  scrollPickerQty: { fontSize: 11, color: "#aaa", marginTop: 2 },
});
