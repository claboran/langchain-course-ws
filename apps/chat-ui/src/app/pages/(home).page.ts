import { Component } from '@angular/core';

import { AnalogWelcomeComponent } from './analog-welcome.component';

@Component({
  selector: 'chat-ui-home',

  imports: [AnalogWelcomeComponent],
  template: ` <chat-ui-analog-welcome /> `,
})
export default class HomeComponent {}
