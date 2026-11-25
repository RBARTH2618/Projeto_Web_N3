import { Injectable } from '@nestjs/common';
import {
  ApiException,
  AreaExperimentalModel,
  CulturaModel,
  PragaModel,
  UsuarioModel,
} from '../models/DomainModels.js';
import { CatalogoRepository } from '../repositories/CatalogoRepository.js';

@Injectable()
export class CatalogoService {
  constructor(private readonly catalogoRepo: CatalogoRepository) {}

  public async listarCulturasComPragas(): Promise<CulturaModel[]> {
    return this.catalogoRepo.listarCulturasComPragas();
  }

  public async buscarCulturaPorId(id: string): Promise<CulturaModel> {
    const cultura = await this.catalogoRepo.buscarCulturaPorId(id);
    if (!cultura) {
      throw new ApiException(404, `Cultura '${id}' não encontrada no catálogo.`);
    }
    return cultura;
  }

  public async buscarPragaPorId(id: string): Promise<PragaModel> {
    const praga = await this.catalogoRepo.buscarPragaPorId(id);
    if (!praga) {
      throw new ApiException(404, `Praga '${id}' não encontrada no catálogo.`);
    }
    return praga;
  }

  public async listarAreasUnirv(): Promise<AreaExperimentalModel[]> {
    return this.catalogoRepo.listarAreasUnirv();
  }

  public async listarUsuarios(): Promise<UsuarioModel[]> {
    return this.catalogoRepo.listarUsuarios();
  }
}
