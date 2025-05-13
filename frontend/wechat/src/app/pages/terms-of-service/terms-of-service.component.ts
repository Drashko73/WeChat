import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { fadeIn } from '../../animations/animations';

@Component({
  selector: 'app-terms-of-service',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './terms-of-service.component.html',
  styleUrl: './terms-of-service.component.css',
  animations: [fadeIn]
})
export class TermsOfServiceComponent {
  // Component for displaying Terms of Service
}
