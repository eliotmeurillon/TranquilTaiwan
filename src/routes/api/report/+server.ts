import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { addresses, livabilityScores, reports } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * GET /api/report?address=...
 * Get premium detailed report for an address
 * In production, this would check payment status
 */
export const GET: RequestHandler = async ({ url }) => {
	const address = url.searchParams.get('address');
	
	if (!address) {
		error(400, 'Address parameter is required');
	}
	
	try {
		// Find address
		const addressRecords = await db
			.select()
			.from(addresses)
			.where(eq(addresses.address, address))
			.limit(1);
		
		if (addressRecords.length === 0) {
			error(404, 'Address not found. Please calculate score first.');
		}
		
		const addressRecord = addressRecords[0];
		
		// Get score with raw data
		const scoreRecords = await db
			.select()
			.from(livabilityScores)
			.where(eq(livabilityScores.addressId, addressRecord.id))
			.orderBy(desc(livabilityScores.calculatedAt))
			.limit(1);
		
		if (scoreRecords.length === 0) {
			error(404, 'Score not found. Please calculate score first.');
		}
		
		const scoreRecord = scoreRecords[0];
		
		// Check if premium report exists
		const existingReports = await db
			.select()
			.from(reports)
			.where(
				and(
					eq(reports.addressId, addressRecord.id),
					eq(reports.status, 'premium')
				)
			)
			.limit(1);
		
		// In production, verify payment here
		// For now, we'll return the detailed data if it exists
		
		if (existingReports.length === 0) {
			// Create premium report (in production, this would require payment)
			const [newReport] = await db
				.insert(reports)
				.values({
					addressId: addressRecord.id,
					status: 'premium',
					detailedData: scoreRecord.rawData,
					purchasedAt: new Date()
				})
				.returning();
			
			return json({
				address: addressRecord.address,
				coordinates: {
					latitude: parseFloat(addressRecord.latitude || '0'),
					longitude: parseFloat(addressRecord.longitude || '0')
				},
				scores: {
					overall: parseFloat(scoreRecord.overallScore || '0'),
					noise: parseFloat(scoreRecord.noiseScore || '0'),
					airQuality: parseFloat(scoreRecord.airQualityScore || '0'),
					safety: parseFloat(scoreRecord.safetyScore || '0'),
					convenience: parseFloat(scoreRecord.convenienceScore || '0'),
					zoningRisk: parseFloat(scoreRecord.zoningRiskScore || '0')
				},
				detailedData: scoreRecord.rawData,
				premium: true,
				reportId: newReport.id
			});
		}
		
		const report = existingReports[0];
		
		return json({
			address: addressRecord.address,
			coordinates: {
				latitude: parseFloat(addressRecord.latitude || '0'),
				longitude: parseFloat(addressRecord.longitude || '0')
			},
			scores: {
				overall: parseFloat(scoreRecord.overallScore || '0'),
				noise: parseFloat(scoreRecord.noiseScore || '0'),
				airQuality: parseFloat(scoreRecord.airQualityScore || '0'),
				safety: parseFloat(scoreRecord.safetyScore || '0'),
				convenience: parseFloat(scoreRecord.convenienceScore || '0'),
				zoningRisk: parseFloat(scoreRecord.zoningRiskScore || '0')
			},
			detailedData: report.detailedData,
			premium: true,
			reportId: report.id
		});
		
	} catch (err) {
		console.error('Error fetching report:', err);
		error(500, 'Failed to fetch report');
	}
};

