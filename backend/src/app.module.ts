import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseConnection } from './config/DatabaseConnection.js';
import { AnaliseEcologicaController } from './controllers/AnaliseEcologicaController.js';
import { CatalogoController } from './controllers/CatalogoController.js';
import { CenarioController } from './controllers/CenarioController.js';
import { CatalogoRepository } from './repositories/CatalogoRepository.js';
import { CenarioRepository } from './repositories/CenarioRepository.js';
import { CatalogoService } from './services/CatalogoService.js';
import { CenarioService } from './services/CenarioService.js';
import { LifeTableMathEngine } from './services/LifeTableMathEngine.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [
    CatalogoController,
    CenarioController,
    AnaliseEcologicaController,
  ],
  providers: [
    DatabaseConnection,
    CatalogoRepository,
    CenarioRepository,
    CatalogoService,
    CenarioService,
    LifeTableMathEngine,
  ],
})
export class AppModule {}
