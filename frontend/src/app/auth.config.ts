import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { lastValueFrom, tap, catchError, throwError } from 'rxjs';

export function initializeAuthConfig(
  httpClient: HttpClient,
  oauthService: OAuthService
): () => Promise<void> {
  return () =>
    lastValueFrom(
      httpClient.get<AuthConfig>('/assets/config/auth-config.json').pipe(
        tap((config) => {
          if (config.redirectUri && !config.redirectUri.startsWith('http')) {
            config.redirectUri = window.location.origin + config.redirectUri;
          }
          oauthService.configure(config);
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Failed to load auth config', error);
          const div = document.createElement('div');
          div.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #1a1a1a;
            color: #ff4444;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            flex-direction: column;
            font-family: sans-serif;
            text-align: center;
          `;
          div.innerHTML = `
            <h1 style="margin-bottom: 20px;">Configuration Error</h1>
            <p style="font-size: 1.2rem; margin-bottom: 30px; color: #ccc;">Failed to load authentication configuration.</p>
            <p style="font-size: 0.9rem; color: #888; margin-bottom: 30px;">${error.message || 'Unknown error'}</p>
            <button onclick="window.location.reload()" style="
              padding: 10px 20px;
              font-size: 1rem;
              cursor: pointer;
              background: #fff;
              color: #000;
              border: none;
              border-radius: 4px;
            ">Retry</button>
          `;
          document.body.appendChild(div);
          // Return non-completing observable or throw to stop app init
          return throwError(() => error);
        })
      )
    ).then(() => {
      // Optional: Load discovery document here if you want it done during initialization
      // return oauthService.loadDiscoveryDocumentAndLogin();
    });
}
