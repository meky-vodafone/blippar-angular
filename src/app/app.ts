import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BlippArAdvancedComponent } from './components/blipp-ar-advanced/blipp-ar-advanced.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BlippArAdvancedComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('youtube-ar');
}
