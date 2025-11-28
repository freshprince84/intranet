export enum TourType {
  OWN = 'own',
  EXTERNAL = 'external'
}

export enum TourBookingStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show'
}

export enum MessageDirection {
  OUTGOING = 'outgoing',
  INCOMING = 'incoming'
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export interface Tour {
  id: number;
  title: string;
  description?: string | null;
  type: TourType;
  isActive: boolean;
  duration?: number | null;
  maxParticipants?: number | null;
  minParticipants?: number | null;
  price?: number | string | null;
  currency?: string | null;
  location?: string | null;
  meetingPoint?: string | null;
  includes?: string | null;
  excludes?: string | null;
  requirements?: string | null;
  totalCommission?: number | string | null;
  totalCommissionPercent?: number | string | null;
  sellerCommissionPercent?: number | string | null;
  sellerCommissionFixed?: number | string | null;
  externalProviderId?: number | null;
  externalProvider?: TourProvider | null;
  externalBookingUrl?: string | null;
  imageUrl?: string | null;
  galleryUrls?: string[] | null;
  availableFrom?: string | null;
  availableTo?: string | null;
  recurringSchedule?: any | null;
  organizationId: number;
  branchId?: number | null;
  branch?: { id: number; name: string } | null;
  createdById?: number | null;
  createdBy?: { id: number; firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TourProvider {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  contactPerson?: string | null;
  notes?: string | null;
  organizationId: number;
  branchId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TourBooking {
  id: number;
  tourId: number;
  tour?: Tour | null;
  bookingDate: string;
  tourDate: string;
  numberOfParticipants: number;
  totalPrice: number | string;
  currency: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerNotes?: string | null;
  paymentStatus: 'pending' | 'paid' | 'partially_paid' | 'refunded';
  amountPaid?: number | string | null;
  amountPending?: number | string | null;
  paymentLink?: string | null;
  paymentDeadline?: string | null;
  autoCancelEnabled?: boolean;
  reservedUntil?: string | null;
  bookedById?: number | null;
  bookedBy?: { id: number; firstName: string; lastName: string } | null;
  commissionAmount?: number | string | null;
  commissionCalculatedAt?: string | null;
  status: TourBookingStatus;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  cancelledReason?: string | null;
  isExternal: boolean;
  externalBookingId?: string | null;
  externalStatus?: string | null;
  externalMessage?: string | null;
  alternativeTours?: number[] | null;
  organizationId: number;
  branchId?: number | null;
  branch?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TourReservation {
  id: number;
  tourId: number;
  tour?: Tour | null;
  bookingId: number;
  booking?: TourBooking | null;
  reservationId: number;
  reservation?: any | null;
  tourPrice: number | string;
  accommodationPrice: number | string;
  currency: string;
  tourPricePaid?: number | string | null;
  tourPricePending?: number | string | null;
  accommodationPaid?: number | string | null;
  accommodationPending?: number | string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TourWhatsAppMessage {
  id: number;
  bookingId: number;
  booking?: TourBooking | null;
  direction: MessageDirection;
  message: string;
  phoneNumber: string;
  sentAt: string;
  status: MessageStatus;
  errorMessage?: string | null;
  processed: boolean;
  processedAt?: string | null;
  action?: string | null;
  extractedData?: any | null;
  createdAt: string;
  updatedAt: string;
}


