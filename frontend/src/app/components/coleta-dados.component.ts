import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LifeTableService } from '../life-table.service';
import { MapaColetaComponent } from './mapa-coleta.component';

@Component({
  selector: 'app-coleta-dados',
  standalone: true,
  imports: [CommonModule, FormsModule, MapaColetaComponent],
  template: `
    <div class="space-y-5">
      <!-- Card Principal da Matriz de Coleta (RF006) -->
      <div class="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-serif font-bold text-stone-900">
              1. Coleta de Amostras (Entrada de Dados)
            </h2>
            <p class="text-xs text-stone-500">
              Informe as contagens observadas por amostra. Todos os cálculos ecológicos e estatísticos são atualizados instantaneamente.
            </p>
          </div>
        </div>

        <!-- Barra de Dimensionamento e Gestão de Fases do Ciclo de Vida (StagesBar) -->
        <div class="stages-chips p-3 rounded-xl bg-stone-50 border border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-3 text-xs">
            <span class="text-stone-600">
              Talhões: <strong class="text-stone-900">{{ lifeTableService.plots().length }}</strong>
            </span>
            <span class="text-stone-600">
              Amostras / talhão:
              <strong class="text-stone-900">{{ lifeTableService.activePlot()?.samples?.length || 10 }}</strong>
            </span>
            <button
              type="button"
              (click)="abrirDimensionamento()"
              class="px-2.5 py-1 text-xs font-semibold rounded-md border border-stone-300 bg-white hover:bg-stone-100 text-stone-700"
            >
              Dimensionar Amostragem
            </button>
            <button
              type="button"
              (click)="adicionarNinfa5Rapido()"
              class="px-3 py-1 text-xs font-bold rounded-md bg-stone-900 hover:bg-stone-800 text-white transition"
            >
              Adicionar Ninfa (N5)
            </button>
          </div>

          <!-- Adicionar estágio customizado ou remover estágio intermediário -->
          <div class="flex flex-wrap items-center gap-1.5">
            <input
              type="text"
              [(ngModel)]="novaFaseTexto"
              placeholder="Nova fase (ex.: Ninfa 6 (N6))"
              class="px-2.5 py-1 text-xs rounded-md border border-stone-300 bg-white w-44"
            />
            <button
              type="button"
              (click)="adicionarFaseCustom()"
              class="px-2.5 py-1 text-xs font-bold rounded-md border border-emerald-700 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
            >
              + Fase
            </button>
          </div>
        </div>

        <!-- Seletor Horizontal de Talhões (PlotSelector) -->
        <div class="space-y-2">
          <div class="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            TALHÃO ATIVO:
            <span class="text-amber-800 ml-1">{{ lifeTableService.activePlot()?.nome }}</span>
          </div>

          <div class="flex flex-wrap items-center gap-1.5">
            @for (p of lifeTableService.plots(); track p.numero; let pIdx = $index) {
              <button
                type="button"
                (click)="selecionarTalhao(pIdx)"
                class="plot-tab px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1.5"
                [ngClass]="
                  lifeTableService.selectedPlotIndex() === pIdx
                    ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                "
              >
                <span class="opacity-75 text-[10px]">{{ (pIdx + 1) | number: '2.0-0' }}</span>
                <span>{{ p.nome }}</span>
              </button>
            }
            <button
              type="button"
              (click)="lifeTableService.addPlot()"
              class="px-3 py-1.5 text-xs font-bold rounded-lg border border-dashed border-stone-300 hover:border-stone-500 text-stone-600 hover:text-stone-900 bg-white transition"
            >
              + Novo Talhão
            </button>
          </div>
        </div>

        <!-- MATRIZ EDITÁVEL DE CONTAGENS POR PONTO AMOSTRAL (SamplesGrid) -->
        @if (lifeTableService.activePlot(); as plot) {
          <div class="overflow-x-auto border border-stone-200 rounded-xl">
            <table class="data-table w-full text-xs text-left border-collapse">
              <thead>
                <tr class="bg-[#f5f2eb] border-b border-stone-200 text-[10px] font-bold uppercase tracking-wider text-stone-600">
                  <th class="py-2.5 px-3 sticky left-0 bg-[#f5f2eb] z-10 min-w-[165px]">
                    FASE DE DESENVOLVIMENTO
                  </th>
                  @for (s of plot.samples; track s.id) {
                    <th class="py-2.5 px-2 text-center min-w-[74px]">
                      <div>AMOSTRA {{ s.id }}</div>
                      <div class="text-[9px] font-normal text-stone-400">
                        {{ s.lat.toFixed(4) }}, {{ s.lng.toFixed(4) }}
                      </div>
                    </th>
                  }
                  <th class="py-2.5 px-3 text-right bg-amber-50/70 text-amber-900 min-w-[90px]">
                    SOMA ({{ plot.nome }})
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-stone-200/70">
                @for (st of lifeTableService.stages(); track st.ordem; let fIdx = $index) {
                  <tr class="hover:bg-stone-50/80 transition">
                    <td class="py-2 px-3 font-medium text-stone-800 sticky left-0 bg-white z-10 border-r border-stone-100">
                      <div class="flex items-center justify-between gap-1.5">
                        <div class="flex items-center gap-2">
                          <span class="w-6 h-6 rounded-md bg-stone-100 border border-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-700">
                            {{ st.codigo }}
                          </span>
                          <span class="font-semibold">{{ st.nome }}</span>
                        </div>
                        @if (lifeTableService.stages().length > 2 && fIdx > 0 && fIdx < lifeTableService.stages().length - 1) {
                          <button
                            type="button"
                            (click)="lifeTableService.removeStage(fIdx)"
                            class="text-stone-300 hover:text-red-600 text-[11px] px-1"
                            title="Remover estágio"
                          >
                            ✕
                          </button>
                        }
                      </div>
                    </td>

                    @for (s of plot.samples; track s.id; let sIdx = $index) {
                      <td class="p-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          [ngModel]="plot.counts[fIdx][sIdx]"
                          (ngModelChange)="onCellChange(fIdx, sIdx, $event)"
                          class="w-16 text-center py-1 px-1.5 rounded-md border border-stone-200 focus:border-amber-700 focus:ring-1 focus:ring-amber-700/30 focus:outline-none font-semibold text-stone-800 bg-white"
                        />
                      </td>
                    }

                    <!-- Coluna de Soma Automática da Linha (RowSumLx - RN010) -->
                    <td class="sum-cell py-2 px-3 text-right font-bold text-amber-900 bg-amber-50/40 border-l border-stone-100">
                      {{ calcularSomaLinha(plot.counts[fIdx]) }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- Cartões de Resumo Instantâneo do Talhão Ativo -->
        @if (lifeTableService.activePlotLifeTable(); as table) {
          <div class="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-stone-100">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
              <div class="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <div class="text-[10px] font-bold uppercase text-stone-400">
                  TOTAL DE OVOS INICIAIS (L0)
                </div>
                <div class="text-lg font-serif font-bold text-stone-900 mt-0.5">
                  {{ table.initialEggs }}
                </div>
              </div>
              <div class="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <div class="text-[10px] font-bold uppercase text-stone-400">
                  ADULTOS SOBREVIVENTES
                </div>
                <div class="text-lg font-serif font-bold text-stone-900 mt-0.5">
                  {{ table.survivingAdults }}
                </div>
              </div>
              <div class="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <div class="text-[10px] font-bold uppercase text-stone-400">
                  MORTALIDADE TOTAL
                </div>
                <div class="text-lg font-serif font-bold text-amber-800 mt-0.5">
                  {{ table.totalMortalityPct | number: '1.2-2' }}%
                </div>
              </div>
              <div class="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <div class="text-[10px] font-bold uppercase text-stone-400">
                  K TOTAL (VARLEY & GRADWELL)
                </div>
                <div class="text-lg font-serif font-bold text-amber-800 mt-0.5">
                  {{ table.kTotal | number: '1.4-4' }}
                </div>
              </div>
            </div>

            <button
              type="button"
              [disabled]="lifeTableService.plots().length <= 2"
              (click)="lifeTableService.removePlot(lifeTableService.selectedPlotIndex())"
              class="px-3 py-2 text-xs font-semibold rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-40"
            >
              Excluir {{ lifeTableService.activePlot()?.nome }}
            </button>
          </div>
        }
      </div>

      <!-- COMPONENTE DE GEORREFERENCIAMENTO LEAFLET NAS 4 ÁREAS DA UniRV (RF007 & RF008) -->
      <app-mapa-coleta />
    </div>
  `,
})
export class ColetaDadosComponent {
  public readonly lifeTableService = inject(LifeTableService);
  public novaFaseTexto = '';

  public selecionarTalhao(idx: number): void {
    this.lifeTableService.selectedPlotIndex.set(idx);
  }

  public onCellChange(
    stageIdx: number,
    sampleIdx: number,
    value: number,
  ): void {
    const plotIdx = this.lifeTableService.selectedPlotIndex();
    this.lifeTableService.updateSampleValue(plotIdx, stageIdx, sampleIdx, value);
  }

  public calcularSomaLinha(row?: number[]): number {
    if (!row) return 0;
    return row.reduce((a, b) => a + (Number(b) || 0), 0);
  }

  public abrirDimensionamento(): void {
    this.lifeTableService.wizardInitialStep.set(3);
    this.lifeTableService.wizardModalOpen.set(true);
  }

  public async adicionarNinfa5Rapido(): Promise<void> {
    const jaExiste = this.lifeTableService
      .stages()
      .some((s) => s.codigo.toUpperCase() === 'N5');
    if (jaExiste) {
      this.lifeTableService.showToast(
        'O estágio Ninfa 5 (N5) já está presente na grade.',
      );
      return;
    }
    await this.lifeTableService.addStage('Ninfa 5 (N5)');
  }

  public async adicionarFaseCustom(): Promise<void> {
    if (!this.novaFaseTexto.trim()) return;
    await this.lifeTableService.addStage(this.novaFaseTexto);
    this.novaFaseTexto = '';
  }
}
