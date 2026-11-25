import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import type {
  AtualizarCelulaContagemDTO,
  AtualizarCenarioMetadadosDTO,
  CriarCenarioDTO,
  MoverRegiaoTalhaoDTO,
  SincronizarColetaDTO,
} from '../models/DomainModels.js';
import { CenarioService } from '../services/CenarioService.js';

@Controller('cenarios')
export class CenarioController {
  constructor(private readonly cenarioService: CenarioService) {}

  @Get()
  public async listarCenarios() {
    return this.cenarioService.listarCenarios();
  }

  @Get(':id')
  public async buscarCenario(@Param('id') id: string) {
    return this.cenarioService.buscarCenarioComAnalise(id);
  }

  @Post()
  public async criarCenario(@Body() dto: CriarCenarioDTO) {
    return this.cenarioService.criarNovoCenario(dto);
  }

  @Put(':id')
  public async atualizarMetadados(
    @Param('id') id: string,
    @Body() dto: AtualizarCenarioMetadadosDTO,
  ) {
    return this.cenarioService.atualizarMetadados(id, dto);
  }

  @Put(':id/coleta')
  public async sincronizarColeta(
    @Param('id') id: string,
    @Body() dto: SincronizarColetaDTO,
  ) {
    return this.cenarioService.sincronizarColeta(id, dto);
  }

  @Patch(':id/talhoes/:num/contagem')
  public async atualizarCelulaContagem(
    @Param('id') id: string,
    @Param('num') num: string,
    @Body() dto: AtualizarCelulaContagemDTO,
  ) {
    return this.cenarioService.atualizarCelulaContagem(id, Number(num), dto);
  }

  @Post(':id/talhoes/:num/mover-regiao')
  public async moverRegiaoTalhao(
    @Param('id') id: string,
    @Param('num') num: string,
    @Body() dto: MoverRegiaoTalhaoDTO,
  ) {
    return this.cenarioService.moverRegiaoDoTalhao(id, Number(num), dto);
  }

  @Post(':id/duplicar')
  public async duplicarCenario(@Param('id') id: string) {
    return this.cenarioService.duplicarCenario(id);
  }

  @Delete(':id')
  public async excluirCenario(@Param('id') id: string) {
    return this.cenarioService.excluirCenario(id);
  }
}
