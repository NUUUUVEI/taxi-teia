export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'PENDENT',
  confirmed: 'CONFIRMAT',
  completed: 'FET',
  cancelled: 'CANCEL·LAT',
}

export type ExpenseCategory =
  | 'fuel'
  | 'mechanics'
  | 'insurance'
  | 'gestoria'
  | 'tolls'
  | 'amortization'
  | 'other'

export type ServiceType = {
  id: string
  slug: string
  label_ca: string
  label_es: string
  label_en: string
  icon: string
  estimated_minutes_default: number
}

export type Booking = {
  id: string
  created_at: string
  client_name: string
  client_phone: string
  client_email?: string | null
  pickup_address: string
  dropoff_address: string
  service_type: string
  start_time: string
  requested_time?: string | null
  time_mode?: 'pickup' | 'arrival' | null
  locale?: string | null
  estimated_minutes: number
  fare?: number | null
  notes?: string | null
  status: BookingStatus
  flight_number?: string | null
  passengers?: number | null
  luggage?: number | null
}

/** Fields the driver may change on a booking. */
export type BookingUpdate = Partial<Omit<Booking, 'id' | 'created_at'>>

export type Expense = {
  id: string
  created_at: string
  date: string
  category: ExpenseCategory
  amount: number
  description: string | null
  invoice_photo_url: string | null
}

export type DriverPushToken = {
  user_id: string
  token: string
  updated_at: string
}

export type DriverLocation = {
  user_id: string
  lat: number
  lng: number
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      bookings: {
        Row: Booking
        Insert: Omit<Booking, 'id' | 'created_at'>
        Update: BookingUpdate
        Relationships: []
      }
      service_types: {
        Row: ServiceType
        Insert: Omit<ServiceType, 'id'>
        Update: Partial<Omit<ServiceType, 'id'>>
        Relationships: []
      }
      expenses: {
        Row: Expense
        Insert: {
          id?: string
          created_at?: string
          date: string
          category: ExpenseCategory | string
          amount: number
          description?: string | null
          invoice_photo_url?: string | null
        }
        Update: Partial<Omit<Expense, 'id' | 'created_at'>>
        Relationships: []
      }
      driver_push_tokens: {
        Row: DriverPushToken
        Insert: DriverPushToken
        Update: Partial<Omit<DriverPushToken, 'user_id'>>
        Relationships: []
      }
      driver_location: {
        Row: DriverLocation
        Insert: DriverLocation
        Update: Partial<Omit<DriverLocation, 'user_id'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
