// Stands in for the cloudflare:workers module in unit tests, so each test decides
// which bindings exist (e.g. env.DB from createTestDb()).
export const env = {} as Env;
