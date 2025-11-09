import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-ar-game-iframe',
  templateUrl: './ar-game-iframe.html',
  styleUrls: ['./ar-game-iframe.css'],
})
export class ArGameIframe implements OnInit, OnDestroy {
  /** URL of the embedded game */
  gameUrl: string = 'https://ar-game-exp.netlify.app/';
  safeUrl!: SafeResourceUrl;

  /** Emits when the embedded game reports completion status */
  @Output() gameComplete = new EventEmitter<{ caughtCharachter: boolean; timeTakenInSeconds: number }>();

  private allowedOrigin: string | null = null;
  private messageHandler = (event: MessageEvent) => this.onMessage(event);
  private handledFirstMessage = false;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.gameUrl);

    // Compute allowed origin from the game URL so we only accept messages from it
    try {
      this.allowedOrigin = new URL(this.gameUrl).origin;
    } catch (e) {
      this.allowedOrigin = null;
    }

    window.addEventListener('message', this.messageHandler, false);
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.messageHandler, false);
  }

  private onMessage(event: MessageEvent) {
    // If we computed an allowed origin, enforce it
    if (this.allowedOrigin && event.origin !== this.allowedOrigin) {
      return;
    }

    let data = event.data;

    // Support stringified JSON as well
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        return; // not JSON — ignore
      }
    }

    if (!data || typeof data !== 'object') return;

    // Expecting an object shaped: { caughtCharachter: boolean, timeTakenInSeconds: number }
    const hasCaught = 'caughtCharachter' in data;
    const hasTime = 'timeTakenInSeconds' in data;

    if (!hasCaught || !hasTime) return;

    const payload = {
      caughtCharachter: Boolean(data.caughtCharachter),
      timeTakenInSeconds: Number(data.timeTakenInSeconds),
    };

    // Emit payload and unsubscribe so we only handle the first valid game-complete message
    this.gameComplete.emit(payload);
    this.handledFirstMessage = true;
    try {
      window.removeEventListener('message', this.messageHandler, false);
    } catch (e) {
      // ignore removal errors
    }
  }
}
