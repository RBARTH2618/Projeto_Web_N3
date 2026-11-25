import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { CenariosAnaliticosComponent } from './components/cenarios-analiticos.component';
import { ColetaDadosComponent } from './components/coleta-dados.component';
import { ImportarModalComponent } from './components/importar-modal.component';
import { TabelaMediaComponent } from './components/tabela-media.component';
import { TabelaVidaComponent } from './components/tabela-vida.component';
import { TelaInicialSelecaoComponent } from './components/tela-inicial-selecao.component';
import { LifeTableService } from './life-table.service';
import { SelecaoContextService } from './selecao-context.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    TelaInicialSelecaoComponent,
    CenariosAnaliticosComponent,
    ColetaDadosComponent,
    TabelaVidaComponent,
    TabelaMediaComponent,
    ImportarModalComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  public readonly lifeTableService = inject(LifeTableService);
  public readonly selecaoCtx = inject(SelecaoContextService);

  public readonly tabTitles: Record<number, string> = {
    0: '0. Central de Cenários & Marchas Analíticas dos Agrônomos',
    1: '1. Coleta de Amostras (Entrada de Dados)',
    2: '2. Tabela de Vida Ecológica por Talhão',
    3: '3. Tabela de Vida Média & Mortalidade Indispensável',
  };

  public readonly maxKStageLabel = computed<string>(() => {
    return this.lifeTableService.meanLifeTable().maxKStageName || 'Ovo (Ov)';
  });

  public readonly ninfasCount = computed<number>(() => {
    const totalStages = this.lifeTableService.stages().length;
    return Math.max(0, totalStages - 2);
  });

  public async ngOnInit(): Promise<void> {
    await this.lifeTableService.inicializar();
  }

  public selecionarAba(tab: number): void {
    this.lifeTableService.activeTab.set(tab);
  }

  public abrirWizard(step: 1 | 2 | 3 = 1): void {
    this.lifeTableService.wizardInitialStep.set(step);
    this.lifeTableService.wizardModalOpen.set(true);
  }

  public abrirImportador(): void {
    this.lifeTableService.importModalOpen.set(true);
  }
}
