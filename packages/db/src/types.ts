export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface ServiceType {
  id: string
  slug: string
  label_ca: string
  label_es: string
  label_en: string
  icon: string
  estimated_minutes_default: number
}

export interface Booking {
  id: string
  created_at: string
  client_name: string
  client_phone: string
  pickup_address: string
  dropoff_address: string
  service_type: string
  start_time: string
  estimated_minutes: number
  fare?: number | null
  notes?: string | null
  status: BookingStatus
}

export interface Database {
  public: {
    Tables: {
      bookings: {
        Row: Booking
        Insert: Omit<Booking, 'id' | 'created_at'>
        Update: Partial<Omit<Booking, 'id' | 'created_at'>>
      }
      service_types: {
        Row: ServiceType
        Insert: Omit<ServiceType, 'id'>
        Update: Partial<Omit<ServiceType, 'id'>>
      }
    }
  }
}
