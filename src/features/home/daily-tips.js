/**
 * Daily Tips for Pump Home Screen
 * Returns gym-oriented motivational and educational tips
 */

const TIPS = [
  'Focus on form over weight—proper technique prevents injury and builds strength.',
  'Rest days are when your muscles grow. Honor them as much as workout days.',
  'Progressive overload wins. Increase weight, reps, or sets gradually each week.',
  'Stay hydrated. Drink water between sets, not just before and after.',
  'Warm up every session. 5 minutes of light cardio + dynamic stretches reduce injury risk.',
  'Track your workouts. What gets measured gets managed.',
  'Consistency beats intensity. Show up even when motivation is low.',
  'Sleep 7–9 hours. Muscle recovery happens during sleep, not in the gym.',
  'Eat protein with every meal. Aim for 0.7–1g per pound of body weight daily.',
  'Stretch after training. 10 minutes of static stretching improves mobility and recovery.',
  'Switch it up. Change exercises every 4–6 weeks to avoid plateaus.',
  'Mind the mind-muscle connection. Feel the exercise, don\'t just move weight.',
  'Deload week every 4 weeks. Take 50% volume to reset and prevent burnout.',
  'Celebrate small wins. Every rep is progress toward your goal.',
];

/**
 * Get the tip for today based on day of year
 * Deterministic: same tip for everyone on the same calendar day
 * @returns {string} The day's tip
 */
export function tipForToday() {
  // Calculate day of year (1–366)
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // Cycle through tips: 14 tips, so repeats every 14 days
  return TIPS[dayOfYear % TIPS.length];
}

export default TIPS;
