import { createContext, useContext } from 'react';

export const FieldAccessibility = createContext<{ required?: boolean; invalid?: boolean; describedBy?: string }>({});
export const useFieldAccessibility = () => {
  const field = useContext(FieldAccessibility);
  return { 'aria-required': field.required || undefined, 'aria-invalid': field.invalid || undefined, 'aria-describedby': field.describedBy };
};
