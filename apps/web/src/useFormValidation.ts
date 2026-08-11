import { useState, useCallback } from 'react';

export type ValidationRules<T> = {
  [K in keyof T]?: ((value: T[K], form: T) => string | null)[];
};

export function useFormValidation<T extends Record<string, any>>(rules: ValidationRules<T>) {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const validate = useCallback((form: T): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let valid = true;
    for (const key of Object.keys(rules) as (keyof T)[]) {
      const fieldRules = rules[key];
      if (!fieldRules) continue;
      for (const rule of fieldRules) {
        const err = rule(form[key], form);
        if (err) {
          newErrors[key] = err;
          valid = false;
          break; // stop at first error per field
        }
      }
    }
    setErrors(newErrors);
    return valid;
  }, [rules]);

  const clearErrors = useCallback(() => setErrors({}), []);

  const setFieldError = useCallback((field: keyof T, msg: string | null) => {
    setErrors(prev => {
      const next = { ...prev };
      if (msg) next[field] = msg;
      else delete next[field];
      return next;
    });
  }, []);

  return { errors, validate, clearErrors, setFieldError };
}

// ---- Reusable rule factories ----

export const required = (label: string) =>
  (v: any) => (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) ? `${label} is required` : null;

export const minLength = (label: string, min: number) =>
  (v: any) => typeof v === 'string' && v.trim().length < min ? `${label} must be at least ${min} characters` : null;

export const maxLength = (label: string, max: number) =>
  (v: any) => typeof v === 'string' && v.trim().length > max ? `${label} must be at most ${max} characters` : null;

export const email = (label: string) =>
  (v: any) => {
    if (!v || v === '') return null; // use required() for mandatory
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : `${label} is not a valid email`;
  };

export const phone = (label: string) =>
  (v: any) => {
    if (!v || v === '') return null;
    return /^[+\d\s()-]{6,20}$/.test(v) ? null : `${label} is not a valid phone number`;
  };

export const min = (label: string, minVal: number) =>
  (v: any) => {
    const n = Number(v);
    return !isNaN(n) && n >= minVal ? null : `${label} must be at least ${minVal}`;
  };

export const max = (label: string, maxVal: number) =>
  (v: any) => {
    const n = Number(v);
    return !isNaN(n) && n <= maxVal ? null : `${label} must be at most ${maxVal}`;
  };

export const nonNegative = (label: string) =>
  (v: any) => {
    if (v === '' || v === undefined || v === null) return null;
    const n = Number(v);
    return !isNaN(n) && n >= 0 ? null : `${label} cannot be negative`;
  };

export const positive = (label: string) =>
  (v: any) => {
    if (v === '' || v === undefined || v === null) return null;
    const n = Number(v);
    return !isNaN(n) && n > 0 ? null : `${label} must be greater than 0`;
  };

export const atLeastOneItem = (label: string, itemsField?: string) =>
  (_v: any, form: any) => {
    const items = itemsField ? form[itemsField] : _v;
    return Array.isArray(items) && items.some((i: any) => i.product || i.account) ? null : `Add at least one ${label}`;
  };
