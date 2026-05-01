export type ReleaseStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'shipped' | 'cancelled'

export type ShipmentRelease = {
  id: string
  invoice_number: string
  invoice_key: string | null
  customer_name: string
  carrier_name: string | null
  order_number: string | null
  shipment_number: string | null
  origin_city: string | null
  destination_city: string | null
  destination_state: string | null
  gross_weight_kg: number | null
  total_amount: number | null
  scheduled_ship_date: string | null
  status: ReleaseStatus
  notes: string | null
  created_at: string
}

export type ReleaseForm = {
  invoice_number: string
  invoice_key: string
  customer_name: string
  carrier_name: string
  order_number: string
  shipment_number: string
  origin_city: string
  destination_city: string
  destination_state: string
  gross_weight_kg: string
  total_amount: string
  scheduled_ship_date: string
  notes: string
}
