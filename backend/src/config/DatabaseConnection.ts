import * as fs from 'node:fs';
import * as path from 'node:path';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import pg from 'pg';
import { newDb } from 'pg-mem';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number | null;
}

export interface DbClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  release(): void;
}

@Injectable()
export class DatabaseConnection implements OnModuleInit {
  private static instance: DatabaseConnection | null = null;
  private readonly logger = new Logger(DatabaseConnection.name);
  private pool!: pg.Pool;
  private isInMemory = false;
  private initialized = false;

  constructor() {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = this;
    }
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async onModuleInit(): Promise<void> {
    await this.ensureInitialized();
  }

  public async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    const host = process.env.DB_HOST ?? 'localhost';
    const port = Number(process.env.DB_PORT ?? 5432);
    const user = process.env.DB_USER ?? 'postgres';
    const password = process.env.DB_PASSWORD ?? 'postgres';
    const database = process.env.DB_NAME ?? 'unirv_lifetable';

    const pgPool = new pg.Pool({
      host,
      port,
      user,
      password,
      database,
      connectionTimeoutMillis: 2500,
    });

    try {
      const client = await pgPool.connect();
      client.release();
      this.pool = pgPool;
      this.isInMemory = false;
      this.logger.log(`Conectado ao PostgreSQL em ${host}:${port}/${database}`);
    } catch (err) {
      this.logger.warn(
        `PostgreSQL físico indisponível em ${host}:${port} (${(err as Error).message}). Ativando motor PostgreSQL em memória (pg-mem) compatível com script.sql.`,
      );
      await pgPool.end().catch(() => undefined);
      const mem = newDb();
      const adapter = mem.adapters.createPg();
      this.pool = new adapter.Pool();
      this.isInMemory = true;
    }

    this.initialized = true;

    // Verifica se as tabelas já existem e têm dados; caso contrário, executa script.sql
    try {
      const check = await this.query<{ total: string | number }>(
        'SELECT COUNT(*) AS total FROM culturas',
      );
      const count = Number(check.rows[0]?.total ?? 0);
      if (count === 0) {
        await this.seedFromDefaultScript();
      }
    } catch {
      await this.seedFromDefaultScript();
    }
  }

  public getEngineMode(): string {
    return this.isInMemory ? 'postgresql-pg-mem' : 'postgresql-native';
  }

  public async seedFromDefaultScript(): Promise<void> {
    const candidates = [
      path.resolve(process.cwd(), 'database', 'script.sql'),
      path.resolve(process.cwd(), '..', 'script.sql'),
      path.resolve(process.cwd(), 'script.sql'),
    ];
    const scriptPath = candidates.find((p) => fs.existsSync(p));
    if (!scriptPath) {
      throw new Error('Arquivo script.sql não encontrado para inicialização do banco.');
    }
    await this.executeSqlScript(scriptPath);
  }

  public async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    await this.ensureInitialized();
    const res = await this.pool.query(sql, params);
    return {
      rows: (res.rows ?? []) as T[],
      rowCount: res.rowCount ?? res.rows?.length ?? 0,
    };
  }

  public async withTransaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
    await this.ensureInitialized();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const wrappedClient: DbClient = {
        query: async <R = any>(sql: string, params: any[] = []): Promise<QueryResult<R>> => {
          const res = await client.query(sql, params);
          return {
            rows: (res.rows ?? []) as R[],
            rowCount: res.rowCount ?? res.rows?.length ?? 0,
          };
        },
        release: () => client.release(),
      };
      const result = await fn(wrappedClient);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  public async executeSqlScript(filePath: string): Promise<void> {
    await this.ensureInitialized();
    const rawSql = fs.readFileSync(filePath, 'utf8');
    if (this.isInMemory) {
      const withoutComments = rawSql
        .split(/\r?\n/)
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n');

      const statements = withoutComments
        .split(/;\s*(?:\r?\n|$)/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const cleanStmt of statements) {
        if (
          /^SELECT\s+setval/i.test(cleanStmt) ||
          /^DROP\s+VIEW/i.test(cleanStmt) ||
          /^CREATE\s+VIEW/i.test(cleanStmt)
        ) {
          try {
            await this.pool.query(cleanStmt);
          } catch {
            // pg-mem ignora views complexas com COUNT(DISTINCT ...) ou DROP VIEW IF EXISTS
          }
          continue;
        }
        let stmtToRun = cleanStmt;
        if (/^CREATE\s+TABLE\s+contagens_fase/i.test(stmtToRun)) {
          stmtToRun = stmtToRun.replace(/CHECK\s*\([^)]+\)/gi, '');
        }
        await this.pool.query(stmtToRun);
      }
    } else {
      await this.pool.query(rawSql);
    }
    this.logger.log(`Carga SQL executada com sucesso a partir de: ${filePath}`);
  }
}
