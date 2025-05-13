import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { fadeIn, fadeInUp, staggerFadeIn } from '../../animations/animations';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './features.component.html',
  styleUrl: './features.component.css',
  animations: [fadeIn, fadeInUp, staggerFadeIn]
})
export class FeaturesComponent {

}
