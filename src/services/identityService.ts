// src/services/identityService.ts
import prisma from '../config/database';
import { IdentifyRequest, IdentifyResponse, LinkPrecedence } from '../types';
import { Contact } from '@prisma/client';

export class IdentityService {
  /**
   * Main method to identify and reconcile contacts
   */
  async identify(data: IdentifyRequest): Promise<IdentifyResponse> {
    // Sanitize input data
    const sanitizedData = this.sanitizeInput(data);
    
    // Find matching contacts
    const matchingContacts = await this.findMatchingContacts(
      sanitizedData.email, 
      sanitizedData.phoneNumber
    );

    // Handle different scenarios
    if (matchingContacts.length === 0) {
      return await this.handleNewContact(sanitizedData);
    }

    // Process existing contacts
    return await this.processExistingContacts(matchingContacts, sanitizedData);
  }

  /**
   * Sanitize input data
   */
  private sanitizeInput(data: IdentifyRequest): IdentifyRequest {
    return {
      email: data.email?.trim().toLowerCase(),
      phoneNumber: data.phoneNumber ? String(data.phoneNumber).replace(/\D/g, '') : undefined,
    };
  }

  /**
   * Handle creation of new primary contact
   */
  private async handleNewContact(data: IdentifyRequest): Promise<IdentifyResponse> {
    const newContact = await prisma.contact.create({
      data: {
        email: data.email,
        phoneNumber: data.phoneNumber,
        linkPrecedence: LinkPrecedence.PRIMARY,
      },
    });

    return this.formatResponse([newContact]);
  }

  /**
   * Process existing contacts and handle linking
   */
  private async processExistingContacts(
    matchingContacts: Contact[], 
    data: IdentifyRequest
  ): Promise<IdentifyResponse> {
    // Check if we need to create a secondary contact
    if (this.shouldCreateNewContact(matchingContacts, data.email, data.phoneNumber)) {
      const primaryContact = await this.findPrimaryContact(matchingContacts);
      
      await prisma.contact.create({
        data: {
          email: data.email,
          phoneNumber: data.phoneNumber,
          linkedId: primaryContact.id,
          linkPrecedence: LinkPrecedence.SECONDARY,
        },
      });
    }

    // Check for multiple primary contacts that need merging
    const primaryContacts = matchingContacts.filter(
      c => c.linkPrecedence === LinkPrecedence.PRIMARY
    );

    if (primaryContacts.length > 1) {
      await this.mergePrimaryContacts(primaryContacts);
    }

    // Get all contacts in the chain for response
    const allContacts = await this.getAllContactsInChain(matchingContacts);
    return this.formatResponse(allContacts);
  }

  /**
   * Find all contacts matching email or phone
   */
  private async findMatchingContacts(
    email?: string,
    phoneNumber?: string
  ): Promise<Contact[]> {
    const whereConditions = [];

    if (email) {
      whereConditions.push({ email, deletedAt: null });
    }

    if (phoneNumber) {
      whereConditions.push({ phoneNumber, deletedAt: null });
    }

    if (whereConditions.length === 0) {
      return [];
    }

    return await prisma.contact.findMany({
      where: { OR: whereConditions },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Determine if a new contact should be created
   */
  private shouldCreateNewContact(
    existingContacts: Contact[],
    email?: string,
    phoneNumber?: string
  ): boolean {
    // Check for exact match
    const hasExactMatch = existingContacts.some(
      contact => contact.email === email && contact.phoneNumber === phoneNumber
    );

    if (hasExactMatch) return false;

    const hasEmail = !!email;
    const hasPhone = !!phoneNumber;

    // Both fields provided - create new contact to link them
    if (hasEmail && hasPhone) {
      return true;
    }

    // Single field provided - check if it's new information
    if (hasEmail) {
      return !existingContacts.some(c => c.email === email);
    }

    if (hasPhone) {
      return !existingContacts.some(c => c.phoneNumber === phoneNumber);
    }

    return false;
  }

  /**
   * Find the primary contact in a chain
   */
  private async findPrimaryContact(contacts: Contact[]): Promise<Contact> {
    // Check for primary contacts in the provided list
    const primaryContacts = contacts.filter(
      c => c.linkPrecedence === LinkPrecedence.PRIMARY
    );

    if (primaryContacts.length > 0) {
      // Return the oldest primary
      return primaryContacts.reduce((oldest, current) => 
        new Date(oldest.createdAt) < new Date(current.createdAt) ? oldest : current
      );
    }

    // All are secondary, find their primary
    const linkedIds = contacts
      .map(c => c.linkedId)
      .filter((id): id is number => id !== null);

    if (linkedIds.length === 0) {
      throw new Error('Data integrity issue: Secondary contacts without linkedId');
    }

    const primaryContact = await prisma.contact.findFirst({
      where: {
        id: { in: linkedIds },
        linkPrecedence: LinkPrecedence.PRIMARY,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!primaryContact) {
      throw new Error('Data integrity issue: No primary contact found');
    }

    return primaryContact;
  }

  /**
   * Merge multiple primary contacts into one chain
   */
  private async mergePrimaryContacts(primaryContacts: Contact[]): Promise<void> {
    // Sort by creation date
    const sortedPrimaries = [...primaryContacts].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const oldestPrimary = sortedPrimaries[0];
    const newerPrimaries = sortedPrimaries.slice(1);

    // Convert newer primaries to secondary
    for (const contact of newerPrimaries) {
      // Update the contact to secondary
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          linkPrecedence: LinkPrecedence.SECONDARY,
          linkedId: oldestPrimary.id,
        },
      });

      // Update all contacts that were linked to this primary
      await prisma.contact.updateMany({
        where: {
          linkedId: contact.id,
          deletedAt: null,
        },
        data: {
          linkedId: oldestPrimary.id,
        },
      });
    }
  }

  /**
   * Get all contacts in a chain
   */
  private async getAllContactsInChain(initialContacts: Contact[]): Promise<Contact[]> {
    const primaryContact = await this.findPrimaryContact(initialContacts);

    return await prisma.contact.findMany({
      where: {
        OR: [
          { id: primaryContact.id },
          { linkedId: primaryContact.id },
        ],
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Format the response according to API specification
   */
  private formatResponse(contacts: Contact[]): IdentifyResponse {
    const primaryContact = contacts.find(
      c => c.linkPrecedence === LinkPrecedence.PRIMARY
    );

    if (!primaryContact) {
      throw new Error('No primary contact found');
    }

    // Use Sets to ensure uniqueness
    const emails = new Set<string>();
    const phoneNumbers = new Set<string>();
    const secondaryContactIds: number[] = [];

    // Process all contacts
    contacts.forEach(contact => {
      // Add contact info to sets
      if (contact.email) emails.add(contact.email);
      if (contact.phoneNumber) phoneNumbers.add(contact.phoneNumber);
      
      // Track secondary contact IDs
      if (contact.linkPrecedence === LinkPrecedence.SECONDARY) {
        secondaryContactIds.push(contact.id);
      }
    });

    return {
      contact: {
        primaryContactId: primaryContact.id, // Keeping the typo as per requirement
        emails: Array.from(emails),
        phoneNumbers: Array.from(phoneNumbers),
        secondaryContactIds: secondaryContactIds.sort((a, b) => a - b),
      },
    };
  }
}