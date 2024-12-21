import { SessionOptions } from 'express-session';

interface Config {
  openai: {
    apiKey: string;
  };
  server: {
    port: number;
    env: string;
  };
  session: SessionOptions;
  database: {
    url: string;
  };
}

// Check for required environment variables
const requiredEnvVars = {
  'OPENAI_API_KEY': process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY, // Fallback to VITE_ prefix if needed
  'DATABASE_URL': process.env.DATABASE_URL
};

// Check all required environment variables
Object.entries(requiredEnvVars).forEach(([name, value]) => {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    throw new Error(`${name} must be set`);
  }
});

export const config: Config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '',
  },
  server: {
    port: Number(process.env.PORT) || 5000,
    env: process.env.NODE_ENV || 'development',
    timeout: 120000,
    keepAliveTimeout: 65000,
    headers: {
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=65'
    }
  },
  session: {
    secret: process.env.SESSION_SECRET || 'development-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
    name: 'sid',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
};
