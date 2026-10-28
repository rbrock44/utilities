import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
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
        gold: response.gold,
        silver: response.silver,
        platinum: response.platinum ?? -1,
        palladium: response.palladium ?? -1,
        // The API sends `timeStamp`, the time it scraped the prices.
        timestamp: new Date(response.timeStamp || Date.now())
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
