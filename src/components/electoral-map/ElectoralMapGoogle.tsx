'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import type { ElectoralPoint, MapFilters, MapType } from '@/types/electoralMap';
import {
  MARKER_STYLES,
  CATEGORY_LABELS,
  STATUS_LABELS,
  MAP_CENTER_DEFAULT,
  MAP_ZOOM_DEFAULT,
  cargarElectoralPointsDesdeBD,
  cargarMunicipiosDesdeBD,
} from '@/data/mockElectoralPoints';
import MarkerInfoPanel from './MarkerInfoPanel';
import StreetViewPanel from './StreetViewPanel';
import styles from './ElectoralMapGoogle.module.css';

type ExploreItem = {
  id: string;
  title: string;
  photoUrl?: string;
};

type AdvMarker = any;

const CAT_COLORS: Record<string, string> = {
  lider: '#f59e0b',
  votante: '#3b82f6',
  voluntario: '#22c55e',
  punto_votacion: '#ef4444',
  casa_visitada: '#8b5cf6',
  pendiente: '#6b7280',
};

const MAP_TYPE_LABELS: Record<'roadmap' | 'satellite' | 'hybrid', string> = {
  roadmap: 'Mapa',
  satellite: 'Satélite',
  hybrid: 'Híbrido',
};

function makePinDiv(color: string, selected: boolean): HTMLElement {
  const size = selected ? 28 : 20;
  const border = selected ? 2.5 : 2;
  const iconSize = selected ? 11 : 8;

  const iconSvg = `
    <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  `;

  const el = document.createElement('div');

  el.style.cssText = `
    width:${size}px;
    height:${size}px;
    background:${color};
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    border:${border}px solid white;
    box-shadow:0 2px 6px rgba(0,0,0,0.35);
    display:flex;
    align-items:center;
    justify-content:center;
    cursor:pointer;
  `;

  const inner = document.createElement('div');

  inner.style.cssText = `
    transform:rotate(45deg);
    display:flex;
    align-items:center;
    justify-content:center;
    width:100%;
    height:100%;
    padding-bottom:3px;
  `;

  inner.innerHTML = iconSvg;
  el.appendChild(inner);

  return el;
}

function PegmanIcon() {
  return (
    <svg
      className={styles.streetViewSvg}
      viewBox="0 0 34 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="17" cy="51.5" rx="6.5" ry="1.8" fill="rgba(0,0,0,0.18)" />
      <circle cx="17" cy="7.5" r="6.5" fill="#FABB05" stroke="#fff" strokeWidth="1.6" />
      <circle cx="14.5" cy="6.8" r="1.1" fill="#fff" />
      <circle cx="19.5" cy="6.8" r="1.1" fill="#fff" />
      <circle cx="14.8" cy="7.1" r="0.55" fill="#202124" />
      <circle cx="19.8" cy="7.1" r="0.55" fill="#202124" />
      <path d="M14.2 9.4 Q17 11 19.8 9.4" stroke="#202124" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <rect x="15.2" y="13.2" width="3.6" height="3.5" rx="1.2" fill="#FABB05" stroke="#fff" strokeWidth="1.2" />
      <path d="M10.5 17C10.5 15.6 11.6 14.5 13 14.5H21C22.4 14.5 23.5 15.6 23.5 17V33H10.5V17Z" fill="#FABB05" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10.5 17L6.5 26Q8.2 28.2 9.8 27L14 19Z" fill="#FABB05" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23.5 17L27.5 26Q25.8 28.2 24.2 27L20 19Z" fill="#FABB05" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.8 33L10 47.5Q11.3 49.6 12.8 48.2L14.2 33Z" fill="#FABB05" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M23.2 33L24 47.5Q22.7 49.6 21.2 48.2L19.8 33Z" fill="#FABB05" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M17 33V40" stroke="#E6A700" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

const DEFAULT_FILTERS: MapFilters = {
  categoria: 'todos',
  municipio: 'todos',
  estadoContacto: 'todos',
  lider: 'todos',
  requiereTransporte: null,
};

const FALLBACK_EXPLORE: ExploreItem[] = [
  { id: 'f1', title: 'Centro histórico' },
  { id: 'f2', title: 'Parque principal' },
  { id: 'f3', title: 'Centro comercial' },
  { id: 'f4', title: 'Zona residencial' },
  { id: 'f5', title: 'Avenida principal' },
];

export default function ElectoralMapGoogle() {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const svServiceRef = useRef<google.maps.StreetViewService | null>(null);
  const svPanoRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const markersRef = useRef<Map<string, AdvMarker>>(new Map());
  const clustererRef = useRef<any>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [mapType, setMapType] = useState<MapType>('roadmap');
  const [selectedPoint, setSelectedPoint] = useState<ElectoralPoint | null>(null);
  const [svAvailable, setSvAvailable] = useState<boolean | null>(null);
  const [svLoading, setSvLoading] = useState(false);
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_FILTERS);
  const [clustering, setClustering] = useState(true);
  const [zoom, setZoom] = useState(MAP_ZOOM_DEFAULT);
  const [coords, setCoords] = useState(MAP_CENTER_DEFAULT);

  const [points, setPoints] = useState<ElectoralPoint[]>([]);
  const [municipios, setMunicipios] = useState<string[]>(['todos']);

  const [isDragging, setIsDragging] = useState(false);
  const [pegPos, setPegPos] = useState<{ x: number; y: number } | null>(null);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [exploreItems, setExploreItems] = useState<ExploreItem[]>(FALLBACK_EXPLORE);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const filteredPoints = useMemo(() => {
    return points.filter((p) => {
      if (filters.categoria !== 'todos' && p.categoria !== filters.categoria) return false;
      if (filters.municipio !== 'todos' && p.municipio !== filters.municipio) return false;
      if (filters.estadoContacto !== 'todos' && p.estadoContacto !== filters.estadoContacto) return false;
      if (filters.lider !== 'todos' && p.liderAsignado !== filters.lider) return false;

      if (
        filters.requiereTransporte !== null &&
        p.requiereTransporte !== filters.requiereTransporte
      ) {
        return false;
      }

      return true;
    });
  }, [points, filters]);

  const lideres = useMemo(() => {
    const lista = Array.from(
      new Set(
        points
          .map((p) => p.liderAsignado)
          .filter((value): value is string => Boolean(value && value !== 'Sin asignar'))
      )
    ).sort((a, b) => a.localeCompare(b, 'es'));

    return ['todos', ...lista];
  }, [points]);

  const hasActiveFilters =
    filters.categoria !== 'todos' ||
    filters.municipio !== 'todos' ||
    filters.estadoContacto !== 'todos' ||
    filters.lider !== 'todos' ||
    filters.requiereTransporte !== null;

  const closeSV = useCallback(() => {
    setSvAvailable(null);
    setSvLoading(false);
    svPanoRef.current?.setVisible(false);
  }, []);

  const getLatLngFromPointer = useCallback((cx: number, cy: number) => {
    if (!mapDivRef.current || !overlayRef.current) return null;

    const proj = overlayRef.current.getProjection();

    if (!proj) return null;

    const rect = mapDivRef.current.getBoundingClientRect();

    return proj.fromContainerPixelToLatLng(
      new google.maps.Point(cx - rect.left, cy - rect.top)
    );
  }, []);

  const openSVAtLatLng = useCallback((location: google.maps.LatLng) => {
    if (!svServiceRef.current || !svPanoRef.current) return;

    setSvLoading(true);
    setSvAvailable(null);

    svServiceRef.current.getPanorama(
      {
        location,
        radius: 180,
        source: google.maps.StreetViewSource.OUTDOOR,
      },
      (data, status) => {
        setSvLoading(false);

        if (status === google.maps.StreetViewStatus.OK && data?.location?.latLng) {
          setSvAvailable(true);

          if (data.location.pano) {
            svPanoRef.current!.setPano(data.location.pano);
          } else {
            svPanoRef.current!.setPosition(data.location.latLng);
          }

          svPanoRef.current!.setPov({
            heading: 0,
            pitch: 0,
          });

          svPanoRef.current!.setVisible(true);
        } else {
          setSvAvailable(false);
          svPanoRef.current!.setVisible(false);
        }
      }
    );
  }, []);

  const openStreetView = useCallback(
    (p: ElectoralPoint) => {
      openSVAtLatLng(new google.maps.LatLng(p.lat, p.lng));
    },
    [openSVAtLatLng]
  );

  const loadExploreItems = useCallback(() => {
    if (!mapRef.current || !placesRef.current) return;

    const center = mapRef.current.getCenter();

    if (!center) return;

    setExploreLoading(true);

    placesRef.current.nearbySearch(
      {
        location: center,
        radius: 3500,
        type: 'tourist_attraction',
      },
      (results, status) => {
        setExploreLoading(false);

        if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
          setExploreItems(FALLBACK_EXPLORE);
          return;
        }

        setExploreItems(
          results
            .filter((r) => r.name)
            .slice(0, 8)
            .map((r, i) => ({
              id: r.place_id || `p${i}`,
              title: r.name!,
              photoUrl: r.photos?.[0]?.getUrl({
                maxWidth: 420,
                maxHeight: 180,
              }),
            }))
        );
      }
    );
  }, []);

  const handlePegmanDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!mapDivRef.current) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = mapDivRef.current.getBoundingClientRect();

    setIsDragging(true);
    setPegPos({
      x: e.clientX - rect.left - 20,
      y: e.clientY - rect.top - 30,
    });
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: PointerEvent) => {
      if (!mapDivRef.current) return;

      const rect = mapDivRef.current.getBoundingClientRect();

      setPegPos({
        x: e.clientX - rect.left - 20,
        y: e.clientY - rect.top - 30,
      });
    };

    const onUp = (e: PointerEvent) => {
      const ll = getLatLngFromPointer(e.clientX, e.clientY);

      setIsDragging(false);
      setPegPos(null);

      if (ll) openSVAtLatLng(ll);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isDragging, getLatLngFromPointer, openSVAtLatLng]);

  const handleMarkerClick = useCallback(
    (point: ElectoralPoint, marker: AdvMarker) => {
      if (selectedPoint && selectedPoint.id !== point.id) {
        const prev = markersRef.current.get(selectedPoint.id);

        if (prev) {
          prev.content = makePinDiv(
            CAT_COLORS[selectedPoint.categoria] || '#6b7280',
            false
          );
        }
      }

      marker.content = makePinDiv(CAT_COLORS[point.categoria] || '#6b7280', true);

      setSelectedPoint(point);

      mapRef.current?.panTo({
        lat: point.lat,
        lng: point.lng,
      });
    },
    [selectedPoint]
  );

  const handleClosePanel = useCallback(() => {
    if (selectedPoint) {
      const m = markersRef.current.get(selectedPoint.id);

      if (m) {
        m.content = makePinDiv(
          CAT_COLORS[selectedPoint.categoria] || '#6b7280',
          false
        );
      }
    }

    setSelectedPoint(null);
    closeSV();
  }, [selectedPoint, closeSV]);

  useEffect(() => {
    async function cargarDatosDesdeBD() {
      try {
        setDataLoading(true);
        setDataError(null);

        const [pointsDesdeBD, municipiosDesdeBD] = await Promise.all([
          cargarElectoralPointsDesdeBD({
            limit: 5000,
          }),
          cargarMunicipiosDesdeBD(),
        ]);

        setPoints(pointsDesdeBD);
        setMunicipios(municipiosDesdeBD);

        if (pointsDesdeBD.length > 0) {
          const first = pointsDesdeBD[0];

          setCoords({
            lat: first.lat,
            lng: first.lng,
          });

          if (mapRef.current) {
            mapRef.current.setCenter({
              lat: first.lat,
              lng: first.lng,
            });
          }
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'No fue posible cargar puntos desde la base de datos.';

        setDataError(message);
        setPoints([]);
        setMunicipios(['todos']);
      } finally {
        setDataLoading(false);
      }
    }

    cargarDatosDesdeBD();
  }, []);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!key) {
      setLoadError('⚠️ Configura NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en .env.local');
      return;
    }

    new Loader({
      apiKey: key,
      version: 'weekly',
      libraries: ['places', 'geometry', 'marker' as any],
      language: 'es',
      region: 'CO',
    })
      .load()
      .then(() => {
        if (!mapDivRef.current) return;

        const map = new google.maps.Map(mapDivRef.current, {
          center: MAP_CENTER_DEFAULT,
          zoom: MAP_ZOOM_DEFAULT,
          mapTypeId: 'roadmap',
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'DEMO_MAP_ID',
          mapTypeControl: false,
          streetViewControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM,
          },
          fullscreenControl: true,
          fullscreenControlOptions: {
            position: google.maps.ControlPosition.RIGHT_TOP,
          },
          scaleControl: true,
        });

        mapRef.current = map;
        svServiceRef.current = new google.maps.StreetViewService();
        placesRef.current = new google.maps.places.PlacesService(map);

        const ov = new google.maps.OverlayView();

        ov.onAdd = () => {};
        ov.draw = () => {};
        ov.onRemove = () => {};
        ov.setMap(map);
        overlayRef.current = ov;

        const pano = map.getStreetView();

        pano.setOptions({
          enableCloseButton: true,
          addressControl: true,
          fullscreenControl: true,
          linksControl: true,
          panControl: true,
          zoomControl: true,
          motionTracking: false,
          motionTrackingControl: false,
        });

        svPanoRef.current = pano;

        pano.addListener('visible_changed', () => {
          setSvLoading(false);
          setSvAvailable(pano.getVisible() ? true : null);
        });

        map.addListener('maptypeid_changed', () => {
          setMapType(map.getMapTypeId() as MapType);
        });

        map.addListener('zoom_changed', () => {
          setZoom(map.getZoom() ?? MAP_ZOOM_DEFAULT);
        });

        map.addListener('center_changed', () => {
          const c = map.getCenter();

          if (c) {
            setCoords({
              lat: c.lat(),
              lng: c.lng(),
            });
          }
        });

        map.addListener('idle', () => {
          if ((map.getZoom() ?? 0) >= 11) {
            loadExploreItems();
          }
        });

        setIsLoaded(true);
        setTimeout(loadExploreItems, 800);
      })
      .catch((err) => {
        setLoadError(`Error al cargar Google Maps: ${err.message}`);
      });

    return () => {
      overlayRef.current?.setMap(null);
      overlayRef.current = null;
    };
  }, [loadExploreItems]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const run = async () => {
      clustererRef.current?.clearMarkers();

      markersRef.current.forEach((m) => {
        m.map = null;
      });

      markersRef.current.clear();

      const newMarkers: AdvMarker[] = [];

      const { AdvancedMarkerElement } = (await google.maps.importLibrary(
        'marker'
      )) as any;

      filteredPoints.forEach((point) => {
        const isSelected = selectedPoint?.id === point.id;
        const color = CAT_COLORS[point.categoria] || '#6b7280';
        const pinEl = makePinDiv(color, isSelected);

        const marker = new AdvancedMarkerElement({
          map: mapRef.current!,
          position: {
            lat: point.lat,
            lng: point.lng,
          },
          content: pinEl,
          title: point.nombre,
        });

        marker.addListener('click', () => handleMarkerClick(point, marker));

        markersRef.current.set(point.id, marker);
        newMarkers.push(marker);
      });

      if (clustering && newMarkers.length > 0) {
        clustererRef.current = new MarkerClusterer({
          map: mapRef.current,
          markers: newMarkers,
        });
      }
    };

    run();
  }, [
    isLoaded,
    filteredPoints,
    clustering,
    selectedPoint?.id,
    handleMarkerClick,
  ]);

  const changeMapType = useCallback((type: MapType) => {
    mapRef.current?.setMapTypeId(type);
    setMapType(type);
  }, []);

  if (loadError) {
    return (
      <div className={styles.errorWrap}>
        <div className={styles.errorBox}>
          <span className={styles.errorIcon}>⚠️</span>
          <h3>Error al cargar el mapa</h3>
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mapContainer}>
      {/* ── Barra de controles ───────────────────────────────── */}
      <div className={styles.mapTopbar}>
        <div className={styles.pointsChip}>
          <span className={dataError ? styles.statusDotRed : styles.statusDotGreen} />
          <strong>{filteredPoints.length}</strong>
          <span>/ {points.length} puntos</span>
        </div>

        {/* Agregar */}
        <button
          className={styles.addBtn}
          type="button"
          disabled
          title="Pendiente implementar API de creación"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Agregar
        </button>

        {/* Filtros */}
        <div className={styles.filterWrapper}>
          <button
            className={`${styles.filterBtn} ${
              hasActiveFilters ? styles.filterBtnActive : ''
            }`}
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filtros
            {hasActiveFilters && <span className={styles.filterDot} />}
          </button>

          {filterOpen && (
            <div className={styles.filterDropdown}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Categoría</label>

                <div className={styles.categoryList}>
                  {(['todos', 'lider', 'voluntario', 'pendiente'] as const).map(
                    (cat) => (
                      <button
                        key={cat}
                        className={`${styles.catChip} ${
                          filters.categoria === cat ? styles.catChipActive : ''
                        }`}
                        onClick={() =>
                          setFilters((f) => ({
                            ...f,
                            categoria: cat,
                          }))
                        }
                      >
                        <span
                          className={styles.catDot}
                          style={{
                            background:
                              cat === 'todos'
                                ? '#6b7280'
                                : MARKER_STYLES[cat].color,
                          }}
                        />
                        {CATEGORY_LABELS[cat]}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Municipio</label>

                <select
                  className={styles.filterSelect}
                  value={filters.municipio}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      municipio: e.target.value,
                    }))
                  }
                >
                  {municipios.map((m) => (
                    <option key={m} value={m}>
                      {m === 'todos' ? 'Todos los municipios' : m}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Estado de contacto</label>

                <select
                  className={styles.filterSelect}
                  value={filters.estadoContacto}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      estadoContacto: e.target.value as any,
                    }))
                  }
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Líder asignado</label>

                <select
                  className={styles.filterSelect}
                  value={filters.lider}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      lider: e.target.value,
                    }))
                  }
                >
                  {lideres.map((l) => (
                    <option key={l} value={l}>
                      {l === 'todos' ? 'Todos los líderes' : l}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterFooter}>
                <button
                  className={styles.clearFilters}
                  onClick={() => {
                    setFilters(DEFAULT_FILTERS);
                    setFilterOpen(false);
                  }}
                >
                  Limpiar filtros
                </button>

                <button
                  className={styles.applyFilters}
                  onClick={() => setFilterOpen(false)}
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.topbarDivider} />

        {/* Clustering */}
        <button
          className={`${styles.clusterToggle} ${
            clustering ? styles.clusterToggleOn : ''
          }`}
          type="button"
          onClick={() => setClustering((v) => !v)}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Agrupar
        </button>

        <div className={styles.topbarDivider} />

        {/* Tipo de mapa */}
        <div className={styles.mapTypeBtns}>
          {(['roadmap', 'satellite', 'hybrid'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`${styles.mapTypeBtn} ${
                mapType === t ? styles.mapTypeBtnActive : ''
              }`}
              onClick={() => changeMapType(t)}
            >
              {MAP_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Área del mapa ───────────────────────────────────── */}
      <div className={styles.mapArea}>
        {(!isLoaded || dataLoading) && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingSpinner} />
            <span>
              {!isLoaded
                ? 'Cargando mapa electoral…'
                : 'Cargando puntos desde Railway…'}
            </span>
          </div>
        )}

        {dataError && (
          <div className={styles.loadingOverlay}>
            <div className={styles.errorBox}>
              <span className={styles.errorIcon}>⚠️</span>
              <h3>Error cargando puntos</h3>
              <p>{dataError}</p>
            </div>
          </div>
        )}

        <div ref={mapDivRef} className={styles.mapDiv} />

        {/* Panel de detalle — overlay flotante */}
        <MarkerInfoPanel
          point={selectedPoint}
          onClose={handleClosePanel}
          onOpenStreetView={openStreetView}
          isLoaded={isLoaded}
        />

        {(svLoading || svAvailable === false) && (
          <StreetViewPanel
            loading={svLoading}
            available={svAvailable}
            point={selectedPoint}
            onClose={closeSV}
          />
        )}

        {/* Bandeja Explorar + Pegman */}
        {!isDragging && (
          <div
            className={`${styles.exploreDock} ${
              exploreOpen ? styles.exploreDockOpen : ''
            }`}
          >
            <div className={styles.exploreDockHeader}>
              <button
                className={styles.explorePegmanButton}
                type="button"
                onPointerDown={handlePegmanDown}
                title="Street View"
                aria-label="Street View"
              >
                <PegmanIcon />
              </button>

              <button
                className={styles.exploreTitleButton}
                type="button"
                onClick={() => setExploreOpen((v) => !v)}
                aria-expanded={exploreOpen}
              >
                Explorar
                <svg
                  className={exploreOpen ? styles.exploreArrowOpen : ''}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M6 15l6-6 6 6"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {exploreOpen && (
              <div className={styles.exploreContent}>
                <button className={styles.layersCard} type="button">
                  <span className={styles.layersPreview} />

                  <span className={styles.layersLabel}>
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polygon points="12 2 22 8.5 12 15 2 8.5 12 2" />
                      <polyline points="2 14 12 20.5 22 14" />
                    </svg>
                    Capas
                  </span>
                </button>

                <div className={styles.exploreCardsScroller}>
                  {exploreLoading && (
                    <div className={styles.exploreLoadingCard}>
                      Cargando lugares…
                    </div>
                  )}

                  {!exploreLoading &&
                    exploreItems.map((item, i) => (
                      <button
                        key={item.id}
                        type="button"
                        className={styles.exploreCard}
                        title={item.title}
                      >
                        {item.photoUrl ? (
                          <img
                            className={styles.exploreCardImage}
                            src={item.photoUrl}
                            alt={item.title}
                          />
                        ) : (
                          <span
                            className={`${styles.exploreCardFallback} ${
                              i % 3 === 0
                                ? styles.exploreFallbackA
                                : i % 3 === 1
                                  ? styles.exploreFallbackB
                                  : styles.exploreFallbackC
                            }`}
                          />
                        )}

                        <span className={styles.exploreCardOverlay}>
                          <span className={styles.exploreCameraIcon}>📷</span>
                          <span className={styles.exploreCardTitle}>
                            {item.title}
                          </span>
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isDragging && pegPos && (
          <button
            className={styles.streetViewFloatingPegman}
            style={{
              left: `${pegPos.x}px`,
              top: `${pegPos.y}px`,
            }}
            type="button"
            aria-label="Street View flotante"
          >
            <PegmanIcon />
          </button>
        )}

        {isDragging && (
          <div className={styles.streetViewDropHint}>
            Suelta sobre una calle para Street View
          </div>
        )}

        {/* Status bar */}
        <div className={styles.statusBar}>
          <div className={dataError ? styles.statusDotRed : styles.statusDotGreen} />

          <span>
            {dataError
              ? 'Error BD'
              : dataLoading
                ? 'Cargando BD'
                : 'BD conectada'}
          </span>

          <span className={styles.statusSep}>·</span>

          <span>
            {coords.lat.toFixed(4)}°N, {Math.abs(coords.lng).toFixed(4)}°W
          </span>

          <span className={styles.statusSep}>·</span>

          <span>Zoom {zoom}</span>

          <span className={styles.statusRight}>
            {filteredPoints.length} de {points.length} puntos
          </span>
        </div>
      </div>
    </div>
  );
}