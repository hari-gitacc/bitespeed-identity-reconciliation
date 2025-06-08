// src/services/identityService.ts
import prisma from '../config/database';
import { IdentifyRequest, IdentifyResponse, LinkPrecedence } from '../types';

export class IdentityService {
    async identify(data: IdentifyRequest): Promise<IdentifyResponse> {
        const { email, phoneNumber } = data;

        // Validate input
        if (!email && !phoneNumber) {
            throw new Error('Either email or phoneNumber must be provided');
        }

        // Find all contacts that match either email or phone
        const matchingContacts = await this.findMatchingContacts(email, phoneNumber);

        if (matchingContacts.length === 0) {
            // No existing contacts, create new primary contact
            const newContact = await prisma.contact.create({
                data: {
                    email,
                    phoneNumber,
                    linkPrecedence: LinkPrecedence.PRIMARY,
                },
            });

            return this.formatResponse([newContact]);
        }

        // Check if we need to create a new secondary contact
        const needsNewContact = this.shouldCreateNewContact(matchingContacts, email, phoneNumber);

        if (needsNewContact) {
            // Find the primary contact to link to
            const primaryContact = await this.findPrimaryContact(matchingContacts);

            // Create new secondary contact
            await prisma.contact.create({
                data: {
                    email,
                    phoneNumber,
                    linkedId: primaryContact.id,
                    linkPrecedence: LinkPrecedence.SECONDARY,
                },
            });
        }

        // Check if we need to link two primary contact chains
        const primaryContacts = matchingContacts.filter(c => c.linkPrecedence === LinkPrecedence.PRIMARY);

        if (primaryContacts.length > 1) {
            // Multiple primary contacts found, need to merge chains
            await this.mergePrimaryContacts(primaryContacts);
        }

        // Fetch all contacts in the chain for response
        const allContacts = await this.getAllContactsInChain(matchingContacts);
        return this.formatResponse(allContacts);
    }

    private async findMatchingContacts(
        email?: string,
        phoneNumber?: string
    ) {
        const whereConditions: any[] = [];

        if (email) {
            whereConditions.push({ email });
        }

        if (phoneNumber) {
            whereConditions.push({ phoneNumber });
        }

        return await prisma.contact.findMany({
            where: {
                OR: whereConditions,
                deletedAt: null,
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    private shouldCreateNewContact(
        existingContacts: any[],
        email?: string,
        phoneNumber?: string
    ): boolean {
        // Check if the combination of email and phone already exists
        const hasExactMatch = existingContacts.some(
            contact => contact.email === email && contact.phoneNumber === phoneNumber
        );

        if (hasExactMatch) return false;

        // Check if we have new information
        const hasEmail = email !== null && email !== undefined;
        const hasPhone = phoneNumber !== null && phoneNumber !== undefined;

        if (hasEmail && hasPhone) {
            // Both provided, check if this exact combination exists
            return true;
        }

        // Single field provided, check if it's already in contacts
        if (hasEmail && !hasPhone) {
            return !existingContacts.some(c => c.email === email);
        }

        if (hasPhone && !hasEmail) {
            return !existingContacts.some(c => c.phoneNumber === phoneNumber);
        }

        return false;
    }

    private async findPrimaryContact(
        contacts: any[]
    ) {
        // Find the ultimate primary contact
        const primaryContacts = contacts.filter(c => c.linkPrecedence === LinkPrecedence.PRIMARY);

        if (primaryContacts.length > 0) {
            // Return the oldest primary
            return primaryContacts.sort((a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )[0];
        }

        // All are secondary, find their primary
        const linkedIds = contacts.map(c => c.linkedId).filter(id => id !== null);
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

    private async mergePrimaryContacts(
        primaryContacts: any[]
    ) {
        // Sort by creation date to find the oldest
        const sortedPrimaries = primaryContacts.sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        const oldestPrimary = sortedPrimaries[0];
        const newerPrimaries = sortedPrimaries.slice(1);

        // Convert newer primaries to secondary
        for (const contact of newerPrimaries) {
            // Update the contact itself
            await prisma.contact.update({
                where: { id: contact.id },
                data: {
                    linkPrecedence: LinkPrecedence.SECONDARY,
                    linkedId: oldestPrimary.id,
                },
            });

            // Update all its secondary contacts to point to the oldest primary
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

    private async getAllContactsInChain(
        initialContacts: any[]
    ) {
        // Find the primary contact
        const primaryContact = await this.findPrimaryContact(initialContacts);

        // Get all contacts in the chain
        const allContacts = await prisma.contact.findMany({
            where: {
                OR: [
                    { id: primaryContact.id },
                    { linkedId: primaryContact.id },
                ],
                deletedAt: null,
            },
            orderBy: { createdAt: 'asc' },
        });

        return allContacts;
    }

    private formatResponse(contacts: any[]): IdentifyResponse {
        // Find primary contact
        const primaryContact = contacts.find(c => c.linkPrecedence === LinkPrecedence.PRIMARY);

        if (!primaryContact) {
            throw new Error('No primary contact found');
        }

        // Collect unique emails and phone numbers
        const emails = new Set<string>();
        const phoneNumbers = new Set<string>();
        const secondaryContactIds: number[] = [];

        // Add primary contact info first
        if (primaryContact.email) emails.add(primaryContact.email);
        if (primaryContact.phoneNumber) phoneNumbers.add(primaryContact.phoneNumber);

        // Add secondary contacts info
        contacts.forEach(contact => {
            if (contact.linkPrecedence === LinkPrecedence.SECONDARY) {
                secondaryContactIds.push(contact.id);
                if (contact.email) emails.add(contact.email);
                if (contact.phoneNumber) phoneNumbers.add(contact.phoneNumber);
            }
        });

        return {
            contact: {
                primaryContactId: primaryContact.id, 
                emails: Array.from(emails),
                phoneNumbers: Array.from(phoneNumbers),
                secondaryContactIds: secondaryContactIds.sort((a, b) => a - b),
            },
        };
    }
}