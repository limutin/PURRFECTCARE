import React from 'react';
import { Dog, Cat, Rabbit, Bird, Fish, Turtle, PawPrint } from 'lucide-react';

const SPECIES: Record<string, { icon: any; bg: string; fg: string }> = {
  dog: { icon: Dog, bg: '#fef3c7', fg: '#b45309' },
  cat: { icon: Cat, bg: '#e0f2fe', fg: '#0369a1' },
  rabbit: { icon: Rabbit, bg: '#fce7f3', fg: '#be185d' },
  bird: { icon: Bird, bg: '#dcfce7', fg: '#15803d' },
  fish: { icon: Fish, bg: '#e0e7ff', fg: '#4338ca' },
  turtle: { icon: Turtle, bg: '#ecfccb', fg: '#4d7c0f' },
};

export function speciesStyle(type?: string) {
  return SPECIES[(type || '').toLowerCase().trim()] || { icon: PawPrint, bg: '#ccfbf1', fg: '#0f766e' };
}

interface PetAvatarProps {
  type?: string;
  photoUrl?: string | null;
  name?: string;
  size?: number;
  className?: string;
}

/** Round pet avatar: the pet's photo if there is one, otherwise a species icon. */
export function PetAvatar({ type, photoUrl, name, size = 40, className = '' }: PetAvatarProps) {
  const s = speciesStyle(type);
  const Icon = s.icon;
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name ? `${name}` : 'Pet photo'}
        className={`rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 ring-2 ring-white shadow-sm ${className}`}
      style={{ width: size, height: size, background: s.bg, color: s.fg }}
      aria-label={type || 'Pet'}
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2} />
    </div>
  );
}
