export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "SUPER_ADMIN" | "MANAGER" | "STAFF" | "RESOURCE";
  phone?: string;
  locationId?: number;
  canBookAppts: boolean;
  active: boolean;
  locked: boolean;
}

export interface Resource {
  id: number;
  name: string;
  type?: string;
  capacity: number;
  colorHex: string;
  locationId: number;
  locationName?: string;
  active: boolean;
}

export interface VisitType {
  id: number;
  name: string;
  defaultPrice: number;
  durationMin: number;
  colorHex: string;
  active: boolean;
  chargeCode?: { id: number; code: string; description: string; };
}

export interface VisitStatus {
  id: number;
  name: string;
  sortOrder: number;
  terminal: boolean;
  chargeable: boolean;
  colorHex: string;
}

export interface Location {
  id: number;
  code: string;
  name: string;
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  colorHex: string;
  active: boolean;
}

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
  membershipType?: string;
  referralSource?: string;
  emergencyContact?: string;
  allergies?: string;
  consentOnFile: boolean;
  active: boolean;
}
