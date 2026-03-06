# Energe.ia

[![Platform](https://img.shields.io/badge/Platform-iOS-blue.svg)](https://developer.apple.com/ios/)
[![Status](https://img.shields.io/badge/Status-Closed_Alpha-orange.svg)](https://energe.ia)
[![Tech Stack](https://img.shields.io/badge/Stack-React_Native_|_Expo_|_Supabase-86cf35.svg)](https://reactnative.dev/)

**Energe.ia** is a gamified habit-tracking application that transforms personal growth into a medieval, retro-styled RPG adventure. Heavily influenced by Eastern Orthodox theology and medieval aesthetics, the app serves as a "cozy" digital sanctuary for those seeking to cultivate virtue and excise vice.

---

## ⚔️ The Concept: Growth Through "Energeia"

In Orthodox theology, *Energeia* refers to the divine energies — the outward expression of God's grace, accessible to those who strive toward *theosis* (union with God). In this app, your character is a direct reflection of your real-world choices.

- **Virtue & Vice**: Earn Energeia by completing positive habits. Falling into bad habits costs HP and degrades your streak.
- **RPG Progression**: Choose from 3 starter classes, each with unique stat bonuses. Grow in power and unlock armor, weapons, and items from the **Market**.
- **Death & Resurrection**: If your HP reaches zero, you fall — losing your level, energeia, and a random item. But the righteous fall seven times and rise again. *(Proverbs 24:16)*
- **Aesthetic**: Pixel art, retro "low-fi" vibe inspired by Stardew Valley and Byzantine icon tradition.

---

## 🎮 Alpha Features (Current Build)

### Character System
- Email + password authentication with persistent accounts across devices
- Character creation with class selection (Fighter, Monk, Noble, Princess) and username
- Animated character display with health and energeia bars
- Class-specific stat bonuses:
  - **Monk** — +10% to XP earned per habit completion
  - **Noble** — +10% to energeia coin wallet per habit completion
  - **Fighter** — +10% damage to bosses *(boss system in development)*

### Habit Tracking
- Create habits as positive, negative, or both
- 4-tier streak color system:
  - 🔴 Red (streak < 0) — 25% heavier penalty, no bonus
  - 🟡 Yellow (streak = 0) — base stats, no bonus
  - 🟢 Green (streak 1–6) — +1 energeia bonus, 25% lighter penalty
  - 🔵 Blue (streak ≥ 7) — +2 energeia bonus, 50% lighter penalty
- Difficulty scaling (1–10) affects reward and damage magnitude
- Equipped item bonuses apply to XP earned

### Death System
- HP hitting zero triggers a full-screen death modal with gendered angel artwork
- Penalties: reset to Level 1, wipe all energeia (XP and coins), lose one random inventory item
- Orthodox-themed resurrection text with "Rise Again" button

### Calendar
- Color-coded daily habit log (green = completed, red = failed)
- Notes per day, editable log entries
- Bottom habit tracking header

### Seasonal Stories
- 4 seasonal quest arcs (Winter, Spring, Summer, Autumn), 3 parts each
- Items drop randomly on habit completion while a quest is active (~1 in 6 chance)
- Completing a final part rewards energeia and a unique seasonal item
- Unlocks the next part automatically on completion

### Market & Inventory
- Buy items with energeia currency
- Exclusive items (one-purchase) and stackable items
- Item stacking display in inventory
- Equipped items grant hidden stat bonuses

### Achievements
- Tracked milestones awarded automatically on qualifying events

### Settings
- Change username and password in-app
- Account deletion with confirmation
- Profile display with character image, level, and class badge

---

## 🛠️ Technical Stack

- **Frontend:** React Native with Expo SDK 54, Expo Router (file-based navigation)
- **Backend & Database:** Supabase (PostgreSQL) — auth, row-level security, real-time data
- **Authentication:** Supabase email + password auth with persistent sessions via AsyncStorage
- **Navigation:** 4-tab layout (Habits, Calendar, Items, Settings) with nested stacks
- **Monetization (Upcoming):** Apple In-App Purchases via StoreKit / RevenueCat for subscription tiers

---

## 📊 Habit Tracking & Behavioral Design

Energe.ia isn't just a game — it's a tool for self-mastery:

- **Streak Tracking:** A 4-tier color system shows momentum and rewards consistency
- **Calendar Logs:** Visual color-coded grid tracks daily habit patterns over time
- **Seasonal Quests:** Time-gated narrative arcs tied to the Orthodox liturgical calendar provide long-term engagement goals
- **Theological Grounding:** Mechanics are designed around Orthodox ascetic practice — fasting, prayer, almsgiving — not arbitrary gamification

---

## 🗺️ Roadmap

- [x] Character creation and class selection
- [x] Email/password authentication
- [x] Habit scoring with streak tiers and class bonuses
- [x] Death and resurrection mechanic
- [x] Seasonal story quest system (4 seasons × 3 parts)
- [x] Market with energeia currency
- [x] Inventory with item stacking
- [x] Calendar with color-coded habit logs
- [x] Achievements system
- [x] Settings (username, password, account deletion)
- [ ] **Class Quest Map** — pixel art scrollable node map per class (in design)
- [ ] **Party System** — social groups, shared quests, and accountability partners
- [ ] **Boss Encounters** — fighter class damage bonuses applied here
- [ ] **Apple In-App Purchases** — subscription tiers for premium classes and seasonal gear
- [ ] **Push Notifications** — daily habit reminders and streak warnings

---

## 🔒 Private Alpha

*This repository is currently private during closed alpha to protect intellectual property and user privacy. Documentation and code samples are available for review upon request.*

*Bug reports and feedback from alpha testers are tracked via [GitHub Discussions](../../discussions).*
