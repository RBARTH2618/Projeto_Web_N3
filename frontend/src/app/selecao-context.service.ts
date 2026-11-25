import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  CulturaInfo,
  PragaInfo,
  UnirvExperimentalArea,
  UsuarioInfo,
} from './culturas-pragas.models';

@Injectable({
  providedIn: 'root',
})
export class SelecaoContextService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api';

  public readonly culturas = signal<CulturaInfo[]>([]);
  public readonly areasUnirv = signal<UnirvExperimentalArea[]>([]);
  public readonly usuarios = signal<UsuarioInfo[]>([]);
  public readonly carregando = signal<boolean>(false);
  public readonly erroCatalogo = signal<string | null>(null);

  public readonly culturaSelecionada = signal<CulturaInfo | null>(null);
  public readonly pragaSelecionada = signal<PragaInfo | null>(null);

  public readonly pragasDaCulturaAtiva = computed<PragaInfo[]>(() => {
    return this.culturaSelecionada()?.pragas ?? [];
  });

  public async carregarCatalogos(): Promise<void> {
    this.carregando.set(true);
    this.erroCatalogo.set(null);
    try {
      const [culturas, areas, usuarios] = await Promise.all([
        firstValueFrom(
          this.http.get<CulturaInfo[]>(`${this.apiUrl}/catalogo/culturas`),
        ),
        firstValueFrom(
          this.http.get<UnirvExperimentalArea[]>(
            `${this.apiUrl}/catalogo/areas-unirv`,
          ),
        ),
        firstValueFrom(
          this.http.get<UsuarioInfo[]>(`${this.apiUrl}/catalogo/usuarios`),
        ),
      ]);
      this.culturas.set(culturas ?? []);
      this.areasUnirv.set(areas ?? []);
      this.usuarios.set(usuarios ?? []);

      if (!this.culturaSelecionada() && culturas.length > 0) {
        const soja = culturas.find((c) => c.id === 'soja') ?? culturas[0];
        this.culturaSelecionada.set(soja);
        if (soja.pragas.length > 0) {
          this.pragaSelecionada.set(soja.pragas[0]);
        }
      }
    } catch (err) {
      this.erroCatalogo.set(
        (err as any)?.error?.message ??
          'Não foi possível conectar ao servidor REST em http://localhost:3000/api.',
      );
    } finally {
      this.carregando.set(false);
    }
  }

  public selecionarCultura(cultura: CulturaInfo): void {
    this.culturaSelecionada.set(cultura);
    if (cultura.pragas.length > 0) {
      this.pragaSelecionada.set(cultura.pragas[0]);
    } else {
      this.pragaSelecionada.set(null);
    }
  }

  public selecionarPraga(praga: PragaInfo): void {
    this.pragaSelecionada.set(praga);
  }

  public sincronizarComCenario(culturaId: string, pragaId: string): void {
    const cultura = this.culturas().find((c) => c.id === culturaId);
    if (cultura) {
      this.culturaSelecionada.set(cultura);
      const praga = cultura.pragas.find((p) => p.id === pragaId);
      if (praga) {
        this.pragaSelecionada.set(praga);
      }
    }
  }
}
