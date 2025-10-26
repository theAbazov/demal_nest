// Простые типы для приложения
export enum UserRole {
  CLIENT = 'CLIENT',
  PARTNER = 'PARTNER',
  ADMIN = 'ADMIN',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum TourStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  COMPLETED = 'COMPLETED',
}

export interface User {
  id: string;
  phoneNumber: string;
  fullName: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
