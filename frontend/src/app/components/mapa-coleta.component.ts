import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { UnirvExperimentalArea } from '../culturas-pragas.models';
import { LifeTableService } from '../life-table.service';
import { SelecaoContextService } from '../selecao-context.service';

@Component({
  selector: 'app-mapa-coleta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-base font-serif font-bold text-stone-900">
            Mapeamento Geolocalizado de Amostras — Áreas Experimentais UniRV (Rio Verde - GO)
          </h3>
          <p class="text-xs text-stone-500">
            Selecione uma amostra abaixo e clique no mapa para registrar o ponto GPS de coleta no
            <strong>{{ lifeTableService.activePlot()?.nome || 'Talhão 1' }}</strong> nos arredores das fazendas e estações experimentais da Universidade de Rio Verde (UniRV).
          </p>
        </div>

        <!-- Botões de Camada e Enquadramento (ViewModeBtns & LayerToggle) -->
        <div class="map-btn-group flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            (click)="alternarCamada('street')"
            class="px-3 py-1.5 text-xs font-bold rounded-lg border transition"
            [ngClass]="
              mapLayerMode() === 'street'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
            "
          >
            Visão Mapa
          </button>
          <button
            type="button"
            (click)="alternarCamada('satellite')"
            class="px-3 py-1.5 text-xs font-bold rounded-lg border transition"
            [ngClass]="
              mapLayerMode() === 'satellite'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
            "
          >
            Satélite Esri
          </button>
          <button
            type="button"
            (click)="capturarGpsAtual()"
            class="px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700"
          >
            Capturar GPS Atual
          </button>
          <button
            type="button"
            (click)="enquadrarTalhaoAtivo()"
            class="px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700"
          >
            Enquadrar Talhão
          </button>
          <button
            type="button"
            (click)="enquadrarTodasAreasUnirv()"
            class="px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700"
          >
            Visão Geral UniRV
          </button>
        </div>
      </div>

      <!-- Painel das 4 Áreas Experimentais da UniRV (UnirvAreasCards - RF007) -->
      <div class="p-3.5 rounded-xl bg-[#f7f4ed] border border-stone-200/90 space-y-2.5">
        <div class="flex flex-wrap items-center gap-2 text-[11px]">
          <span class="px-2 py-0.5 rounded bg-emerald-800 text-white font-bold uppercase tracking-wider">
            ÁREAS EXPERIMENTAIS UNIRV (RIO VERDE - GO)
          </span>
          <span class="text-stone-600">
            Clique em uma estação para navegar até a área ou posicionar as {{ lifeTableService.activePlot()?.samples?.length || 10 }} amostras do {{ lifeTableService.activePlot()?.nome }}:
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          @for (area of selecaoCtx.areasUnirv(); track area.id) {
            <div
              class="unirv-area-card bg-white p-3 rounded-lg border transition-all flex flex-col justify-between space-y-2"
              [ngClass]="
                lifeTableService.activePlot()?.areaExperimentalId === area.id
                  ? 'border-emerald-700 ring-1 ring-emerald-700/30'
                  : 'border-stone-200'
              "
            >
              <div>
                <div class="flex items-center justify-between gap-1">
                  <span class="font-bold text-xs text-stone-900">{{ area.nome }}</span>
                  <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                    {{ contarTalhoesNaArea(area.id) }}T
                  </span>
                </div>
                <div class="text-[11px] font-bold text-emerald-800 mt-0.5">
                  {{ area.dmsLabel }}
                </div>
                <div class="text-[10px] text-stone-400">
                  ({{ area.latCentro.toFixed(6) }}, {{ area.lngCentro.toFixed(6) }}) • {{ area.hectares }} ha
                </div>
              </div>

              <div class="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  (click)="voarParaArea(area)"
                  class="flex-1 px-2 py-1 text-[11px] font-semibold rounded border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700"
                >
                  Ver no Mapa
                </button>
                <button
                  type="button"
                  (click)="alocarTalhaoNaArea(area)"
                  class="flex-1 px-2 py-1 text-[11px] font-bold rounded border border-emerald-700/40 bg-emerald-50 hover:bg-emerald-100 text-emerald-900"
                >
                  Alocar {{ lifeTableService.activePlot()?.nome }} Aqui
                </button>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Seletor de Modo de Clique no Mapa (RF008 - BtnModoClique) -->
      <div class="p-3 rounded-xl bg-emerald-950/5 border border-emerald-800/20 space-y-1.5">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-bold text-stone-700">Ao clicar no mapa:</span>
          <button
            type="button"
            (click)="clickMoveAllPlot.set(true)"
            class="btn-click-region px-3 py-1 text-xs font-bold rounded-lg transition"
            [ngClass]="
              clickMoveAllPlot()
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white text-stone-700 border border-stone-300'
            "
          >
            Trazer Todos os Pontos do Talhão ({{ lifeTableService.activePlot()?.samples?.length || 10 }} Amostras)
          </button>
          <button
            type="button"
            (click)="clickMoveAllPlot.set(false)"
            class="px-3 py-1 text-xs font-bold rounded-lg transition"
            [ngClass]="
              !clickMoveAllPlot()
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white text-stone-700 border border-stone-300'
            "
          >
            Posicionar Apenas Amostra Ativa (#{{ lifeTableService.selectedSampleIndex() + 1 }})
          </button>
        </div>
        <div class="text-[11px] text-emerald-900">
          {{
            clickMoveAllPlot()
              ? 'Clique em qualquer área do mapa para trazer todas as amostras do ' +
                (lifeTableService.activePlot()?.nome || 'Talhão') +
                ' para a região clicada.'
              : 'Clique em qualquer ponto do mapa para posicionar individualmente a Amostra #' +
                (lifeTableService.selectedSampleIndex() + 1) +
                '.'
          }}
        </div>
      </div>

      <!-- Pílulas Seletoras de Amostra em Foco -->
      @if (lifeTableService.activePlot(); as plot) {
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-xs font-semibold text-stone-500 mr-1">Amostra em foco:</span>
          @for (s of plot.samples; track s.id; let sIdx = $index) {
            <button
              type="button"
              (click)="selecionarAmostra(sIdx)"
              class="px-2.5 py-1 text-xs font-semibold rounded-full border transition flex items-center gap-1"
              [ngClass]="
                lifeTableService.selectedSampleIndex() === sIdx
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              "
            >
              <span>{{ s.id }}</span>
              <span>Amostra {{ s.id }}</span>
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </button>
          }
        </div>
      }

      <!-- CONTAINER DO MAPA LEAFLET 1.9 (LeafletCanvas) -->
      <div
        #mapContainer
        id="leaflet-coleta-map"
        class="w-full h-[430px] rounded-xl border border-stone-300 overflow-hidden z-10 cursor-crosshair"
      ></div>

      <!-- Gaveta Expansível de Ajuste Fino de Coordenadas GPS por Amostra (CoordsDrawer - RF008) -->
      @if (lifeTableService.activePlot(); as plot) {
        <div class="border border-stone-200 rounded-xl overflow-hidden">
          <button
            type="button"
            (click)="coordsExpanded.set(!coordsExpanded())"
            class="w-full px-4 py-2.5 bg-stone-50 hover:bg-stone-100 flex items-center justify-between text-xs font-bold text-stone-700"
          >
            <span>
              {{ coordsExpanded() ? '▾' : '▸' }} Grade de Coordenadas GPS por Amostra ({{ plot.nome }} — Datum WGS84)
            </span>
            <span class="text-[11px] font-normal text-stone-500">
              Centroide: {{ plot.latCentro.toFixed(6) }}, {{ plot.lngCentro.toFixed(6) }}
            </span>
          </button>

          @if (coordsExpanded()) {
            <div class="coords-grid p-4 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              @for (s of plot.samples; track s.id; let sIdx = $index) {
                <div class="p-2.5 rounded-lg border border-stone-200 bg-stone-50/50 space-y-1.5 text-xs">
                  <div class="font-bold text-stone-800 flex items-center justify-between">
                    <span>Amostra #{{ s.id }} ({{ s.code }})</span>
                    <button
                      type="button"
                      (click)="focarAmostraNoMapa(s.lat, s.lng, sIdx)"
                      class="text-[10px] text-emerald-700 hover:underline font-semibold"
                    >
                      Focar
                    </button>
                  </div>
                  <div class="grid grid-cols-2 gap-1.5">
                    <div>
                      <label class="block text-[9px] uppercase text-stone-400 font-bold">Lat</label>
                      <input
                        type="number"
                        step="0.0001"
                        [ngModel]="s.lat"
                        (change)="atualizarCoordManual(sIdx, $any($event.target).value, s.lng)"
                        class="w-full px-1.5 py-1 text-[11px] rounded border border-stone-300 bg-white"
                      />
                    </div>
                    <div>
                      <label class="block text-[9px] uppercase text-stone-400 font-bold">Lng</label>
                      <input
                        type="number"
                        step="0.0001"
                        [ngModel]="s.lng"
                        (change)="atualizarCoordManual(sIdx, s.lat, $any($event.target).value)"
                        class="w-full px-1.5 py-1 text-[11px] rounded border border-stone-300 bg-white"
                      />
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class MapaColetaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  public mapContainer!: ElementRef<HTMLDivElement>;

  public readonly lifeTableService = inject(LifeTableService);
  public readonly selecaoCtx = inject(SelecaoContextService);

  public readonly mapLayerMode = signal<'street' | 'satellite'>('satellite');
  public readonly clickMoveAllPlot = signal<boolean>(true);
  public readonly coordsExpanded = signal<boolean>(false);

  private map: L.Map | null = null;
  private streetLayer: L.TileLayer | null = null;
  private satelliteLayer: L.TileLayer | null = null;
  private overlayGroup: L.LayerGroup | null = null;

  constructor() {
    effect(() => {
      // Re-renderiza camadas toda vez que o talhão ativo, amostras ou áreas mudarem
      const _plot = this.lifeTableService.activePlot();
      const _areas = this.selecaoCtx.areasUnirv();
      const _sampleIdx = this.lifeTableService.selectedSampleIndex();
      if (this.map) {
        this.desenharPoligonosEMarcadores();
      }
    });
  }

  public ngAfterViewInit(): void {
    this.inicializarMapa();
  }

  public ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  public alternarCamada(mode: 'street' | 'satellite'): void {
    this.mapLayerMode.set(mode);
    if (!this.map || !this.streetLayer || !this.satelliteLayer) return;
    if (mode === 'satellite') {
      this.map.removeLayer(this.streetLayer);
      this.satelliteLayer.addTo(this.map);
    } else {
      this.map.removeLayer(this.satelliteLayer);
      this.streetLayer.addTo(this.map);
    }
  }

  public contarTalhoesNaArea(areaId: string): number {
    return this.lifeTableService
      .plots()
      .filter((p) => p.areaExperimentalId === areaId).length;
  }

  public voarParaArea(area: UnirvExperimentalArea): void {
    if (!this.map) return;
    this.map.flyTo([area.latCentro, area.lngCentro], 16, { duration: 0.7 });
  }

  public async alocarTalhaoNaArea(area: UnirvExperimentalArea): Promise<void> {
    const plotIdx = this.lifeTableService.selectedPlotIndex();
    await this.lifeTableService.movePlotToCoordinates(
      plotIdx,
      area.latCentro,
      area.lngCentro,
      area.id,
    );
    this.voarParaArea(area);
  }

  public selecionarAmostra(idx: number): void {
    this.lifeTableService.selectedSampleIndex.set(idx);
    const sample = this.lifeTableService.activePlot()?.samples[idx];
    if (sample && this.map) {
      this.map.panTo([sample.lat, sample.lng]);
    }
  }

  public focarAmostraNoMapa(lat: number, lng: number, idx: number): void {
    this.lifeTableService.selectedSampleIndex.set(idx);
    if (this.map) {
      this.map.flyTo([lat, lng], 17, { duration: 0.5 });
    }
  }

  public async atualizarCoordManual(
    sampleIdx: number,
    latRaw: string | number,
    lngRaw: string | number,
  ): Promise<void> {
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const plotIdx = this.lifeTableService.selectedPlotIndex();
    await this.lifeTableService.movePlotToCoordinates(
      plotIdx,
      lat,
      lng,
      undefined,
      sampleIdx,
    );
  }

  public enquadrarTalhaoAtivo(): void {
    const plot = this.lifeTableService.activePlot();
    if (!plot || !this.map) return;
    if (plot.samples.length > 1) {
      const bounds = L.latLngBounds(
        plot.samples.map((s) => [s.lat, s.lng] as [number, number]),
      );
      this.map.fitBounds(bounds.pad(0.45));
    } else {
      this.map.flyTo([plot.latCentro, plot.lngCentro], 16);
    }
  }

  public enquadrarTodasAreasUnirv(): void {
    const areas = this.selecaoCtx.areasUnirv();
    if (!this.map || areas.length === 0) return;
    const bounds = L.latLngBounds(
      areas.map((a) => [a.latCentro, a.lngCentro] as [number, number]),
    );
    this.map.fitBounds(bounds.pad(0.35));
  }

  public capturarGpsAtual(): void {
    if (!navigator.geolocation) {
      this.lifeTableService.showToast(
        'Geolocalização do navegador não suportada; mantendo coordenadas da UniRV.',
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const plotIdx = this.lifeTableService.selectedPlotIndex();
        await this.lifeTableService.movePlotToCoordinates(
          plotIdx,
          pos.coords.latitude,
          pos.coords.longitude,
        );
        this.enquadrarTalhaoAtivo();
      },
      () => {
        this.lifeTableService.showToast(
          'Permissão GPS negada; posicionando na Fazenda Experimental Fontes do Saber (UniRV).',
        );
        this.enquadrarTalhaoAtivo();
      },
    );
  }

  private inicializarMapa(): void {
    const plot = this.lifeTableService.activePlot();
    const initialLat = plot?.latCentro ?? -17.784306;
    const initialLng = plot?.lngCentro ?? -50.960667;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [initialLat, initialLng],
      zoom: 16,
    });

    this.streetLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors | UniRV Rio Verde - GO',
      },
    );

    this.satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Tiles © Esri World Imagery | Estações Experimentais UniRV',
      },
    );

    this.satelliteLayer.addTo(this.map);
    this.overlayGroup = L.layerGroup().addTo(this.map);

    // Listener de clique para realocação espacial de talhão ou amostra (RF008)
    this.map.on('click', async (e: L.LeafletMouseEvent) => {
      const plotIdx = this.lifeTableService.selectedPlotIndex();
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      if (this.clickMoveAllPlot()) {
        await this.lifeTableService.movePlotToCoordinates(plotIdx, lat, lng);
      } else {
        const sampleIdx = this.lifeTableService.selectedSampleIndex();
        await this.lifeTableService.movePlotToCoordinates(
          plotIdx,
          lat,
          lng,
          undefined,
          sampleIdx,
        );
      }
    });

    setTimeout(() => {
      this.map?.invalidateSize();
      this.desenharPoligonosEMarcadores();
    }, 150);
  }

  private desenharPoligonosEMarcadores(): void {
    if (!this.map || !this.overlayGroup) return;
    this.overlayGroup.clearLayers();

    // 1. Desenha polígonos tracejados dourados das 4 Áreas Experimentais da UniRV
    for (const area of this.selecaoCtx.areasUnirv()) {
      if (area.poligonoCoords?.length) {
        const poly = L.polygon(area.poligonoCoords, {
          color: '#d97706',
          weight: 2,
          dashArray: '6, 4',
          fillColor: '#f59e0b',
          fillOpacity: 0.12,
        });
        poly.bindTooltip(`${area.nome} (${area.hectares} ha)`, {
          direction: 'top',
          sticky: true,
        });
        poly.addTo(this.overlayGroup);
      }
    }

    // 2. Desenha polígono envolvente e pinos numerados (A1..An) do talhão ativo
    const activePlot = this.lifeTableService.activePlot();
    if (!activePlot) return;

    const focusedSampleIdx = this.lifeTableService.selectedSampleIndex();
    if (activePlot.samples.length >= 3) {
      const lats = activePlot.samples.map((s) => s.lat);
      const lngs = activePlot.samples.map((s) => s.lng);
      const minLat = Math.min(...lats) - 0.00012;
      const maxLat = Math.max(...lats) + 0.00012;
      const minLng = Math.min(...lngs) - 0.00012;
      const maxLng = Math.max(...lngs) + 0.00012;

      L.rectangle(
        [
          [minLat, minLng],
          [maxLat, maxLng],
        ],
        {
          color: '#10b981',
          weight: 2,
          fillColor: '#10b981',
          fillOpacity: 0.18,
        },
      )
        .bindTooltip(`${activePlot.nome} (${activePlot.samples.length} amostras)`)
        .addTo(this.overlayGroup);
    }

    activePlot.samples.forEach((s, idx) => {
      const isFocused = idx === focusedSampleIdx;
      const totalCountAtSample = activePlot.counts.reduce(
        (acc, stageRow) => acc + (stageRow[idx] ?? 0),
        0,
      );

      const icon = L.divIcon({
        className: 'custom-sample-pin',
        html: `<div style="
          width: ${isFocused ? '28px' : '24px'};
          height: ${isFocused ? '28px' : '24px'};
          border-radius: 9999px;
          background: ${isFocused ? '#b45309' : '#065f46'};
          color: #ffffff;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
        ">${s.id}</div>`,
        iconSize: [isFocused ? 28 : 24, isFocused ? 28 : 24],
        iconAnchor: [isFocused ? 14 : 12, isFocused ? 14 : 12],
      });

      const marker = L.marker([s.lat, s.lng], { icon });
      marker.bindTooltip(
        `<strong>${activePlot.nome} — Amostra #${s.id} (${s.code})</strong><br/>GPS: ${s.lat.toFixed(6)}, ${s.lng.toFixed(6)}<br/>Total amostrado: ${totalCountAtSample} ind.`,
      );
      marker.on('click', (ev) => {
        L.DomEvent.stopPropagation(ev);
        this.lifeTableService.selectedSampleIndex.set(idx);
      });
      marker.addTo(this.overlayGroup!);
    });
  }
}
