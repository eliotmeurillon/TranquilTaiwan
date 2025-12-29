/**
 * Address Normalization for Taiwan addresses
 * 
 * Normalizes various formats of Taiwan addresses to a consistent format
 * that works better with geocoding APIs.
 * 
 * Examples:
 * - 台北市大安區忠孝東路四段 123 號
 * - 台北市 大安區 忠孝東路4段123號
 * - No.123, Sec.4, Zhongxiao E. Rd., Da'an Dist., Taipei
 * 
 * All should normalize to: 台北市大安區忠孝東路四段123號
 */

/**
 * Convert Arabic numerals to Chinese numerals for address segments
 */
function arabicToChinese(num: number): string {
	const chineseNums = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
	if (num === 0) return chineseNums[0];
	if (num <= 10) return chineseNums[num];
	if (num < 20) return '十' + (num > 10 ? chineseNums[num % 10] : '');
	if (num < 100) {
		const tens = Math.floor(num / 10);
		const ones = num % 10;
		return chineseNums[tens] + '十' + (ones > 0 ? chineseNums[ones] : '');
	}
	return num.toString(); // For numbers >= 100, keep Arabic
}

/**
 * Convert Chinese numerals to Arabic numerals
 */
function chineseToArabic(chinese: string): string {
	const chineseNums: Record<string, number> = {
		'零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
		'六': 6, '七': 7, '八': 8, '九': 9, '十': 10
	};
	
	// Simple conversion for common patterns
	if (chineseNums[chinese] !== undefined) {
		return chineseNums[chinese].toString();
	}
	
	// Handle "十X" pattern (11-19)
	const match = chinese.match(/^十([一二三四五六七八九])$/);
	if (match) {
		return (10 + chineseNums[match[1]]).toString();
	}
	
	// Handle "X十Y" pattern (20-99)
	const match2 = chinese.match(/^([一二三四五六七八九])十([一二三四五六七八九]?)$/);
	if (match2) {
		const tens = chineseNums[match2[1]] * 10;
		const ones = match2[2] ? chineseNums[match2[2]] : 0;
		return (tens + ones).toString();
	}
	
	return chinese; // Return as-is if can't convert
}

/**
 * Normalize Taiwan address to a consistent format
 * 
 * Strategy:
 * 1. Normalize whitespace
 * 2. Convert English to Chinese where possible
 * 3. Standardize number formats (choose one: Arabic or Chinese)
 * 4. Ensure proper structure: 市/縣 -> 區/鄉 -> 路 -> 段 -> 號
 */
export function normalizeTaiwanAddress(address: string): string {
	let normalized = address.trim();
	
	// Remove extra whitespace
	normalized = normalized.replace(/\s+/g, ' ');
	
	// Common English to Chinese mappings for Taipei
	const englishToChinese: Record<string, string> = {
		'Taipei': '台北',
		'Taipei City': '台北市',
		'New Taipei': '新北',
		'New Taipei City': '新北市',
		'Da\'an': '大安',
		'Da\'an District': '大安區',
		'Zhongshan': '中山',
		'Zhongshan District': '中山區',
		'Xinyi': '信義',
		'Xinyi District': '信義區',
		'Songshan': '松山',
		'Songshan District': '松山區',
		'Zhongxiao': '忠孝',
		'Zhongxiao East Road': '忠孝東路',
		'Zhongxiao West Road': '忠孝西路',
		'Section': '段',
		'Sec.': '段',
		'No.': '',
		'No': '',
		'Road': '路',
		'Rd.': '路',
		'Rd': '路',
		'Street': '街',
		'St.': '街',
		'St': '街',
		'Lane': '巷',
		'Alley': '弄',
		'Building': '號',
		'Dist.': '區',
		'District': '區'
	};
	
	// Replace English terms with Chinese
	for (const [english, chinese] of Object.entries(englishToChinese)) {
		const regex = new RegExp(english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
		normalized = normalized.replace(regex, chinese);
	}
	
	// Normalize number formats in segments (convert Arabic to Chinese for 段)
	// Example: "4段" -> "四段", but keep Arabic for 號 (building numbers)
	normalized = normalized.replace(/(\d+)(段)/g, (match, num) => {
		const numInt = parseInt(num, 10);
		if (numInt <= 10) {
			return arabicToChinese(numInt) + '段';
		}
		return match; // Keep Arabic for numbers > 10
	});
	
	// Ensure proper spacing between components
	// Pattern: 市/縣 -> 區/鄉 -> 路 -> 段 -> 號
	normalized = normalized
		.replace(/([市縣])([^區鄉路街段號])/g, '$1 $2') // Space after 市/縣
		.replace(/([區鄉])([^路街段號])/g, '$1 $2') // Space after 區/鄉
		.replace(/([路街])([^段號])/g, '$1 $2') // Space after 路/街
		.replace(/(段)([^號])/g, '$1 $2') // Space after 段
		.replace(/\s+/g, ' ') // Collapse multiple spaces
		.trim();
	
	// Ensure 號 is properly attached to number
	normalized = normalized.replace(/(\d+)\s*號/g, '$1號');
	
	// Remove trailing commas and clean up
	normalized = normalized.replace(/,\s*$/, '').trim();
	
	return normalized;
}

/**
 * Extract address components for better geocoding
 * Returns: { city, district, street, buildingNumber, normalized }
 */
export function parseTaiwanAddress(address: string): {
	city?: string;
	district?: string;
	street?: string;
	buildingNumber?: string;
	normalized: string;
} {
	const normalized = normalizeTaiwanAddress(address);
	
	// Extract city (市 or 縣)
	const cityMatch = normalized.match(/([^市縣]+[市縣])/);
	const city = cityMatch ? cityMatch[1] : undefined;
	
	// Extract district (區 or 鄉)
	const districtMatch = normalized.match(/([^區鄉]+[區鄉])/);
	const district = districtMatch ? districtMatch[1] : undefined;
	
	// Extract street (路 or 街)
	const streetMatch = normalized.match(/([^路街]+[路街])/);
	const street = streetMatch ? streetMatch[1] : undefined;
	
	// Extract building number (號)
	const buildingMatch = normalized.match(/(\d+)號/);
	const buildingNumber = buildingMatch ? buildingMatch[1] : undefined;
	
	return {
		city,
		district,
		street,
		buildingNumber,
		normalized
	};
}

/**
 * Generate geocoding query candidates from a Taiwan address
 * Returns array of queries ordered from most specific to least specific
 */
export function generateGeocodingCandidates(address: string): string[] {
	const parsed = parseTaiwanAddress(address);
	const candidates: string[] = [];
	
	// 1. Full normalized address
	candidates.push(parsed.normalized);
	
	// 2. Full address with "Taiwan" suffix
	if (!parsed.normalized.includes('台灣') && !parsed.normalized.includes('Taiwan')) {
		candidates.push(`${parsed.normalized}, Taiwan`);
	}
	
	// 3. City + District + Street + Building (without floor info)
	if (parsed.city && parsed.district && parsed.street && parsed.buildingNumber) {
		candidates.push(`${parsed.city}${parsed.district}${parsed.street}${parsed.buildingNumber}號`);
	}
	
	// 4. City + District + Street (no building number) - for street-level geocoding
	if (parsed.city && parsed.district && parsed.street) {
		candidates.push(`${parsed.city}${parsed.district}${parsed.street}`);
	}
	
	// 5. District + Street (for cases where city is implicit)
	if (parsed.district && parsed.street) {
		candidates.push(`${parsed.district}${parsed.street}, Taiwan`);
	}
	
	// Remove duplicates while preserving order
	const unique: string[] = [];
	for (const candidate of candidates) {
		if (!unique.includes(candidate)) {
			unique.push(candidate);
		}
	}
	
	return unique;
}


