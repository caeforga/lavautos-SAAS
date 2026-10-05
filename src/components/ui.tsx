'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { CalendarDays, Check, ChevronDown, LoaderCircle, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import { day } from '@/lib/domain';

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);
  return <dialog ref={ref} className={wide ? 'modal wide' : 'modal'} onCancel={onClose}><header><h2>{title}</h2><button className="d-btn d-btn-ghost icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></header>{children}</dialog>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

export type FieldSpec = { name: string; label: string; type?: string; value?: string | number; options?: { value: string; label: string }[]; required?: boolean; min?: number | string; step?: string };

function SelectInput({ field }: { field: FieldSpec }) {
  const options = field.options ?? [];
  const initial = String(field.value ?? options[0]?.value ?? '');
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find(option => option.value === value) ?? options[0];
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (['ArrowDown', 'Enter', ' '].includes(event.key)) { event.preventDefault(); setOpen(true); }
    if (event.key === 'Escape') setOpen(false);
  }
  return <div className="select-control" ref={ref}><input type="hidden" name={field.name} value={value} /><button type="button" className="d-btn select-trigger" aria-label={field.label} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(current => !current)} onKeyDown={handleKeyDown}><span>{selected?.label ?? 'Selecciona una opción'}</span><ChevronDown size={17} aria-hidden="true" /></button>{open && <div className="select-menu" id={listId} role="listbox" aria-label={field.label}>{options.map(option => <button type="button" role="option" aria-selected={option.value === value} className={option.value === value ? 'selected' : ''} key={option.value} onClick={() => { setValue(option.value); setOpen(false); }}><span>{option.label}</span>{option.value === value && <Check size={16} aria-hidden="true" />}</button>)}</div>}</div>;
}

function parseDate(value?: string): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, date] = value.split('-').map(Number);
  const result = new Date(year, month - 1, date, 12);
  return result.getFullYear() === year && result.getMonth() === month - 1 && result.getDate() === date ? result : undefined;
}

function dateValue(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function DatePicker({ label, value, onChange, name, min, required = true }: { label: string; value: string; onChange: (value: string) => void; name?: string; min?: string; required?: boolean }) {
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = parseDate(value);
  const minimum = parseDate(min);
  const today = day(new Date());
  const display = selected ? new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(selected) : 'Selecciona una fecha';

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!controlRef.current?.contains(event.target as Node)) setOpen(false); };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [open]);

  function toggle() {
    if (!open && controlRef.current) {
      const bounds = controlRef.current.getBoundingClientRect();
      const below = window.innerHeight - bounds.bottom;
      setAbove(below < 345 && bounds.top > below);
    }
    setOpen(current => !current);
  }

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return <div className="date-control" ref={controlRef}>
    {name && <input type="hidden" name={name} value={value} />}
    <button ref={triggerRef} type="button" className="d-input date-trigger" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={toggle}><span className={selected ? '' : 'date-placeholder'}>{display}</span><CalendarDays size={17} aria-hidden="true" /></button>
    {open && <div className={`date-popover${above ? ' above' : ''}`}>
      <DayPicker className="d-react-day-picker" mode="single" required selected={selected} onSelect={picked => choose(dateValue(picked))} disabled={minimum ? { before: minimum } : undefined} defaultMonth={selected ?? minimum ?? parseDate(today)} locale={es} lang="es-CO" weekStartsOn={1} role="dialog" aria-label={`Calendario de ${label}`} autoFocus />
      <div className="date-actions">
        {!required && <button type="button" onClick={() => choose('')}>Borrar</button>}
        <button type="button" disabled={!!min && today < min} onClick={() => choose(today)}>Hoy</button>
      </div>
    </div>}
  </div>;
}

function DateInput({ field }: { field: FieldSpec }) {
  const [value, setValue] = useState(String(field.value ?? ''));
  return <DatePicker label={field.label} name={field.name} value={value} onChange={setValue} min={typeof field.min === 'string' ? field.min : undefined} required={field.required !== false} />;
}

export function RecordForm({ fields, onSubmit, submit = 'Guardar' }: { fields: FieldSpec[]; onSubmit: (data: Record<string, string>) => Promise<void>; submit?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requestId] = useState(() => crypto.randomUUID());
  return <form className="record-form" onSubmit={async event => {
    event.preventDefault();
    const data = { ...Object.fromEntries(new FormData(event.currentTarget)), _request_id: requestId } as Record<string, string>;
    const missingDate = fields.find(field => field.type === 'date' && field.required !== false && !data[field.name]);
    if (missingDate) { setError(`${missingDate.label} es obligatorio.`); return; }
    setBusy(true);
    setError('');
    try { await onSubmit(data); } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo guardar'); } finally { setBusy(false); }
  }}>
    {fields.map(field => field.options
      ? <div className="field" key={field.name}><span>{field.label}</span><SelectInput field={field} /></div>
      : field.type === 'date'
        ? <div className="field" key={field.name}><span>{field.label}</span><DateInput field={field} /></div>
        : <Field key={field.name} label={field.label}>{field.type === 'textarea'
          ? <textarea className="d-textarea" name={field.name} defaultValue={field.value} required={field.required !== false} />
          : <input className="d-input" name={field.name} type={field.type ?? 'text'} defaultValue={field.value} required={field.required !== false} min={field.min} step={field.step ?? (field.type === 'number' ? '0.01' : undefined)} />}</Field>)}
    {error && <p className="error" role="alert">{error}</p>}
    <button className="d-btn d-btn-primary primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : null}{submit}</button>
  </form>;
}

export function Empty({ title, detail }: { title: string; detail: string }) { return <div className="empty"><span>✧</span><h3>{title}</h3><p>{detail}</p></div>; }
