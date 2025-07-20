import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stats-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-card.component.html',
  styleUrl: './stats-card.component.css'
})
export class StatsCardComponent {
  @Input() title: string = '';
  @Input() value: number = 0;
  @Input() change?: number;
  @Input() icon: string = 'fas fa-chart-line';
  @Input() color: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'indigo' = 'blue';

  protected Math = Math;

  get iconClass(): string {
    return this.icon;
  }

  get iconBackgroundClass(): string {
    const colorMap = {
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
      indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
    };
    return colorMap[this.color];
  }

  get changeColorClass(): string {
    if (this.change === undefined) return '';
    return this.change > 0 
      ? 'text-green-600 dark:text-green-400 text-sm font-semibold'
      : 'text-red-600 dark:text-red-400 text-sm font-semibold';
  }

  get changeIconClass(): string {
    if (this.change === undefined) return '';
    return this.change > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
  }
}
