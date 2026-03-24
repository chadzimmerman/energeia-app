-- ============================================================
-- CLASS QUEST LINES MIGRATION
-- Adds class-specific quest lines for all 4 classes.
-- Uses season = 'class_<classname>' as the group key so
-- existing checkStoryDrop next-part and reward logic works
-- without any changes to index.tsx.
-- ============================================================

-- Step 1: Add quest_line_type and class_key columns to seasonal_stories.
-- Keeping one table is intentional — user_story_progress links here by
-- story_id, so all existing checkStoryDrop logic works unchanged.
ALTER TABLE seasonal_stories
  ADD COLUMN IF NOT EXISTS quest_line_type VARCHAR NOT NULL DEFAULT 'seasonal',
  ADD COLUMN IF NOT EXISTS class_key VARCHAR;

-- Step 2: Add two new class quest reward items

-- Princess class quest reward
INSERT INTO items_master (name, description, type, required_class, cost, is_in_market, is_quest_reward, season, image_path)
VALUES (
  'Diadem of the Humble Queen',
  'A jeweled headpiece given to those who have learned that true nobility is found not in power, but in quiet service. Worn lightly.',
  'equippable', 'princess', 0, false, true, 'class_princess', 'placeholder'
);

-- Male Noble class quest reward
INSERT INTO items_master (name, description, type, required_class, cost, is_in_market, is_quest_reward, season, image_path)
VALUES (
  'Labarum of Constantine',
  'The Chi-Rho standard carried into battle by an emperor who believed. Passed only to those who have learned to rule without cruelty.',
  'equippable', 'nobleman', 0, false, true, 'class_noble', 'placeholder'
);

-- Step 3: Tag existing class quest reward items with their pseudo-season
UPDATE items_master SET season = 'class_monk'    WHERE name = 'Holy Robes of the Life-Giver';
UPDATE items_master SET season = 'class_fighter' WHERE name = 'Warrior''s Spring Sword';

-- Step 4: Insert Monk class quest line (5 parts)
INSERT INTO seasonal_stories
  (title, intro_text, completion_text, part_number, required_items_count, required_item_name,
   quest_type, boss_difficulty, reward_energeia, season, is_active, quest_line_type, class_key)
VALUES
(
  'The Call to Stillness',
  'The elder beckons you to the chapel. "Before you can pray, you must first learn silence," he says. "It is harder than it sounds." Complete your daily practice twenty times, and return.',
  'The rope grows heavy with repetition. Something in you has begun to settle. The elder says nothing — he just nods.',
  1, 20, 'practice completed', 'collection', null, 50, 'class_monk', true, 'class', 'monk'
),
(
  'The Fasting Trial',
  'The elder sets a simple rule-book on the table. "The body pulls the mind downward. Discipline it, and the mind begins to rise." Keep the fast fifteen times.',
  'Your body grows lighter, your thoughts clearer. You had not noticed how much noise hunger makes until it went quiet.',
  2, 15, 'day of fasting', 'collection', null, 75, 'class_monk', true, 'class', 'monk'
),
(
  'The Night Watch',
  'Evening bells ring through the stone corridors. "Now you must learn to pray through the dark hours," the elder says. "Something opens at night that does not open in the day." Keep the vigil twenty-five times.',
  'You stand in the grey before dawn, trembling — not from cold, but from something that passed through you in the silence.',
  3, 25, 'vigil kept', 'collection', null, 100, 'class_monk', true, 'class', 'monk'
),
(
  'The Battle Within',
  'A heaviness settles over your cell. The elder warned you: the real struggle is not outside. "What comes for you now," he said, "wears many faces. Meet it with everything you have learned." Complete your rule thirty times to push through it.',
  'The heaviness lifts. You do not feel victorious — only quieter, and somehow more solid. The elder smiles: "Now you know what the work is for."',
  4, 300, null, 'fight', 3, 150, 'class_monk', true, 'class', 'monk'
),
(
  'The Robe',
  'The elder stands before you holding folded cloth. "You have survived what most run from," he says. "This robe is for those who have chosen to stay." Complete your practice ten final times.',
  'The robes are placed over your shoulders. You are clothed in something older than words. You understand now why the elder smiles so rarely — and why, when he does, it means everything.',
  5, 10, 'practice completed', 'collection', null, 200, 'class_monk', true, 'class', 'monk'
);

-- Step 5: Insert Fighter class quest line (5 parts)
INSERT INTO seasonal_stories
  (title, intro_text, completion_text, part_number, required_items_count, required_item_name,
   quest_type, boss_difficulty, reward_energeia, season, is_active, quest_line_type, class_key)
VALUES
(
  'The Oath of Arms',
  'The old knight leans on his sword in the dust of the yard. "Every great warrior I''ve known began here," he says. "Not in glory — in mud and repetition." Show him twenty days of discipline.',
  'Your muscles ache. Your spirit is sharpening. The knight does not praise you. He simply says: "Again tomorrow."',
  1, 20, 'training session', 'collection', null, 50, 'class_fighter', true, 'class', 'fighter'
),
(
  'The Fast Before Battle',
  'The knight sets down his cup. "A man who cannot go without eating cannot go without anything. Fast fifteen times before your next campaign. See what is left of you."',
  'You break the fast with a full chest. Something in you has been tested and held. You feel ready for more than food.',
  2, 15, 'day of fasting', 'collection', null, 75, 'class_fighter', true, 'class', 'fighter'
),
(
  'The Dragon of the East',
  'Word arrives from the eastern villages: something old and terrible has come down from the hills. You ride out alone. You have your sword and whatever you have built in the weeks before.',
  'The creature falls at the edge of the forest. The villagers come out slowly, not quite believing. You plant your sword in the earth and stand still for a long moment.',
  3, 250, null, 'fight', 3, 100, 'class_fighter', true, 'class', 'fighter'
),
(
  'The Trial of Resolve',
  'The powerful demand that you abandon what you stand for. You refuse. Now the pressure mounts — not from swords, but from whispers and cold rooms and long waiting. Hold your ground twenty times.',
  'They could not move you. The room goes quiet. Someone near the door says, almost too soft to hear: "This one cannot be bought."',
  4, 20, 'act of resolve', 'collection', null, 150, 'class_fighter', true, 'class', 'fighter'
),
(
  'The Blessed Blade',
  'The final battle has come. The old bishop meets you at the gate before dawn and draws a sign over your sword without a word. "You know what this is for," he says. "Go."',
  'The field is quiet when it ends. The sword catches the first light and seems, for a moment, to hold it. The knight was right about something: glory is not loud.',
  5, 400, null, 'fight', 3, 200, 'class_fighter', true, 'class', 'fighter'
);

-- Step 6: Insert Princess class quest line (5 parts)
INSERT INTO seasonal_stories
  (title, intro_text, completion_text, part_number, required_items_count, required_item_name,
   quest_type, boss_difficulty, reward_energeia, season, is_active, quest_line_type, class_key)
VALUES
(
  'The Duties of the Court',
  'Your governess sets a list before you. "A princess who does not know what her household needs will not know what her kingdom needs. Twenty duties. Begin." ',
  'The servants move more easily. Something in the court has shifted — lighter, somehow. Your mother passes the doorway and pauses. "A small thing," she says. "Keep going."',
  1, 20, 'duty fulfilled', 'collection', null, 50, 'class_princess', true, 'class', 'princess'
),
(
  'The Almsgiving',
  'Outside the palace walls, the poor wait. An old woman hands you a basket. "The court forgets what the city looks like," she says quietly. "Go fifteen times, and remember."',
  'A child presses a small flower into your hand on the way back. You tuck it into your sleeve. You have never felt so wealthy.',
  2, 15, 'alms given', 'collection', null, 75, 'class_princess', true, 'class', 'princess'
),
(
  'The Siege',
  'Enemies close the gates. The men ride to battle. You remain — keeping the stores, steadying the frightened, praying before the old icon in the corner chapel. The city depends on you holding together. Defend it.',
  'The gates hold. A strange stillness settles over the chapel after it is done. The elder who tends the icon says quietly: "It was not the soldiers."',
  3, 250, null, 'fight', 2, 100, 'class_princess', true, 'class', 'princess'
),
(
  'The Betrothal Test',
  'Suitors arrive with titles and promises. Your mother sits beside you. "You will know the right choice," she says, "not from what they offer — from what they do not say." Demonstrate wisdom twenty times before you answer.',
  'You send them away. The court erupts. You go to your room and feel, for the first time in months, that you have been entirely yourself.',
  4, 20, 'act of wisdom', 'collection', null, 150, 'class_princess', true, 'class', 'princess'
),
(
  'The Diadem',
  'On a quiet morning, an elder places a diadem in your hands. "This is not the crown they give in ceremonies," she says. "This one is earned in secret, by those who served when no one was watching." Complete your final prayers.',
  'You place it gently on your head, alone in the room. There is no audience. That is the point.',
  5, 15, 'prayer', 'collection', null, 200, 'class_princess', true, 'class', 'princess'
);

-- Step 7: Insert Male Noble class quest line (5 parts)
INSERT INTO seasonal_stories
  (title, intro_text, completion_text, part_number, required_items_count, required_item_name,
   quest_type, boss_difficulty, reward_energeia, season, is_active, quest_line_type, class_key)
VALUES
(
  'The Weight of the Seal',
  'Your steward places a stack of petitions on the table. "My lord, they have been waiting." Twenty judgments await your seal. Each one is someone''s life. Rule well.',
  'The petitioners leave. Your chamberlain looks at you differently. "Word has already reached the next province," he says.',
  1, 20, 'judgment rendered', 'collection', null, 50, 'class_noble', true, 'class', 'nobleman'
),
(
  'The Tithe',
  'The bishop arrives with his ledger and sets it open without preamble. "A lord who takes and does not give is not ruling — he is consuming. Render the tithe fifteen times."',
  'The bishop closes his ledger. Your hall feels, somehow, more open than it did before.',
  2, 15, 'tithe rendered', 'collection', null, 75, 'class_noble', true, 'class', 'nobleman'
),
(
  'The Rebellion',
  'A rival lord has stirred up your serfs with old grievances — some fair, some poisoned. You ride out without an army. Force would end it quickly and badly. Earn their trust back instead.',
  'The rival disappears south by nightfall. Your serfs do not cheer — but they do not flee. One old farmer meets your eyes. That is enough.',
  3, 280, null, 'fight', 3, 100, 'class_noble', true, 'class', 'nobleman'
),
(
  'The King''s Test',
  'The king summons you. He does not explain. In the throne room, surrounded by men who want things, you are asked simply to give counsel — twenty times, honestly, even when it costs you.',
  'The session ends. Most of the other lords are angry with you. The king is not. He says only: "You may go." That is higher praise than you expected.',
  4, 20, 'wise counsel given', 'collection', null, 150, 'class_noble', true, 'class', 'nobleman'
),
(
  'The Labarum',
  'A foreign prince has crossed the border. You are asked to lead the defense — not as a soldier, but as a sovereign. You carry the old standard into the field. Your men watch to see if you believe in what you''re holding.',
  'Peace returns. You bring the standard back to the hall and hang it without ceremony. The Labarum of Constantine was not won today — it was only recognized. You have always been carrying it.',
  5, 350, null, 'fight', 3, 200, 'class_noble', true, 'class', 'nobleman'
);
