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
}

export interface DriverLocation {
  user_id: string
  lat: number
  lng: number
  updated_at: string
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
      driver_location: {
        Row: DriverLocation
        Insert: DriverLocation
        Update: Partial<Omit<DriverLocation, 'user_id'>>
      }
    }
  }
}
