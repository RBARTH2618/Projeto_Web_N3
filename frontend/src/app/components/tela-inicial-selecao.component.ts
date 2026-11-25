import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CulturaInfo, PragaInfo } from '../culturas-pragas.models';
import { LifeTableService } from '../life-table.service';
import { SelecaoContextService } from '../selecao-context.service';

@Component({
  selector: 'app-tela-inicial-selecao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-sm p-4"
      (click)="fecharModal()"
    >
      <div
        class="bg-[#fbf9f5] border border-stone-200 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-stone-800"
        (click)="$event.stopPropagation()"
      >
        <!-- TOPO DO MODAL (StepperHeader) -->
        <div class="stepper-bar px-6 py-4 bg-white border-b border-stone-200 flex items-center justify-between">
          <div>
            <div class="text-[11px] font-bold uppercase tracking-widest text-amber-700">
              ETAPA {{ step() }} DE 3
            </div>
            @if (step() === 1) {
              <h2 class="text-xl font-serif font-bold text-stone-900">
                Selecione a Cultura Agrícola
              </h2>
              <p class="text-xs text-stone-500">
                Escolha a cultura hospedeira para parametrizar a tabela de vida e análise de fator-chave.
              </p>
            } @else if (step() === 2) {
              <h2 class="text-xl font-serif font-bold text-stone-900">
                Selecione a Praga-Alvo
              </h2>
              <p class="text-xs text-stone-500">
                Defina a praga monitorada em {{ selecaoCtx.culturaSelecionada()?.nome }} para prosseguir ao dimensionamento.
              </p>
            } @else {
              <h2 class="text-xl font-serif font-bold text-stone-900">
                Dimensionamento Amostral (Talhões e Amostras)
              </h2>
              <p class="text-xs text-stone-500">
                Defina a quantidade de talhões avaliados e o número de amostras coletadas por talhão para {{ selecaoCtx.pragaSelecionada()?.nome }}.
              </p>
            }
          </div>

          <div class="flex items-center gap-2">
            @if (step() === 2) {
              <button
                type="button"
                (click)="voltarParaCulturas()"
                class="px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 transition"
              >
                ← Trocar Cultura
              </button>
            }
            @if (step() === 3) {
              <button
                type="button"
                (click)="voltarParaPragas()"
                class="px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 transition"
              >
                ← Trocar Praga
              </button>
              <button
                type="button"
                (click)="voltarParaCulturas()"
                class="px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 transition"
              >
                Trocar Cultura
              </button>
            }
            <button
              type="button"
              (click)="fecharModal()"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
              title="Fechar assistente"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- CORPO COM ROLAGEM FLUIDA -->
        <div class="p-6 overflow-y-auto flex-1 space-y-5">
          <!-- RF001: ETAPA 1 - SELEÇÃO DA CULTURA AGRÍCOLA -->
          @if (step() === 1) {
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              @for (c of selecaoCtx.culturas(); track c.id) {
                <button
                  type="button"
                  (click)="selecionarCultura(c)"
                  class="cultura-card group text-left bg-white rounded-xl border border-stone-200 hover:border-emerald-700 hover:shadow-lg transition-all flex flex-col overflow-hidden"
                >
                  <div class="relative h-36 w-full bg-stone-100 overflow-hidden">
                    <img
                      [src]="c.icone"
                      [alt]="c.nome"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span
                      class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-stone-900/80 text-amber-100 backdrop-blur-xs"
                    >
                      {{ c.familia }}
                    </span>
                  </div>
                  <div class="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <div class="font-serif font-bold text-base text-stone-900 group-hover:text-emerald-800">
                        {{ c.nome }}
                      </div>
                      <div class="text-xs italic text-emerald-700 font-medium">
                        {{ c.nomeCientifico }}
                      </div>
                      <p class="mt-1.5 text-[11px] text-stone-600 line-clamp-3 leading-relaxed">
                        {{ c.descricao }}
                      </p>
                    </div>
                    <div class="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                      <span class="text-stone-500 font-medium">
                        {{ c.totalPragas }} pragas catalogadas
                      </span>
                      <span class="font-bold text-amber-700 group-hover:translate-x-0.5 transition-transform">
                        Selecionar →
                      </span>
                    </div>
                  </div>
                </button>
              }
            </div>
          }

          <!-- RF002: ETAPA 2 - SELEÇÃO DA PRAGA-ALVO POR CULTURA -->
          @if (step() === 2) {
            @if (selecaoCtx.culturaSelecionada(); as cultura) {
              <!-- ContextBanner -->
              <div class="cultura-selected flex items-center justify-between p-3.5 rounded-xl bg-emerald-950/5 border border-emerald-800/20">
                <div class="flex items-center gap-3">
                  <img
                    [src]="cultura.icone"
                    [alt]="cultura.nome"
                    class="w-11 h-11 rounded-lg object-cover border border-stone-300"
                  />
                  <div>
                    <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      CULTURA HOSPEDEIRA SELECIONADA
                    </div>
                    <div class="text-sm font-bold text-stone-900">
                      {{ cultura.nome }}
                      <span class="italic font-normal text-stone-600">({{ cultura.nomeCientifico }})</span>
                    </div>
                    <div class="text-xs text-stone-500">{{ cultura.descricao }}</div>
                  </div>
                </div>
              </div>

              <!-- PragaGrid -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                @for (p of selecaoCtx.pragasDaCulturaAtiva(); track p.id) {
                  <button
                    type="button"
                    (click)="selecionarPraga(p)"
                    class="praga-card group text-left bg-white rounded-xl border border-stone-200 hover:border-amber-700 hover:shadow-lg transition-all flex flex-col overflow-hidden"
                  >
                    <div class="relative h-36 w-full bg-[#f6f3ec] overflow-hidden">
                      <img
                        [src]="p.icone"
                        [alt]="p.nome"
                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span
                        class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
                        [ngClass]="
                          p.importancia.includes('Principal')
                            ? 'bg-red-700 text-white'
                            : 'bg-amber-600 text-white'
                        "
                      >
                        {{ p.importancia.includes('Principal') ? 'Praga-Chave' : 'Secundária' }}
                      </span>
                    </div>

                    <div class="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                      <div>
                        <div class="font-serif font-bold text-sm text-stone-900 group-hover:text-amber-800">
                          {{ p.nome }}
                        </div>
                        <div class="text-xs italic text-amber-800">
                          {{ p.nomeCientifico }}
                        </div>
                        <div class="text-[10px] text-stone-400 font-medium mt-0.5">
                          {{ p.ordemFamilia }}
                        </div>
                        <p class="mt-1.5 text-[11px] text-stone-600 line-clamp-3 leading-relaxed">
                          {{ p.descricaoDano }}
                        </p>
                      </div>

                      <div class="space-y-2">
                        <!-- StagePills -->
                        <div class="flex flex-wrap gap-1">
                          @for (fase of p.fasesSugeridas; track fase) {
                            <span class="stage-pill px-1.5 py-0.5 text-[10px] font-medium bg-stone-100 text-stone-700 rounded border border-stone-200">
                              {{ fase }}
                            </span>
                          }
                        </div>

                        <div class="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                          <span class="text-stone-500">{{ p.fasesSugeridas.length }} estágios</span>
                          <span class="font-bold text-amber-700">
                            Dimensionar Amostragem →
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                }
              </div>
            }
          }

          <!-- RF003: ETAPA 3 - IDENTIFICAÇÃO DO CENÁRIO E DIMENSIONAMENTO AMOSTRAL -->
          @if (step() === 3) {
            <div class="space-y-5">
              <!-- Contexto Duplo: Cultura + Praga -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                @if (selecaoCtx.culturaSelecionada(); as cultura) {
                  <div class="flex items-center gap-3 p-3 rounded-xl bg-white border border-stone-200">
                    <img
                      [src]="cultura.icone"
                      [alt]="cultura.nome"
                      class="w-12 h-12 rounded-lg object-cover border border-stone-200"
                    />
                    <div class="min-w-0">
                      <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        CULTURA SELECIONADA
                      </div>
                      <div class="text-sm font-bold text-stone-900 truncate">
                        {{ cultura.nome }} <span class="italic font-normal text-stone-500">({{ cultura.nomeCientifico }})</span>
                      </div>
                      <div class="text-[11px] text-stone-500 truncate">{{ cultura.descricao }}</div>
                    </div>
                  </div>
                }
                @if (selecaoCtx.pragaSelecionada(); as praga) {
                  <div class="flex items-center gap-3 p-3 rounded-xl bg-white border border-stone-200">
                    <img
                      [src]="praga.icone"
                      [alt]="praga.nome"
                      class="w-12 h-12 rounded-lg object-cover border border-stone-200"
                    />
                    <div class="min-w-0">
                      <div class="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                        PRAGA-ALVO SELECIONADA
                      </div>
                      <div class="text-sm font-bold text-stone-900 truncate">
                        {{ praga.nome }} <span class="italic font-normal text-stone-500">({{ praga.nomeCientifico }})</span>
                      </div>
                      <div class="text-[11px] text-stone-500 truncate">
                        {{ praga.ordemFamilia }} • {{ praga.fasesSugeridas.length }} fases fenológicas
                      </div>
                    </div>
                  </div>
                }
              </div>

              <!-- Identificação do Cenário e Criado Por -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-stone-200">
                <div>
                  <label class="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                    NOME DO CENÁRIO ANALÍTICO (MARCHA ANALÍTICA):
                  </label>
                  <input
                    type="text"
                    [(ngModel)]="nomeCenario"
                    placeholder="Ex.: Monitoramento Percevejo-marrom em Soja - UniRV"
                    class="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:border-emerald-700 bg-stone-50/50 font-medium"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                    CRIADO POR (USUÁRIO / AGRÔNOMO RESPONSÁVEL):
                  </label>
                  <input
                    type="text"
                    [(ngModel)]="criadoPor"
                    placeholder="Ex.: Eng. Agr. Dr. Sérgio"
                    class="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:border-emerald-700 bg-stone-50/50 font-medium"
                  />
                </div>
              </div>

              <!-- Dimensionamento de Talhões (T) e Amostras por Talhão (A) -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Card Talhões -->
                <div class="bg-white p-4 rounded-xl border border-stone-200 space-y-3">
                  <div>
                    <div class="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      UNIDADES DE ÁREA
                    </div>
                    <h3 class="text-sm font-bold text-stone-900">Número de Talhões</h3>
                    <p class="text-[11px] text-stone-500">
                      Quantidade de talhões avaliados no experimento (mínimo de 2 talhões para cálculo de regressão linear e erro padrão).
                    </p>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      (click)="ajustarTalhoes(-1)"
                      class="w-9 h-9 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 font-bold text-stone-700"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="2"
                      max="50"
                      [ngModel]="numTalhoes()"
                      (ngModelChange)="setTalhoes($event)"
                      class="w-20 text-center py-1.5 text-base font-bold rounded-lg border border-stone-300"
                    />
                    <button
                      type="button"
                      (click)="ajustarTalhoes(1)"
                      class="w-9 h-9 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 font-bold text-stone-700"
                    >
                      +
                    </button>
                    <span class="text-xs text-stone-500 font-medium">talhões</span>
                  </div>

                  <div>
                    <div class="text-[10px] font-bold uppercase text-stone-400 mb-1.5">
                      VALORES RÁPIDOS:
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      @for (v of atalhosTalhoes; track v) {
                        <button
                          type="button"
                          (click)="numTalhoes.set(v)"
                          class="px-2.5 py-1 text-xs font-bold rounded-md border transition"
                          [ngClass]="
                            numTalhoes() === v
                              ? 'bg-stone-900 text-white border-stone-900'
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                          "
                        >
                          {{ v }}
                        </button>
                      }
                    </div>
                  </div>
                </div>

                <!-- Card Amostras por Talhão -->
                <div class="bg-white p-4 rounded-xl border border-stone-200 space-y-3">
                  <div>
                    <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      PONTOS DE COLETA
                    </div>
                    <h3 class="text-sm font-bold text-stone-900">Número de Amostras por Talhão</h3>
                    <p class="text-[11px] text-stone-500">
                      Quantidade de pontos amostrais georreferenciados coletados dentro de cada talhão.
                    </p>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      (click)="ajustarAmostras(-1)"
                      class="w-9 h-9 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 font-bold text-stone-700"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      [ngModel]="amostrasPorTalhao()"
                      (ngModelChange)="setAmostras($event)"
                      class="w-20 text-center py-1.5 text-base font-bold rounded-lg border border-stone-300"
                    />
                    <button
                      type="button"
                      (click)="ajustarAmostras(1)"
                      class="w-9 h-9 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 font-bold text-stone-700"
                    >
                      +
                    </button>
                    <span class="text-xs text-stone-500 font-medium">amostras / talhão</span>
                  </div>

                  <div>
                    <div class="text-[10px] font-bold uppercase text-stone-400 mb-1.5">
                      VALORES RÁPIDOS:
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      @for (a of atalhosAmostras; track a) {
                        <button
                          type="button"
                          (click)="amostrasPorTalhao.set(a)"
                          class="px-2.5 py-1 text-xs font-bold rounded-md border transition"
                          [ngClass]="
                            amostrasPorTalhao() === a
                              ? 'bg-stone-900 text-white border-stone-900'
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                          "
                        >
                          {{ a }}
                        </button>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <!-- Painel de Resumo do Esforço Amostral -->
              <div class="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 space-y-2.5">
                <div class="flex flex-wrap items-center gap-3 text-xs text-stone-700">
                  <span>Talhões: <strong>{{ numTalhoes() }}</strong></span>
                  <span>×</span>
                  <span>Amostras / talhão: <strong>{{ amostrasPorTalhao() }}</strong></span>
                  <span>=</span>
                  <span class="text-amber-900 font-bold">
                    Total de Pontos Amostrais: {{ totalPontos() }} pontos
                  </span>
                  <span class="text-stone-400">|</span>
                  <span class="text-stone-600">
                    Células na Matriz: <strong>{{ totalCelulas() }}</strong> ({{ numFases() }} fases)
                  </span>
                </div>

                <label class="flex items-center gap-2 text-xs text-stone-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    [(ngModel)]="iniciarZerado"
                    class="rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>Iniciar tabela com contagens zeradas (em branco para novo levantamento em campo)</span>
                </label>
              </div>

              <!-- Botões Finais Etapa 3 -->
              <div class="flex items-center justify-between pt-2">
                <button
                  type="button"
                  (click)="voltarParaPragas()"
                  class="px-4 py-2 text-xs font-semibold rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700"
                >
                  ← Voltar para Pragas
                </button>

                <button
                  type="button"
                  [disabled]="salvando()"
                  (click)="confirmarParametrizacao()"
                  class="btn-confirm px-5 py-2.5 text-xs font-bold rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-50 shadow-md transition disabled:opacity-50"
                >
                  {{
                    salvando()
                      ? 'Criando Cenário no PostgreSQL...'
                      : 'Confirmar e Iniciar Análise (' +
                        numTalhoes() +
                        ' Talhões × ' +
                        amostrasPorTalhao() +
                        ' Amostras) →'
                  }}
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class TelaInicialSelecaoComponent implements OnInit {
  public readonly selecaoCtx = inject(SelecaoContextService);
  public readonly lifeTableService = inject(LifeTableService);

  public readonly step = signal<1 | 2 | 3>(1);
  public nomeCenario = '';
  public criadoPor = 'Eng. Agr. Dr. Sérgio';
  public readonly numTalhoes = signal<number>(10);
  public readonly amostrasPorTalhao = signal<number>(10);
  public iniciarZerado = false;
  public readonly salvando = signal<boolean>(false);

  public readonly atalhosTalhoes = [3, 4, 5, 8, 10, 12, 15, 20];
  public readonly atalhosAmostras = [3, 5, 8, 10, 12, 15, 20, 25];

  public readonly totalPontos = computed(
    () => this.numTalhoes() * this.amostrasPorTalhao(),
  );
  public readonly numFases = computed(
    () => this.selecaoCtx.pragaSelecionada()?.fasesSugeridas.length ?? 6,
  );
  public readonly totalCelulas = computed(
    () => this.totalPontos() * this.numFases(),
  );

  public ngOnInit(): void {
    const initial = this.lifeTableService.wizardInitialStep();
    this.step.set(initial);
    this.atualizarSugestaoNome();
  }

  public selecionarCultura(c: CulturaInfo): void {
    this.selecaoCtx.selecionarCultura(c);
    this.step.set(2);
    this.atualizarSugestaoNome();
  }

  public selecionarPraga(p: PragaInfo): void {
    this.selecaoCtx.selecionarPraga(p);
    this.step.set(3);
    this.atualizarSugestaoNome();
  }

  public voltarParaCulturas(): void {
    this.step.set(1);
  }

  public voltarParaPragas(): void {
    this.step.set(2);
  }

  public ajustarTalhoes(delta: number): void {
    this.setTalhoes(this.numTalhoes() + delta);
  }

  public setTalhoes(val: number): void {
    const n = Math.max(2, Math.min(50, Math.round(Number(val) || 2)));
    this.numTalhoes.set(n);
  }

  public ajustarAmostras(delta: number): void {
    this.setAmostras(this.amostrasPorTalhao() + delta);
  }

  public setAmostras(val: number): void {
    const n = Math.max(1, Math.min(100, Math.round(Number(val) || 1)));
    this.amostrasPorTalhao.set(n);
  }

  public fecharModal(): void {
    this.lifeTableService.wizardModalOpen.set(false);
  }

  public async confirmarParametrizacao(): Promise<void> {
    const cultura = this.selecaoCtx.culturaSelecionada();
    const praga = this.selecaoCtx.pragaSelecionada();
    if (!cultura || !praga) return;

    this.salvando.set(true);
    try {
      await this.lifeTableService.criarCenario({
        nome:
          this.nomeCenario.trim() ||
          `Monitoramento ${praga.nome} em ${cultura.nome} — UniRV`,
        criadoPor: this.criadoPor.trim() || 'Eng. Agr. Dr. Sérgio',
        culturaId: cultura.id,
        pragaId: praga.id,
        numTalhoes: this.numTalhoes(),
        amostrasPorTalhao: this.amostrasPorTalhao(),
        iniciarZerado: this.iniciarZerado,
      });
    } finally {
      this.salvando.set(false);
    }
  }

  private atualizarSugestaoNome(): void {
    const c = this.selecaoCtx.culturaSelecionada();
    const p = this.selecaoCtx.pragaSelecionada();
    if (c && p) {
      this.nomeCenario = `Monitoramento ${p.nome} em ${c.nome} — UniRV`;
    }
  }
}
