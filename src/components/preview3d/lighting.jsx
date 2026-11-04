import React from 'react';
import { Sun, Sunset, Moon } from 'lucide-react';

/** Day, evening and night lighting shared by the room and flat 3D views. */
export const LIGHT_OPTIONS = [
  { value: 'day', label: 'Day', icon: <Sun size={15} />, ariaLabel: 'Day lighting' },
  { value: 'evening', label: 'Evening', icon: <Sunset size={15} />, ariaLabel: 'Evening lighting' },
  { value: 'night', label: 'Night', icon: <Moon size={15} />, ariaLabel: 'Night lighting' },
];

export const LIGHTING = {
  day: {
    background: null,
    ambient: [1.15, '#FAF7F0'],
    hemi: 0.7,
    sun: [1.25, '#FFF8EE'],
    fill: [0.85, 0.65],
    lamp: 0,
  },
  evening: {
    background: '#E7D2BE',
    ambient: [0.4, '#F0BE92'],
    hemi: 0.25,
    sun: [0.7, '#FF9A55'],
    fill: [0.22, 0.14],
    lamp: 1.1,
  },
  night: {
    background: '#1B2233',
    ambient: [0.16, '#8CA0C8'],
    hemi: 0.1,
    sun: [0.3, '#9DB4E0'],
    fill: [0.08, 0.06],
    lamp: 2.2,
  },
};
