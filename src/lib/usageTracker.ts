// Stub for build compatibility
export function trackUsage(data: any) {
  // No-op for now
  return Promise.resolve();
}

export function getUserUsage(userId: string) {
  // Return default usage
  return Promise.resolve({
    requests: 0,
    limit: 1000
  });
}
