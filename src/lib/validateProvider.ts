// Server-side provider validation using the same registry as the UI
import { getProvider } from '@/config/providers';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate connection data against provider configuration
 * This ensures server-side validation matches UI validation
 */
export function validateProviderConnection(
  providerKey: string,
  data: Record<string, any>
): ValidationResult {
  const provider = getProvider(providerKey);
  
  if (!provider) {
    return {
      valid: false,
      errors: ['Provider configuration not found']
    };
  }

  const errors: string[] = [];

  for (const field of provider.fields) {
    const value = data[field.name];

    // Required field validation
    if (field.required && !value) {
      errors.push(`${field.label} is required`);
      continue;
    }

    // Skip further validation if value is empty and not required
    if (!value) continue;

    // Pattern validation
    if (field.pattern && typeof value === 'string' && !field.pattern.test(value)) {
      errors.push(`Invalid ${field.label} format`);
      continue;
    }

    // Custom validation function
    if (field.validate && typeof value === 'string') {
      const result = field.validate(value);
      if (result !== true) {
        errors.push(result);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Extract connection info from validated data
 */
export function extractConnectionInfo(
  providerKey: string,
  data: Record<string, any>
): { connectionString?: string; filePath?: string; extras?: any } {
  const provider = getProvider(providerKey);
  
  if (!provider) {
    throw new Error('Provider not found');
  }

  // Apply normalize function if provider has one
  if (provider.normalize) {
    return provider.normalize(data);
  }

  // Default: just return the data as-is
  return data;
}
