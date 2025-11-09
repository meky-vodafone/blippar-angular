import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ArGame } from '../../service/ar-game';

@Component({
  selector: 'app-game-header',
  imports: [DatePipe],
  templateUrl: './game-header.component.html',
  styleUrl: './game-header.component.scss',
})
export class GameHeaderComponent {
  arGameService = inject(ArGame);
  progressBarWidth = computed(
    () =>
      ((this.arGameService.time - this.arGameService.secondsLeft()) * 100) /
      this.arGameService.time
  );

  ngOnDestroy() {
    this.arGameService.clearInterval();
  }
}
