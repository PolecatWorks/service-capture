import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'shell';

  constructor(private oauthService: OAuthService) {
    this.oauthService.loadDiscoveryDocumentAndLogin();

    //this.oauthService.setupAutomaticSilentRefresh();

    // Automatically load user profile
    this.oauthService.events.pipe(filter(e => e.type === 'token_received')).subscribe(_ => this.oauthService.loadUserProfile());
  }
}
