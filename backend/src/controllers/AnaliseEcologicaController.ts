import { Body, Controller, Get, Post } from '@nestjs/common';
import { DatabaseConnection } from '../config/DatabaseConnection.js';
import type { FaseCenarioModel, TalhaoModel } from '../models/DomainModels.js';
import { LifeTableMathEngine } from '../services/LifeTableMathEngine.js';

@Controller()
export class AnaliseEcologicaController {
  constructor(
    private readonly mathEngine: LifeTableMathEngine,
    private readonly db: DatabaseConnection,
  ) {}

  @Get('health')
  public async healthCheck() {
    await this.db.ensureInitialized();
    return {
      status: 'ok',
      engine: this.db.getEngineMode(),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('database/seed')
  public async reseedDatabase() {
    await this.db.seedFromDefaultScript();
    return {
      status: 'ok',
      message: 'Banco de dados restaurado para a carga inicial padrão (script.sql).',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('analise/calcular')
  public calcularTabelaDeVida(
    @Body()
    payload: {
      plots: TalhaoModel[];
      stages: FaseCenarioModel[];
      usar100rxPlanilha?: boolean;
    },
  ) {
    return this.mathEngine.computeCompleteAnalysis(
      payload.plots ?? [],
      payload.stages ?? [],
      Boolean(payload.usar100rxPlanilha),
    );
  }
}
