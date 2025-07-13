import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { fadeIn, fadeInUp, staggerFadeIn } from '../../animations/animations';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './features.component.html',
  styleUrl: './features.component.css',
  animations: [fadeIn, fadeInUp, staggerFadeIn]
})
export class FeaturesComponent {
  isModalOpen = false;
  modalImageSrc = '';
  modalImageAlt = '';

  constructor(
    private themeService: ThemeService
  ) {}

  get currentTheme() {
    return this.themeService.isDarkMode() ? 'dark' : 'light';
  }

  openImageModal(imageSrc: string, imageAlt: string) {
    this.modalImageSrc = imageSrc;
    this.modalImageAlt = imageAlt;
    this.isModalOpen = true;
    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
  }

  closeImageModal() {
    this.isModalOpen = false;
    this.modalImageSrc = '';
    this.modalImageAlt = '';
    // Restore body scrolling
    document.body.style.overflow = 'auto';
  }
}
