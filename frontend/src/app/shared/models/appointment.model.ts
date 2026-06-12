export interface Appointment {
  id: number;
  customerId: number;
  customerFullName: string;
  resourceId?: number;
  resourceName?: string;
  staffResourceId?: number;
  staffResourceName?: string;
  staffId?: number;
  staffName?: string;
  locationId?: number;
  locationName?: string;
  visitTypeId?: number;
  visitTypeName?: string;
  visitStatusId: number;
  visitStatusName: string;
  visitStatusColor: string;
  apptDate: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  chargeAmount: number;
  notes?: string;
  invoiceId?: number;
  invoiceNumber?: string;
  createdAt: string;
}

export interface AppointmentRequest {
  customerId: number;
  resourceId?: number;
  staffResourceId?: number;
  staffId?: number;
  locationId?: number;
  visitTypeId?: number;
  visitStatusId: number;
  apptDate: string;
  startTime: string;
  endTime: string;
  chargeAmount?: number;
  notes?: string;
  excludeAppointmentId?: number;
}

export interface AvailabilityConflict {
  available: boolean;
  reason?: string;
  conflictingAppointmentId?: number;
  conflictingCustomerName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}
