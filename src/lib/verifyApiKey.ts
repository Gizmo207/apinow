// Stub for build compatibility
export async function verifyApiKey(apiKey: string) {
  // For now, just return a mock verification
  return {
    valid: false,
    userId: null,
    error: 'API key verification not implemented'
  };
}
