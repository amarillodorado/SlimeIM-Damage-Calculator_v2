import type { InputKey } from '../../domain/types';

export function focusRequiredInput(key: InputKey) {
  const field = document.querySelector<HTMLElement>(`[data-input-key="${key}"]`);
  if (!field) return;
  field.closest('section')?.querySelector<HTMLButtonElement>('header button[aria-expanded="false"]')?.click();
  requestAnimationFrame(() => {
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const control =
      field.querySelector<HTMLElement>('input:checked') ??
      field.querySelector<HTMLElement>('input:not([type=hidden]),select') ??
      field.querySelector<HTMLElement>('button');
    control?.focus({ preventScroll: true });
  });
}
