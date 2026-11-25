import { Injectable } from '@nestjs/common';
import {
  CompleteEcologicalAnalysis,
  FaseCenarioModel,
  MeanLifeRow,
  MeanLifeTableResult,
  PlotLifeTableResult,
  StageLifeRow,
  TalhaoModel,
} from '../models/DomainModels.js';

@Injectable()
export class LifeTableMathEngine {
  /**
   * RF010: Calcula a Tabela de Vida Ecológica de um Talhão individual (Natural e Padronizada Base 1.000 Ovos).
   */
  public computeLifeTableForPlot(
    plot: TalhaoModel,
    stages: FaseCenarioModel[],
    useSpreadsheet100rx = false,
    plot1InitialEggs?: number,
  ): PlotLifeTableResult {
    const numStages = stages.length;
    const rowSums: number[] = stages.map((_, idx) => {
      const row = plot.counts[idx] ?? [];
      return row.reduce(
        (acc, v) => acc + (Number.isFinite(v) && v > 0 ? Number(v) : 0),
        0,
      );
    });

    const totalInitialL0 = rowSums.reduce((acc, v) => acc + v, 0);
    const baseL0ForSpreadsheet =
      useSpreadsheet100rx && plot1InitialEggs && plot1InitialEggs > 0
        ? plot1InitialEggs
        : totalInitialL0;

    const rows: StageLifeRow[] = [];
    let currentLx = totalInitialL0;

    for (let i = 0; i < numStages; i++) {
      const stage = stages[i];
      const isAdult = i === numStages - 1;
      const soma = rowSums[i] ?? 0;
      const lx = Math.max(0, currentLx);
      const dx = isAdult ? 0 : soma;
      const nextLx = isAdult ? lx : Math.max(0, lx - dx);

      const lxPct = totalInitialL0 > 0 ? (lx / totalInitialL0) * 100 : 0;
      const qx100 = !isAdult && lx > 0 ? (dx / lx) * 100 : 0;
      const rx100 =
        !isAdult && baseL0ForSpreadsheet > 0
          ? (dx / baseL0ForSpreadsheet) * 100
          : 0;
      const sx = !isAdult && lx > 0 ? nextLx / lx : isAdult ? 1 : 0;
      const mmPct = qx100;
      const kx =
        !isAdult && lx > 0 && nextLx > 0
          ? Math.log10(lx) - Math.log10(nextLx)
          : 0;

      const lxStd = totalInitialL0 > 0 ? (lx / totalInitialL0) * 1000 : 0;
      const dxStd =
        !isAdult && totalInitialL0 > 0 ? (dx / totalInitialL0) * 1000 : 0;
      const qx100Std = !isAdult && lxStd > 0 ? (dxStd / lxStd) * 100 : 0;
      const rx100Std = !isAdult ? dxStd / 10 : 0;
      const mmPctStd = qx100Std;
      const kxStd = kx;

      rows.push({
        stageIndex: i,
        code: stage.codigo,
        stageName: stage.nome,
        soma,
        lx,
        dx,
        lxPct,
        qx100,
        rx100,
        sx,
        mmPct,
        kx,
        lxStd,
        dxStd,
        qx100Std,
        rx100Std,
        mmPctStd,
        kxStd,
        isMaxK: false,
        isAdult,
      });

      currentLx = nextLx;
    }

    let maxK = -1;
    let maxKIdx = 0;
    for (let i = 0; i < rows.length - 1; i++) {
      if (rows[i].kx > maxK) {
        maxK = rows[i].kx;
        maxKIdx = i;
      }
    }
    if (rows.length > 1 && maxK > 0) {
      rows[maxKIdx].isMaxK = true;
    }

    const survivingAdults = rows.length > 0 ? rows[rows.length - 1].lx : 0;
    const totalDeaths = totalInitialL0 - survivingAdults;
    const totalMortalityPct =
      totalInitialL0 > 0 ? (totalDeaths / totalInitialL0) * 100 : 0;
    const kTotal = rows
      .filter((r) => !r.isAdult)
      .reduce((acc, r) => acc + r.kx, 0);

    return {
      plotNumber: plot.numero,
      plotName: plot.nome,
      rows,
      initialEggs: totalInitialL0,
      survivingAdults,
      totalDeaths,
      totalMortalityPct,
      kTotal,
      maxKStageCode: rows[maxKIdx]?.code ?? '-',
      maxKStageName: rows[maxKIdx]?.stageName ?? '-',
    };
  }

  /**
   * RF011: Calcula a Tabela de Vida Média consolidada entre os n talhões e a Mortalidade Indispensável (MI_x e %MI_x).
   */
  public computeMeanLifeTable(
    plotTables: PlotLifeTableResult[],
    stages: FaseCenarioModel[],
  ): MeanLifeTableResult {
    const n = plotTables.length;
    const numStages = stages.length;

    if (n === 0 || numStages === 0) {
      return {
        rows: [],
        totalMortalityMeanPct: 0,
        totalMortalitySePct: 0,
        kTotalMean: 0,
        survivalAdultPct: 0,
        maxKStageName: '-',
        maxMiStageName: '-',
      };
    }

    const lxStats = stages.map((_, idx) => {
      const vals = plotTables.map((p) => p.rows[idx]?.lxStd ?? 0);
      return this.meanSdSe(vals);
    });

    const dxStats = stages.map((_, idx) => {
      const vals = plotTables.map((p) => p.rows[idx]?.dxStd ?? 0);
      return this.meanSdSe(vals);
    });

    const l0Mean = lxStats[0]?.mean ?? 1000;
    const lFinalMean = lxStats[numStages - 1]?.mean ?? 0;

    const rows: MeanLifeRow[] = [];
    for (let i = 0; i < numStages; i++) {
      const isAdult = i === numStages - 1;
      const lxMean = lxStats[i].mean;
      const dxMean = isAdult ? 0 : dxStats[i].mean;
      const nextLxMean = isAdult
        ? lxMean
        : (lxStats[i + 1]?.mean ?? Math.max(0, lxMean - dxMean));

      const lxPct = l0Mean > 0 ? (lxMean / l0Mean) * 100 : 0;
      const qx100 = !isAdult && lxMean > 0 ? (dxMean / lxMean) * 100 : 0;
      const rx100 = !isAdult && l0Mean > 0 ? (dxMean / l0Mean) * 100 : 0;
      const mmPct = qx100;
      const sx = !isAdult && lxMean > 0 ? nextLxMean / lxMean : 1;
      const kxMean =
        !isAdult && lxMean > 0 && nextLxMean > 0
          ? Math.log10(lxMean) - Math.log10(nextLxMean)
          : 0;

      const mix =
        !isAdult && qx100 < 100 && qx100 > 0
          ? lFinalMean * (qx100 / (100 - qx100))
          : 0;
      const mixPct = !isAdult && l0Mean > 0 ? (mix / l0Mean) * 100 : 0;
      const potentialIncreasePct =
        !isAdult && qx100 < 100 && qx100 > 0
          ? (qx100 / (100 - qx100)) * 100
          : 0;
      const potentialFactor = !isAdult && sx > 0 ? 1 / sx : 1;

      rows.push({
        stageIndex: i,
        code: stages[i].codigo,
        stageName: stages[i].nome,
        lxMean,
        lxSd: lxStats[i].sd,
        lxSe: lxStats[i].se,
        dxMean,
        dxSd: isAdult ? 0 : dxStats[i].sd,
        dxSe: isAdult ? 0 : dxStats[i].se,
        lxPct,
        qx100,
        rx100,
        mmPct,
        sx,
        kxMean,
        mix,
        mixPct,
        potentialIncreasePct,
        potentialFactor,
        isAdult,
      });
    }

    const mortPcts = plotTables.map((p) => p.totalMortalityPct);
    const mortStats = this.meanSdSe(mortPcts);
    const kTotalMean = rows
      .filter((r) => !r.isAdult)
      .reduce((acc, r) => acc + r.kxMean, 0);
    const survivalAdultPct = 100 - mortStats.mean;

    const immatureRows = rows.filter((r) => !r.isAdult);
    const maxKRow = [...immatureRows].sort((a, b) => b.kxMean - a.kxMean)[0];
    const maxMiRow = [...immatureRows].sort((a, b) => b.mixPct - a.mixPct)[0];

    return {
      rows,
      totalMortalityMeanPct: mortStats.mean,
      totalMortalitySePct: mortStats.se,
      kTotalMean,
      survivalAdultPct,
      maxKStageName: maxKRow?.stageName ?? '-',
      maxMiStageName: maxMiRow?.stageName ?? '-',
    };
  }

  public computeCompleteAnalysis(
    plots: TalhaoModel[],
    stages: FaseCenarioModel[],
    useSpreadsheet100rx = false,
  ): CompleteEcologicalAnalysis {
    if (!plots.length || stages.length < 2) {
      return {
        plotLifeTables: [],
        meanLifeTable: {
          rows: [],
          totalMortalityMeanPct: 0,
          totalMortalitySePct: 0,
          kTotalMean: 0,
          survivalAdultPct: 0,
          maxKStageName: '-',
          maxMiStageName: '-',
        },
      };
    }

    const firstPlotTable = this.computeLifeTableForPlot(
      plots[0],
      stages,
      false,
    );
    const plot1L0 = firstPlotTable.initialEggs;

    const plotLifeTables = plots.map((p) =>
      this.computeLifeTableForPlot(p, stages, useSpreadsheet100rx, plot1L0),
    );
    const meanLifeTable = this.computeMeanLifeTable(plotLifeTables, stages);

    return {
      plotLifeTables,
      meanLifeTable,
    };
  }

  private meanSdSe(values: number[]): {
    sum: number;
    mean: number;
    sd: number;
    se: number;
  } {
    const n = values.length;
    if (n === 0) return { sum: 0, mean: 0, sd: 0, se: 0 };
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    if (n < 2) return { sum, mean, sd: 0, se: 0 };
    const variance =
      values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1);
    const sd = Math.sqrt(Math.max(0, variance));
    const se = sd / Math.sqrt(n);
    return { sum, mean, sd, se };
  }
}
