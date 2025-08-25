import { trigger, transition, style, animate, query, stagger, state, animateChild, group } from '@angular/animations';

// Fade in animation
export const fadeIn = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('600ms ease-out', style({ opacity: 1 }))
  ])
]);

// Fade in up animation (elements fade in while moving up)
export const fadeInUp = trigger('fadeInUp', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(20px)' }),
    animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
  ])
]);

// Staggered fade in for lists
export const staggerFadeIn = trigger('staggerFadeIn', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(20px)' }),
      stagger(100, [
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ], { optional: true })
  ])
]);

// Dropdown animation
export const dropdownAnimation = trigger('dropdownAnimation', [
  state('open', style({
    height: '*',
    opacity: 1,
    visibility: 'visible'
  })),
  state('closed', style({
    height: '0',
    opacity: 0,
    visibility: 'hidden'
  })),
  transition('closed => open', [
    animate('300ms ease-in-out')
  ]),
  transition('open => closed', [
    animate('200ms ease-in-out')
  ])
]);

// Rotate animation
export const rotateAnimation = trigger('rotateAnimation', [
  state('open', style({
    transform: 'rotate(180deg)'
  })),
  state('closed', style({
    transform: 'rotate(0deg)'
  })),
  transition('closed <=> open', [
    animate('200ms ease-in-out')
  ])
]);

// Route animations for page transitions
// export const routeAnimations = trigger('routeAnimations', [
//   transition('* <=> *', [
//     style({ position: 'relative' }),
//     query(':enter, :leave', [
//       style({
//         position: 'absolute',
//         top: 0,
//         left: 0,
//         width: '100%'
//       })
//     ], { optional: true }),
//     query(':enter', [
//       style({ opacity: 0 }),
//     ], { optional: true }),
//     query(':leave', [
//       style({ opacity: 1 }),
//       animate('300ms ease-out', style({ opacity: 0 }))
//     ], { optional: true }),
//     query(':enter', [
//       style({ opacity: 0 }),
//       animate('300ms ease-out', style({ opacity: 1 }))
//     ], { optional: true })
//   ])
// ]);