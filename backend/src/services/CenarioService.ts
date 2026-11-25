import { Injectable } from '@nestjs/common';
import {
  ApiException,
  AtualizarCelulaContagemDTO,
  AtualizarCenarioMetadadosDTO,
  CenarioAnaliticoModel,
  CompleteEcologicalAnalysis,
  CriarCenarioDTO,
  FaseCenarioModel,
  MoverRegiaoTalhaoDTO,
  PontoAmostralModel,
  SincronizarColetaDTO,
  TalhaoModel,
} from '../models/DomainModels.js';
import { CatalogoRepository } from '../repositories/CatalogoRepository.js';
import { CenarioRepository } from '../repositories/CenarioRepository.js';
import { LifeTableMathEngine } from './LifeTableMathEngine.js';

@Injectable()
export class CenarioService {
  constructor(
    private readonly cenarioRepo: CenarioRepository,
    private readonly catalogoRepo: CatalogoRepository,
    private readonly mathEngine: LifeTableMathEngine,
  ) {}

  public async listarCenarios(): Promise<
    (CenarioAnaliticoModel & {
      analysisSummary?: {
        criticalStageName: string;
        kTotalMean: number;
        mortalityMeanPct: number;
      };
    })[]
  > {
    const cenarios = await this.cenarioRepo.listarTodosCenariosCompletos();
    return cenarios.map((c) => {
      const analysis = this.mathEngine.computeCompleteAnalysis(
        c.plots,
        c.stages,
        c.usar100rxPlanilha,
      );
      return {
        ...c,
        analysisSummary: {
          criticalStageName: analysis.meanLifeTable.maxKStageName,
          kTotalMean: analysis.meanLifeTable.kTotalMean,
          mortalityMeanPct: analysis.meanLifeTable.totalMortalityMeanPct,
        },
      };
    });
  }

  public async buscarCenarioComAnalise(id: string): Promise<{
    cenario: CenarioAnaliticoModel;
    analysis: CompleteEcologicalAnalysis;
  }> {
    const cenario = await this.cenarioRepo.buscarCenarioPorId(id);
    if (!cenario) {
      throw new ApiException(404, `Cenário '${id}' não encontrado.`);
    }
    const analysis = this.mathEngine.computeCompleteAnalysis(
      cenario.plots,
      cenario.stages,
      cenario.usar100rxPlanilha,
    );
    return { cenario, analysis };
  }

  public async criarNovoCenario(
    dto: CriarCenarioDTO,
  ): Promise<CenarioAnaliticoModel> {
    if (!dto.nome || !dto.nome.trim()) {
      throw new ApiException(400, 'O nome do cenário analítico é obrigatório.');
    }
    const cultura = await this.catalogoRepo.buscarCulturaPorId(dto.culturaId);
    if (!cultura) {
      throw new ApiException(404, `Cultura '${dto.culturaId}' inválida.`);
    }
    const praga = await this.catalogoRepo.buscarPragaPorId(dto.pragaId);
    if (!praga) {
      throw new ApiException(404, `Praga '${dto.pragaId}' inválida.`);
    }

    const numTalhoes = Math.max(2, Math.min(50, Number(dto.numTalhoes) || 10));
    const amostrasPorTalhao = Math.max(
      1,
      Math.min(100, Number(dto.amostrasPorTalhao) || 10),
    );
    const iniciarZerado = Boolean(dto.iniciarZerado);

    const stages: FaseCenarioModel[] = praga.fasesSugeridas.map((nome, idx) => ({
      ordem: idx,
      codigo: this.extrairCodigoFase(nome, idx, praga.fasesSugeridas.length),
      nome,
    }));

    const areas = await this.catalogoRepo.listarAreasUnirv();
    const plots: TalhaoModel[] = [];

    for (let t = 0; t < numTalhoes; t++) {
      const area = areas[t % areas.length] ?? {
        id: 'area-1',
        latCentro: -17.784306,
        lngCentro: -50.960667,
      };
      const jitterLat = ((t % 3) - 1) * 0.00055;
      const jitterLng = (Math.floor(t / 3) % 3 - 1) * 0.00065;
      const latCentro = Number((area.latCentro + jitterLat).toFixed(6));
      const lngCentro = Number((area.lngCentro + jitterLng).toFixed(6));

      const samples: PontoAmostralModel[] = [];
      for (let s = 0; s < amostrasPorTalhao; s++) {
        const rowOffset = Math.floor(s / 5) * 0.00025 - 0.00012;
        const colOffset = (s % 5) * 0.00028 - 0.00056;
        samples.push({
          id: s + 1,
          code: `A${s + 1}`,
          lat: Number((latCentro + rowOffset).toFixed(6)),
          lng: Number((lngCentro + colOffset).toFixed(6)),
        });
      }

      const counts: number[][] = stages.map((_, fIdx) =>
        samples.map((__, sIdx) => {
          if (iniciarZerado) return 0;
          return this.gerarContagemExperimentalRealista(
            t,
            fIdx,
            sIdx,
            stages.length,
          );
        }),
      );

      plots.push({
        numero: t + 1,
        nome: `Talhão ${t + 1}`,
        areaExperimentalId: area.id,
        latCentro,
        lngCentro,
        samples,
        counts,
      });
    }

    const id = `cenario-${Date.now()}`;
    return this.cenarioRepo.criarCenarioCompleto(
      {
        id,
        nome: dto.nome.trim(),
        criadoPor: (dto.criadoPor || 'Eng. Agr. Dr. Sérgio').trim(),
        culturaId: cultura.id,
        pragaId: praga.id,
        usar100rxPlanilha: false,
        observacoes: dto.observacoes ?? '',
      },
      stages,
      plots,
    );
  }

  public async atualizarMetadados(
    id: string,
    dto: AtualizarCenarioMetadadosDTO,
  ): Promise<CenarioAnaliticoModel> {
    const updated = await this.cenarioRepo.atualizarMetadados(id, dto);
    if (!updated) {
      throw new ApiException(404, `Cenário '${id}' não encontrado.`);
    }
    return updated;
  }

  public async sincronizarColeta(
    id: string,
    dto: SincronizarColetaDTO,
  ): Promise<CenarioAnaliticoModel> {
    if (!Array.isArray(dto.stages) || dto.stages.length < 2) {
      throw new ApiException(
        400,
        'O cenário deve possuir pelo menos 2 fases fenológicas.',
      );
    }
    if (!Array.isArray(dto.plots) || dto.plots.length < 2) {
      throw new ApiException(
        400,
        'O cenário deve possuir pelo menos 2 talhões para análise de regressão.',
      );
    }
    const updated = await this.cenarioRepo.substituirTalhoesEFases(
      id,
      dto.stages,
      dto.plots,
      dto.usar100rxPlanilha,
    );
    if (!updated) {
      throw new ApiException(404, `Cenário '${id}' não encontrado.`);
    }
    return updated;
  }

  public async atualizarCelulaContagem(
    id: string,
    numeroTalhao: number,
    dto: AtualizarCelulaContagemDTO,
  ): Promise<CenarioAnaliticoModel> {
    const updated = await this.cenarioRepo.atualizarValorAmostra(
      id,
      numeroTalhao,
      dto,
    );
    if (!updated) {
      throw new ApiException(404, `Cenário '${id}' não encontrado.`);
    }
    return updated;
  }

  public async moverRegiaoDoTalhao(
    id: string,
    numeroTalhao: number,
    dto: MoverRegiaoTalhaoDTO,
  ): Promise<CenarioAnaliticoModel> {
    const areas = await this.catalogoRepo.listarAreasUnirv();
    let areaId = dto.areaExperimentalId;
    if (!areaId && areas.length > 0) {
      // Encontra estação experimental da UniRV mais próxima por distância euclidiana WGS84
      let minDist = Number.POSITIVE_INFINITY;
      areaId = areas[0].id;
      for (const a of areas) {
        const d =
          (a.latCentro - dto.lat) ** 2 + (a.lngCentro - dto.lng) ** 2;
        if (d < minDist) {
          minDist = d;
          areaId = a.id;
        }
      }
    }

    const updated = await this.cenarioRepo.moverRegiaoTalhao(
      id,
      numeroTalhao,
      Number(dto.lat),
      Number(dto.lng),
      areaId ?? 'area-1',
      dto.apenasAmostraIndex,
    );
    if (!updated) {
      throw new ApiException(404, `Cenário '${id}' não encontrado.`);
    }
    return updated;
  }

  public async duplicarCenario(id: string): Promise<CenarioAnaliticoModel> {
    const novoId = `cenario-${Date.now()}`;
    const copy = await this.cenarioRepo.duplicarCenario(id, novoId);
    if (!copy) {
      throw new ApiException(404, `Cenário '${id}' não encontrado para duplicação.`);
    }
    return copy;
  }

  public async excluirCenario(id: string): Promise<{ deletedId: string }> {
    const total = await this.cenarioRepo.contarCenarios();
    if (total <= 1) {
      throw new ApiException(
        400,
        'RN006: Não é permitido excluir o último cenário ativo do sistema.',
      );
    }
    const ok = await this.cenarioRepo.excluirCenario(id);
    if (!ok) {
      throw new ApiException(404, `Cenário '${id}' não encontrado.`);
    }
    return { deletedId: id };
  }

  private extrairCodigoFase(
    nomeFase: string,
    idx: number,
    total: number,
  ): string {
    const match = /\(([^)]+)\)/.exec(nomeFase);
    if (match?.[1]) return match[1].trim();
    if (idx === 0) return 'Ov';
    if (idx === total - 1) return 'Ad';
    return `F${idx}`;
  }

  private gerarContagemExperimentalRealista(
    plotIdx: number,
    stageIdx: number,
    sampleIdx: number,
    totalStages: number,
  ): number {
    // Gera dados determinísticos com variabilidade espacial entre talhões para produzir regressão realista
    const seed = (plotIdx + 1) * 17 + (stageIdx + 1) * 31 + (sampleIdx + 1) * 13;
    if (stageIdx === 0) {
      // Fase inicial (Ovos): maior pressão
      return (seed % 7) + (plotIdx % 3);
    }
    if (stageIdx === totalStages - 1) {
      // Adultos sobreviventes
      return (seed % 3) + 1;
    }
    if (stageIdx === 2 || stageIdx === 3) {
      // Estágio intermediário regulador
      return (seed % 5) + (plotIdx % 2);
    }
    return seed % 3;
  }
}
