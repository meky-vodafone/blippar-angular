import { Component, ElementRef, input, signal, ViewChild, viewChild } from '@angular/core';

@Component({
  selector: 'app-console-log',
  imports: [],
  templateUrl: './console-log.component.html',
  styleUrl: './console-log.component.scss',
})
export class ConsoleLogComponent {
  showLog = signal(false);
  @ViewChild('logContainer') logContainer!: ElementRef;
  logTypes = input<Array<'log' | 'warn' | 'error'>>(['log', 'error']);

  logs: Array<{ type: 'log' | 'warn' | 'error'; message: string; color: string }> = [];
  selectedTypes: Array<'log' | 'warn' | 'error'> = ['log', 'error'];

  ngOnInit(): void {
    const self = this;
    this.logTypes().forEach((type) => {
      const original = console[type];
      console[type] = function (...args) {
        original.apply(console, args);
        self.addLog(
          type,
          args.map((a) => (typeof a === 'object' ? self.safeStringify(a) : a)).join(' '),
          type === 'error' ? '#ff5555' : type === 'warn' ? '#ffaa00' : '#00ffcc'
        );
      };
    });
    // Initialize selectedTypes to match logTypes input
    this.selectedTypes = [...this.logTypes()];
  }

  private safeStringify(obj: any): string {
    const seen = new WeakSet();
    return JSON.stringify(obj, function (key, value) {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    });
  }

  private addLog(type: 'log' | 'warn' | 'error', msg: string, color: string) {
    this.logs.push({ type, message: `[${type.toUpperCase()}] ${msg}`, color });
  }

  onTypeSelectionChange(type: 'log' | 'warn' | 'error', checked: boolean) {
    if (checked) {
      if (!this.selectedTypes.includes(type)) {
        this.selectedTypes.push(type);
      }
    } else {
      this.selectedTypes = this.selectedTypes.filter(t => t !== type);
    }
  }

  get filteredLogs() {
    return this.logs.filter(log => this.selectedTypes.includes(log.type));
  }
}
