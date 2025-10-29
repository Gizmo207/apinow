import { MYSQL_PROVIDERS } from './mysql';
import { POSTGRES_PROVIDERS } from './postgresql';
import { SQLITE_PROVIDERS } from './sqlite';
import { MARIADB_PROVIDERS } from './mariadb';
import { MONGODB_PROVIDERS } from './mongodb';
import { MSSQL_PROVIDERS } from './mssql';
import { REDIS_PROVIDERS } from './redis';
import { ProviderConfig, Engine } from './types';

// Centralized provider registry - single source of truth
export const PROVIDERS: Record<string, ProviderConfig> = [
  ...MYSQL_PROVIDERS,
  ...POSTGRES_PROVIDERS,
  ...SQLITE_PROVIDERS,
  ...MARIADB_PROVIDERS,
  ...MONGODB_PROVIDERS,
  ...MSSQL_PROVIDERS,
  ...REDIS_PROVIDERS,
].reduce((acc, provider) => {
  acc[provider.key] = provider;
  return acc;
}, {} as Record<string, ProviderConfig>);

// Get all providers for a specific engine
export function providersByEngine(engine: Engine): ProviderConfig[] {
  return Object.values(PROVIDERS).filter(p => p.engine === engine);
}

// Get provider by key
export function getProvider(key: string): ProviderConfig | undefined {
  return PROVIDERS[key];
}

// Get provider dropdown options for an engine
export function getProviderOptions(engine: Engine) {
  return providersByEngine(engine).map(p => ({
    value: p.key,
    label: p.name
  }));
}

export * from './types';
