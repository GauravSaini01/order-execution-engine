import { QueryResult } from 'pg';

export interface DBClient {
  query(sql: string, params?: any[]): Promise<QueryResult<any>>;
}