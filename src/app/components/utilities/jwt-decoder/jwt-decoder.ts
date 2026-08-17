import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface TimeClaim {
  key: string;
  label: string;
  absolute: string;
  relative: string;
}

type ExpiryState = 'valid' | 'expired' | 'not-yet-valid' | 'no-expiry';

const CLAIM_LABELS: Record<string, string> = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expires',
  nbf: 'Not before',
  iat: 'Issued at',
  jti: 'JWT ID',
};

@Component({
  selector: 'app-jwt-decoder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './jwt-decoder.html',
  styleUrl: './jwt-decoder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JwtDecoderComponent implements OnDestroy {
  token = '';
  header: Record<string, unknown> | null = null;
  payload: Record<string, unknown> | null = null;
  signature = '';
  headerJson = '';
  payloadJson = '';
  errorMessage: string | null = null;
  copiedKey: string | null = null;

  private decodeTimeout: ReturnType<typeof setTimeout> | null = null;
  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnDestroy(): void {
    if (this.decodeTimeout) {
      clearTimeout(this.decodeTimeout);
    }
    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
  }

  get hasToken(): boolean {
    return this.token.trim() !== '';
  }

  get decoded(): boolean {
    return this.header !== null && this.payload !== null;
  }

  get algorithm(): string {
    const alg = this.header?.['alg'];
    return typeof alg === 'string' ? alg : 'unknown';
  }

  get tokenType(): string | null {
    const typ = this.header?.['typ'];
    return typeof typ === 'string' ? typ : null;
  }

  get algorithmIsNone(): boolean {
    return this.algorithm.toLowerCase() === 'none';
  }

  onTokenChange(): void {
    if (this.decodeTimeout) {
      clearTimeout(this.decodeTimeout);
    }
    this.decodeTimeout = setTimeout(() => this.decode(), 200);
  }

  decode(): void {
    this.errorMessage = null;
    this.header = null;
    this.payload = null;
    this.headerJson = '';
    this.payloadJson = '';
    this.signature = '';

    const token = this.token.trim();
    if (token === '') {
      this.cdr.markForCheck();
      return;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      this.errorMessage = `A JWT has three dot-separated parts. This one has ${parts.length}.`;
      this.cdr.markForCheck();
      return;
    }

    const header = this.decodeSegment(parts[0], 'header');
    if (typeof header === 'string') {
      this.errorMessage = header;
      this.cdr.markForCheck();
      return;
    }

    const payload = this.decodeSegment(parts[1], 'payload');
    if (typeof payload === 'string') {
      this.errorMessage = payload;
      this.cdr.markForCheck();
      return;
    }

    this.header = header;
    this.payload = payload;
    this.headerJson = JSON.stringify(header, null, 2);
    this.payloadJson = JSON.stringify(payload, null, 2);
    this.signature = parts[2];
    this.cdr.markForCheck();
  }

  clear(): void {
    this.token = '';
    this.decode();
  }

  get expiryState(): ExpiryState {
    const exp = this.numericClaim('exp');
    const nbf = this.numericClaim('nbf');
    const now = Date.now() / 1000;

    if (nbf !== null && now < nbf) {
      return 'not-yet-valid';
    }
    if (exp === null) {
      return 'no-expiry';
    }
    return now > exp ? 'expired' : 'valid';
  }

  get expiryLabel(): string {
    const exp = this.numericClaim('exp');
    const nbf = this.numericClaim('nbf');

    switch (this.expiryState) {
      case 'expired':
        return `Expired ${this.relative(exp!)}`;
      case 'not-yet-valid':
        return `Not valid until ${this.relative(nbf!)}`;
      case 'no-expiry':
        return 'No expiry claim';
      default:
        return `Expires ${this.relative(exp!)}`;
    }
  }

  get timeClaims(): TimeClaim[] {
    const claims: TimeClaim[] = [];

    for (const key of ['iat', 'nbf', 'exp']) {
      const seconds = this.numericClaim(key);
      if (seconds === null) {
        continue;
      }

      claims.push({
        key,
        label: CLAIM_LABELS[key] ?? key,
        absolute: new Date(seconds * 1000).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'medium',
        }),
        relative: this.relative(seconds),
      });
    }

    return claims;
  }

  get otherClaims(): { key: string; label: string; value: string }[] {
    if (this.payload === null) {
      return [];
    }

    return Object.keys(this.payload)
      .filter((key) => !['iat', 'nbf', 'exp'].includes(key))
      .map((key) => ({
        key,
        label: CLAIM_LABELS[key] ?? key,
        value: this.stringify(this.payload![key]),
      }));
  }

  async copy(key: string, value: string): Promise<void> {
    if (value === '') {
      return;
    }

    await navigator.clipboard.writeText(value);

    this.copiedKey = key;
    this.cdr.markForCheck();

    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
    this.copiedTimeout = setTimeout(() => {
      this.copiedKey = null;
      this.cdr.markForCheck();
    }, 2000);
  }

  private numericClaim(key: string): number | null {
    const value = this.payload?.[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private stringify(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }

  /**
   * Picks the largest unit that still yields a whole number, so a token is
   * "in 2 hours" rather than "in 7200 seconds".
   */
  private relative(seconds: number): string {
    const deltaSeconds = seconds - Date.now() / 1000;
    const units: { unit: Intl.RelativeTimeFormatUnit; size: number }[] = [
      { unit: 'year', size: 31536000 },
      { unit: 'day', size: 86400 },
      { unit: 'hour', size: 3600 },
      { unit: 'minute', size: 60 },
      { unit: 'second', size: 1 },
    ];

    for (const { unit, size } of units) {
      if (Math.abs(deltaSeconds) >= size || unit === 'second') {
        return this.relativeFormat.format(Math.round(deltaSeconds / size), unit);
      }
    }

    return '';
  }

  private decodeSegment(segment: string, name: string): Record<string, unknown> | string {
    let json: string;

    try {
      json = this.base64UrlDecode(segment);
    } catch {
      return `The ${name} is not valid base64url.`;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      return `The ${name} decoded, but it is not valid JSON.`;
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return `The ${name} is not a JSON object.`;
    }

    return parsed as Record<string, unknown>;
  }

  private base64UrlDecode(segment: string): string {
    let normalized = segment.replace(/-/g, '+').replace(/_/g, '/');

    if (normalized === '' || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
      throw new Error('invalid base64url');
    }

    const remainder = normalized.length % 4;
    if (remainder === 1) {
      throw new Error('invalid base64url length');
    }
    if (remainder > 0) {
      normalized += '='.repeat(4 - remainder);
    }

    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes as BufferSource);
  }
}
