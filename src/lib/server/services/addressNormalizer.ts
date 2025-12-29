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
	
	// First, handle "District de X" patterns BEFORE other translations to avoid issues
	// This must come before individual word translations
	normalized = normalized.replace(/District\s+de\s+Zhongshan/gi, '中山區');
	normalized = normalized.replace(/District\s+de\s+Songshan/gi, '松山區');
	normalized = normalized.replace(/District\s+de\s+Daan/gi, '大安區');
	normalized = normalized.replace(/District\s+de\s+Xinyi/gi, '信義區');
	normalized = normalized.replace(/District\s+de\s+Zhongzheng/gi, '中正區');
	
	// Extract and remove business names/POI names before translation
	// Pattern: Capitalized words at the start, possibly with "of", "Ministry", "Bureau", etc.
	// Examples: "National Taxation Bureau of Taipei", "Ministry of Finance"
	// Also handle multiple comma-separated business names
	let businessName = '';
	// Try to match business names - look for patterns like "X, Y, Z" where X, Y, Z are capitalized phrases
	// and they're followed by address components (numbers, Taipei, Section, Road, etc.)
	const businessPattern = /^((?:[A-Z][^,]+(?:,\s*[A-Z][^,]+)+)),\s*(?=\d|Taipei|台北|Section|Road|路|Street|街|Wanhua|萬華)/;
	const businessMatch = normalized.match(businessPattern);
	if (businessMatch && businessMatch[1]) {
		const potentialBusiness = businessMatch[1].trim();
		// Check if it looks like a business name (has multiple capitalized words or business keywords)
		if (potentialBusiness.split(',').length >= 2 || 
		    /(?:Bureau|Ministry|Department|Office|Center|Centre|Bank|Company|Corp|Inc|Ltd)/i.test(potentialBusiness)) {
			businessName = potentialBusiness;
			// Remove business name from normalized address
			normalized = normalized.replace(new RegExp('^' + businessName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ',\\s*', 'i'), '');
		}
	}
	
	// Handle redundant patterns like "Eastern District of Taipei" (Taipei already implies the city)
	// Remove "Eastern District of" or "Western District of" etc. when followed by Taipei
	normalized = normalized.replace(/\b(Eastern|Western|Northern|Southern)\s+District\s+of\s+Taipei/gi, '台北');
	normalized = normalized.replace(/\b(Eastern|Western|Northern|Southern)\s+District\s+of\s+台北/gi, '台北');
	
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
		'Zhongshan South Road': '中山南路',
		'Zhongshan North Road': '中山北路',
		'Zhongshan East Road': '中山東路',
		'Zhongshan West Road': '中山西路',
		'Xinyi': '信義',
		'Xinyi District': '信義區',
		'Songshan': '松山',
		'Songshan District': '松山區',
		'Songjiang': '松江',
		'Songjiang Road': '松江路',
		'Zhuyuan': '竹園',
		'Zhuyuan Village': '竹園里',
		'Zhucuolun': '朱厝崙',
		'Zhongxiao': '忠孝',
		'Zhongxiao East Road': '忠孝東路',
		'Zhongxiao West Road': '忠孝西路',
		'Dunhua South Road': '敦化南路',
		'Dunhua North Road': '敦化北路',
		'Dunhua': '敦化',
		'Jianguo': '建國',
		'Jianguo South Road': '建國南路',
		'Jianguo North Road': '建國北路',
		'Jianguo East Road': '建國東路',
		'Jianguo West Road': '建國西路',
		'Zhongzheng': '中正',
		'Zhongzheng District': '中正區',
		'Chengnei': '城內',
		'Dongmen': '東門',
		'Dongmen Village': '東門里',
		'Yi': '義',
		'Yi Village': '義里',
		'Yi\'an': '義安',
		'Yi\'an Village': '義安里',
		'Daan': '大安',
		'Daan District': '大安區',
		'Liuzhangli': '六張犁',
		'Section': '段',
		'Sec.': '段',
		'Sec': '段',
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
		'District': '區',
		'Village': '里',
		'Fucheng Village': '富成里',
		'Fucheng': '富成',
		'Zhonghua': '中華',
		'Zhonghua Road': '中華路',
		'Zhonghua Village': '中華里',
		'Wanhua': '萬華',
		'Wanhua District': '萬華區',
		'Station Front': '站前',
		'Fuxing': '復興',
		'Fuxing Village': '復興里',
		'Zhonglun': '中崙',
		'Guangming Village': '光明里',
		'Guangming': '光明',
		'Huashan': '華山',
		'健康路': '健康路', // Keep as-is
		// Directional words - use word boundaries to avoid matching inside words like "Eastern"
		'Taiwan': '台灣',
		'Taïwan': '台灣',
		'Taiwan,': '台灣',
		'Taïwan,': '台灣'
	};
	
	// Replace English terms with Chinese (longer matches first to avoid partial replacements)
	// Use word boundaries for single words to avoid partial matches
	const sortedEntries = Object.entries(englishToChinese).sort((a, b) => b[0].length - a[0].length);
	for (const [english, chinese] of sortedEntries) {
		// For single words, use word boundaries to avoid matching inside other words
		// For phrases, match as-is but allow for following words (like "Section")
		const isSingleWord = !/\s/.test(english) && english.length <= 10;
		const escaped = english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		let regex: RegExp;
		if (isSingleWord) {
			regex = new RegExp(`\\b${escaped}\\b`, 'gi');
		} else {
			// For phrases, match the phrase but allow optional following text (like "Section 1")
			// This handles "Jianguo South Road Section 1" -> "建國南路一段"
			regex = new RegExp(escaped + '(?=\\s|,|$)', 'gi');
		}
		normalized = normalized.replace(regex, chinese);
	}
	
	// Handle directional words separately with word boundaries (after other translations)
	normalized = normalized.replace(/\bNorth\b/gi, '北');
	normalized = normalized.replace(/\bSouth\b/gi, '南');
	normalized = normalized.replace(/\bEast\b/gi, '東');
	normalized = normalized.replace(/\bWest\b/gi, '西');
	
	// Handle compound road names with directions: "X South Road" -> "X南路"
	// This handles cases where the road name was translated but direction wasn't
	// First, handle cases where road name is in English but direction is separate
	normalized = normalized.replace(/([A-Za-z]+)\s+(North|South|East|West)\s+路/gi, (match, road, direction) => {
		const dirMap: Record<string, string> = { 'North': '北', 'South': '南', 'East': '東', 'West': '西' };
		// Try to translate the road name if it's a known road
		const roadTranslations: Record<string, string> = {
			'Jianguo': '建國',
			'Zhongxiao': '忠孝',
			'Dunhua': '敦化',
			'Zhongshan': '中山',
			'Zhonghua': '中華'
		};
		const translatedRoad = roadTranslations[road] || road;
		return `${translatedRoad}${dirMap[direction] || direction}路`;
	});
	
	// Handle cases where we have "X 南 路" or "X South 路" (road name translated, direction translated separately, Road not translated)
	// This handles patterns like "Jianguo 南 路" -> "建國南路"
	normalized = normalized.replace(/([A-Za-z\u4e00-\u9fa5]+)\s+(北|南|東|西)\s+路/gi, (match, road, direction) => {
		// Try to translate the road name if it's English
		const roadTranslations: Record<string, string> = {
			'Jianguo': '建國',
			'Zhongxiao': '忠孝',
			'Dunhua': '敦化',
			'Zhongshan': '中山',
			'Zhonghua': '中華'
		};
		const translatedRoad = roadTranslations[road] || road;
		return `${translatedRoad}${direction}路`;
	});
	
	// Also handle "X South 路" pattern (English road name, English direction, Chinese 路)
	normalized = normalized.replace(/([A-Za-z]+)\s+(North|South|East|West)\s+路/gi, (match, road, direction) => {
		const dirMap: Record<string, string> = { 'North': '北', 'South': '南', 'East': '東', 'West': '西' };
		const roadTranslations: Record<string, string> = {
			'Jianguo': '建國',
			'Zhongxiao': '忠孝',
			'Dunhua': '敦化',
			'Zhongshan': '中山',
			'Zhonghua': '中華'
		};
		const translatedRoad = roadTranslations[road] || road;
		return `${translatedRoad}${dirMap[direction] || direction}路`;
	});
	
	// Handle "X Road" where X is already in Chinese but Road wasn't translated
	normalized = normalized.replace(/([\u4e00-\u9fa5]+)\s+Road/gi, '$1路');
	normalized = normalized.replace(/([\u4e00-\u9fa5]+)\s+Rd\.?/gi, '$1路');
	
	// Extract and preserve building numbers before removing postal codes
	// Building numbers are typically at the start or before road names
	// Pattern: number at start, or number before comma/road name
	let buildingNumber = '';
	const buildingAtStart = normalized.match(/^(\d+)\s*,/);
	if (buildingAtStart) {
		buildingNumber = buildingAtStart[1];
		// Remove the building number from start for now (we'll add it back later)
		normalized = normalized.replace(/^\d+\s*,?\s*/, '');
	}
	
	// Remove postal codes (they're not needed for geocoding and can confuse the API)
	// But be careful not to remove building numbers (usually 1-3 digits, postal codes are 3-5 digits)
	// Postal codes are typically at the end before Taiwan
	normalized = normalized.replace(/\b\d{3,5}\b(?=\s*(,|$|台灣|Taiwan|Taïwan))/g, '').trim();
	
	// Clean up multiple commas and spaces
	normalized = normalized.replace(/,\s*,/g, ',').replace(/,\s*$/, '').trim();
	
	// Normalize number formats in segments (convert Arabic to Chinese for 段)
	// Example: "4段" -> "四段", but keep Arabic for 號 (building numbers)
	// Also handle "Section 2" -> "二段" and "段 2" -> "二段"
	normalized = normalized.replace(/(?:Section|Sec\.?|Sec)\s*(\d+)/gi, (match, num) => {
		const numInt = parseInt(num, 10);
		if (numInt <= 10) {
			return arabicToChinese(numInt) + '段';
		}
		return num + '段'; // Keep Arabic for numbers > 10
	});
	normalized = normalized.replace(/(段)\s*(\d+)/g, (match, duan, num) => {
		const numInt = parseInt(num, 10);
		if (numInt <= 10) {
			return arabicToChinese(numInt) + '段';
		}
		return num + '段'; // Keep Arabic for numbers > 10
	});
	normalized = normalized.replace(/(\d+)(段)/g, (match, num) => {
		const numInt = parseInt(num, 10);
		if (numInt <= 10) {
			return arabicToChinese(numInt) + '段';
		}
		return match; // Keep Arabic for numbers > 10
	});
	
	// Fix "區 X" patterns where X should be part of the district name
	// Example: "區 中山" -> "中山區" or "區 Daan" -> "大安區"
	normalized = normalized.replace(/區\s+([A-Za-z\u4e00-\u9fa5]+)/g, (match, word) => {
		// Check if this word has a translation
		const wordLower = word.toLowerCase();
		const translations: Record<string, string> = {
			'daan': '大安',
			'songshan': '松山',
			'zhongshan': '中山',
			'xinyi': '信義',
			'zhongzheng': '中正',
			'wanhua': '萬華'
		};
		// If it's already Chinese, just reorder
		if (/[\u4e00-\u9fa5]/.test(word)) {
			return word + '區';
		}
		// If it's English and has a translation, use it
		if (translations[wordLower]) {
			return translations[wordLower] + '區';
		}
		return match; // Keep as-is if no translation
	});
	
	// Handle standalone district names (like "Wanhua" without "District" or "區")
	// Convert "Wanhua" -> "萬華區" when it appears as a standalone word (not part of a road name)
	normalized = normalized.replace(/\bWanhua\b(?!\s+(?:Road|路|Street|街|District|區))/gi, '萬華區');
	
	// Also fix patterns like "區中山" (no space) -> "中山區"
	normalized = normalized.replace(/區([\u4e00-\u9fa5]+)/g, '$1區');
	
	// Ensure proper spacing between components
	// Pattern: 市/縣 -> 區/鄉 -> 路 -> 段 -> 巷/弄 -> 號
	normalized = normalized
		.replace(/([市縣])([^區鄉路街段號巷弄])/g, '$1 $2') // Space after 市/縣
		.replace(/([區鄉])([^路街段號巷弄])/g, '$1 $2') // Space after 區/鄉
		.replace(/([路街])([^段號巷弄])/g, '$1 $2') // Space after 路/街
		.replace(/(段)([^號巷弄])/g, '$1 $2') // Space after 段
		.replace(/([巷弄])([^號])/g, '$1 $2') // Space after 巷/弄
		.replace(/\s+/g, ' ') // Collapse multiple spaces
		.trim();
	
	// Ensure 號 is properly attached to number
	normalized = normalized.replace(/(\d+)\s*號/g, '$1號');
	
	// Ensure 段 is properly attached (no space between number and 段)
	// Handle both Chinese and Arabic numbers
	normalized = normalized.replace(/([一二三四五六七八九十]+)\s*段/g, '$1段');
	normalized = normalized.replace(/(\d+)\s*段/g, '$1段');
	
	// Ensure 巷 and 弄 are properly attached to numbers (e.g., "15巷" not "15 巷")
	normalized = normalized.replace(/(\d+)\s*([巷弄])/g, '$1$2');
	
	// Remove trailing commas and clean up
	normalized = normalized.replace(/,\s*$/, '').trim();
	
	// Remove any remaining standalone commas (but keep them if they separate major components)
	normalized = normalized.replace(/,\s*,/g, ',').trim();
	
	// Try to reorder components to standard Taiwan format: City -> District -> Street -> Lane -> Building
	// This helps when addresses come in non-standard order (e.g., building number at start)
	
	// First, extract all components (handle comma-separated addresses)
	const parts = normalized.split(',').map(p => p.trim()).filter(p => p.length > 0);
	
	// Extract key components from the normalized string
	const cityMatch = normalized.match(/([^市縣]+[市縣])/);
	const districtMatch = normalized.match(/([^區鄉]+[區鄉])/);
	const streetMatch = normalized.match(/([^路街]+[路街](?:\d+[巷弄])?)/);
	const buildingMatch = normalized.match(/(\d+號)/);
	const sectionMatch = normalized.match(/([一二三四五六七八九十\d]+段)/);
	
	// If we have all key components, try to reconstruct in proper order
	if (cityMatch && districtMatch && streetMatch) {
		const city = cityMatch[1];
		const district = districtMatch[1];
		let street = streetMatch[1];
		// Use extracted building number if available, otherwise use the one found in the address
		const building = buildingNumber 
			? buildingNumber + '號'
			: (buildingMatch ? buildingMatch[1] : '');
		const section = sectionMatch ? sectionMatch[1] : '';
		
		// If section is separate from street, combine them
		if (section && !street.includes(section)) {
			// Insert section before 路/街 in street name
			street = street.replace(/([路街])/, `${section}$1`);
		}
		
		// Reconstruct in standard order: City -> District -> Street -> Building
		const reordered = [city, district, street, building].filter(Boolean).join('');
		
		// Check if reordered address would have duplicates
		const hasDuplicates = (addr: string): boolean => {
			// Check for repeated building numbers
			const buildingMatches = addr.match(/(\d+號)/g);
			if (buildingMatches && buildingMatches.length > 1) return true;
			// Check for repeated road names
			const roadMatches = addr.match(/([^路街]+[路街])/g);
			if (roadMatches && roadMatches.length > 1) {
				// Allow if they're different roads (different names)
				const roadNames = roadMatches.map(r => r.replace(/[路街]/g, ''));
				const uniqueRoads = new Set(roadNames);
				if (uniqueRoads.size < roadMatches.length) return true;
			}
			return false;
		};
		
		// Use reordered if:
		// 1. Current order is wrong (city not at start OR building at start)
		// 2. Reordered version doesn't have duplicates
		// 3. Reordered version is cleaner (no redundant parts, shorter or similar length)
		const hasWrongOrder = !normalized.startsWith(city) || /^\d+號/.test(normalized);
		const noDuplicates = !hasDuplicates(reordered);
		const isCleaner = reordered.length <= normalized.length * 1.1 && 
		                  !reordered.includes(',,') && 
		                  reordered.split(',').length <= parts.length;
		
		if (hasWrongOrder && noDuplicates && isCleaner) {
			normalized = reordered;
		} else if (hasWrongOrder && noDuplicates && reordered.length < normalized.length) {
			// Even if not cleaner, use reordered if it's shorter, has no duplicates, and order is wrong
			normalized = reordered;
		}
	}
	
	// Final cleanup: remove any remaining commas if we have a clean address without them
	if (!normalized.includes(',') || normalized.match(/^[^,]+[市縣][^,]+[區鄉][^,]+[路街]/)) {
		// Already in good format, remove commas
		normalized = normalized.replace(/,/g, '').trim();
	}
	
	// If we extracted a building number at the start but it's not in the final address, add it
	if (buildingNumber && !normalized.includes(buildingNumber + '號') && !normalized.match(/\d+號/)) {
		// Find where to insert the building number (after street name, before any remaining parts)
		const streetMatch = normalized.match(/([^路街]+[路街])/);
		if (streetMatch) {
			const streetEnd = streetMatch.index! + streetMatch[0].length;
			normalized = normalized.slice(0, streetEnd) + buildingNumber + '號' + normalized.slice(streetEnd);
		} else {
			// If no street found, append at the end
			normalized = normalized + buildingNumber + '號';
		}
	}
	
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
	
	// Extract street (路 or 街) - may include lane (巷) and alley (弄)
	// Pattern: 路/街 followed optionally by 巷/弄 and numbers
	// Also handle cases where street might have directional suffix (南路, 北路, etc.)
	const streetMatch = normalized.match(/([^路街]+[路街](?:\d+[巷弄])?)/);
	const street = streetMatch ? streetMatch[1] : undefined;
	
	// Extract building number (號)
	const buildingMatch = normalized.match(/(\d+)號/);
	const buildingNumber = buildingMatch ? buildingMatch[1] : undefined;
	
	// If no street found, try to find any road-like pattern
	if (!street) {
		const roadPattern = normalized.match(/([^,，]+(?:路|街|Road|Rd\.?))/i);
		if (roadPattern) {
			return {
				city,
				district,
				street: roadPattern[1].trim(),
				buildingNumber,
				normalized
			};
		}
	}
	
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
	const unique: string[] = [];
	
	// Helper to check if a candidate is already in the list (avoid duplicates)
	const isDuplicate = (candidate: string): boolean => {
		return unique.includes(candidate) || 
		       unique.some(existing => existing.replace(/\s+/g, '') === candidate.replace(/\s+/g, ''));
	};
	
	// Helper to check if a candidate is malformed (has duplicates or weird patterns)
	const isMalformed = (candidate: string): boolean => {
		// Check for duplicated building numbers
		const buildingMatches = candidate.match(/(\d+號)/g);
		if (buildingMatches && buildingMatches.length > 1) return true;
		
		// Check for duplicated road names (same road name repeated)
		const roadMatches = candidate.match(/([^路街]+[路街])/g);
		if (roadMatches && roadMatches.length > 1) {
			const roadNames = roadMatches.map(r => r.replace(/[路街]/g, '').trim());
			// If we have the same road name multiple times, it's malformed
			for (let i = 0; i < roadNames.length; i++) {
				for (let j = i + 1; j < roadNames.length; j++) {
					if (roadNames[i] === roadNames[j] && roadNames[i].length > 1) {
						return true;
					}
				}
			}
		}
		
		// Check for patterns like "X...X" where X is a significant part (more than 3 chars)
		const significantParts = candidate.match(/(.{4,})/g);
		if (significantParts) {
			for (const part of significantParts) {
				const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				const matches = candidate.match(new RegExp(escaped, 'g'));
				if (matches && matches.length > 1) return true;
			}
		}
		
		// Check for weird patterns like "區X...X" where X is repeated
		if (/區([^區路街號]+).*\1/.test(candidate)) return true;
		
		// Check for business names or English words mixed with Chinese addresses
		// Pattern: English capitalized words (likely business names) mixed with Chinese
		if (/[A-Z][a-z]+.*[\u4e00-\u9fa5].*[A-Z][a-z]+/i.test(candidate)) {
			// Allow if it's just "Taiwan" or common place names
			const allowedEnglish = /\b(Taiwan|Taipei|Section|Road|Street|District|Village)\b/i;
			const englishWords = candidate.match(/[A-Z][a-z]+/g) || [];
			const hasOnlyAllowed = englishWords.every(word => allowedEnglish.test(word));
			if (!hasOnlyAllowed) return true;
		}
		
		return false;
	};
	
	// 1. Full normalized address (if it's meaningful and doesn't have obvious issues)
	if (parsed.normalized && parsed.normalized.length > 2) {
		if (!isMalformed(parsed.normalized)) {
			unique.push(parsed.normalized);
			
			// 2. Full address with "Taiwan" suffix
			if (!parsed.normalized.includes('台灣') && !parsed.normalized.includes('Taiwan')) {
				unique.push(`${parsed.normalized}, Taiwan`);
			}
		}
	}
	
	// 3. City + District + Street + Building (construct from components, avoid duplication)
	if (parsed.city && parsed.district && parsed.street && parsed.buildingNumber) {
		const candidate = `${parsed.city}${parsed.district}${parsed.street}${parsed.buildingNumber}號`;
		// Only add if it's not already in the normalized address (to avoid duplicates)
		if (!parsed.normalized.includes(candidate) && !isDuplicate(candidate)) {
			unique.push(candidate);
		}
	}
	
	// 4. City + District + Street (no building number) - for street-level geocoding
	if (parsed.city && parsed.district && parsed.street) {
		const candidate = `${parsed.city}${parsed.district}${parsed.street}`;
		if (!isDuplicate(candidate)) {
			unique.push(candidate);
			// Also try with Taiwan suffix
			unique.push(`${candidate}, Taiwan`);
		}
	}
	
	// 5. District + Street (for cases where city is implicit)
	if (parsed.district && parsed.street) {
		const candidate = `${parsed.district}${parsed.street}`;
		if (!isDuplicate(candidate)) {
			unique.push(candidate);
			unique.push(`${candidate}, Taiwan`);
		}
	}
	
	// 6. City + District (if street parsing failed but we have city/district)
	if (parsed.city && parsed.district && !parsed.street) {
		const candidate = `${parsed.city}${parsed.district}`;
		if (!isDuplicate(candidate)) {
			unique.push(candidate);
			unique.push(`${candidate}, Taiwan`);
		}
	}
	
	// 7. Try street name only (if it contains lane/alley info, try without it)
	if (parsed.street) {
		// Extract just the road name (remove lane/alley and section if present)
		let roadOnly = parsed.street.replace(/\d+[巷弄]/g, '').trim();
		roadOnly = roadOnly.replace(/[一二三四五六七八九十\d]+段/g, '').trim();
		
		if (roadOnly && roadOnly !== parsed.street && roadOnly.length > 1) {
			if (parsed.city && parsed.district) {
				const candidate = `${parsed.city}${parsed.district}${roadOnly}`;
				if (!isDuplicate(candidate)) {
					unique.push(candidate);
					unique.push(`${candidate}, Taiwan`);
				}
			}
		}
	}
	
	// 8. If we have street but no city/district, try street with common prefixes
	if (parsed.street && (!parsed.city || !parsed.district)) {
		// Try with "台北市" prefix
		if (parsed.street.includes('路') || parsed.street.includes('街')) {
			// Extract just the road name (remove section if present)
			let roadName = parsed.street.replace(/[一二三四五六七八九十\d]+段/g, '').trim();
			if (roadName.length > 1) {
				// Try common districts if we don't have one
				const commonDistricts = ['中正區', '大安區', '信義區', '松山區', '中山區'];
				for (const district of commonDistricts) {
					const candidate = `台北市${district}${roadName}`;
					if (!isDuplicate(candidate)) {
						unique.push(candidate);
					}
				}
			}
		}
	}
	
	// Final cleanup: remove any candidates that are clearly malformed
	return unique.filter(candidate => {
		// Remove if it's too short or just punctuation
		if (candidate.trim().length < 3) return false;
		
		// Remove if it has obvious duplication patterns
		if (/(\d+號).*\1/.test(candidate)) return false;
		
		// Remove if it has the same road name repeated
		const roadMatches = candidate.match(/([^路街]+[路街])/g);
		if (roadMatches && roadMatches.length > 1) {
			const roadNames = roadMatches.map(r => r.replace(/[路街]/g, '').trim());
			const uniqueRoads = new Set(roadNames);
			// If we have duplicate road names, it's malformed
			if (uniqueRoads.size < roadMatches.length) return false;
		}
		
		// Remove if it has significant repeated parts (more than 3 chars)
		const parts = candidate.split(/[，,\s]+/).filter(p => p.length > 3);
		const partSet = new Set(parts);
		if (partSet.size < parts.length) return false;
		
		// Remove if it contains weird patterns like business names mixed with addresses incorrectly
		// Pattern: English words followed by Chinese address components, then the English part repeated
		const englishPartMatch = candidate.match(/([A-Z][a-zA-Z\s]+)/);
		if (englishPartMatch && englishPartMatch[1]) {
			const englishPart = englishPartMatch[1].trim();
			if (englishPart.length > 3) {
				// Check if this English part appears multiple times
				const matches = candidate.match(new RegExp(englishPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
				if (matches && matches.length > 1) return false;
			}
		}
		
		return true;
	});
}


