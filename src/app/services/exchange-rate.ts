import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CURRENCY_LABELS } from '../constants/units/currency-labels';

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ExchangeRateService {
  private apiUrl = 'https://api.frankfurter.dev/v1/latest?base=USD';

  constructor(private http: HttpClient) {}

  getRates(): Observable<ExchangeRates> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => ({
        base: response.base,
        rates: { [response.base]: 1, ...response.rates },
        timestamp: new Date(response.date || Date.now())
      })),
      catchError(error => {
        console.error('Error fetching exchange rates:', error);
        return of({
          base: 'USD',
          rates: {},
          timestamp: new Date()
        });
      })
    );
  }

  toUnitDefinitions(rates: ExchangeRates): UnitDefinition[] {
    return Object.keys(rates.rates)
      .map(code => {
        const rate = rates.rates[code];
        const name = CURRENCY_LABELS[code];
        return {
          id: code,
          label: name ? `${code} - ${name}` : code,
          aliases: name ? [code, name] : [code],
          toBase: (value: number) => value / rate,
          fromBase: (value: number) => value * rate
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  }
}
