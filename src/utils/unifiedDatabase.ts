// Stub for build compatibility
export class UnifiedDatabaseService {
  constructor(config: any) {}
  
  async query(sql: string, params?: any[]) {
    return [];
  }
  
  async execute(sql: string, params?: any[]) {
    return { affectedRows: 0 };
  }
}
