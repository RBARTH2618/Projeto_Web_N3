import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MeanLifeRow } from '../life-table.models';
import { LifeTableService } from '../life-table.service';

@Component({
  selector: 'app-tabela-media',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-5">
      <div class="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
        <!-- Cabeçalho da Aba 3 (RF011) -->
        <div>
          <h2 class="text-lg font-serif font-bold text-stone-900">
            3. Tabela de Vida Média & Mortalidade Indispensável (Pereira et al., 2018)
          </h2>
          <p class="text-xs text-stone-500">
            Média consolidada entre todos os {{ lifeTableService.plots().length }} talhões (padronizada para 1.000 ovos), Desvio Padrão (DP), Erro Padrão (EP = DP / √n), Mortalidade Indispensável (MI) e Aumento Populacional Esperado (%).
          </p>
        </div>

        <!-- TABELA DE VIDA MÉDIA DOS TALHÕES E MORTALIDADE INDISPENSÁVEL (MeanLifeTable) -->
        @if (lifeTableService.meanLifeTable(); as meanTable) {
          <div class="overflow-x-auto border border-stone-200 rounded-xl">
            <table class="data-table w-full text-xs border-collapse">
              <thead>
                <tr class="bg-[#f5f2eb] border-b border-stone-200 text-[10px] font-bold uppercase tracking-wider text-stone-600">
                  <th class="py-2.5 px-3 text-left min-w-[140px]">FASE</th>
                  <th class="py-2.5 px-2.5 text-right min-w-[125px]">LX (MÉDIA ± EP)</th>
                  <th class="py-2.5 px-2.5 text-right min-w-[125px]">DX (MÉDIA ± EP)</th>
                  <th class="py-2.5 px-2.5 text-right">DESVIO PADRÃO LX</th>
                  <th class="py-2.5 px-2.5 text-right">100QX (%)</th>
                  <th class="py-2.5 px-2.5 text-right">100RX (%)</th>
                  <th class="py-2.5 px-2.5 text-right">MM (%)</th>
                  <th class="py-2.5 px-2.5 text-right">K MÉDIO</th>
                  <th class="py-2.5 px-2.5 text-right bg-amber-50/70 text-amber-900">MI (%)</th>
                  <th class="py-2.5 px-3 text-right bg-emerald-50/70 text-emerald-900">AUMENTO POP. (%)</th>
                </tr>
              </thead>

              <tbody class="divide-y divide-stone-200/70 font-mono text-[11px]">
                @for (r of meanTable.rows; track r.stageIndex) {
                  <tr
                    class="transition"
                    [ngClass]="
                      isMaxMiRow(r)
                        ? 'bg-amber-50/60 hover:bg-amber-100/50'
                        : 'hover:bg-stone-50'
                    "
                  >
                    <!-- Fase -->
                    <td class="py-2.5 px-3 font-sans font-semibold text-stone-800">
                      <div class="flex items-center gap-2">
                        <span class="w-6 h-6 rounded bg-stone-100 border border-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-700">
                          {{ r.code }}
                        </span>
                        <span>{{ r.stageName }}</span>
                      </div>
                    </td>

                    <!-- LX (MÉDIA ± EP) -->
                    <td class="py-2.5 px-2.5 text-right">
                      <div class="font-bold text-stone-900">
                        {{ r.lxMean | number: '1.2-2' }} ±
                      </div>
                      <div class="text-[10px] text-stone-500">
                        {{ r.lxSe | number: '1.2-2' }}
                      </div>
                    </td>

                    <!-- DX (MÉDIA ± EP) -->
                    <td class="py-2.5 px-2.5 text-right">
                      @if (r.isAdult) {
                        <span class="text-stone-400">—</span>
                      } @else {
                        <div class="text-stone-700">
                          {{ r.dxMean | number: '1.2-2' }} ±
                        </div>
                        <div class="text-[10px] text-stone-400">
                          {{ r.dxSe | number: '1.2-2' }}
                        </div>
                      }
                    </td>

                    <!-- DESVIO PADRÃO LX -->
                    <td class="py-2.5 px-2.5 text-right text-stone-500">
                      {{ r.lxSd | number: '1.2-2' }}
                    </td>

                    <!-- 100QX (%) -->
                    <td class="py-2.5 px-2.5 text-right font-semibold text-emerald-800">
                      {{ r.isAdult ? '—' : (r.qx100 | number: '1.4-4') }}
                    </td>

                    <!-- 100RX (%) -->
                    <td class="py-2.5 px-2.5 text-right text-stone-700">
                      {{ r.isAdult ? '—' : (r.rx100 | number: '1.4-4') }}
                    </td>

                    <!-- MM (%) -->
                    <td class="py-2.5 px-2.5 text-right font-semibold text-stone-800">
                      {{ r.isAdult ? '—' : (r.mmPct | number: '1.4-4') }}
                    </td>

                    <!-- K MÉDIO -->
                    <td class="py-2.5 px-2.5 text-right font-bold text-amber-900">
                      {{ r.isAdult ? '—' : (r.kxMean | number: '1.4-4') }}
                    </td>

                    <!-- MI (%) -->
                    <td class="py-2.5 px-2.5 text-right font-bold text-amber-800 bg-amber-50/30">
                      @if (r.isAdult) {
                        <span>—</span>
                      } @else {
                        <span [title]="'MI absoluto (base 1000): ' + (r.mix | number: '1.2-2') + ' ind.'">
                          {{ r.mixPct | number: '1.2-2' }}%
                        </span>
                      }
                    </td>

                    <!-- AUMENTO POP. (%) -->
                    <td class="py-2.5 px-3 text-right font-bold text-emerald-800 bg-emerald-50/30">
                      @if (r.isAdult) {
                        <span>—</span>
                      } @else {
                        <span>+{{ r.potentialIncreasePct | number: '1.1-1' }}%</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>

              <!-- Linha de Somatório / Consolidação no Rodapé da Tabela -->
              <tfoot>
                <tr class="bg-[#f5f2eb] border-t-2 border-stone-300 font-mono text-[11px] font-bold text-stone-900">
                  <td class="py-2.5 px-3 font-sans uppercase text-[10px] tracking-wider text-stone-600">
                    TOTAL / ACUMULADO (n = {{ lifeTableService.plots().length }})
                  </td>
                  <td class="py-2.5 px-2.5 text-right">
                    1000.00 → {{ adultMeanLx() | number: '1.2-2' }}
                  </td>
                  <td class="py-2.5 px-2.5 text-right text-stone-700">
                    ∑ d̄ₓ = {{ totalDxMean() | number: '1.2-2' }}
                  </td>
                  <td class="py-2.5 px-2.5 text-right text-stone-500">
                    DP Mort.: {{ totalMortalitySd() | number: '1.2-2' }}%
                  </td>
                  <td class="py-2.5 px-2.5 text-right text-stone-500">—</td>
                  <td class="py-2.5 px-2.5 text-right text-amber-900">
                    ∑ 100r̄ₓ = {{ meanTable.totalMortalityMeanPct | number: '1.2-2' }}%
                  </td>
                  <td class="py-2.5 px-2.5 text-right text-stone-500">—</td>
                  <td class="py-2.5 px-2.5 text-right text-amber-900">
                    K̄ = {{ meanTable.kTotalMean | number: '1.4-4' }}
                  </td>
                  <td class="py-2.5 px-2.5 text-right text-amber-900 bg-amber-50/50">
                    ∑ MI = {{ totalMiPct() | number: '1.2-2' }}%
                  </td>
                  <td class="py-2.5 px-3 text-right text-emerald-900 bg-emerald-50/50">
                    Sobrev.: {{ meanTable.survivalAdultPct | number: '1.2-2' }}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Cartões de Destaque Executivo (HighlightCards - RF011 e Figura 14) -->
          <div class="summary-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div class="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
              <div class="text-[10px] font-bold uppercase text-stone-500">
                MORTALIDADE TOTAL MÉDIA
              </div>
              <div class="text-xl font-serif font-bold text-amber-800 mt-1">
                {{ meanTable.totalMortalityMeanPct | number: '1.2-2' }}% ± {{ meanTable.totalMortalitySePct | number: '1.2-2' }}%
              </div>
              <div class="text-[11px] text-stone-500 mt-0.5">
                Sobrevivência até Adulto: {{ meanTable.survivalAdultPct | number: '1.2-2' }}%
              </div>
            </div>

            <div class="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
              <div class="text-[10px] font-bold uppercase text-stone-500">
                K TOTAL MÉDIO
              </div>
              <div class="text-xl font-serif font-bold text-amber-800 mt-1">
                {{ meanTable.kTotalMean | number: '1.4-4' }}
              </div>
              <div class="text-[11px] text-stone-500 mt-0.5">
                Soma das mortalidades logarítmicas médias
              </div>
            </div>

            <div class="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <div class="text-[10px] font-bold uppercase text-stone-500">
                ESTÁGIO COM MAIOR k̄ₓ MÉDIO
              </div>
              <div class="text-base font-serif font-bold text-stone-900 mt-1">
                {{ meanTable.maxKStageName }}
              </div>
              @if (maxKRow(); as mk) {
                <div class="text-[11px] text-amber-800 font-semibold mt-0.5">
                  k̄ₓ = {{ mk.kxMean | number: '1.4-4' }} (100q̄ₓ = {{ mk.qx100 | number: '1.2-2' }}%)
                </div>
              }
            </div>

            <div class="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200">
              <div class="text-[10px] font-bold uppercase text-emerald-900">
                MAIOR MORTALIDADE INDISPENSÁVEL (MIₓ)
              </div>
              <div class="text-base font-serif font-bold text-emerald-950 mt-1">
                {{ meanTable.maxMiStageName }}
              </div>
              @if (maxMiRow(); as mm) {
                <div class="text-[11px] text-emerald-800 font-semibold mt-0.5">
                  %MIₓ = {{ mm.mixPct | number: '1.2-2' }}% ({{ mm.mix | number: '1.1-1' }} ind. / +{{ mm.potentialIncreasePct | number: '1.1-1' }}% pop.)
                </div>
              }
            </div>
          </div>

          <!-- Nota Metodológica sobre Mortalidade Indispensável (MIx) -->
          <div class="p-4 rounded-xl bg-[#f8f6f0] border border-stone-200/80 text-xs text-stone-600 space-y-1.5">
            <div class="font-bold text-stone-800 uppercase text-[10px] tracking-wider">
              Interpretação Ecológica & Nota Metodológica — Mortalidade Indispensável (Southwood, 1978; Pereira et al., 2018):
            </div>
            <p class="leading-relaxed text-[11px]">
              A <strong>Mortalidade Indispensável (MIₓ)</strong> quantifica a parcela líquida de mortalidade de um estágio que <em>não seria compensada</em> pelos fatores de mortalidade atuantes nas fases subsequentes caso a mortalidade do estágio <code>x</code> fosse anulada:
              <code class="px-1.5 py-0.5 rounded bg-white border border-stone-200 font-mono text-stone-800">
                MIₓ = L̄_final × [100q̄ₓ / (100 − 100q̄ₓ)]
              </code>
              e
              <code class="px-1.5 py-0.5 rounded bg-white border border-stone-200 font-mono text-stone-800">
                %MIₓ = (MIₓ / L̄₀) × 100
              </code>.
              O indicador <strong>Aumento Pop. (%)</strong> expressa o crescimento percentual imediato na população adulta sobrevivente caso o controle natural daquela fase deixasse de atuar.
            </p>
          </div>
        }
      </div>
    </div>
  `,
})
export class TabelaMediaComponent {
  public readonly lifeTableService = inject(LifeTableService);

  public readonly immatureRows = computed<MeanLifeRow[]>(() =>
    this.lifeTableService.meanLifeTable().rows.filter((r) => !r.isAdult),
  );

  public readonly maxKRow = computed<MeanLifeRow | null>(() => {
    const list = [...this.immatureRows()].sort((a, b) => b.kxMean - a.kxMean);
    return list[0] ?? null;
  });

  public readonly maxMiRow = computed<MeanLifeRow | null>(() => {
    const list = [...this.immatureRows()].sort((a, b) => b.mixPct - a.mixPct);
    return list[0] ?? null;
  });

  public readonly adultMeanLx = computed<number>(() => {
    const rows = this.lifeTableService.meanLifeTable().rows;
    return rows[rows.length - 1]?.lxMean ?? 0;
  });

  public readonly totalDxMean = computed<number>(() => {
    return this.immatureRows().reduce((acc, r) => acc + r.dxMean, 0);
  });

  public readonly totalMiPct = computed<number>(() => {
    return this.immatureRows().reduce((acc, r) => acc + r.mixPct, 0);
  });

  public readonly totalMortalitySd = computed<number>(() => {
    const rows = this.lifeTableService.meanLifeTable().rows;
    const adultRow = rows[rows.length - 1];
    return adultRow ? adultRow.lxSd / 10 : 0;
  });

  public isMaxMiRow(row: MeanLifeRow): boolean {
    if (row.isAdult) return false;
    const max = this.maxMiRow();
    return Boolean(max && max.stageIndex === row.stageIndex && max.mixPct > 0);
  }
}
