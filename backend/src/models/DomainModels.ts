export class ApiException extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiException';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface UsuarioModel {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  instituicao: string;
}

export interface AreaExperimentalModel {
  id: string;
  nome: string;
  subtitulo: string;
  hectares: number;
  latCentro: number;
  lngCentro: number;
  dmsLabel: string;
  poligonoCoords: [number, number][];
}

export interface PragaModel {
  id: string;
  culturaId: string;
  nome: string;
  nomeCientifico: string;
  ordemFamilia: string;
  importancia: string;
  descricaoDano: string;
  icone: string;
  fasesSugeridas: string[];
}

export interface CulturaModel {
  id: string;
  nome: string;
  nomeCientifico: string;
  familia: string;
  descricao: string;
  icone: string;
  corTema: string;
  totalPragas: number;
  pragas: PragaModel[];
}

export interface FaseCenarioModel {
  ordem: number;
  codigo: string;
  nome: string;
}

export interface PontoAmostralModel {
  id: number;
  code: string;
  lat: number;
  lng: number;
}

export interface TalhaoModel {
  id?: number;
  numero: number;
  nome: string;
  areaExperimentalId: string;
  latCentro: number;
  lngCentro: number;
  samples: PontoAmostralModel[];
  counts: number[][];
}

export interface CenarioAnaliticoModel {
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
  stages: FaseCenarioModel[];
  plots: TalhaoModel[];
}

export interface CriarCenarioDTO {
  nome: string;
  criadoPor: string;
  culturaId: string;
  pragaId: string;
  numTalhoes: number;
  amostrasPorTalhao: number;
  iniciarZerado?: boolean;
  observacoes?: string;
}

export interface AtualizarCenarioMetadadosDTO {
  nome: string;
  criadoPor: string;
  criadoEm?: string;
  observacoes?: string;
  usar100rxPlanilha?: boolean;
}

export interface AtualizarCelulaContagemDTO {
  stageIndex: number;
  sampleIndex: number;
  value: number;
  lat?: number;
  lng?: number;
}

export interface MoverRegiaoTalhaoDTO {
  lat: number;
  lng: number;
  areaExperimentalId?: string;
  apenasAmostraIndex?: number;
}

export interface SincronizarColetaDTO {
  stages: FaseCenarioModel[];
  plots: TalhaoModel[];
  usar100rxPlanilha?: boolean;
}

// =============================================================================
// CONTRATOS DO MOTOR MATEMÁTICO (RF010 e RF011)
// =============================================================================

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

export interface CompleteEcologicalAnalysis {
  plotLifeTables: PlotLifeTableResult[];
  meanLifeTable: MeanLifeTableResult;
}
