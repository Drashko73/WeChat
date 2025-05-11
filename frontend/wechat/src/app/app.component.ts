import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { ThemeService } from './services/theme.service';
// import { routeAnimations } from './animations/animations';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  // animations: [routeAnimations]
})
export class AppComponent implements OnInit {
  title = 'wechat';
  private themeService = inject(ThemeService);
  
  ngOnInit(): void {
    // Initialize theme from localStorage or system preference
    this.themeService.applyThemeToDOM();
  }

  // This function prepares states for route animations
  prepareRoute(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'];
  }
}
