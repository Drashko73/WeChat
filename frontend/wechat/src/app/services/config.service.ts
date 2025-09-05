import { Injectable } from '@angular/core';
import { environment as defaultEnvironment } from '../../environments/environment';

/**
 * Configuration interface that matches the environment variables structure
 */
export interface AppConfig {
  production: boolean;
  apiUrl: string;
  // Add other configuration properties as needed
}

/**
 * Service responsible for providing application configuration
 * and overriding default values with environment variables when available
 */
@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private config: AppConfig;

  constructor() {
    // Start with default environment
    this.config = { ...defaultEnvironment };
    
    // Override with environment variables if available
    this.loadFromWindowEnv();
  }

  /**
   * Loads configuration from window.__env object which will be
   * populated with environment variables during Docker deployment
   */
  private loadFromWindowEnv(): void {
    // Check if window.__env is available (will be injected via Docker)
    if (typeof window !== 'undefined' && (window as any).__env) {
      const env = (window as any).__env;
      
      // Override apiUrl if provided
      if (env.API_URL) {
        this.config.apiUrl = env.API_URL;
      }
      
      // Override production flag if provided
      if (env.PRODUCTION !== undefined) {
        this.config.production = env.PRODUCTION === 'true';
      }
      
      // Add more environment variables as needed
    }
  }

  /**
   * Get the entire configuration object
   */
  get(): AppConfig {
    return this.config;
  }

  /**
   * Get API URL from configuration
   */
  get apiUrl(): string {
    return this.config.apiUrl;
  }

  /**
   * Check if the application is running in production mode
   */
  get isProduction(): boolean {
    return this.config.production;
  }
}
