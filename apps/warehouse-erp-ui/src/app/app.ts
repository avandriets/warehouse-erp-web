import { JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WarehouseAuthService } from '@warehouse/auth';

@Component({
  selector: 'app-root',
  imports: [JsonPipe, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(WarehouseAuthService);

  protected logIn(): void {
    this.auth.login();
  }

  protected signUp(): void {
    this.auth.signup();
  }

  protected logOut(): void {
    this.auth.logout();
  }
}
