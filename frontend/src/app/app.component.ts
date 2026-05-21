import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AnalyzePropertyComponent } from './pages/analyze-property/analyze-property.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AnalyzePropertyComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly title = 'HouseIQ';
}
