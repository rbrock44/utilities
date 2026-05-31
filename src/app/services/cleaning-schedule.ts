import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CleaningScheduleService {
  private apiUrl = 'https://home-page-api.ryan-brock.com/cleaning-schedule';

  constructor(private http: HttpClient) {}

  getMeetings(): Observable<Meeting[]> {
    return this.http.get<unknown>(this.apiUrl).pipe(
      map((response) => this.normalizeMeetings(response)),
      catchError((error) => {
        console.error('Error fetching cleaning schedule:', error);
        return of(this.getFallbackMeetings());
      })
    );
  }

  private getFallbackMeetings(): Meeting[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const previousYear = currentYear - 1;

    return [
      {
        id: 9001,
        date: `${currentYear}-01-15`,
        startTime: '09:00',
        endTime: '11:00',
        title: 'Bo',
        person: 'Ryan',
        hasBeenPaid: true
      },
      {
        id: 9002,
        date: `${currentYear}-01-20`,
        startTime: '13:00',
        endTime: '15:30',
        title: 'Deep Clean',
        person: 'Ryan',
        hasBeenPaid: false
      },
      {
        id: 9003,
        date: `${currentYear}-03-05`,
        startTime: '10:00',
        endTime: '12:00',
        title: 'Bo',
        person: 'Taylor',
        hasBeenPaid: true
      },
      {
        id: 9004,
        date: `${currentYear}-03-18`,
        startTime: '08:30',
        endTime: '10:30',
        title: 'Move Out',
        person: 'Taylor',
        hasBeenPaid: false
      },
      {
        id: 9005,
        date: `${currentYear}-05-02`,
        startTime: '14:00',
        endTime: '16:00',
        title: 'Bo',
        person: 'Morgan',
        hasBeenPaid: false
      },
      {
        id: 9006,
        date: `${currentYear}-08-14`,
        startTime: '09:30',
        endTime: '12:30',
        title: 'Deep Clean',
        person: 'Morgan',
        hasBeenPaid: true
      },
      {
        id: 9007,
        date: `${previousYear}-06-09`,
        startTime: '11:00',
        endTime: '13:30',
        title: 'Bo',
        person: 'Ryan',
        hasBeenPaid: true
      },
      {
        id: 9008,
        date: `${previousYear}-10-22`,
        startTime: '15:00',
        endTime: '17:00',
        title: 'Move Out',
        person: 'Taylor',
        hasBeenPaid: false
      }
    ];
  }

  private normalizeMeetings(response: unknown): Meeting[] {
    if (Array.isArray(response)) {
      return response
        .map((item) => this.toMeeting(item))
        .filter((meeting): meeting is Meeting => meeting !== null);
    }

    if (this.isRecord(response)) {
      const possibleData = response['data'];
      if (Array.isArray(possibleData)) {
        return possibleData
          .map((item) => this.toMeeting(item))
          .filter((meeting): meeting is Meeting => meeting !== null);
      }
    }

    return [];
  }

  private toMeeting(input: unknown): Meeting | null {
    if (!this.isRecord(input)) {
      return null;
    }

    const date = this.toStringOrNull(input['date']);
    const startTime = this.toStringOrNull(input['startTime']);
    const endTime = this.toStringOrNull(input['endTime']);
    const title = this.toStringOrNull(input['title']);
    const person = this.toStringOrNull(input['person']);

    if (!date || !startTime || !endTime || !title || !person) {
      return null;
    }

    const idValue = input['id'];
    const parsedId = typeof idValue === 'number' ? idValue : undefined;

    const hasBeenPaidValue = input['hasBeenPaid'];
    const parsedHasBeenPaid = typeof hasBeenPaidValue === 'boolean' ? hasBeenPaidValue : undefined;

    return {
      id: parsedId,
      date,
      startTime,
      endTime,
      title,
      person,
      hasBeenPaid: parsedHasBeenPaid
    };
  }

  private toStringOrNull(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
