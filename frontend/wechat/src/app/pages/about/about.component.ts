import { Component } from '@angular/core';
import { fadeIn, fadeInUp, staggerFadeIn } from '../../animations/animations';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css',
  animations: [fadeIn, fadeInUp, staggerFadeIn]
})
export class AboutComponent {

}
