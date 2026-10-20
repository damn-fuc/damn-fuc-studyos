export const queryKeys = {
  tasks: (userId: string) => ['tasks', userId] as const,
  projects: (userId: string) => ['projects', userId] as const,
  milestones: (userId: string) => ['milestones', userId] as const,
  activities: (userId: string) => ['activities', userId] as const,
  activitiesForDate: (userId: string, date: string) => ['activities', userId, date] as const,
  dailyReview: (userId: string, date: string) => ['daily-review', userId, date] as const,
  weeklyReviews: (userId: string) => ['weekly-reviews', userId] as const,
  activityRange: (userId: string, start: string, end: string) => ['activities', userId, start, end] as const,
  weeklyReview: (userId: string, weekStart: string) => ['weekly-review', userId, weekStart] as const,
  settings: (userId: string) => ['settings', userId] as const,
  dashboard: (userId: string, today: string) => ['dashboard', userId, today] as const,
}
