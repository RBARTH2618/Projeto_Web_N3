import { Injectable } from '@nestjs/common';
import { DatabaseConnection, DbClient } from '../config/DatabaseConnection.js';
import {
  AtualizarCelulaContagemDTO,
  AtualizarCenarioMetadadosDTO,
  CenarioAnaliticoModel,
  FaseCenarioModel,
  PontoAmostralModel,
  TalhaoModel,
} from '../models/DomainModels.js';

@Injectable()
export class CenarioRepository {
  constructor(private readonly db: DatabaseConnection) {}

  public async listarTodosCenariosCompletos(): Promise<CenarioAnaliticoModel[]> {
    const cenariosRes = await this.db.query<{
      id: string;
      nome: string;
      criado_por: string;
      usuario_id: string | null;
      cultura_id: string;
      cultura_nome: string;
      cultura_cientifico: string;
      praga_id: string;
      praga_nome: string;
      praga_cientifico: string;
      usar_100rx_planilha: boolean;
      observacoes: string;
      criado_em: Date | string;
    }>(`
      SELECT
        c.id,
        c.nome,
        c.criado_por,
        c.usuario_id,
        c.cultura_id,
        cu.nome AS cultura_nome,
        cu.nome_cientifico AS cultura_cientifico,
        c.praga_id,
        pr.nome AS praga_nome,
        pr.nome_cientifico AS praga_cientifico,
        c.usar_100rx_planilha,
        c.observacoes,
        c.criado_em
      FROM cenarios_analiticos c
      JOIN culturas cu ON cu.id = c.cultura_id
      JOIN pragas pr ON pr.id = c.praga_id
      ORDER BY c.criado_em DESC, c.id ASC
    `);

    const fasesRes = await this.db.query<{
      cenario_id: string;
      ordem_fase: number;
      codigo_fase: string;
      nome_fase: string;
    }>(
      'SELECT cenario_id, ordem_fase, codigo_fase, nome_fase FROM cenario_fases ORDER BY cenario_id ASC, ordem_fase ASC',
    );

    const talhoesRes = await this.db.query<{
      id: number;
      cenario_id: string;
      area_experimental_id: string | null;
      numero_talhao: number;
      nome_talhao: string;
      lat_centro: string | number;
      lng_centro: string | number;
    }>(
      'SELECT id, cenario_id, area_experimental_id, numero_talhao, nome_talhao, lat_centro, lng_centro FROM talhoes ORDER BY cenario_id ASC, numero_talhao ASC',
    );

    const amostrasRes = await this.db.query<{
      talhao_id: number;
      indice_amostra: number;
      codigo_amostra: string;
      latitude: string | number;
      longitude: string | number;
    }>(
      'SELECT talhao_id, indice_amostra, codigo_amostra, latitude, longitude FROM amostras_coleta ORDER BY talhao_id ASC, indice_amostra ASC',
    );

    const contagensRes = await this.db.query<{
      talhao_id: number;
      ordem_fase: number;
      indice_amostra: number;
      quantidade_individuos: number;
    }>(
      'SELECT talhao_id, ordem_fase, indice_amostra, quantidade_individuos FROM contagens_fase ORDER BY talhao_id ASC, ordem_fase ASC, indice_amostra ASC',
    );

    const fasesByCenario = new Map<string, FaseCenarioModel[]>();
    for (const f of fasesRes.rows) {
      const list = fasesByCenario.get(f.cenario_id) ?? [];
      list.push({
        ordem: Number(f.ordem_fase),
        codigo: f.codigo_fase,
        nome: f.nome_fase,
      });
      fasesByCenario.set(f.cenario_id, list);
    }

    const amostrasByTalhao = new Map<number, PontoAmostralModel[]>();
    for (const a of amostrasRes.rows) {
      const list = amostrasByTalhao.get(Number(a.talhao_id)) ?? [];
      list.push({
        id: Number(a.indice_amostra),
        code: a.codigo_amostra,
        lat: Number(a.latitude),
        lng: Number(a.longitude),
      });
      amostrasByTalhao.set(Number(a.talhao_id), list);
    }

    const contagensByTalhao = new Map<number, Map<string, number>>();
    for (const cnt of contagensRes.rows) {
      const tId = Number(cnt.talhao_id);
      const map = contagensByTalhao.get(tId) ?? new Map<string, number>();
      map.set(
        `${cnt.ordem_fase}:${cnt.indice_amostra}`,
        Number(cnt.quantidade_individuos),
      );
      contagensByTalhao.set(tId, map);
    }

    const talhoesByCenario = new Map<string, TalhaoModel[]>();
    for (const t of talhoesRes.rows) {
      const tId = Number(t.id);
      const stages = fasesByCenario.get(t.cenario_id) ?? [];
      const samples = amostrasByTalhao.get(tId) ?? [];
      const countMap = contagensByTalhao.get(tId) ?? new Map<string, number>();

      const counts: number[][] = stages.map((st) =>
        samples.map((s) => countMap.get(`${st.ordem}:${s.id}`) ?? 0),
      );

      const list = talhoesByCenario.get(t.cenario_id) ?? [];
      list.push({
        id: tId,
        numero: Number(t.numero_talhao),
        nome: t.nome_talhao,
        areaExperimentalId: t.area_experimental_id ?? 'area-1',
        latCentro: Number(t.lat_centro),
        lngCentro: Number(t.lng_centro),
        samples,
        counts,
      });
      talhoesByCenario.set(t.cenario_id, list);
    }

    return cenariosRes.rows.map((c) => ({
      id: c.id,
      nome: c.nome,
      criadoPor: c.criado_por,
      usuarioId: c.usuario_id,
      culturaId: c.cultura_id,
      culturaNome: c.cultura_nome,
      culturaCientifico: c.cultura_cientifico,
      pragaId: c.praga_id,
      pragaNome: c.praga_nome,
      pragaCientifico: c.praga_cientifico,
      usar100rxPlanilha: Boolean(c.usar_100rx_planilha),
      observacoes: c.observacoes ?? '',
      criadoEm:
        c.criado_em instanceof Date
          ? c.criado_em.toISOString()
          : String(c.criado_em),
      stages: fasesByCenario.get(c.id) ?? [],
      plots: talhoesByCenario.get(c.id) ?? [],
    }));
  }

  public async buscarCenarioPorId(id: string): Promise<CenarioAnaliticoModel | null> {
    const todos = await this.listarTodosCenariosCompletos();
    return todos.find((c) => c.id === id) ?? null;
  }

  public async criarCenarioCompleto(
    cenario: {
      id: string;
      nome: string;
      criadoPor: string;
      culturaId: string;
      pragaId: string;
      usar100rxPlanilha: boolean;
      observacoes: string;
    },
    stages: FaseCenarioModel[],
    plots: TalhaoModel[],
  ): Promise<CenarioAnaliticoModel> {
    await this.db.withTransaction(async (client) => {
      await client.query(
        `INSERT INTO cenarios_analiticos (id, nome, criado_por, cultura_id, praga_id, usar_100rx_planilha, observacoes, criado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [
          cenario.id,
          cenario.nome,
          cenario.criadoPor,
          cenario.culturaId,
          cenario.pragaId,
          cenario.usar100rxPlanilha,
          cenario.observacoes,
        ],
      );

      await this.inserirFasesETalhoes(client, cenario.id, stages, plots);
    });

    const created = await this.buscarCenarioPorId(cenario.id);
    if (!created) {
      throw new Error('Falha ao recuperar cenário recém-criado.');
    }
    return created;
  }

  public async atualizarMetadados(
    id: string,
    dto: AtualizarCenarioMetadadosDTO,
  ): Promise<CenarioAnaliticoModel | null> {
    const current = await this.buscarCenarioPorId(id);
    if (!current) return null;

    await this.db.withTransaction(async (client) => {
      await client.query(
        `UPDATE cenarios_analiticos
         SET nome = $1,
             criado_por = $2,
             observacoes = $3,
             usar_100rx_planilha = $4
         WHERE id = $5`,
        [
          dto.nome ?? current.nome,
          dto.criadoPor ?? current.criadoPor,
          dto.observacoes ?? current.observacoes,
          dto.usar100rxPlanilha ?? current.usar100rxPlanilha,
          id,
        ],
      );
    });

    return this.buscarCenarioPorId(id);
  }

  public async substituirTalhoesEFases(
    cenarioId: string,
    stages: FaseCenarioModel[],
    plots: TalhaoModel[],
    usar100rxPlanilha?: boolean,
  ): Promise<CenarioAnaliticoModel | null> {
    const existing = await this.buscarCenarioPorId(cenarioId);
    if (!existing) return null;

    await this.db.withTransaction(async (client) => {
      if (typeof usar100rxPlanilha === 'boolean') {
        await client.query(
          'UPDATE cenarios_analiticos SET usar_100rx_planilha = $1 WHERE id = $2',
          [usar100rxPlanilha, cenarioId],
        );
      }
      await client.query('DELETE FROM cenario_fases WHERE cenario_id = $1', [
        cenarioId,
      ]);
      await client.query('DELETE FROM talhoes WHERE cenario_id = $1', [
        cenarioId,
      ]);
      await this.inserirFasesETalhoes(client, cenarioId, stages, plots);
    });

    return this.buscarCenarioPorId(cenarioId);
  }

  public async atualizarValorAmostra(
    cenarioId: string,
    numeroTalhao: number,
    dto: AtualizarCelulaContagemDTO,
  ): Promise<CenarioAnaliticoModel | null> {
    await this.db.withTransaction(async (client) => {
      const tRes = await client.query<{ id: number }>(
        'SELECT id FROM talhoes WHERE cenario_id = $1 AND numero_talhao = $2',
        [cenarioId, numeroTalhao],
      );
      const talhaoId = tRes.rows[0]?.id;
      if (!talhaoId) return;

      const indiceAmostra = dto.sampleIndex + 1;
      const valor = Math.max(0, Math.round(Number(dto.value) || 0));

      const existsRes = await client.query<{ id: number }>(
        'SELECT id FROM contagens_fase WHERE talhao_id = $1 AND ordem_fase = $2 AND indice_amostra = $3',
        [talhaoId, dto.stageIndex, indiceAmostra],
      );
      if (existsRes.rows.length > 0) {
        await client.query(
          'UPDATE contagens_fase SET quantidade_individuos = $1 WHERE talhao_id = $2 AND ordem_fase = $3 AND indice_amostra = $4',
          [valor, talhaoId, dto.stageIndex, indiceAmostra],
        );
      } else {
        await client.query(
          'INSERT INTO contagens_fase (talhao_id, ordem_fase, indice_amostra, quantidade_individuos) VALUES ($1, $2, $3, $4)',
          [talhaoId, dto.stageIndex, indiceAmostra, valor],
        );
      }

      if (typeof dto.lat === 'number' && typeof dto.lng === 'number') {
        await client.query(
          'UPDATE amostras_coleta SET latitude = $1, longitude = $2 WHERE talhao_id = $3 AND indice_amostra = $4',
          [dto.lat, dto.lng, talhaoId, indiceAmostra],
        );
      }
    });

    return this.buscarCenarioPorId(cenarioId);
  }

  public async moverRegiaoTalhao(
    cenarioId: string,
    numeroTalhao: number,
    newLat: number,
    newLng: number,
    areaExperimentalId: string,
    apenasAmostraIndex?: number,
  ): Promise<CenarioAnaliticoModel | null> {
    await this.db.withTransaction(async (client) => {
      const tRes = await client.query<{
        id: number;
        lat_centro: string | number;
        lng_centro: string | number;
      }>(
        'SELECT id, lat_centro, lng_centro FROM talhoes WHERE cenario_id = $1 AND numero_talhao = $2',
        [cenarioId, numeroTalhao],
      );
      const talhao = tRes.rows[0];
      if (!talhao) return;

      if (typeof apenasAmostraIndex === 'number' && apenasAmostraIndex >= 0) {
        await client.query(
          'UPDATE amostras_coleta SET latitude = $1, longitude = $2 WHERE talhao_id = $3 AND indice_amostra = $4',
          [newLat, newLng, talhao.id, apenasAmostraIndex + 1],
        );
        // Recalcula centroide do talhão
        const samplesRes = await client.query<{
          latitude: string | number;
          longitude: string | number;
        }>(
          'SELECT latitude, longitude FROM amostras_coleta WHERE talhao_id = $1',
          [talhao.id],
        );
        if (samplesRes.rows.length > 0) {
          const avgLat =
            samplesRes.rows.reduce((a, r) => a + Number(r.latitude), 0) /
            samplesRes.rows.length;
          const avgLng =
            samplesRes.rows.reduce((a, r) => a + Number(r.longitude), 0) /
            samplesRes.rows.length;
          await client.query(
            'UPDATE talhoes SET lat_centro = $1, lng_centro = $2, area_experimental_id = $3 WHERE id = $4',
            [avgLat, avgLng, areaExperimentalId, talhao.id],
          );
        }
      } else {
        const deltaLat = newLat - Number(talhao.lat_centro);
        const deltaLng = newLng - Number(talhao.lng_centro);

        await client.query(
          'UPDATE talhoes SET lat_centro = $1, lng_centro = $2, area_experimental_id = $3 WHERE id = $4',
          [newLat, newLng, areaExperimentalId, talhao.id],
        );

        const samplesRes = await client.query<{
          id: number;
          latitude: string | number;
          longitude: string | number;
        }>(
          'SELECT id, latitude, longitude FROM amostras_coleta WHERE talhao_id = $1',
          [talhao.id],
        );

        for (const s of samplesRes.rows) {
          const updatedLat = Number((Number(s.latitude) + deltaLat).toFixed(6));
          const updatedLng = Number((Number(s.longitude) + deltaLng).toFixed(6));
          await client.query(
            'UPDATE amostras_coleta SET latitude = $1, longitude = $2 WHERE id = $3',
            [updatedLat, updatedLng, s.id],
          );
        }
      }
    });

    return this.buscarCenarioPorId(cenarioId);
  }

  public async duplicarCenario(
    idOrigem: string,
    novoId: string,
  ): Promise<CenarioAnaliticoModel | null> {
    const origem = await this.buscarCenarioPorId(idOrigem);
    if (!origem) return null;

    const novoNome = `${origem.nome} (Cópia)`;
    return this.criarCenarioCompleto(
      {
        id: novoId,
        nome: novoNome,
        criadoPor: origem.criadoPor,
        culturaId: origem.culturaId,
        pragaId: origem.pragaId,
        usar100rxPlanilha: origem.usar100rxPlanilha,
        observacoes: origem.observacoes,
      },
      origem.stages,
      origem.plots,
    );
  }

  public async contarCenarios(): Promise<number> {
    const res = await this.db.query<{ total: string | number }>(
      'SELECT COUNT(*) AS total FROM cenarios_analiticos',
    );
    return Number(res.rows[0]?.total ?? 0);
  }

  public async excluirCenario(id: string): Promise<boolean> {
    const res = await this.db.withTransaction(async (client) => {
      // Caso o banco esteja em memória ou sem cascade ativo em alguma tabela filha, garante limpeza transacional
      const tRes = await client.query<{ id: number }>(
        'SELECT id FROM talhoes WHERE cenario_id = $1',
        [id],
      );
      for (const t of tRes.rows) {
        await client.query('DELETE FROM contagens_fase WHERE talhao_id = $1', [
          t.id,
        ]);
        await client.query('DELETE FROM amostras_coleta WHERE talhao_id = $1', [
          t.id,
        ]);
      }
      await client.query('DELETE FROM talhoes WHERE cenario_id = $1', [id]);
      await client.query('DELETE FROM cenario_fases WHERE cenario_id = $1', [
        id,
      ]);
      const del = await client.query(
        'DELETE FROM cenarios_analiticos WHERE id = $1',
        [id],
      );
      return (del.rowCount ?? 0) > 0;
    });
    return res;
  }

  private async inserirFasesETalhoes(
    client: DbClient,
    cenarioId: string,
    stages: FaseCenarioModel[],
    plots: TalhaoModel[],
  ): Promise<void> {
    for (let i = 0; i < stages.length; i++) {
      const st = stages[i];
      await client.query(
        `INSERT INTO cenario_fases (cenario_id, ordem_fase, codigo_fase, nome_fase)
         VALUES ($1, $2, $3, $4)`,
        [cenarioId, i, st.codigo, st.nome],
      );
    }

    for (let pIdx = 0; pIdx < plots.length; pIdx++) {
      const plot = plots[pIdx];
      const numeroTalhao = pIdx + 1;
      const nomeTalhao = plot.nome || `Talhão ${numeroTalhao}`;
      const tInsert = await client.query<{ id: number }>(
        `INSERT INTO talhoes (cenario_id, area_experimental_id, numero_talhao, nome_talhao, lat_centro, lng_centro)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          cenarioId,
          plot.areaExperimentalId || 'area-1',
          numeroTalhao,
          nomeTalhao,
          plot.latCentro,
          plot.lngCentro,
        ],
      );
      const talhaoId = tInsert.rows[0].id;

      for (let sIdx = 0; sIdx < plot.samples.length; sIdx++) {
        const sample = plot.samples[sIdx];
        const indiceAmostra = sIdx + 1;
        await client.query(
          `INSERT INTO amostras_coleta (talhao_id, indice_amostra, codigo_amostra, latitude, longitude)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            talhaoId,
            indiceAmostra,
            sample.code || `A${indiceAmostra}`,
            sample.lat,
            sample.lng,
          ],
        );
      }

      for (let fIdx = 0; fIdx < stages.length; fIdx++) {
        const rowCounts = plot.counts[fIdx] ?? [];
        for (let sIdx = 0; sIdx < plot.samples.length; sIdx++) {
          const val = Math.max(0, Math.round(Number(rowCounts[sIdx]) || 0));
          await client.query(
            `INSERT INTO contagens_fase (talhao_id, ordem_fase, indice_amostra, quantidade_individuos)
             VALUES ($1, $2, $3, $4)`,
            [talhaoId, fIdx, sIdx + 1, val],
          );
        }
      }
    }
  }
}
