import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ArGame {
  time = 60;
  secondsLeft = signal(this.time);
  private intervalId?: ReturnType<typeof setInterval>;
  timerCompleted$ = new Subject<boolean>();

  startTimer() {
    this.intervalId = setInterval(() => {
      const current = this.secondsLeft();
      if (current > 0) {
        this.secondsLeft.set(current - 1);
      } else {
        clearInterval(this.intervalId);
        this.timerCompleted$.next(true);
        this.timerCompleted$.complete();
        console.log('Timer completed');
      }
    }, 1000);
  }

  clearInterval(): void {
    clearInterval(this.intervalId);
  }

  ngOnDestroy(): void {
    this.clearInterval();
  }
}
