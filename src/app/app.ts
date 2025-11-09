import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BlippArAdvancedComponent } from './components/blipp-ar-advanced/blipp-ar-advanced.component';
import { ArGameIframe } from "./components/ar-game-iframe/ar-game-iframe";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BlippArAdvancedComponent, ArGameIframe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('youtube-ar');
}
