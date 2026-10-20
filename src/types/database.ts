export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type StudyCategory = 'java' | 'ai' | 'research' | 'other'
export type TaskStatus = 'todo' | 'doing' | 'done' | 'canceled'
export type TaskPriority = 'low' | 'medium' | 'high'
export type ProjectKind = 'learning' | 'research'
export type ProjectStatus = 'active' | 'paused' | 'completed'
export type MilestoneStatus = 'todo' | 'doing' | 'done'
export type ThemePreference = 'light' | 'dark' | 'system'

type TableShape<Row, RequiredInsert extends keyof Row> = {
  Row: Row
  Insert: Pick<Row, RequiredInsert> & Partial<Omit<Row, RequiredInsert>>
  Update: Partial<Omit<Row, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  Relationships: []
}

type TimestampColumns = {
  created_at: string
  updated_at: string
}

export type ProjectRow = TimestampColumns & {
  id: string
  user_id: string
  name: string
  description: string
  kind: ProjectKind
  status: ProjectStatus
  goal: string
  external_links: Json
  archived_at: string | null
}

export type MilestoneRow = TimestampColumns & {
  id: string
  user_id: string
  project_id: string
  title: string
  description: string
  due_date: string | null
  status: MilestoneStatus
  sort_order: number
}

export type TaskRow = TimestampColumns & {
  id: string
  user_id: string
  title: string
  description: string
  category: StudyCategory
  status: TaskStatus
  priority: TaskPriority
  scheduled_date: string | null
  due_date: string | null
  completed_at: string | null
  project_id: string | null
  milestone_id: string | null
}

export type ActivityLogRow = TimestampColumns & {
  id: string
  user_id: string
  activity_date: string
  category: StudyCategory
  title: string
  content: string
  duration_minutes: number
  notes: string
  project_id: string | null
}

export type DailyReviewRow = TimestampColumns & {
  id: string
  user_id: string
  review_date: string
  wins: string
  difficulties: string
  tomorrow_plan: string
}

export type WeeklyReviewRow = TimestampColumns & {
  id: string
  user_id: string
  week_start: string
  outcomes: string
  problems: string
  next_week_goals: string
}

export type UserSettingsRow = TimestampColumns & {
  id: string
  user_id: string
  display_name: string
  timezone: string
  weekly_goal_minutes: number
  theme: ThemePreference
}

export type Database = {
  public: {
    Tables: {
      projects: TableShape<ProjectRow, 'user_id' | 'name'>
      milestones: TableShape<MilestoneRow, 'user_id' | 'project_id' | 'title'>
      tasks: TableShape<TaskRow, 'user_id' | 'title'>
      activity_logs: TableShape<ActivityLogRow, 'user_id' | 'activity_date' | 'category' | 'title' | 'duration_minutes'>
      daily_reviews: TableShape<DailyReviewRow, 'user_id' | 'review_date'>
      weekly_reviews: TableShape<WeeklyReviewRow, 'user_id' | 'week_start'>
      user_settings: TableShape<UserSettingsRow, 'user_id'>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<Name extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][Name]['Row']

export type TablesInsert<Name extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][Name]['Insert']

export type TablesUpdate<Name extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][Name]['Update']
