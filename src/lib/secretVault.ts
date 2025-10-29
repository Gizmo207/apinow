// Stub secret vault - returns null (no secrets stored)

export async function getSecret(key: string): Promise<string | null> {
  return null;
}

export async function setSecret(key: string, value: string): Promise<void> {
  // No-op
}
