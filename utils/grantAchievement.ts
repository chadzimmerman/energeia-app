import { supabase } from './supabase';

/**
 * Grants an achievement to the user. Safe to call repeatedly —
 * upsert ensures no duplicate rows if already earned.
 */
export const grantAchievement = async (
  userId: string,
  achievementId: string
): Promise<void> => {
  await supabase
    .from('user_achievements')
    .upsert(
      { user_id: userId, achievement_id: achievementId, is_achieved: true },
      { onConflict: 'user_id,achievement_id' }
    );
};
