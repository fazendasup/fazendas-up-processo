export const ENV = {
  // Required
  databaseUrl: process.env.DATABASE_URL ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  isProduction: process.env.NODE_ENV === "production",
  
  // Optional - for Manus OAuth integration
  appId: process.env.VITE_APP_ID ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  
  // Optional - for Manus Forge API integration (storage, LLM, etc)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  frontendForgeApiUrl: process.env.VITE_FRONTEND_FORGE_API_URL ?? "",
  frontendForgeApiKey: process.env.VITE_FRONTEND_FORGE_API_KEY ?? "",
};

// Validate required environment variables
if (!ENV.databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}
if (!ENV.cookieSecret && ENV.isProduction) {
  throw new Error("JWT_SECRET environment variable is required in production");
}
