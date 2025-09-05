import { Component, ElementRef, Input, OnInit, OnDestroy, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { Chart, ChartConfiguration, ChartType } from 'chart.js';
import {
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
  LineController,
  BarController,
  DoughnutController,
  PieController,
  Filler
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
  LineController,
  BarController,
  DoughnutController,
  PieController,
  Filler
);

@Component({
  selector: 'app-chart',
  standalone: true,
  template: `
    <div class="w-full h-full">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class ChartComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('chartCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() type: ChartType = 'line';
  @Input() data: any;
  @Input() options: any = {};

  private chart: Chart | null = null;

  ngOnInit() {
    this.createChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && this.chart && !changes['data'].firstChange) {
      this.updateChart();
    }
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private createChart() {
    if (!this.data) return;

    const config: ChartConfiguration = {
      type: this.type,
      data: this.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: 'rgb(107, 114, 128)', // gray-500
              font: {
                family: 'Inter, system-ui, sans-serif'
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1
          }
        },
        scales: this.type === 'doughnut' || this.type === 'pie' ? {} : {
          x: {
            ticks: {
              color: 'rgb(107, 114, 128)'
            },
            grid: {
              color: 'rgba(107, 114, 128, 0.1)'
            }
          },
          y: {
            ticks: {
              color: 'rgb(107, 114, 128)'
            },
            grid: {
              color: 'rgba(107, 114, 128, 0.1)'
            }
          }
        },
        ...this.options
      }
    };

    this.chart = new Chart(this.canvasRef.nativeElement, config);
  }

  private updateChart() {
    if (this.chart && this.data) {
      this.chart.data = this.data;
      this.chart.update();
    }
  }
}
