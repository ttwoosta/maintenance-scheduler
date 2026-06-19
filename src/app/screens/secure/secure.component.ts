import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-secure',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="padding: 2rem">
      <h2>Protected Page</h2>
      <p>You can see this because you are signed in as <strong>{{ auth.user()?.email }}</strong>.</p>
      <button (click)="signOut()">Sign out</button>
    </div>
  `,
})
export class SecureComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  async signOut() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}
