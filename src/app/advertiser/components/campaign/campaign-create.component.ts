import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { CampaignService } from '../../../services/campaign.service';
import { CampaignCreateRequest } from '../../../models/campaign.model';

@Component({
  selector: 'app-campaign-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './campaign-create.component.html',
  styleUrl: './campaign-create.component.css'
})
export class CampaignCreateComponent implements OnInit {
  // Form fields
  campaignName = '';
  budget: number | null = null;
  startDate = '';
  endDate = '';
  cities: string[] = [];

  // State
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // City suggestions
  citySuggestions = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
    'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat',
    'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane',
    'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad'
  ];

  // Today's date for min date
  today = new Date().toISOString().split('T')[0];

  constructor(
    private campaignService: CampaignService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  // City management
  addCity(city: string): void {
    const trimmedCity = city.trim();
    if (trimmedCity && !this.cities.includes(trimmedCity)) {
      this.cities.push(trimmedCity);
    }
  }

  removeCity(city: string): void {
    this.cities = this.cities.filter(c => c !== city);
  }

  isCitySelected(city: string): boolean {
    return this.cities.includes(city);
  }

  toggleCity(city: string): void {
    if (this.isCitySelected(city)) {
      this.removeCity(city);
    } else {
      this.addCity(city);
    }
  }

  // Validation
  isFormValid(): boolean {
    return !!(
      this.campaignName.trim() &&
      this.budget && this.budget >= 1000 &&
      this.startDate &&
      this.endDate &&
      this.cities.length > 0 &&
      new Date(this.endDate) >= new Date(this.startDate)
    );
  }

  // Submit form
  submitForm(): void {
    if (!this.isFormValid()) {
      this.errorMessage.set('Please fill all required fields correctly');
      return;
    }

    const campaignData: CampaignCreateRequest = {
      name: this.campaignName.trim(),
      budget: this.budget!,
      billboards: 1,
      startDate: this.startDate,
      endDate: this.endDate,
      cities: this.cities
    };

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.campaignService.createCampaign(campaignData).subscribe({
      next: (campaign) => {
        this.isSubmitting.set(false);
        this.successMessage.set(`Campaign "${campaign.name}" created successfully!`);
        setTimeout(() => {
          this.router.navigate(['/advertiser/campaigns']);
        }, 1500);
      },
      error: (err) => {
        console.error('Error creating campaign:', err);
        this.isSubmitting.set(false);
        this.errorMessage.set(err.message || 'Failed to create campaign');
      }
    });
  }

  // Cancel
  cancel(): void {
    this.router.navigate(['/advertiser/campaigns']);
  }

  // Format currency
  formatCurrency(amount: number): string {
    return this.campaignService.formatCurrency(amount);
  }

  // Calculate duration
  getDuration(): number {
    if (!this.startDate || !this.endDate) return 0;
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
