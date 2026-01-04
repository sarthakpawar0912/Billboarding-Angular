import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  link?: string;
  icon?: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="breadcrumb-container" [class.with-background]="showBackground" aria-label="Breadcrumb">
      <ol class="breadcrumb">
        <!-- Home icon -->
        <li class="breadcrumb-item">
          <a [routerLink]="homeLink" class="home-link" aria-label="Home">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </a>
        </li>

        @for (item of items; track item.label; let last = $last) {
          <li class="breadcrumb-separator" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </li>
          <li class="breadcrumb-item" [class.active]="last">
            @if (item.link && !last) {
              <a [routerLink]="item.link">{{ item.label }}</a>
            } @else {
              <span>{{ item.label }}</span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: [`
    .breadcrumb-container {
      margin-bottom: 16px;
    }

    .breadcrumb-container.with-background {
      background: var(--white, #ffffff);
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid var(--gray-100, #f3f4f6);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0;
      margin: 0;
      list-style: none;
      font-size: 13px;
    }

    .breadcrumb-item {
      display: flex;
      align-items: center;
    }

    .breadcrumb-item a,
    .home-link {
      color: var(--gray-500, #6b7280);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: color 0.15s ease;
    }

    .breadcrumb-item a:hover,
    .home-link:hover {
      color: var(--primary, #5B2DFF);
    }

    .breadcrumb-item.active span {
      color: var(--gray-900, #111827);
      font-weight: 500;
    }

    .breadcrumb-separator {
      display: flex;
      align-items: center;
      color: var(--gray-300, #d1d5db);
    }

    .breadcrumb-separator svg {
      width: 14px;
      height: 14px;
    }
  `]
})
export class BreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];
  @Input() homeLink: string = '/';
  @Input() showBackground: boolean = false;
}
