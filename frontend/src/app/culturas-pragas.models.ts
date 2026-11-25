export interface PragaInfo {
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

export interface CulturaInfo {
  id: string;
  nome: string;
  nomeCientifico: string;
  familia: string;
  descricao: string;
  icone: string;
  corTema: string;
  totalPragas: number;
  pragas: PragaInfo[];
}

export interface UnirvExperimentalArea {
  id: string;
  nome: string;
  subtitulo: string;
  hectares: number;
  latCentro: number;
  lngCentro: number;
  dmsLabel: string;
  poligonoCoords: [number, number][];
}

export interface UsuarioInfo {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  instituicao: string;
}
