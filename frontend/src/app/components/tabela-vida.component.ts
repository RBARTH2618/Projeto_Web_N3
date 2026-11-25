import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LifeTableService } from '../life-table.service';

@Component({
  selector: 'app-tabela-vida',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-5">
      <div class="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
        <!-- Cabeçalho da Aba 2 (RF010) -->
        <div>
          <h2 class="text-lg font-serif font-bold text-stone-900">
            2. Tabela de Vida Ecológica — {{ lifeTableService.activePlot()?.nome }}
          </h2>
          <p class="text-xs text-stone-500">
            Cálculo das taxas de mortalidade (100qx, 100rx, MM), sobrevivência (lx), mortes (dx) e mortalidade logarítmica (k = -log10(1 - MM/100)).
          </p>
        </div>

        <!-- Seletor de Convenção de Cálculo de 100rx (RN015 - ModeToggle100rx) -->
        <div class="mode-toggle p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
          <label class="flex items-center gap-2 text-xs text-stone-700 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              [ngModel]="lifeTableService.useSpreadsheet100rx()"
              (ngModelChange)="lifeTableService.setUseSpreadsheet100rx($event)"
              class="rounded border-stone-300 text-amber-800 focus:ring-amber-700"
            />
            <span>
              Usar referência 100rx estática da planilha (lx Ovo Talhão 1) — Convenção de Planilha Encadeada (RN015)
            </span>
          </label>
        </div>

        <!-- Seletor de Talhão em Visualização -->
        <div class="space-y-2">
          <div class="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            TALHÃO EM VISUALIZAÇÃO:
            <span class="text-amber-800 ml-1">{{ lifeTableService.activePlot()?.nome }}</span>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            @for (p of lifeTableService.plots(); track p.numero; let pIdx = $index) {
              <button
                type="button"
                (click)="lifeTableService.selectedPlotIndex.set(pIdx)"
                class="px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1.5"
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
          </div>
        </div>

        <!-- TABELA DUPLA (Tabela Natural Observada + Tabela Padronizada Base 1.000 Ovos - Figura 12 e 13) -->
        @if (lifeTableService.activePlotLifeTable(); as table) {
          <div class="overflow-x-auto border border-stone-200 rounded-xl">
            <table class="data-table w-full text-xs border-collapse">
              <thead>
                <tr class="bg-[#f5f2eb] border-b border-stone-200 text-[11px] font-bold text-stone-700">
                  <th colspan="7" class="py-2 px-3 text-center border-r border-stone-300">
                    Tabela Natural (Observada)
                  </th>
                  <th colspan="6" class="py-2 px-3 text-center bg-amber-50/50 text-amber-950">
                    Tabela Padronizada (Base 1.000 Ovos)
                  </th>
                </tr>
                <tr class="bg-stone-100/80 border-b border-stone-200 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  <th class="py-2 px-3 text-left">FASE</th>
                  <th class="py-2 px-2 text-right">SOMA</th>
                  <th class="py-2 px-2 text-right">LX</th>
                  <th class="py-2 px-2 text-right">DX</th>
                  <th class="py-2 px-2 text-right">100QX (%)</th>
                  <th class="py-2 px-2 text-right">100RX (%)</th>
                  <th class="py-2 px-2.5 text-right border-r border-stone-300">K</th>
                  <th class="py-2 px-2 text-right bg-amber-50/30">LX₂</th>
                  <th class="py-2 px-2 text-right bg-amber-50/30">DX₂</th>
                  <th class="py-2 px-2 text-right bg-amber-50/30">100QX₂ (%)</th>
                  <th class="py-2 px-2 text-right bg-amber-50/30">100RX₂ (%)</th>
                  <th class="py-2 px-2 text-right bg-amber-50/30">MM₂ (%)</th>
                  <th class="py-2 px-2.5 text-right bg-amber-50/30">K₂</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-stone-200/70 font-mono text-[11px]">
                @for (r of table.rows; track r.stageIndex) {
                  <tr
                    class="transition"
                    [ngClass]="
                      r.isMaxK
                        ? 'bg-amber-50/70 hover:bg-amber-100/50'
                        : 'hover:bg-stone-50'
                    "
                  >
                    <td class="py-2.5 px-3 font-sans font-semibold text-stone-800">
                      <div class="flex items-center gap-2">
                        <span class="w-6 h-6 rounded bg-stone-100 border border-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-700">
                          {{ r.code }}
                        </span>
                        <span>{{ r.stageName }}</span>
                        @if (r.isMaxK) {
                          <span class="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-700 text-white">
                            Maior k
                          </span>
                        }
                      </div>
                    </td>
                    <td class="py-2.5 px-2 text-right text-stone-700">{{ r.soma }}</td>
                    <td class="py-2.5 px-2 text-right font-bold text-stone-900">{{ r.lx }}</td>
                    <td class="py-2.5 px-2 text-right text-stone-700">
                      {{ r.isAdult ? '—' : r.dx }}
                    </td>
                    <td class="py-2.5 px-2 text-right text-emerald-800 font-semibold">
                      {{ r.isAdult ? '—' : (r.qx100 | number: '1.4-4') }}
                    </td>
                    <td class="py-2.5 px-2 text-right text-stone-700">
                      {{ r.isAdult ? '—' : (r.rx100 | number: '1.4-4') }}
                    </td>
                    <td class="py-2.5 px-2.5 text-right font-bold text-amber-900 border-r border-stone-300">
                      {{ r.isAdult ? '—' : (r.kx | number: '1.4-4') }}
                    </td>

                    <!-- Colunas Padronizadas (Base 1.000 Ovos) -->
                    <td class="py-2.5 px-2 text-right bg-amber-50/20 font-semibold text-stone-800">
                      {{ r.lxStd | number: '1.1-1' }}
                    </td>
                    <td class="py-2.5 px-2 text-right bg-amber-50/20 text-stone-700">
                      {{ r.isAdult ? '—' : (r.dxStd | number: '1.1-1') }}
                    </td>
                    <td class="py-2.5 px-2 text-right bg-amber-50/20 text-emerald-800">
                      {{ r.isAdult ? '—' : (r.qx100Std | number: '1.4-4') }}
                    </td>
                    <td class="py-2.5 px-2 text-right bg-amber-50/20 text-stone-700">
                      {{ r.isAdult ? '—' : (r.rx100Std | number: '1.4-4') }}
                    </td>
                    <td class="py-2.5 px-2 text-right bg-amber-50/20 text-stone-700">
                      {{ r.isAdult ? '—' : (r.mmPctStd | number: '1.4-4') }}
                    </td>
                    <td class="py-2.5 px-2.5 text-right bg-amber-50/20 font-bold text-amber-900">
                      {{ r.isAdult ? '—' : (r.kxStd | number: '1.4-4') }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Cartões de Síntese Demográfica do Talhão (SummaryCards) -->
          <div class="summary-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div class="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
              <div class="text-[10px] font-bold uppercase text-stone-500">
                MORTALIDADE TOTAL ACUMULADA
              </div>
              <div class="text-xl font-serif font-bold text-amber-800 mt-1">
                {{ table.totalMortalityPct | number: '1.2-2' }}%
              </div>
            </div>
            <div class="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
              <div class="text-[10px] font-bold uppercase text-stone-500">
                K TOTAL (SOMA DAS FASES PRÉ-ADULTAS)
              </div>
              <div class="text-xl font-serif font-bold text-amber-800 mt-1">
                {{ table.kTotal | number: '1.4-4' }}
              </div>
            </div>
            <div class="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <div class="text-[10px] font-bold uppercase text-stone-500">
                COORTE INICIAL (L₀) → ADULTOS
              </div>
              <div class="text-xl font-serif font-bold text-stone-900 mt-1">
                {{ table.initialEggs }} → {{ table.survivingAdults }} ind.
              </div>
            </div>
            <div class="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <div class="text-[10px] font-bold uppercase text-stone-500">
                FASE DE MAIOR MORTALIDADE (kₓ)
              </div>
              <div class="text-base font-serif font-bold text-emerald-800 mt-1">
                {{ table.maxKStageName }}
              </div>
            </div>
          </div>

          <!-- Memorial de Fórmulas Matemáticas -->
          <div class="p-4 rounded-xl bg-[#f8f6f0] border border-stone-200/80 text-xs text-stone-600 space-y-1">
            <div class="font-bold text-stone-800 uppercase text-[10px] tracking-wider">
              Memorial de Fórmulas Demográficas (Morris & Miller, 1954; Varley & Gradwell, 1960):
            </div>
            <div class="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px]">
              <span>dₓ = Lₓ − Lₓ₊₁</span>
              <span>Sₓ = Lₓ₊₁ / Lₓ</span>
              <span>100qₓ = (dₓ / Lₓ) × 100</span>
              <span>100rₓ = (dₓ / L₀) × 100</span>
              <span>kₓ = log₁₀(Lₓ) − log₁₀(Lₓ₊₁)</span>
              <span>K_total = ∑ kₓ</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class TabelaVidaComponent {
  public readonly lifeTableService = inject(LifeTableService);
}
