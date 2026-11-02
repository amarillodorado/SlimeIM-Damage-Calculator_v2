/** CLR System.Decimal: signed 96-bit coefficient, scale 0..28, ties to even. */
export type DecimalInput = ClrDecimal | string | number | bigint;
const MAX_COEFFICIENT = (1n << 96n) - 1n;
const POWERS: bigint[] = [1n];
function pow10(n: number): bigint {
  if (!Number.isInteger(n) || n < 0 || n > 2000) throw new RangeError('Invalid decimal scale');
  while (POWERS.length <= n) POWERS.push(POWERS[POWERS.length - 1]! * 10n);
  return POWERS[n]!;
}
export function roundEven(n: bigint, d: bigint): bigint {
  if (d === 0n) throw new RangeError('Division by zero');
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const negative = n < 0n,
    absolute = negative ? -n : n;
  let q = absolute / d;
  const r = absolute % d;
  if (r * 2n > d || (r * 2n === d && q % 2n !== 0n)) q += 1n;
  return negative ? -q : q;
}
export class ClrDecimal {
  coefficient: bigint;
  scale: number;
  constructor(value: DecimalInput = '0') {
    if (value instanceof ClrDecimal) {
      this.coefficient = value.coefficient;
      this.scale = value.scale;
      return;
    }
    if (typeof value === 'number' && !Number.isFinite(value)) throw new TypeError('Enter a finite number');
    const source = String(value).trim();
    if (source.length > 1000) throw new RangeError('Decimal input is too long');
    const match = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i.exec(source);
    if (!match) throw new TypeError(`Invalid decimal: ${source}`);
    const fraction = match[3] ?? match[4] ?? '',
      exponent = Number(match[5] ?? 0);
    if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1000) throw new RangeError('Decimal exponent out of range');
    let coefficient = BigInt((match[2] ?? '0') + fraction) * (match[1] === '-' ? -1n : 1n);
    let scale = fraction.length - exponent;
    if (scale < 0) {
      coefficient *= pow10(-scale);
      scale = 0;
    }
    [this.coefficient, this.scale] = ClrDecimal.fit(coefficient, scale);
  }
  static fit(coefficient: bigint, scale: number): [bigint, number] {
    let drop = Math.max(0, scale - 28);
    for (;;) {
      const rounded = roundEven(coefficient, pow10(drop));
      if (rounded >= -MAX_COEFFICIENT && rounded <= MAX_COEFFICIENT) return [rounded, scale - drop];
      if (scale - drop <= 0) throw new RangeError('System.Decimal coefficient overflow');
      drop++;
    }
  }
  static make(coefficient: bigint, scale: number): ClrDecimal {
    const result = Object.create(ClrDecimal.prototype) as ClrDecimal;
    [result.coefficient, result.scale] = ClrDecimal.fit(coefficient, scale);
    return result;
  }
  static fromRatio(numerator: bigint, denominator: bigint): ClrDecimal {
    if (denominator === 0n) throw new RangeError('Division by zero');
    for (let scale = 28; scale >= 0; scale--) {
      const coefficient = roundEven(numerator * pow10(scale), denominator);
      if (coefficient >= -MAX_COEFFICIENT && coefficient <= MAX_COEFFICIENT) return ClrDecimal.make(coefficient, scale);
    }
    throw new RangeError('System.Decimal division overflow');
  }
  add(other: DecimalInput): ClrDecimal {
    const v = decimal(other),
      scale = Math.max(this.scale, v.scale);
    return ClrDecimal.make(this.coefficient * pow10(scale - this.scale) + v.coefficient * pow10(scale - v.scale), scale);
  }
  neg(): ClrDecimal {
    return ClrDecimal.make(-this.coefficient, this.scale);
  }
  sub(other: DecimalInput): ClrDecimal {
    return this.add(decimal(other).neg());
  }
  mul(other: DecimalInput): ClrDecimal {
    const v = decimal(other);
    return ClrDecimal.make(this.coefficient * v.coefficient, this.scale + v.scale);
  }
  div(other: DecimalInput): ClrDecimal {
    const v = decimal(other);
    return ClrDecimal.fromRatio(this.coefficient * pow10(v.scale), v.coefficient * pow10(this.scale));
  }
  compare(other: DecimalInput): number {
    const v = decimal(other),
      scale = Math.max(this.scale, v.scale);
    const a = this.coefficient * pow10(scale - this.scale),
      b = v.coefficient * pow10(scale - v.scale);
    return a < b ? -1 : a > b ? 1 : 0;
  }
  trunc(): bigint {
    return this.coefficient / pow10(this.scale);
  }
  ceil(): ClrDecimal {
    const divisor = pow10(this.scale),
      integer = this.coefficient / divisor;
    return new ClrDecimal(integer + (this.coefficient > 0n && this.coefficient % divisor !== 0n ? 1n : 0n));
  }
  toString(): string {
    const negative = this.coefficient < 0n;
    let text = String(negative ? -this.coefficient : this.coefficient);
    if (this.scale) {
      text = text.padStart(this.scale + 1, '0');
      text = `${text.slice(0, -this.scale)}.${text.slice(-this.scale)}`.replace(/0+$/, '').replace(/\.$/, '');
    }
    return (negative ? '-' : '') + text;
  }
  toNumber(): number {
    return Number(this.toString());
  }
}
export const decimal = (value: DecimalInput): ClrDecimal => (value instanceof ClrDecimal ? value : new ClrDecimal(value));
export const ZERO = decimal(0),
  ONE = decimal(1);
export const maxDecimal = (a: DecimalInput, b: DecimalInput): ClrDecimal => (decimal(a).compare(b) >= 0 ? decimal(a) : decimal(b));
export const minDecimal = (a: DecimalInput, b: DecimalInput): ClrDecimal => (decimal(a).compare(b) <= 0 ? decimal(a) : decimal(b));
export const plusDecimal = (percent: DecimalInput): ClrDecimal => maxDecimal(0, ONE.add(decimal(percent).div(100)));
export const minusDecimal = (percent: DecimalInput): ClrDecimal => maxDecimal(0, ONE.sub(decimal(percent).div(100)));
export function normalPierceAddition(attack: DecimalInput): ClrDecimal {
  // This one native term intentionally uses binary64 before CLR's ~15-digit cast.
  const floating = Number(decimal(attack).trunc()) * 0.06;
  if (!Number.isFinite(floating)) throw new RangeError('Pierce ATK is out of range');
  return decimal(floating.toPrecision(15));
}
