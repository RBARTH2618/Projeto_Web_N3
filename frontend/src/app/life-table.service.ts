import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  computeLifeTableForPlot,
  computeMeanLifeTable,
} from './life-table.math';
import {
  CenarioAnalitico,
  PlotData,
  PlotLifeTableResult,
  SamplePoint,
  StageDefinition,
} from './life-table.models';
import { SelecaoContextService } from './selecao-context.service';

@Injectable({
  providedIn: 'root',
})
export class LifeTableService {
  private readonly http = inject(HttpClient);
  private readonly selecaoCtx = inject(SelecaoContextService);
  private readonly apiUrl = 'http://localhost:3000/api';

  // Sinais primários de estado (Zero Dados Mocados!)
  public readonly cenarios = signal<CenarioAnalitico[]>([]);
  public readonly activeScenarioId = signal<string>('');
  public readonly activeTab = signal<number>(0);
  public readonly selectedPlotIndex = signal<number>(0);
  public readonly selectedSampleIndex = signal<number>(0);
  public readonly wizardModalOpen = signal<boolean>(false);
  public readonly wizardInitialStep = signal<1 | 2 | 3>(1);
  public readonly importModalOpen = signal<boolean>(false);
  public readonly carregando = signal<boolean>(false);
  public readonly toastMessage = signal<string | null>(null);

  // Cenário Ativo
  public readonly activeScenario = computed<CenarioAnalitico | null>(() => {
    const list = this.cenarios();
    const id = this.activeScenarioId();
    return list.find((c) => c.id === id) ?? list[0] ?? null;
  });

  public readonly stages = computed<StageDefinition[]>(() => {
    return this.activeScenario()?.stages ?? [];
  });

  public readonly plots = computed<PlotData[]>(() => {
    return this.activeScenario()?.plots ?? [];
  });

  public readonly activePlot = computed<PlotData | null>(() => {
    const list = this.plots();
    const idx = this.selectedPlotIndex();
    return list[idx] ?? list[0] ?? null;
  });

  public readonly useSpreadsheet100rx = computed<boolean>(() => {
    return this.activeScenario()?.usar100rxPlanilha ?? false;
  });

  // Sinais Computados do Motor Matemático (Abas 2 a 7)
  public readonly plotLifeTables = computed<PlotLifeTableResult[]>(() => {
    const plots = this.plots();
    const stages = this.stages();
    const useSheet = this.useSpreadsheet100rx();
    if (!plots.length || stages.length < 2) return [];
    const firstTable = computeLifeTableForPlot(plots[0], stages, false);
    const l0Plot1 = firstTable.initialEggs;
    return plots.map((p) =>
      computeLifeTableForPlot(p, stages, useSheet, l0Plot1),
    );
  });

  public readonly activePlotLifeTable = computed<PlotLifeTableResult | null>(
    () => {
      const tables = this.plotLifeTables();
      const idx = this.selectedPlotIndex();
      return tables[idx] ?? tables[0] ?? null;
    },
  );

  public readonly meanLifeTable = computed(() => {
    return computeMeanLifeTable(this.plotLifeTables(), this.stages());
  });

  public showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }

  public async inicializar(): Promise<void> {
    await this.selecaoCtx.carregarCatalogos();
    await this.carregarCenariosDoBackend();
  }

  public async carregarCenariosDoBackend(): Promise<void> {
    this.carregando.set(true);
    try {
      const lista = await firstValueFrom(
        this.http.get<CenarioAnalitico[]>(`${this.apiUrl}/cenarios`),
      );
      this.cenarios.set(lista ?? []);
      if (lista.length > 0) {
        const currentId = this.activeScenarioId();
        const target =
          lista.find((c) => c.id === currentId) ??
          lista.find((c) => c.id === 'cenario-1') ??
          lista[0];
        this.ativarCenarioLocal(target);
      }
    } finally {
      this.carregando.set(false);
    }
  }

  public ativarCenarioLocal(cenario: CenarioAnalitico): void {
    this.activeScenarioId.set(cenario.id);
    this.selectedPlotIndex.set(0);
    this.selectedSampleIndex.set(0);
    this.selecaoCtx.sincronizarComCenario(cenario.culturaId, cenario.pragaId);
  }

  public abrirColetaDoCenario(cenario: CenarioAnalitico): void {
    this.ativarCenarioLocal(cenario);
    this.activeTab.set(1);
    this.showToast(
      `Cenário "${cenario.nome}" carregado do banco (${cenario.plots.length} talhões × ${cenario.plots[0]?.samples.length ?? 0} amostras).`,
    );
  }

  public async criarCenario(payload: {
    nome: string;
    criadoPor: string;
    culturaId: string;
    pragaId: string;
    numTalhoes: number;
    amostrasPorTalhao: number;
    iniciarZerado: boolean;
    observacoes?: string;
  }): Promise<CenarioAnalitico> {
    const novo = await firstValueFrom(
      this.http.post<CenarioAnalitico>(`${this.apiUrl}/cenarios`, payload),
    );
    await this.carregarCenariosDoBackend();
    this.ativarCenarioLocal(novo);
    this.wizardModalOpen.set(false);
    this.activeTab.set(1);
    this.showToast(`Novo cenário "${novo.nome}" criado no PostgreSQL!`);
    return novo;
  }

  public async atualizarMetadadosCenario(
    id: string,
    dto: {
      nome: string;
      criadoPor: string;
      observacoes?: string;
      usar100rxPlanilha?: boolean;
    },
  ): Promise<void> {
    const updated = await firstValueFrom(
      this.http.put<CenarioAnalitico>(`${this.apiUrl}/cenarios/${id}`, dto),
    );
    this.substituirCenarioNaLista(updated);
    this.showToast('Metadados do cenário atualizados no PostgreSQL.');
  }

  public async duplicarCenario(id: string): Promise<void> {
    const copy = await firstValueFrom(
      this.http.post<CenarioAnalitico>(
        `${this.apiUrl}/cenarios/${id}/duplicar`,
        {},
      ),
    );
    await this.carregarCenariosDoBackend();
    this.showToast(`Cenário duplicado com sucesso: "${copy.nome}"`);
  }

  public async excluirCenario(id: string): Promise<void> {
    if (this.cenarios().length <= 1) {
      this.showToast(
        'RN006: Não é permitido excluir o último cenário ativo do sistema.',
      );
      return;
    }
    await firstValueFrom(
      this.http.delete<{ deletedId: string }>(`${this.apiUrl}/cenarios/${id}`),
    );
    await this.carregarCenariosDoBackend();
    this.showToast('Cenário removido em cascata do PostgreSQL.');
  }

  public async updateSampleValue(
    plotIdx: number,
    stageIdx: number,
    sampleIdx: number,
    rawVal: number,
  ): Promise<void> {
    const current = this.activeScenario();
    if (!current) return;
    const val = Math.max(0, Math.round(Number(rawVal) || 0));

    // Atualização otimista imediata no Signal para reatividade instantânea (< 1ms)
    const clonedPlots = current.plots.map((p, pIndex) => {
      if (pIndex !== plotIdx) return p;
      const newCounts = p.counts.map((row, rIndex) =>
        rIndex === stageIdx
          ? row.map((cell, cIndex) => (cIndex === sampleIdx ? val : cell))
          : [...row],
      );
      return { ...p, counts: newCounts };
    });

    const optimistic: CenarioAnalitico = { ...current, plots: clonedPlots };
    this.substituirCenarioNaLista(optimistic);

    const plotNumero = current.plots[plotIdx]?.numero ?? plotIdx + 1;
    const updated = await firstValueFrom(
      this.http.patch<CenarioAnalitico>(
        `${this.apiUrl}/cenarios/${current.id}/talhoes/${plotNumero}/contagem`,
        {
          stageIndex: stageIdx,
          sampleIndex: sampleIdx,
          value: val,
        },
      ),
    );
    this.substituirCenarioNaLista(updated);
  }

  public async addStage(stageName: string): Promise<void> {
    const current = this.activeScenario();
    if (!current || !stageName.trim()) return;
    const trimmed = stageName.trim();
    const match = /\(([^)]+)\)/.exec(trimmed);
    const codigo = match?.[1]
      ? match[1].trim()
      : trimmed.slice(0, 3).toUpperCase();

    // Insere antes do estágio Adulto final
    const insertIdx = Math.max(1, current.stages.length - 1);
    const newStages: StageDefinition[] = [
      ...current.stages.slice(0, insertIdx),
      { ordem: insertIdx, codigo, nome: trimmed },
      ...current.stages.slice(insertIdx),
    ].map((s, idx) => ({ ...s, ordem: idx }));

    const newPlots: PlotData[] = current.plots.map((p) => {
      const zeroRow = p.samples.map(() => 0);
      const newCounts = [
        ...p.counts.slice(0, insertIdx),
        zeroRow,
        ...p.counts.slice(insertIdx),
      ];
      return { ...p, counts: newCounts };
    });

    await this.sincronizarColetaNoBackend(current.id, newStages, newPlots);
    this.showToast(`Estágio "${trimmed}" adicionado! Coluna agora disponível.`);
  }

  public async removeStage(stageIdx: number): Promise<void> {
    const current = this.activeScenario();
    if (!current || current.stages.length <= 2) {
      this.showToast('O cenário deve manter ao menos 2 estágios.');
      return;
    }
    const newStages = current.stages
      .filter((_, idx) => idx !== stageIdx)
      .map((s, idx) => ({ ...s, ordem: idx }));
    const newPlots = current.plots.map((p) => ({
      ...p,
      counts: p.counts.filter((_, idx) => idx !== stageIdx),
    }));
    await this.sincronizarColetaNoBackend(current.id, newStages, newPlots);
    this.showToast('Estágio fenológico removido.');
  }

  public async addPlot(): Promise<void> {
    const current = this.activeScenario();
    if (!current) return;
    const nextNum = current.plots.length + 1;
    const refPlot = current.plots[current.plots.length - 1];
    const numSamples = refPlot?.samples.length ?? 10;
    const areas = this.selecaoCtx.areasUnirv();
    const area = areas[(nextNum - 1) % Math.max(1, areas.length)];
    const baseLat = area?.latCentro ?? -17.784306;
    const baseLng = area?.lngCentro ?? -50.960667;

    const samples: SamplePoint[] = Array.from({ length: numSamples }, (_, i) => ({
      id: i + 1,
      code: `A${i + 1}`,
      lat: Number((baseLat + Math.floor(i / 5) * 0.00025).toFixed(6)),
      lng: Number((baseLng + (i % 5) * 0.00028).toFixed(6)),
    }));

    const counts: number[][] = current.stages.map(() =>
      Array.from({ length: numSamples }, () => 0),
    );

    const newPlots: PlotData[] = [
      ...current.plots,
      {
        numero: nextNum,
        nome: `Talhão ${nextNum}`,
        areaExperimentalId: area?.id ?? 'area-1',
        latCentro: baseLat,
        lngCentro: baseLng,
        samples,
        counts,
      },
    ];

    await this.sincronizarColetaNoBackend(
      current.id,
      current.stages,
      newPlots,
    );
    this.selectedPlotIndex.set(newPlots.length - 1);
    this.showToast(`Talhão ${nextNum} adicionado ao cenário.`);
  }

  public async removePlot(plotIdx: number): Promise<void> {
    const current = this.activeScenario();
    if (!current || current.plots.length <= 2) {
      this.showToast(
        'RN009: São necessários ao menos 2 talhões para viabilizar a regressão estatística.',
      );
      return;
    }
    const newPlots = current.plots
      .filter((_, idx) => idx !== plotIdx)
      .map((p, idx) => ({
        ...p,
        numero: idx + 1,
        nome: `Talhão ${idx + 1}`,
      }));

    await this.sincronizarColetaNoBackend(
      current.id,
      current.stages,
      newPlots,
    );
    this.selectedPlotIndex.set(Math.max(0, plotIdx - 1));
    this.showToast('Talhão removido do cenário.');
  }

  public async movePlotToCoordinates(
    plotIdx: number,
    lat: number,
    lng: number,
    areaExperimentalId?: string,
    apenasAmostraIndex?: number,
  ): Promise<void> {
    const current = this.activeScenario();
    if (!current) return;
    const plot = current.plots[plotIdx];
    if (!plot) return;

    const updated = await firstValueFrom(
      this.http.post<CenarioAnalitico>(
        `${this.apiUrl}/cenarios/${current.id}/talhoes/${plot.numero}/mover-regiao`,
        {
          lat,
          lng,
          areaExperimentalId,
          apenasAmostraIndex,
        },
      ),
    );
    this.substituirCenarioNaLista(updated);
    this.showToast(
      apenasAmostraIndex !== undefined
        ? `Coordenada da Amostra #${apenasAmostraIndex + 1} atualizada no PostgreSQL.`
        : `${plot.nome} realocado espacialmente para (${lat.toFixed(5)}, ${lng.toFixed(5)}).`,
    );
  }

  public async setUseSpreadsheet100rx(value: boolean): Promise<void> {
    const current = this.activeScenario();
    if (!current) return;
    const updated = await firstValueFrom(
      this.http.put<CenarioAnalitico>(`${this.apiUrl}/cenarios/${current.id}`, {
        nome: current.nome,
        criadoPor: current.criadoPor,
        observacoes: current.observacoes,
        usar100rxPlanilha: value,
      }),
    );
    this.substituirCenarioNaLista(updated);
  }

  public async importFromTSV(
    rawText: string,
    mode: 'replace' | 'append' | 'single',
    targetPlotIndex = 0,
  ): Promise<void> {
    const current = this.activeScenario();
    if (!current || !rawText.trim()) return;

    const parsedBlocks = this.parseTsvBlocks(rawText, current.stages);
    if (parsedBlocks.length === 0) {
      this.showToast(
        'Nenhuma linha numérica válida encontrada no texto colado.',
      );
      return;
    }

    const areas = this.selecaoCtx.areasUnirv();
    let newPlots: PlotData[] = [...current.plots];

    if (mode === 'single') {
      const block = parsedBlocks[0];
      const target = newPlots[targetPlotIndex] ?? newPlots[0];
      if (target) {
        const numSamples = block[0]?.length ?? target.samples.length;
        const samples = this.ensureSamplePoints(
          target.samples,
          numSamples,
          target.latCentro,
          target.lngCentro,
        );
        newPlots[targetPlotIndex] = {
          ...target,
          samples,
          counts: block,
        };
      }
    } else if (mode === 'replace') {
      const blocksToUse =
        parsedBlocks.length >= 2
          ? parsedBlocks
          : [parsedBlocks[0], parsedBlocks[0]];
      newPlots = blocksToUse.map((counts, idx) => {
        const area = areas[idx % Math.max(1, areas.length)];
        const lat = area?.latCentro ?? -17.784306;
        const lng = area?.lngCentro ?? -50.960667;
        const numSamples = counts[0]?.length ?? 10;
        return {
          numero: idx + 1,
          nome: `Talhão ${idx + 1}`,
          areaExperimentalId: area?.id ?? 'area-1',
          latCentro: lat,
          lngCentro: lng,
          samples: this.ensureSamplePoints([], numSamples, lat, lng),
          counts,
        };
      });
    } else {
      // append
      const startNum = newPlots.length;
      const appended = parsedBlocks.map((counts, idx) => {
        const plotNum = startNum + idx + 1;
        const area = areas[(plotNum - 1) % Math.max(1, areas.length)];
        const lat = area?.latCentro ?? -17.784306;
        const lng = area?.lngCentro ?? -50.960667;
        const numSamples = counts[0]?.length ?? 10;
        return {
          numero: plotNum,
          nome: `Talhão ${plotNum}`,
          areaExperimentalId: area?.id ?? 'area-1',
          latCentro: lat,
          lngCentro: lng,
          samples: this.ensureSamplePoints([], numSamples, lat, lng),
          counts,
        };
      });
      newPlots = [...newPlots, ...appended];
    }

    await this.sincronizarColetaNoBackend(
      current.id,
      current.stages,
      newPlots,
    );
    this.importModalOpen.set(false);
    this.showToast(
      `Importação TSV concluída e sincronizada com o PostgreSQL (${newPlots.length} talhões).`,
    );
  }

  public async restaurarPadraoBanco(): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiUrl}/database/seed`, {}));
    await this.inicializar();
    this.showToast(
      'Banco de dados restaurado para a carga original (script.sql).',
    );
  }

  private async sincronizarColetaNoBackend(
    cenarioId: string,
    stages: StageDefinition[],
    plots: PlotData[],
  ): Promise<void> {
    const updated = await firstValueFrom(
      this.http.put<CenarioAnalitico>(
        `${this.apiUrl}/cenarios/${cenarioId}/coleta`,
        {
          stages,
          plots,
          usar100rxPlanilha: this.useSpreadsheet100rx(),
        },
      ),
    );
    this.substituirCenarioNaLista(updated);
  }

  private substituirCenarioNaLista(updated: CenarioAnalitico): void {
    const list = this.cenarios().map((c) =>
      c.id === updated.id ? updated : c,
    );
    this.cenarios.set(list);
  }

  private ensureSamplePoints(
    existing: SamplePoint[],
    count: number,
    lat: number,
    lng: number,
  ): SamplePoint[] {
    return Array.from({ length: count }, (_, i) => {
      if (existing[i]) return existing[i];
      return {
        id: i + 1,
        code: `A${i + 1}`,
        lat: Number((lat + Math.floor(i / 5) * 0.00025).toFixed(6)),
        lng: Number((lng + (i % 5) * 0.00028).toFixed(6)),
      };
    });
  }

  private parseTsvBlocks(
    rawText: string,
    stages: StageDefinition[],
  ): number[][][] {
    const lines = rawText.split(/\r?\n/);
    const rawBlocks: string[][] = [];
    let currentBlock: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        if (currentBlock.length > 0) {
          rawBlocks.push(currentBlock);
          currentBlock = [];
        }
        continue;
      }
      if (/^(#\s*Talh[aã]o|Talh[aã]o\s+\d+)/i.test(line)) {
        if (currentBlock.length > 0) {
          rawBlocks.push(currentBlock);
          currentBlock = [];
        }
        continue;
      }
      currentBlock.push(line);
    }
    if (currentBlock.length > 0) {
      rawBlocks.push(currentBlock);
    }

    const parsedBlocks: number[][][] = [];
    for (const block of rawBlocks) {
      const numericRows: number[][] = [];
      for (const line of block) {
        const tokens = line
          .split(/[\t;]+|\s{2,}/)
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
        // Filtra cabeçalhos como "Fases 1 2 3 4..."
        if (/^(fases|amostra)/i.test(tokens[0] ?? '')) continue;
        const nums = tokens
          .map((t) => Number(t.replace(',', '.')))
          .filter((n) => Number.isFinite(n) && n >= 0);
        if (nums.length >= 2) {
          numericRows.push(nums.map((n) => Math.round(n)));
        }
      }
      if (numericRows.length > 0) {
        const numSamples = Math.max(...numericRows.map((r) => r.length), 10);
        const normalized: number[][] = stages.map((_, sIdx) => {
          const src = numericRows[sIdx] ?? [];
          return Array.from({ length: numSamples }, (__, cIdx) => src[cIdx] ?? 0);
        });
        parsedBlocks.push(normalized);
      }
    }

    return parsedBlocks;
  }
}
