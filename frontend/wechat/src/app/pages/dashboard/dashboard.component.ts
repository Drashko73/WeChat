import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { StatsService, DashboardStats, ActivityStats, MessageTypeStats, ActiveChat } from '../../services/stats.service';
import { Router } from '@angular/router';
import { fadeIn } from '../../animations/animations';
import { Observable, Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { User } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ProfilePictureComponent } from '../../components/profile-picture/profile-picture.component';
import { StatsCardComponent } from '../../components/stats-card/stats-card.component';
import { ChartComponent } from '../../components/chart/chart.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ProfilePictureComponent, StatsCardComponent, ChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  animations: [fadeIn]
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser$: Observable<User | null>;
  protectedRouteText: string = "";
  
  // Dashboard Data
  dashboardStats: DashboardStats | null = null;
  activityStats: ActivityStats | null = null;
  messageTypeStats: MessageTypeStats[] = [];
  mostActiveChats: ActiveChat[] = [];
  
  // Chart Data
  activityChartData: any = null;
  activityChartOptions: any = {};
  messageTypeChartData: any = null;
  messageTypeChartOptions: any = {};
  
  // UI State
  activityPeriod: number = 7;
  loading = false;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private authService: AuthService,
    private statsService: StatsService,
    private router: Router,
    private http: HttpClient
  ) {
    this.currentUser$ = this.authService.currentUser;
    this.setupChartOptions();
  }
  
  ngOnInit() {
    this.loadDashboardData();
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  logout(): void {
    this.authService.logout();
  }

  protectedRouteCall(): void {
    this.http.get(environment.apiUrl + '/protected/test').subscribe({
      next: (response) => {
        this.protectedRouteText = JSON.stringify(response);
      },
      error: (error) => {
        console.error('Error fetching protected route:', error);
        this.protectedRouteText = 'Error fetching protected route';
      }
    });
  }
  
  private loadDashboardData(): void {
    this.loading = true;
    
    forkJoin({
      dashboardStats: this.statsService.getDashboardStats(),
      activityStats: this.statsService.getActivityStats(this.activityPeriod),
      messageTypeStats: this.statsService.getMessageTypeStats(),
      mostActiveChats: this.statsService.getMostActiveChats(5)
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.dashboardStats = data.dashboardStats.data;
        this.activityStats = data.activityStats.data;
        this.messageTypeStats = data.messageTypeStats.data;
        this.mostActiveChats = data.mostActiveChats.data;
        
        this.updateCharts();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.loading = false;
      }
    });
  }
  
  loadActivityStats(days: number): void {
    this.activityPeriod = days;
    this.statsService.getActivityStats(days).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.activityStats = response.data;
        this.updateActivityChart();
      },
      error: (error) => {
        console.error('Error loading activity stats:', error);
      }
    });
  }
  
  private updateCharts(): void {
    this.updateActivityChart();
    this.updateMessageTypeChart();
  }
  
  private updateActivityChart(): void {
    if (!this.activityStats) return;
    
    // Generate labels for the last N days
    const labels: string[] = [];
    const messagesData: number[] = [];
    const chatsData: number[] = [];
    const friendsData: number[] = [];
    
    for (let i = this.activityPeriod - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      
      // Find data for this date
      const messageCount = this.activityStats.messages.find(m => m._id === dateStr)?.count || 0;
      const chatCount = this.activityStats.chats.find(c => c._id === dateStr)?.count || 0;
      const friendCount = this.activityStats.friends.find(f => f._id === dateStr)?.count || 0;
      
      messagesData.push(messageCount);
      chatsData.push(chatCount);
      friendsData.push(friendCount);
    }
    
    this.activityChartData = {
      labels: labels,
      datasets: [
        {
          label: 'Messages',
          data: messagesData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'New Chats',
          data: chatsData,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'New Friends',
          data: friendsData,
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  }
  
  private updateMessageTypeChart(): void {
    if (!this.messageTypeStats || this.messageTypeStats.length === 0) return;
    
    const colors = [
      'rgba(59, 130, 246, 0.8)',   // Blue
      'rgba(16, 185, 129, 0.8)',   // Green
      'rgba(139, 92, 246, 0.8)',   // Purple
      'rgba(245, 158, 11, 0.8)',   // Yellow
      'rgba(239, 68, 68, 0.8)',    // Red
    ];
    
    this.messageTypeChartData = {
      labels: this.messageTypeStats.map(stat => {
        const typeMap: { [key: string]: string } = {
          'text': 'Text Messages',
          'image': 'Images',
          'file': 'Files',
          'video': 'Videos',
          'audio': 'Audio'
        };
        return typeMap[stat._id] || stat._id;
      }),
      datasets: [{
        data: this.messageTypeStats.map(stat => stat.count),
        backgroundColor: colors.slice(0, this.messageTypeStats.length),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };
  }
  
  private setupChartOptions(): void {
    this.activityChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
        },
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    };
    
    this.messageTypeChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
        },
      }
    };
  }
  
  // Helper Methods
  getSentMessagePercentage(): number {
    if (!this.dashboardStats || this.dashboardStats.messages.total === 0) return 0;
    return (this.dashboardStats.messages.sent / this.dashboardStats.messages.total) * 100;
  }
  
  getReceivedMessagePercentage(): number {
    if (!this.dashboardStats || this.dashboardStats.messages.total === 0) return 0;
    return (this.dashboardStats.messages.received / this.dashboardStats.messages.total) * 100;
  }
  
  getMaxMessageCount(): number {
    if (!this.mostActiveChats || this.mostActiveChats.length === 0) return 1;
    return Math.max(...this.mostActiveChats.map(chat => chat.messageCount));
  }
  
  trackByChat(index: number, chat: ActiveChat): string {
    return chat._id;
  }
}
