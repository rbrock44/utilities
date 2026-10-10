import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, TitleStrategy, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { SeoTitleStrategy } from './services/seo';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withXhr()),
    // Opening a tool from far down the home page, or from the related panel, should start at the top.
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    provideClientHydration(withEventReplay()),
    { provide: TitleStrategy, useClass: SeoTitleStrategy }
  ]
};
