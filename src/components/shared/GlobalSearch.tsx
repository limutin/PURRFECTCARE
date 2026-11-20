import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../../utils/api';
import { PetAvatar } from './PetAvatar';

interface GlobalSearchProps {
  accessToken: string;
  onOpenPatient: (petId: string) => void;
}

/** Header search across pets, owners, phone numbers and pet IDs. */
export function GlobalSearch({ accessToken, onOpenPatient }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pets, setPets] = useState<any[] | null>(null);
  const [owners, setOwners] = useState<any[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (pets) return;
    try {
      const [p, o] = await Promise.all([api('/pets', accessToken), api('/owners', accessToken)]);
      setPets(p.pets || []);
      setOwners(o.owners || []);
    } catch {
      setPets([]);
    }
  };

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        boxRef.current?.querySelector('input')?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !pets) return [];
    const digits = q.replace(/\D/g, '');
    return pets
      .map(p => {
        const owner = owners.find(o => o.value.id === p.value.owner_id || o.key === p.value.owner_id);
        const hay = [p.value.name, p.value.pet_uid, p.value.breed, owner?.value.name].filter(Boolean).join(' ').toLowerCase();
        const phone = String(owner?.value.contact || '').replace(/\D/g, '');
        const match = hay.includes(q) || (digits.length >= 3 && phone.includes(digits));
        return match ? { pet: p, owner } : null;
      })
      .filter(Boolean)
      .slice(0, 8) as { pet: any; owner: any }[];
  }, [query, pets, owners]);

  const choose = (r: { pet: any }) => {
    onOpenPatient(r.pet.value.id || r.pet.key);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="vc-header-search" ref={boxRef}>
      <Search />
      <input
        value={query}
        placeholder="Search patient, owner or phone…  (Ctrl+K)"
        aria-label="Search patients"
        onFocus={() => { load(); setOpen(true); }}
        onChange={e => { setQuery(e.target.value); setActive(0); setOpen(true); }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
          if (e.key === 'Enter' && results[active]) choose(results[active]);
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && query.trim() && (
        <div className="vc-header-search-results" role="listbox">
          {pets === null ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">Loading…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">No patients match “{query}”.</div>
          ) : results.map((r, i) => (
            <button
              key={r.pet.key}
              type="button"
              role="option"
              data-active={i === active}
              aria-selected={i === active}
              className="vc-header-search-item"
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(r)}
            >
              <PetAvatar type={r.pet.value.type} photoUrl={r.pet.value.photo_url} name={r.pet.value.name} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground truncate">{r.pet.value.name}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{r.pet.value.type}{r.pet.value.breed ? ` · ${r.pet.value.breed}` : ''}</span>
                </span>
                <span className="block text-xs text-muted-foreground truncate">
                  {r.owner?.value.name || 'Unknown owner'}{r.owner?.value.contact ? ` · ${r.owner.value.contact}` : ''}
                </span>
              </span>
              {r.pet.value.pet_uid && <span className="text-[10px] font-mono text-muted-foreground">{r.pet.value.pet_uid}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
