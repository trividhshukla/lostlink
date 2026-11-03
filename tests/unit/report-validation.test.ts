import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { CAMPUS_AREAS, CATEGORIES, REPORT_COLOURS } from '@/lib/constants';

// Regex used in LostLink to block public contact info (R-UNIT-06)
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/;

function containsContactInfo(text: string): boolean {
  if (!text) return false;
  return EMAIL_REGEX.test(text) || PHONE_REGEX.test(text);
}

// Zod Schema representing the public report fields validation
const reportValidationSchema = z.object({
  reportType: z.enum(['lost', 'found']),
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title cannot exceed 100 characters')
    .refine((v) => !containsContactInfo(v), { message: 'Public title cannot contain phone or email' }),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1500, 'Description cannot exceed 1500 characters')
    .refine((v) => !containsContactInfo(v), { message: 'Public description cannot contain phone or email' }),
  category: z.string().refine((cat) => CATEGORIES.some((c) => c.label === cat || c.slug === cat), {
    message: 'Invalid category',
  }),
  colour: z.string().refine((col) => REPORT_COLOURS.includes(col as any), {
    message: 'Invalid colour',
  }),
  campusArea: z.string().refine((area) => CAMPUS_AREAS.includes(area as any), {
    message: 'Invalid campus area',
  }),
  brand: z
    .string()
    .max(60, 'Brand cannot exceed 60 characters')
    .refine((v) => !v || !containsContactInfo(v), { message: 'Brand cannot contain phone or email' })
    .optional()
    .nullable(),
  distinctiveFeatures: z
    .string()
    .max(300, 'Distinctive features cannot exceed 300 characters')
    .refine((v) => !v || !containsContactInfo(v), { message: 'Features cannot contain phone or email' })
    .optional()
    .nullable(),
  exactLocationNote: z
    .string()
    .max(120, 'Location note cannot exceed 120 characters')
    .refine((v) => !v || !containsContactInfo(v), { message: 'Location note cannot contain phone or email' })
    .optional()
    .nullable(),
  incidentDate: z.string().refine(
    (d) => {
      const parsed = new Date(d);
      if (isNaN(parsed.getTime())) return false;
      const now = new Date();
      if (parsed > now) return false; // Future dates rejected
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return parsed >= ninetyDaysAgo; // Reports older than 90 days rejected
    },
    { message: 'Incident date must not be in the future and within the last 90 days' }
  ),
});

// Chat message validator (R-UNIT-07)
const chatMessageSchema = z.object({
  body: z.string().min(1).max(1000),
});

describe('Report Validation Unit Tests (R-UNIT)', () => {
  const baseValidReport = {
    reportType: 'lost',
    title: 'Blue Water Bottle',
    description: 'Left on the wooden table outside the cafeteria during lunch.',
    category: 'Water bottles and lunch boxes',
    colour: 'Blue',
    campusArea: 'BLOCK B',
    brand: 'Hydro Flask',
    distinctiveFeatures: 'Scratch near the cap',
    exactLocationNote: 'Table near vending machine',
    incidentDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };

  it('R-UNIT-01: validates Title length boundaries (2, 3, 100, 101)', () => {
    // 2 chars -> rejected
    const res2 = reportValidationSchema.safeParse({ ...baseValidReport, title: 'AB' });
    expect(res2.success).toBe(false);

    // 3 chars -> allowed
    const res3 = reportValidationSchema.safeParse({ ...baseValidReport, title: 'ABC' });
    expect(res3.success).toBe(true);

    // 100 chars -> allowed
    const res100 = reportValidationSchema.safeParse({ ...baseValidReport, title: 'A'.repeat(100) });
    expect(res100.success).toBe(true);

    // 101 chars -> rejected
    const res101 = reportValidationSchema.safeParse({ ...baseValidReport, title: 'A'.repeat(101) });
    expect(res101.success).toBe(false);
  });

  it('R-UNIT-02: validates Description length boundaries (9, 10, 1500, 1501)', () => {
    // 9 chars -> rejected
    const res9 = reportValidationSchema.safeParse({ ...baseValidReport, description: 'Short one' });
    expect(res9.success).toBe(false);

    // 10 chars -> allowed
    const res10 = reportValidationSchema.safeParse({ ...baseValidReport, description: 'Ten chars!' });
    expect(res10.success).toBe(true);

    // 1500 chars -> allowed
    const res1500 = reportValidationSchema.safeParse({ ...baseValidReport, description: 'X'.repeat(1500) });
    expect(res1500.success).toBe(true);

    // 1501 chars -> rejected
    const res1501 = reportValidationSchema.safeParse({ ...baseValidReport, description: 'X'.repeat(1501) });
    expect(res1501.success).toBe(false);
  });

  it('R-UNIT-03: rejects invalid category, colour, or campus area', () => {
    const invalidCat = reportValidationSchema.safeParse({ ...baseValidReport, category: 'Flying Spaceships' });
    expect(invalidCat.success).toBe(false);

    const invalidCol = reportValidationSchema.safeParse({ ...baseValidReport, colour: 'Neon Rainbow Glitter' });
    expect(invalidCol.success).toBe(false);

    const invalidArea = reportValidationSchema.safeParse({ ...baseValidReport, campusArea: 'Moon Base Alpha' });
    expect(invalidArea.success).toBe(false);
  });

  it('R-UNIT-04: enforces length limits on optional fields (Brand 60, Distinctive 300, Location 120)', () => {
    const brandOver = reportValidationSchema.safeParse({ ...baseValidReport, brand: 'B'.repeat(61) });
    expect(brandOver.success).toBe(false);

    const featuresOver = reportValidationSchema.safeParse({ ...baseValidReport, distinctiveFeatures: 'F'.repeat(301) });
    expect(featuresOver.success).toBe(false);

    const locationOver = reportValidationSchema.safeParse({ ...baseValidReport, exactLocationNote: 'L'.repeat(121) });
    expect(locationOver.success).toBe(false);
  });

  it('R-UNIT-05: rejects future incident dates and reports older than 90 days', () => {
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
    const resFuture = reportValidationSchema.safeParse({ ...baseValidReport, incidentDate: futureDate });
    expect(resFuture.success).toBe(false);

    const oldDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const resOld = reportValidationSchema.safeParse({ ...baseValidReport, incidentDate: oldDate });
    expect(resOld.success).toBe(false);
  });

  it('R-UNIT-06: blocks phone numbers and emails in public report fields', () => {
    const emailInTitle = reportValidationSchema.safeParse({ ...baseValidReport, title: 'Lost keys contact john@campus.edu' });
    expect(emailInTitle.success).toBe(false);

    const phoneInDesc = reportValidationSchema.safeParse({ ...baseValidReport, description: 'Call me at +91 9876543210 if you find it.' });
    expect(phoneInDesc.success).toBe(false);

    const phoneInBrand = reportValidationSchema.safeParse({ ...baseValidReport, brand: 'Call 9876543210' });
    expect(phoneInBrand.success).toBe(false);
  });

  it('R-UNIT-07: allows phone numbers and emails in private chat messages', () => {
    const chatMsgWithPhone = 'Hey! Let us meet at Block B. My phone is +91 9876543210 or email me at user@uni.edu';
    const resChat = chatMessageSchema.safeParse({ body: chatMsgWithPhone });
    expect(resChat.success).toBe(true);
  });
});
