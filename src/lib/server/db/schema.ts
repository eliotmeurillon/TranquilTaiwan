
import { pgTable, serial, text, varchar, decimal, integer, jsonb, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  fullName: text('full_name'),
  phone: varchar('phone', { length: 256 }),
});

// Enum for report status
export const reportStatusEnum = pgEnum('report_status', ['free', 'premium', 'generating']);

// Addresses table - stores addresses and their coordinates
export const addresses = pgTable('addresses', {
  id: serial('id').primaryKey(),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }),
  district: varchar('district', { length: 100 }),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Livability scores table - stores calculated scores for addresses
export const livabilityScores = pgTable('livability_scores', {
  id: serial('id').primaryKey(),
  addressId: integer('address_id').references(() => addresses.id).notNull(),
  overallScore: decimal('overall_score', { precision: 5, scale: 2 }), // 0-100
  noiseScore: decimal('noise_score', { precision: 5, scale: 2 }), // 0-100 (higher = quieter)
  airQualityScore: decimal('air_quality_score', { precision: 5, scale: 2 }), // 0-100 (higher = better)
  safetyScore: decimal('safety_score', { precision: 5, scale: 2 }), // 0-100 (higher = safer)
  convenienceScore: decimal('convenience_score', { precision: 5, scale: 2 }), // 0-100 (higher = more convenient)
  zoningRiskScore: decimal('zoning_risk_score', { precision: 5, scale: 2 }), // 0-100 (higher = lower risk)
  // Raw data stored as JSON for detailed reports
  rawData: jsonb('raw_data'), // Stores all the detailed metrics
  calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Reports table - stores premium reports
export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  addressId: integer('address_id').references(() => addresses.id).notNull(),
  userId: integer('user_id').references(() => users.id),
  status: reportStatusEnum('status').default('free').notNull(),
  // Detailed report data
  detailedData: jsonb('detailed_data'), // Full breakdown of all metrics
  purchasedAt: timestamp('purchased_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
        