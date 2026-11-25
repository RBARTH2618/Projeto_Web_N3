import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LifeTableService } from '../life-table.service';

@Component({
  selector: 'app-importar-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4"
      (click)="fechar()"
    >
      <div
        class="bg-[#fbf9f5] border border-stone-200 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden text-stone-800"
        (click)="$event.stopPropagation()"
      >
        <div class="px-6 py-4 bg-white border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 class="text-base font-serif font-bold text-stone-900">
              Importar / Colar Dados de Amostras do Excel
            </h2>
            <p class="text-xs text-stone-500">
              Copie diretamente as células da planilha Excel com o cabeçalho <code>Talhão X</code> e linhas de fases com amostras numéricas tabuladas.
            </p>
          </div>
          <button
            type="button"
            (click)="fechar()"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            ✕
          </button>
        </div>

        <div class="p-6 space-y-4">
          <!-- Modos de Operação (ImportModeRadio - RF009) -->
          <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200 text-xs">
            <div class="flex flex-wrap items-center gap-4">
              <label class="flex items-center gap-1.5 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  [(ngModel)]="mode"
                />
                <span>Substituir todos os talhões</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="importMode"
                  value="append"
                  [(ngModel)]="mode"
                />
                <span>Adicionar como novos talhões</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="importMode"
                  value="single"
                  [(ngModel)]="mode"
                />
                <span>Importar no {{ lifeTableService.activePlot()?.nome || 'Talhão ativo' }}</span>
              </label>
            </div>

            <button
              type="button"
              (click)="preencherExemploTeste()"
              class="px-2.5 py-1 text-[11px] font-bold rounded bg-amber-100 hover:bg-amber-200 text-amber-900 transition"
            >
              Preencher Exemplo de Teste
            </button>
          </div>

          <!-- Área de Texto TSV / CSV (RawTextArea) -->
          <div>
            <textarea
              rows="10"
              [(ngModel)]="rawText"
              placeholder="Talhão 1&#10;Fases&#9;1&#9;2&#9;3&#9;4&#9;5&#9;6&#9;7&#9;8&#9;9&#9;10&#10;Ov&#9;9&#9;0&#9;8&#9;6&#9;5&#9;2&#9;5&#9;0&#9;0&#9;2&#10;N1&#9;0&#9;0&#9;0&#9;0&#9;0&#9;3&#9;0&#9;0&#9;0&#9;0..."
              class="import-textarea w-full p-3.5 text-xs font-mono rounded-xl border border-stone-300 bg-white focus:outline-none focus:border-stone-800"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              (click)="fechar()"
              class="px-4 py-2 text-xs font-semibold rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              [disabled]="processando()"
              (click)="importar()"
              class="btn-primary px-5 py-2 text-xs font-bold rounded-lg bg-stone-900 hover:bg-stone-800 text-white shadow-sm transition disabled:opacity-50"
            >
              {{ processando() ? 'Sincronizando...' : 'Processar e Carregar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ImportarModalComponent {
  public readonly lifeTableService = inject(LifeTableService);

  public mode: 'replace' | 'append' | 'single' = 'replace';
  public rawText = '';
  public readonly processando = signal<boolean>(false);

  public preencherExemploTeste(): void {
    this.rawText = [
      'Talhão 1\tFases\t1\t2\t3\t4\t5\t6\t7\t8\t9\t10',
      'Ov\t9\t0\t8\t6\t5\t2\t5\t0\t0\t2',
      'N1\t0\t0\t0\t0\t0\t3\t0\t0\t0\t0',
      'N2\t0\t0\t2\t0\t0\t0\t1\t1\t0\t0',
      'N3\t1\t0\t1\t0\t2\t1\t3\t8\t0\t5',
      'N4\t0\t0\t0\t0\t0\t0\t0\t0\t0\t0',
      'N5\t0\t0\t0\t0\t0\t0\t0\t0\t0\t0',
      'Ad\t4\t4\t4\t0\t4\t4\t4\t4\t4\t4',
      '',
      'Talhão 2\tFases\t1\t2\t3\t4\t5\t6\t7\t8\t9\t10',
      'Ov\t9\t0\t8\t6\t5\t2\t5\t0\t0\t2',
      'N1\t0\t0\t0\t0\t0\t3\t0\t0\t0\t0',
      'N2\t0\t0\t2\t0\t0\t0\t1\t1\t0\t0',
      'N3\t1\t0\t1\t0\t2\t1\t3\t8\t0\t5',
      'N4\t0\t0\t0\t0\t0\t2\t0\t0\t0\t1',
      'N5\t0\t0\t0\t0\t0\t0\t0\t0\t0\t0',
      'Ad\t4\t4\t4\t0\t4\t4\t4\t4\t4\t4',
    ].join('\n');
  }

  public fechar(): void {
    this.lifeTableService.importModalOpen.set(false);
  }

  public async importar(): Promise<void> {
    if (!this.rawText.trim()) return;
    this.processando.set(true);
    try {
      await this.lifeTableService.importFromTSV(
        this.rawText,
        this.mode,
        this.lifeTableService.selectedPlotIndex(),
      );
    } finally {
      this.processando.set(false);
    }
  }
}
