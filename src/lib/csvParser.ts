// Utility functions for parsing ABCG CSV data

const FRENCH_MONTHS = {
  'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
  'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
};

const FRENCH_DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/**
 * Parse French date format: "vendredi 26 septembre 2025"
 */
export function parseFrenchDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const parts = dateStr.toLowerCase().trim().split(' ');
  if (parts.length < 4) return null;
  
  const day = parseInt(parts[1]);
  const monthName = parts[2];
  const year = parseInt(parts[3]);
  
  const month = FRENCH_MONTHS[monthName as keyof typeof FRENCH_MONTHS];
  
  if (isNaN(day) || month === undefined || isNaN(year)) return null;
  
  return new Date(year, month, day);
}

/**
 * Normalize number strings: handle commas, spaces, and various formats
 */
export function normalizeNumber(value: string): number | null {
  if (!value || value.trim() === '') return null;
  
  // Remove spaces and convert comma to dot
  const cleaned = value
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/'/g, '');
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse percentage string to decimal: "8,25%" -> 0.0825
 */
export function parsePercentage(value: string): number | null {
  if (!value || value.trim() === '' || value === '#VALEUR!') return null;
  
  const cleaned = value.replace('%', '').trim();
  const num = normalizeNumber(cleaned);
  
  return num !== null ? num / 100 : null;
}

/**
 * Calculate current price from entry price and percentage change
 */
export function calculateCurrentPrice(entryPrice: number, percentChange: number | null): number {
  if (percentChange === null) return entryPrice;
  return entryPrice * (1 + percentChange);
}

/**
 * Determine if a position is valid for import
 */
export function isValidPosition(row: any): boolean {
  // Must have instrument and entry price
  if (!row.Instrument || !row['Entry Price']) return false;
  
  // Skip invalid statuses
  if (row.Status === 'Invalid') return false;
  
  return true;
}

/**
 * Map direction to standard format
 */
export function normalizeDirection(direction: string): 'BUY' | 'SELL' | null {
  const dir = direction?.toUpperCase();
  if (dir === 'BUY' || dir === 'SELL') return dir;
  return null;
}
