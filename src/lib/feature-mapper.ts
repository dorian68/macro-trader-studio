/**
 * Feature name mapping between jobs.feature (human-readable) and ai_interactions.feature_name (machine-readable)
 * Jobs table is the source of truth, managed by n8n workflow
 */

// Map from jobs.feature to ai_interactions.feature_name
export const JOBS_TO_AI_INTERACTIONS_FEATURE_MAP: Record<string, string> = {
  'AI Trade Setup': 'trade_generator',
  'Macro Commentary': 'macro_lab', 
  'Report': 'report',
  'Reports': 'report', // Handle both variants
  'Trade Setup': 'trade_generator', // Handle variant without "AI"
  'Macro Analysis': 'macro_lab', // Handle analysis variant
  'Trade Generator': 'trade_generator', // New canonical name
  'Macro Lab': 'macro_lab' // New canonical name
};

// Map from ai_interactions.feature_name to jobs.feature
export const AI_INTERACTIONS_TO_JOBS_FEATURE_MAP: Record<string, string> = {
  'trade_generator': 'AI Trade Setup', // Canonical key
  'macro_lab': 'Macro Commentary', // Canonical key
  'ai_trade_setup': 'AI Trade Setup', // Legacy support
  'trade_setup': 'AI Trade Setup', // Legacy support
  'macro_commentary': 'Macro Commentary', // Legacy support
  'market_commentary': 'Macro Commentary', // Legacy support
  'report': 'Report',
  'reports': 'Report' // Legacy support
};

/**
 * Convert jobs.feature to ai_interactions.feature_name
 */
export function jobsToAiInteractionsFeature(jobsFeature: string): string {
  return JOBS_TO_AI_INTERACTIONS_FEATURE_MAP[jobsFeature] || jobsFeature.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Convert ai_interactions.feature_name to jobs.feature  
 */
export function aiInteractionsToJobsFeature(aiFeature: string): string {
  return AI_INTERACTIONS_TO_JOBS_FEATURE_MAP[aiFeature] || aiFeature;
}

/**
 * Normalize feature name for consistent storage in ai_interactions
 */
export function normalizeFeatureName(featureName: string): string {
  // If it looks like a jobs.feature format, convert it
  if (JOBS_TO_AI_INTERACTIONS_FEATURE_MAP[featureName]) {
    return JOBS_TO_AI_INTERACTIONS_FEATURE_MAP[featureName];
  }
  
  // If it's already in ai_interactions format, use it
  if (Object.keys(AI_INTERACTIONS_TO_JOBS_FEATURE_MAP).includes(featureName)) {
    return featureName;
  }
  
  // Default normalization
  return featureName.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Get display name for feature (human-readable format)
 */
export function getFeatureDisplayName(featureName: string): string {
  // If it's an ai_interactions feature name, convert to jobs format
  if (AI_INTERACTIONS_TO_JOBS_FEATURE_MAP[featureName]) {
    return AI_INTERACTIONS_TO_JOBS_FEATURE_MAP[featureName];
  }
  
  // If it's already in jobs format, use it
  if (JOBS_TO_AI_INTERACTIONS_FEATURE_MAP[featureName]) {
    return featureName;
  }
  
  // Default: capitalize and replace underscores with spaces
  return featureName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}