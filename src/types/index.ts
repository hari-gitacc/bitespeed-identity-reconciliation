// src/types/index.ts
export interface IdentifyRequest {
  email?: string;
  phoneNumber?: string;
}

export interface IdentifyResponse {
  contact: {
    primaryContactId: number; 
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

export enum LinkPrecedence {
  PRIMARY = 'primary',
  SECONDARY = 'secondary'
}