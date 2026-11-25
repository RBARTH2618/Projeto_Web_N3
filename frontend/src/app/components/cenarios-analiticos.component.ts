import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CenarioAnalitico } from '../life-table.models';
import { LifeTableService } from '../life-table.service';

@Component({
  selector: 'app-cenarios-analiticos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-4">
      <!-- Barra Minimalista de Busca + Novo Cenário (RN002, RN004, RF004, RF005) -->
      <div class="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-serif font-bold text-stone-900">
              Cenários Analíticos
            </h2>
            <span class="px-2 py-0.5 text-xs font-bold rounded-full bg-stone-100 text-stone-700 border border-stone-200">
              {{ cenariosFiltrados().length }}
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <div class="relative">
              <input
                type="text"
                [ngModel]="busca()"
                (ngModelChange)="busca.set($event)"
                placeholder="Buscar cenário, usuário, cultura ou praga..."
                class="w-64 sm:w-72 pl-3 pr-8 py-1.5 text-xs rounded-lg border border-stone-300 bg-stone-50/70 focus:outline-none focus:border-stone-700"
              />
              @if (busca()) {
                <button
                  type="button"
                  (click)="busca.set('')"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs"
                >
                  ✕
                </button>
              }
            </div>

            <button
              type="button"
              (click)="expandirTodos()"
              class="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700"
            >
              Expandir Todos
            </button>
            <button
              type="button"
              (click)="recolherTodos()"
              class="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700"
            >
              Recolher Todos
            </button>
            <button
              type="button"
              (click)="abrirNovoCenario()"
              class="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-50 transition shadow-xs"
            >
              + Novo Cenário
            </button>
          </div>
        </div>

        <!-- LISTA DE ACORDEÕES MINIMALISTAS DE LINHA ÚNICA (RN002) -->
        <div class="space-y-2">
          @for (c of cenariosFiltrados(); track c.id) {
            <div
              class="rounded-xl border transition-all overflow-hidden"
              [ngClass]="
                isAtivo(c)
                  ? 'border-amber-700/60 bg-amber-50/20 shadow-xs'
                  : 'border-stone-200 bg-white'
              "
            >
              <!-- LINHA ÚNICA QUANDO RECOLHIDO (AccordionSummary) -->
              <div
                (click)="toggleExpand(c.id)"
                class="accordion-summary px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-stone-50/80 transition select-none"
              >
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                  <span class="text-xs text-stone-400 w-4 text-center">
                    {{ isExpanded(c.id) ? '▾' : '▸' }}
                  </span>
                  <span
                    class="w-2 h-2 rounded-full shrink-0"
                    [ngClass]="isAtivo(c) ? 'bg-emerald-600' : 'bg-stone-300'"
                  ></span>
                  @if (isAtivo(c)) {
                    <span class="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-800 text-white shrink-0">
                      ATIVO
                    </span>
                  }
                  <span class="font-bold text-xs sm:text-sm text-stone-900 truncate">
                    {{ c.nome }}
                  </span>
                </div>

                <!-- Metadados em linha única -->
                <div class="hidden md:flex items-center gap-2.5 shrink-0 text-xs">
                  <span class="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 font-medium">
                    {{ c.culturaNome }} • {{ c.pragaNome }}
                  </span>
                  <span class="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-semibold">
                    {{ c.plots.length }}T × {{ c.plots[0].samples.length }}A
                  </span>
                  <span class="text-stone-600 font-medium max-w-[160px] truncate">
                    {{ c.criadoPor }}
                  </span>
                  <span class="text-stone-400 text-[11px]">
                    {{ formatarData(c.criadoEm) }}
                  </span>
                </div>

                <!-- Botão Direto Abrir Coleta (RN003) -->
                <button
                  type="button"
                  (click)="abrirColeta(c, $event)"
                  class="btn-open-coleta px-3 py-1 text-xs font-bold rounded-lg bg-stone-900 hover:bg-emerald-800 text-white transition shrink-0"
                >
                  Abrir Coleta →
                </button>
              </div>

              <!-- CORPO EXPANDIDO DO ACORDEÃO (AccordionBody) -->
              @if (isExpanded(c.id)) {
                <div class="accordion-body px-5 py-4 bg-stone-50/70 border-t border-stone-200 space-y-4">
                  <!-- Grade de Metadados -->
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div class="bg-white p-2.5 rounded-lg border border-stone-200/80">
                      <div class="text-[10px] font-bold uppercase text-stone-400">
                        NOME DO CENÁRIO
                      </div>
                      <div class="font-bold text-stone-800 mt-0.5 truncate" [title]="c.nome">
                        {{ c.nome }}
                      </div>
                    </div>
                    <div class="bg-white p-2.5 rounded-lg border border-stone-200/80">
                      <div class="text-[10px] font-bold uppercase text-stone-400">
                        CRIADO POR (USUÁRIO)
                      </div>
                      <div class="font-bold text-stone-800 mt-0.5">
                        {{ c.criadoPor }}
                      </div>
                    </div>
                    <div class="bg-white p-2.5 rounded-lg border border-stone-200/80">
                      <div class="text-[10px] font-bold uppercase text-stone-400">
                        CULTURA
                      </div>
                      <div class="font-bold text-stone-800 mt-0.5">
                        {{ c.culturaNome }}
                        <span class="italic font-normal text-stone-500">({{ c.culturaCientifico }})</span>
                      </div>
                    </div>
                    <div class="bg-white p-2.5 rounded-lg border border-stone-200/80">
                      <div class="text-[10px] font-bold uppercase text-stone-400">
                        PRAGA
                      </div>
                      <div class="font-bold text-stone-800 mt-0.5">
                        {{ c.pragaNome }}
                        <span class="italic font-normal text-stone-500">({{ c.pragaCientifico }})</span>
                      </div>
                    </div>
                    <div class="bg-white p-2.5 rounded-lg border border-stone-200/80">
                      <div class="text-[10px] font-bold uppercase text-stone-400">
                        TALHÕES
                      </div>
                      <div class="font-bold text-stone-800 mt-0.5">
                        {{ c.plots.length }} talhões
                      </div>
                    </div>
                    <div class="bg-white p-2.5 rounded-lg border border-stone-200/80">
                      <div class="text-[10px] font-bold uppercase text-stone-400">
                        AMOSTRAS POR TALHÃO
                      </div>
                      <div class="font-bold text-stone-800 mt-0.5">
                        {{ c.plots[0].samples.length }} amostras ({{ c.plots.length * c.plots[0].samples.length }} pontos)
                      </div>
                    </div>
                    <div class="bg-white p-2.5 rounded-lg border border-stone-200/80">
                      <div class="text-[10px] font-bold uppercase text-stone-400">
                        DATA E HORA DE CRIAÇÃO
                      </div>
                      <div class="font-bold text-stone-800 mt-0.5">
                        {{ formatarData(c.criadoEm) }}
                      </div>
                    </div>
                    <div class="bg-white p-2.5 rounded-lg border border-stone-200/80">
                      <div class="text-[10px] font-bold uppercase text-stone-400">
                        ESTÁGIO CRÍTICO / MORTALIDADE
                      </div>
                      <div class="font-bold text-amber-800 mt-0.5">
                        {{ c.analysisSummary?.criticalStageName || 'Ovo (Ov)' }}
                        •
                        {{ (c.analysisSummary?.mortalityMeanPct ?? 73.4).toFixed(1) }}%
                        (K = {{ (c.analysisSummary?.kTotalMean ?? 0.5745).toFixed(4) }})
                      </div>
                    </div>
                  </div>

                  <!-- Atalhos diretos para as etapas da Marcha Analítica (Abas 1 a 3 da Primeira Entrega) -->
                  <div>
                    <div class="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                      IR PARA ETAPA DA MARCHA ANALÍTICA:
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        (click)="irParaAba(c, 1)"
                        class="px-3 py-1 text-xs font-bold rounded-md bg-emerald-800 text-white hover:bg-emerald-700"
                      >
                        1. Coleta & Amostras
                      </button>
                      <button
                        type="button"
                        (click)="irParaAba(c, 2)"
                        class="px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-stone-300 hover:bg-stone-100 text-stone-700"
                      >
                        2. Tabela de Vida
                      </button>
                      <button
                        type="button"
                        (click)="irParaAba(c, 3)"
                        class="px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-stone-300 hover:bg-stone-100 text-stone-700"
                      >
                        3. Tabela Média & MI
                      </button>
                    </div>
                  </div>

                  <!-- Formulário Inline de Edição de Metadados (RF005) -->
                  @if (editandoId() === c.id) {
                    <div class="edit-form-box p-3.5 bg-white rounded-xl border border-amber-300 space-y-3">
                      <div class="text-xs font-bold text-amber-900">
                        Editar Metadados do Cenário
                      </div>
                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label class="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                            Nome do Cenário
                          </label>
                          <input
                            type="text"
                            [(ngModel)]="editNome"
                            class="w-full px-2.5 py-1.5 text-xs rounded border border-stone-300"
                          />
                        </div>
                        <div>
                          <label class="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                            Criado por (Responsável)
                          </label>
                          <input
                            type="text"
                            [(ngModel)]="editCriadoPor"
                            class="w-full px-2.5 py-1.5 text-xs rounded border border-stone-300"
                          />
                        </div>
                        <div>
                          <label class="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                            Observações Técnicas
                          </label>
                          <input
                            type="text"
                            [(ngModel)]="editObservacoes"
                            class="w-full px-2.5 py-1.5 text-xs rounded border border-stone-300"
                          />
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          (click)="salvarEdicao(c.id)"
                          class="px-3 py-1 text-xs font-bold rounded bg-emerald-800 text-white hover:bg-emerald-700"
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          (click)="cancelarEdicao()"
                          class="px-3 py-1 text-xs font-medium rounded border border-stone-300 bg-stone-50 text-stone-700"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  }

                  <!-- Rodapé de Ações CRUD (ActionFooter) -->
                  <div class="accordion-actions pt-2 border-t border-stone-200/80 flex items-center justify-between text-xs">
                    <div class="flex items-center gap-4">
                      <button
                        type="button"
                        (click)="iniciarEdicao(c)"
                        class="text-stone-600 hover:text-stone-900 font-medium underline-offset-2 hover:underline"
                      >
                        Editar nome/usuário
                      </button>
                      <span class="text-stone-300">•</span>
                      <button
                        type="button"
                        (click)="duplicar(c.id)"
                        class="text-stone-600 hover:text-stone-900 font-medium underline-offset-2 hover:underline"
                      >
                        Duplicar cenário
                      </button>
                    </div>

                    <button
                      type="button"
                      [disabled]="lifeTableService.cenarios().length <= 1"
                      (click)="remover(c.id)"
                      class="text-red-700 hover:text-red-900 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Excluir cenário
                    </button>
                  </div>
                </div>
              }
            </div>
          } @empty {
            <div class="text-center py-8 text-xs text-stone-500">
              Nenhum cenário encontrado para o filtro "{{ busca() }}".
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class CenariosAnaliticosComponent {
  public readonly lifeTableService = inject(LifeTableService);

  public readonly busca = signal<string>('');
  public readonly expandedIds = signal<Set<string>>(new Set(['cenario-1']));
  public readonly editandoId = signal<string | null>(null);

  public editNome = '';
  public editCriadoPor = '';
  public editObservacoes = '';

  public readonly cenariosFiltrados = computed<CenarioAnalitico[]>(() => {
    const q = this.busca().trim().toLowerCase();
    const list = this.lifeTableService.cenarios();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.criadoPor.toLowerCase().includes(q) ||
        c.culturaNome.toLowerCase().includes(q) ||
        c.pragaNome.toLowerCase().includes(q) ||
        (c.observacoes ?? '').toLowerCase().includes(q),
    );
  });

  public isAtivo(c: CenarioAnalitico): boolean {
    return this.lifeTableService.activeScenario()?.id === c.id;
  }

  public isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  public toggleExpand(id: string): void {
    const next = new Set(this.expandedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedIds.set(next);
  }

  public expandirTodos(): void {
    const allIds = this.cenariosFiltrados().map((c) => c.id);
    this.expandedIds.set(new Set(allIds));
  }

  public recolherTodos(): void {
    this.expandedIds.set(new Set());
  }

  public abrirNovoCenario(): void {
    this.lifeTableService.wizardInitialStep.set(1);
    this.lifeTableService.wizardModalOpen.set(true);
  }

  public abrirColeta(c: CenarioAnalitico, event?: Event): void {
    event?.stopPropagation();
    this.lifeTableService.abrirColetaDoCenario(c);
  }

  public irParaAba(c: CenarioAnalitico, tabIndex: number): void {
    this.lifeTableService.ativarCenarioLocal(c);
    this.lifeTableService.activeTab.set(tabIndex);
  }

  public iniciarEdicao(c: CenarioAnalitico): void {
    this.editandoId.set(c.id);
    this.editNome = c.nome;
    this.editCriadoPor = c.criadoPor;
    this.editObservacoes = c.observacoes ?? '';
  }

  public cancelarEdicao(): void {
    this.editandoId.set(null);
  }

  public async salvarEdicao(id: string): Promise<void> {
    if (!this.editNome.trim()) return;
    await this.lifeTableService.atualizarMetadadosCenario(id, {
      nome: this.editNome.trim(),
      criadoPor: this.editCriadoPor.trim() || 'Eng. Agr. Dr. Sérgio',
      observacoes: this.editObservacoes.trim(),
    });
    this.editandoId.set(null);
  }

  public async duplicar(id: string): Promise<void> {
    await this.lifeTableService.duplicarCenario(id);
  }

  public async remover(id: string): Promise<void> {
    await this.lifeTableService.excluirCenario(id);
  }

  public formatarData(iso: string): string {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  }
}
