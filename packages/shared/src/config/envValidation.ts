/**
 * Environment Variable Validation
 * Validates all required environment variables on startup
 * Fails fast with clear error messages if anything is missing
 */

interface EnvVarConfig {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url';
  default?: string;
  validate?: (value: string) => boolean | string;
}

// Server-side environment variables
const serverEnvVars: EnvVarConfig[] = [
  {
    name: 'JWT_SECRET',
    required: true,
    type: 'string',
    validate: (value) => {
      if (value.length < 32) {
        return 'JWT_SECRET must be at least 32 characters long for security';
      }
      if (value === 'dev-secret-key-change-in-prod') {
        return 'JWT_SECRET cannot be the default development value';
      }
      return true;
    },
  },
  {
    name: 'PORT',
    required: false,
    type: 'number',
    default: '3001',
  },
  {
    name: 'NODE_ENV',
    required: false,
    type: 'string',
    default: 'development',
  },
  {
    name: 'DEFAULT_ALCHEMY_API_KEY',
    required: true,
    type: 'string',
    validate: (value) => value.startsWith('') || 'Should be a valid Alchemy API key',
  },
  {
    name: 'FIREBASE_SERVICE_ACCOUNT',
    required: true,
    type: 'string',
    validate: (value) => {
      try {
        const decoded = Buffer.from(value, 'base64').toString();
        const parsed = JSON.parse(decoded);
        return parsed.type === 'service_account' || 'Invalid Firebase service account';
      } catch {
        return 'FIREBASE_SERVICE_ACCOUNT must be a valid base64-encoded JSON';
      }
    },
  },
  {
    name: 'PAYMENT_ADDRESS',
    required: true,
    type: 'string',
    validate: (value) => {
      if (!value.startsWith('0x') || value.length !== 42) {
        return 'PAYMENT_ADDRESS must be a valid Ethereum address (0x...)';
      }
      return true;
    },
  },
  {
    name: 'GAS_PAYMENT_ADDRESS',
    required: true,
    type: 'string',
    validate: (value) => {
      if (!value.startsWith('0x') || value.length !== 42) {
        return 'GAS_PAYMENT_ADDRESS must be a valid Ethereum address (0x...)';
      }
      return true;
    },
  },
  {
    name: 'TARGET_WALLET',
    required: true,
    type: 'string',
    validate: (value) => {
      if (!value.startsWith('0x') || value.length !== 42) {
        return 'TARGET_WALLET must be a valid Ethereum address (0x...)';
      }
      return true;
    },
  },
];

// Client-side environment variables (VITE_ prefix)
const clientEnvVars: EnvVarConfig[] = [
  {
    name: 'VITE_WALLETCONNECT_PROJECT_ID',
    required: true,
    type: 'string',
    validate: (value) => {
      if (value.length < 20) {
        return 'VITE_WALLETCONNECT_PROJECT_ID appears to be invalid';
      }
      if (value === '4e674e1e78cf4aeccc58b6ba6e810c13') {
        return 'VITE_WALLETCONNECT_PROJECT_ID cannot be the hardcoded development value';
      }
      return true;
    },
  },
  {
    name: 'VITE_FIREBASE_API_KEY',
    required: false,
    type: 'string',
  },
  {
    name: 'VITE_FIREBASE_AUTH_DOMAIN',
    required: false,
    type: 'string',
  },
  {
    name: 'VITE_FIREBASE_PROJECT_ID',
    required: false,
    type: 'string',
  },
  {
    name: 'VITE_API_URL',
    required: false,
    type: 'url',
    default: '',
  },
  {
    name: 'VITE_PAYMENT_ADDRESS',
    required: false,
    type: 'string',
  },
];

class EnvironmentValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  validate(vars: EnvVarConfig[], isServer: boolean): boolean {
    this.errors = [];
    this.warnings = [];

    for (const config of vars) {
      const value = isServer 
        ? process.env[config.name] 
        : (import.meta as any).env?.[config.name] || process.env[config.name];

      // Check if required
      if (config.required && !value && !config.default) {
        this.errors.push(`❌ ${config.name} is required but not set`);
        continue;
      }

      // Use default if available
      const actualValue = value || config.default;
      if (!actualValue) {
        this.warnings.push(`⚠️  ${config.name} is not set (optional)`);
        continue;
      }

      // Type validation
      if (config.type === 'number' && isNaN(Number(actualValue))) {
        this.errors.push(`❌ ${config.name} must be a number, got: ${actualValue}`);
        continue;
      }

      if (config.type === 'url') {
        try {
          new URL(actualValue);
        } catch {
          this.errors.push(`❌ ${config.name} must be a valid URL, got: ${actualValue}`);
          continue;
        }
      }

      // Custom validation
      if (config.validate) {
        const result = config.validate(actualValue);
        if (result !== true) {
          this.errors.push(`❌ ${config.name}: ${result}`);
          continue;
        }
      }

      // Check for development values in production
      if (process.env.NODE_ENV === 'production') {
        const devPatterns = ['dev', 'test', 'localhost', 'example', 'changeme'];
        const lowerValue = actualValue.toLowerCase();
        if (devPatterns.some(pattern => lowerValue.includes(pattern))) {
          this.warnings.push(`⚠️  ${config.name} may contain a development value: ${actualValue}`);
        }
      }
    }

    return this.errors.length === 0;
  }

  getErrors(): string[] {
    return this.errors;
  }

  getWarnings(): string[] {
    return this.warnings;
  }

  printReport(): void {
    if (this.warnings.length > 0) {
      console.warn('\n⚠️  Environment Warnings:');
      this.warnings.forEach(w => console.warn(w));
    }

    if (this.errors.length > 0) {
      console.error('\n❌ Environment Errors:');
      this.errors.forEach(e => console.error(e));
      console.error('\n💡 Please set the required environment variables and restart the application.');
    } else {
      console.log('✅ All required environment variables are properly configured');
    }
  }
}

// Export singleton instance
export const envValidator = new EnvironmentValidator();

// Validation functions for different contexts
export function validateServerEnv(): boolean {
  const isValid = envValidator.validate(serverEnvVars, true);
  envValidator.printReport();
  return isValid;
}

export function validateClientEnv(): boolean {
  const isValid = envValidator.validate(clientEnvVars, false);
  envValidator.printReport();
  return isValid;
}

// Helper to check if running in development
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

// Helper to check if running in production
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export default {
  validateServerEnv,
  validateClientEnv,
  isDevelopment,
  isProduction,
  envValidator,
};
