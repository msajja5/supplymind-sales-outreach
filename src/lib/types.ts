export type ContactStatus = 'new'|'contacted'|'replied'|'qualified'|'demo_booked'|'closed'|'lost'
export type ActivityType = 'LinkedIn'|'Email'|'Call'|'Reply'|'Demo'|'Note'

export interface Contact {
  id: string; user_id: string; first_name: string; last_name?: string
  company: string; role?: string; email?: string; linkedin_url?: string
  country?: string; source?: string; status: ContactStatus
  pain_point?: string; notes?: string; email_confidence?: number
  created_at: string; updated_at: string
}

export interface Activity {
  id: string; user_id: string; contact_id?: string
  type: ActivityType; company?: string; note?: string; created_at: string
}

export interface Message {
  id: string; contact_id?: string; user_id: string; channel: string
  touch_number: number; body: string; status: string
  sent_at?: string; goal?: string; created_at: string
}
