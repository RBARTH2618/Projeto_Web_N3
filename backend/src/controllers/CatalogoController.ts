import { Controller, Get, Param } from '@nestjs/common';
import { CatalogoService } from '../services/CatalogoService.js';

@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Get('culturas')
  public async listarCulturas() {
    return this.catalogoService.listarCulturasComPragas();
  }

  @Get('culturas/:id')
  public async buscarCulturaPorId(@Param('id') id: string) {
    return this.catalogoService.buscarCulturaPorId(id);
  }

  @Get('pragas/:id')
  public async buscarPragaPorId(@Param('id') id: string) {
    return this.catalogoService.buscarPragaPorId(id);
  }

  @Get('areas-unirv')
  public async listarAreasUnirv() {
    return this.catalogoService.listarAreasUnirv();
  }

  @Get('usuarios')
  public async listarUsuarios() {
    return this.catalogoService.listarUsuarios();
  }
}
