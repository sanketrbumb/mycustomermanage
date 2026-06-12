export interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  customerFullName: string;
  customerPhone?: string;
  appointmentId?: number;
  invoiceDate: string;
  dueDate?: string;
  grossAmount: number;
  discountType: string;
  discountValue: number;
  netAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'PAID' | 'VOID';
  notes?: string;
  lineItems: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id?: number;
  description: string;
  chargeCode?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReportSummary {
  period: string;
  label: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  grossBilled: number;
  totalCollected: number;
  outstanding: number;
  completionRate: number;
  revenueByVisitType: Record<string, number>;
  appointmentsByStatus: Record<string, number>;
  resourceUtilization: ResourceUtil[];
}

export interface ResourceUtil {
  entityId: number;
  entityName: string;
  entityType: string;
  totalMinutes: number;
  appointmentCount: number;
}
