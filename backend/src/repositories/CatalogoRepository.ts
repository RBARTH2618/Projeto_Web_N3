import { Injectable } from '@nestjs/common';
import { DatabaseConnection } from '../config/DatabaseConnection.js';
import {
  AreaExperimentalModel,
  CulturaModel,
  PragaModel,
  UsuarioModel,
} from '../models/DomainModels.js';

@Injectable()
export class CatalogoRepository {
  constructor(private readonly db: DatabaseConnection) {}

  public async listarCulturasComPragas(): Promise<CulturaModel[]> {
    const culturasRes = await this.db.query<{
      id: string;
      nome: string;
      nome_cientifico: string;
      familia: string;
      descricao: string;
      icone: string;
      cor_tema: string;
    }>('SELECT id, nome, nome_cientifico, familia, descricao, icone, cor_tema FROM culturas ORDER BY nome ASC');

    const pragasRes = await this.db.query<{
      id: string;
      cultura_id: string;
      nome: string;
      nome_cientifico: string;
      ordem_familia: string;
      importancia: string;
      descricao_dano: string;
      icone: string;
      fases_sugeridas: string[] | string;
    }>('SELECT id, cultura_id, nome, nome_cientifico, ordem_familia, importancia, descricao_dano, icone, fases_sugeridas FROM pragas ORDER BY nome ASC');

    const pragasByCultura = new Map<string, PragaModel[]>();
    for (const row of pragasRes.rows) {
      const fases =
        typeof row.fases_sugeridas === 'string'
          ? (JSON.parse(row.fases_sugeridas) as string[])
          : (row.fases_sugeridas ?? []);
      const praga: PragaModel = {
        id: row.id,
        culturaId: row.cultura_id,
        nome: row.nome,
        nomeCientifico: row.nome_cientifico,
        ordemFamilia: row.ordem_familia,
        importancia: row.importancia,
        descricaoDano: row.descricao_dano,
        icone: row.icone,
        fasesSugeridas: fases,
      };
      const list = pragasByCultura.get(row.cultura_id) ?? [];
      list.push(praga);
      pragasByCultura.set(row.cultura_id, list);
    }

    return culturasRes.rows.map((c) => {
      const pragas = pragasByCultura.get(c.id) ?? [];
      return {
        id: c.id,
        nome: c.nome,
        nomeCientifico: c.nome_cientifico,
        familia: c.familia,
        descricao: c.descricao,
        icone: c.icone,
        corTema: c.cor_tema,
        totalPragas: pragas.length,
        pragas,
      };
    });
  }

  public async buscarCulturaPorId(id: string): Promise<CulturaModel | null> {
    const todas = await this.listarCulturasComPragas();
    return todas.find((c) => c.id === id) ?? null;
  }

  public async buscarPragaPorId(id: string): Promise<PragaModel | null> {
    const res = await this.db.query<{
      id: string;
      cultura_id: string;
      nome: string;
      nome_cientifico: string;
      ordem_familia: string;
      importancia: string;
      descricao_dano: string;
      icone: string;
      fases_sugeridas: string[] | string;
    }>(
      'SELECT id, cultura_id, nome, nome_cientifico, ordem_familia, importancia, descricao_dano, icone, fases_sugeridas FROM pragas WHERE id = $1',
      [id],
    );
    const row = res.rows[0];
    if (!row) return null;
    const fases =
      typeof row.fases_sugeridas === 'string'
        ? (JSON.parse(row.fases_sugeridas) as string[])
        : (row.fases_sugeridas ?? []);
    return {
      id: row.id,
      culturaId: row.cultura_id,
      nome: row.nome,
      nomeCientifico: row.nome_cientifico,
      ordemFamilia: row.ordem_familia,
      importancia: row.importancia,
      descricaoDano: row.descricao_dano,
      icone: row.icone,
      fasesSugeridas: fases,
    };
  }

  public async listarAreasUnirv(): Promise<AreaExperimentalModel[]> {
    const res = await this.db.query<{
      id: string;
      nome: string;
      subtitulo: string;
      hectares: string | number;
      lat_centro: string | number;
      lng_centro: string | number;
      dms_label: string;
      poligono_coords: [number, number][] | string;
    }>(
      'SELECT id, nome, subtitulo, hectares, lat_centro, lng_centro, dms_label, poligono_coords FROM areas_experimentais ORDER BY id ASC',
    );
    return res.rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      subtitulo: r.subtitulo,
      hectares: Number(r.hectares),
      latCentro: Number(r.lat_centro),
      lngCentro: Number(r.lng_centro),
      dmsLabel: r.dms_label,
      poligonoCoords:
        typeof r.poligono_coords === 'string'
          ? (JSON.parse(r.poligono_coords) as [number, number][])
          : r.poligono_coords,
    }));
  }

  public async listarUsuarios(): Promise<UsuarioModel[]> {
    const res = await this.db.query<UsuarioModel>(
      'SELECT id, nome, email, cargo, instituicao FROM usuarios ORDER BY nome ASC',
    );
    return res.rows;
  }
}
