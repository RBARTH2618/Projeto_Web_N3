export interface StageDefinition {
  ordem: number;
  codigo: string;
  nome: string;
}

export interface SamplePoint {
  id: number;
  code: string;
  lat: number;
  lng: number;
}

export interface PlotData {
  id?: number;
  numero: number;
  nome: string;
  areaExperimentalId: string;
  latCentro: number;
  lngCentro: number;
  samples: SamplePoint[];
  counts: number[][];
}

export interface CenarioAnalitico {
  id: string;
  nome: string;
  criadoPor: string;
  usuarioId?: string | null;
  culturaId: string;
  culturaNome: string;
  culturaCientifico: string;
  pragaId: string;
  pragaNome: string;
  pragaCientifico: string;
  usar100rxPlanilha: boolean;
  observacoes: string;
  criadoEm: string;
  stages: StageDefinition[];
  plots: PlotData[];
  analysisSummary?: {
    criticalStageName: string;
    kTotalMean: number;
    mortalityMeanPct: number;
  };
}

export interface StageLifeRow {
  stageIndex: number;
  code: string;
  stageName: string;
  soma: number;
  lx: number;
  dx: number;
  lxPct: number;
  qx100: number;
  rx100: number;
  sx: number;
  mmPct: number;
  kx: number;
  lxStd: number;
  dxStd: number;
  qx100Std: number;
  rx100Std: number;
  mmPctStd: number;
  kxStd: number;
  isMaxK: boolean;
  isAdult: boolean;
}

export interface PlotLifeTableResult {
  plotNumber: number;
  plotName: string;
  rows: StageLifeRow[];
  initialEggs: number;
  survivingAdults: number;
  totalDeaths: number;
  totalMortalityPct: number;
  kTotal: number;
  maxKStageCode: string;
  maxKStageName: string;
}

export interface MeanLifeRow {
  stageIndex: number;
  code: string;
  stageName: string;
  lxMean: number;
  lxSd: number;
  lxSe: number;
  dxMean: number;
  dxSd: number;
  dxSe: number;
  lxPct: number;
  qx100: number;
  rx100: number;
  mmPct: number;
  sx: number;
  kxMean: number;
  mix: number;
  mixPct: number;
  potentialIncreasePct: number;
  potentialFactor: number;
  isAdult: boolean;
}

export interface MeanLifeTableResult {
  rows: MeanLifeRow[];
  totalMortalityMeanPct: number;
  totalMortalitySePct: number;
  kTotalMean: number;
  survivalAdultPct: number;
  maxKStageName: string;
  maxMiStageName: string;
}
