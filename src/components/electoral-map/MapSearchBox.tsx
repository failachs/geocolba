'use client';

import { useEffect, useRef } from 'react';
import styles from './MapSearchBox.module.css';

interface Props {
  isLoaded: boolean;
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
}

export default function MapSearchBox({ isLoaded, onPlaceSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef    = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    acRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'co' },  // Solo Colombia
      fields: ['geometry', 'name', 'formatted_address', 'place_id'],
      types: ['geocode', 'establishment'],
    });

    acRef.current.addListener('place_changed', () => {
      const place = acRef.current!.getPlace();
      if (place.geometry) {
        onPlaceSelect(place);
        if (inputRef.current) inputRef.current.value = place.name ?? place.formatted_address ?? '';
      }
    });

    return () => {
      if (acRef.current) {
        google.maps.event.clearInstanceListeners(acRef.current);
      }
    };
  }, [isLoaded, onPlaceSelect]);

  return (
    <div className={styles.wrap}>
      <svg className={styles.icon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        placeholder="Buscar dirección, barrio o municipio…"
        disabled={!isLoaded}
      />
      <kbd className={styles.kbd}>⌘K</kbd>
    </div>
  );
}
