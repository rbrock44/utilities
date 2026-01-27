import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SpotPrices } from '../objects/spot-prices';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SpotPriceService {
  private apiUrl = 'https://home-page-api.ryan-brock.com/spot-price';

  constructor(private http: HttpClient) {}

  getSpotPrices(): Observable<SpotPrices> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => ({
        gold: response.gold || response.goldPrice,
        silver: response.silver || response.silverPrice,
        timestamp: new Date(response.timestamp || Date.now())
      })),
      catchError(error => {
        console.error('Error fetching spot prices:', error);
        return of({
          gold: -1.00,
          silver: -1.00,
          timestamp: new Date()
        });
      })
    );
  }
}
