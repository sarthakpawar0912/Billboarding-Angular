import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
  animateChild,
  group,
  state,
  keyframes
} from '@angular/animations';

/**
 * Shared Angular Animations for Industry-Standard UI
 * These animations provide smooth, professional transitions
 * throughout the application.
 */

// ============================================
// PAGE TRANSITION ANIMATIONS
// ============================================

/**
 * Fade in/out animation for page transitions
 * Usage: [@fadeAnimation]="outlet.isActivated ? outlet.activatedRoute : ''"
 */
export const fadeAnimation = trigger('fadeAnimation', [
  transition('* <=> *', [
    style({ opacity: 0 }),
    animate('300ms ease-out', style({ opacity: 1 }))
  ])
]);

/**
 * Slide animation from right to left
 * Usage: [@slideAnimation]="outlet.isActivated ? outlet.activatedRoute : ''"
 */
export const slideAnimation = trigger('slideAnimation', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(20px)' }),
    animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(-20px)' }))
  ])
]);

/**
 * Slide up animation for page content
 * Usage: [@slideUpAnimation]
 */
export const slideUpAnimation = trigger('slideUpAnimation', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(20px)' }),
    animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
  ])
]);

/**
 * Slide down animation
 * Usage: [@slideDownAnimation]
 */
export const slideDownAnimation = trigger('slideDownAnimation', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(-20px)' }),
    animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
  ])
]);

// ============================================
// CARD & LIST ANIMATIONS
// ============================================

/**
 * Stagger animation for lists/grids
 * Usage: Apply to parent container, children with *ngFor get staggered
 */
export const staggerAnimation = trigger('staggerAnimation', [
  transition(':enter', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(15px)' }),
      stagger('50ms', [
        animate('400ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ], { optional: true })
  ])
]);

/**
 * Card hover animation
 * Usage: [@cardAnimation]
 */
export const cardAnimation = trigger('cardAnimation', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.95)' }),
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ opacity: 1, transform: 'scale(1)' }))
  ]),
  transition(':leave', [
    animate('200ms ease-in',
      style({ opacity: 0, transform: 'scale(0.95)' }))
  ])
]);

/**
 * List item animation
 * Usage: [@listItemAnimation]
 */
export const listItemAnimation = trigger('listItemAnimation', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(-15px)' }),
    animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(15px)' }))
  ])
]);

// ============================================
// MODAL & OVERLAY ANIMATIONS
// ============================================

/**
 * Modal/dialog animation
 * Usage: [@modalAnimation]
 */
export const modalAnimation = trigger('modalAnimation', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.9) translateY(-20px)' }),
    animate('300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
  ]),
  transition(':leave', [
    animate('200ms ease-in',
      style({ opacity: 0, transform: 'scale(0.9) translateY(-20px)' }))
  ])
]);

/**
 * Backdrop/overlay animation
 * Usage: [@backdropAnimation]
 */
export const backdropAnimation = trigger('backdropAnimation', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('200ms ease-out', style({ opacity: 1 }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ opacity: 0 }))
  ])
]);

/**
 * Drawer/sidebar animation
 * Usage: [@drawerAnimation]
 */
export const drawerAnimation = trigger('drawerAnimation', [
  transition(':enter', [
    style({ transform: 'translateX(-100%)' }),
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ transform: 'translateX(0)' }))
  ]),
  transition(':leave', [
    animate('250ms ease-in',
      style({ transform: 'translateX(-100%)' }))
  ])
]);

// ============================================
// BUTTON & INTERACTION ANIMATIONS
// ============================================

/**
 * Button click animation
 * Usage: [@buttonClick]="clickState"
 */
export const buttonClickAnimation = trigger('buttonClick', [
  state('clicked', style({ transform: 'scale(0.95)' })),
  state('default', style({ transform: 'scale(1)' })),
  transition('default => clicked', animate('100ms ease-in')),
  transition('clicked => default', animate('100ms ease-out'))
]);

/**
 * Pulse animation for attention
 * Usage: [@pulseAnimation]
 */
export const pulseAnimation = trigger('pulseAnimation', [
  transition(':enter', [
    animate('1s ease-in-out', keyframes([
      style({ transform: 'scale(1)', offset: 0 }),
      style({ transform: 'scale(1.05)', offset: 0.5 }),
      style({ transform: 'scale(1)', offset: 1 })
    ]))
  ])
]);

/**
 * Shake animation for errors
 * Usage: [@shakeAnimation]="hasError"
 */
export const shakeAnimation = trigger('shakeAnimation', [
  transition('false => true', [
    animate('400ms ease-in-out', keyframes([
      style({ transform: 'translateX(0)', offset: 0 }),
      style({ transform: 'translateX(-10px)', offset: 0.2 }),
      style({ transform: 'translateX(10px)', offset: 0.4 }),
      style({ transform: 'translateX(-10px)', offset: 0.6 }),
      style({ transform: 'translateX(10px)', offset: 0.8 }),
      style({ transform: 'translateX(0)', offset: 1 })
    ]))
  ])
]);

// ============================================
// LOADING & STATE ANIMATIONS
// ============================================

/**
 * Skeleton loading animation
 * Usage: [@skeletonAnimation]
 */
export const skeletonAnimation = trigger('skeletonAnimation', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('300ms ease-out', style({ opacity: 1 }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ opacity: 0 }))
  ])
]);

/**
 * Content reveal animation (for when data loads)
 * Usage: [@contentReveal]
 */
export const contentRevealAnimation = trigger('contentReveal', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(10px)' }),
    animate('400ms 100ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ opacity: 1, transform: 'translateY(0)' }))
  ])
]);

// ============================================
// NOTIFICATION & TOAST ANIMATIONS
// ============================================

/**
 * Toast/notification slide in from right
 * Usage: [@toastAnimation]
 */
export const toastAnimation = trigger('toastAnimation', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(100%)' }),
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ opacity: 1, transform: 'translateX(0)' }))
  ]),
  transition(':leave', [
    animate('250ms ease-in',
      style({ opacity: 0, transform: 'translateX(100%)' }))
  ])
]);

/**
 * Alert/notification animation
 * Usage: [@alertAnimation]
 */
export const alertAnimation = trigger('alertAnimation', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(-10px) scale(0.95)' }),
    animate('300ms ease-out',
      style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
  ]),
  transition(':leave', [
    animate('200ms ease-in',
      style({ opacity: 0, transform: 'translateY(-10px) scale(0.95)' }))
  ])
]);

// ============================================
// EXPAND/COLLAPSE ANIMATIONS
// ============================================

/**
 * Expand/collapse animation for accordions
 * Usage: [@expandCollapse]="isExpanded"
 */
export const expandCollapseAnimation = trigger('expandCollapse', [
  state('collapsed', style({ height: '0', overflow: 'hidden', opacity: 0 })),
  state('expanded', style({ height: '*', overflow: 'visible', opacity: 1 })),
  transition('collapsed <=> expanded', [
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)')
  ])
]);

/**
 * Rotate animation for chevrons/arrows
 * Usage: [@rotateAnimation]="isOpen"
 */
export const rotateAnimation = trigger('rotateAnimation', [
  state('false', style({ transform: 'rotate(0deg)' })),
  state('true', style({ transform: 'rotate(180deg)' })),
  transition('false <=> true', animate('200ms ease-out'))
]);

// ============================================
// TABLE & DATA ANIMATIONS
// ============================================

/**
 * Table row animation
 * Usage: [@tableRowAnimation]
 */
export const tableRowAnimation = trigger('tableRowAnimation', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(-10px)' }),
    animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(10px)' }))
  ])
]);

/**
 * Highlight animation for updated rows
 * Usage: [@highlightAnimation]="wasUpdated"
 */
export const highlightAnimation = trigger('highlightAnimation', [
  transition('false => true', [
    animate('1s ease-out', keyframes([
      style({ backgroundColor: 'rgba(91, 45, 255, 0.2)', offset: 0 }),
      style({ backgroundColor: 'rgba(91, 45, 255, 0.1)', offset: 0.5 }),
      style({ backgroundColor: 'transparent', offset: 1 })
    ]))
  ])
]);

// ============================================
// ROUTE ANIMATIONS (for router-outlet)
// ============================================

/**
 * Route transition animation
 * Usage: On router-outlet with [@routeAnimation]="prepareRoute(outlet)"
 */
export const routeAnimation = trigger('routeAnimation', [
  transition('* <=> *', [
    style({ position: 'relative' }),
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%'
      })
    ], { optional: true }),
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(20px)' })
    ], { optional: true }),
    group([
      query(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-20px)' }))
      ], { optional: true }),
      query(':enter', [
        animate('300ms 100ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ], { optional: true })
    ])
  ])
]);
