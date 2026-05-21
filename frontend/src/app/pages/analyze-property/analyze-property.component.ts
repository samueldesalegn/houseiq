import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PropertyAnalysisService } from '../../services/property-analysis.service';

import {
  InvestmentProfile,
  PropertyAnalysisRequest,
  PropertyAnalysisResponse,
} from '../../models/property-analysis.model';

type ResultPage =
  | 'overview'
  | 'explanation'
  | 'insights'
  | 'scenarios'
  | 'stress';

@Component({
  selector: 'app-analyze-property',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analyze-property.component.html',
  styleUrl: './analyze-property.component.scss',
})
export class AnalyzePropertyComponent {
  private readonly propertyService = inject(PropertyAnalysisService);

  readonly address = signal('5501 Grand Lake Dr, San Antonio, TX 78244');
  readonly profile = signal<InvestmentProfile>('cash_flow_investor');

  readonly purchasePrice = signal<number | null>(null);
  readonly downPaymentPercent = signal<number | null>(null);
  readonly interestRate = signal<number | null>(null);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<PropertyAnalysisResponse | null>(null);

  readonly showResultsPage = signal(false);
  readonly activePage = signal<ResultPage>('overview');

  readonly summary = computed(() => this.result()?.summary ?? null);
  readonly property = computed(() => this.result()?.property ?? null);
  readonly underwriting = computed(() => this.result()?.underwriting ?? null);
  readonly breakEven = computed(() => this.result()?.break_even ?? null);
  readonly resilience = computed(() => this.result()?.resilience ?? null);
  readonly scenarios = computed(() => this.result()?.scenarios ?? null);
  readonly hiddenInsights = computed(
    () => this.result()?.hidden_insights ?? [],
  );
  readonly actionPlan = computed(() => this.result()?.action_plan ?? []);
  readonly dealExplanation = computed(
    () => this.result()?.deal_explanation ?? null,
  );

  analyzeProperty(): void {
    const cleanAddress = this.address().trim();

    if (!cleanAddress) {
      this.error.set('Please enter a property address.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const assumptions: PropertyAnalysisRequest['assumptions'] = {};

    if (this.purchasePrice() !== null) {
      assumptions.purchase_price = this.purchasePrice()!;
    }

    if (this.downPaymentPercent() !== null) {
      assumptions.down_payment_percent = this.downPaymentPercent()!;
    }

    if (this.interestRate() !== null) {
      assumptions.interest_rate = this.interestRate()!;
    }

    const payload: PropertyAnalysisRequest = {
      address: cleanAddress,
      profile: this.profile(),
      refresh: true,
      include_details: true,
      assumptions,
    };

    this.propertyService.analyzeProperty(payload).subscribe({
      next: (response) => {
        this.result.set(response);
        this.applyReturnedAssumptions(response);
        this.activePage.set('overview');
        this.showResultsPage.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set(
          err?.error?.message ||
            err?.error?.details ||
            err?.error?.error ||
            err?.message ||
            'Failed to analyze property',
        );
        this.showResultsPage.set(false);
        this.loading.set(false);
      },
    });
  }

  backToSearch(): void {
    this.showResultsPage.set(false);
    this.activePage.set('overview');
  }

  clearAssumptions(): void {
    this.purchasePrice.set(null);
    this.downPaymentPercent.set(null);
    this.interestRate.set(null);
  }

  private applyReturnedAssumptions(response: PropertyAnalysisResponse): void {
    if (this.purchasePrice() === null) {
      this.purchasePrice.set(response.underwriting?.purchase_price ?? null);
    }

    if (this.downPaymentPercent() === null) {
      this.downPaymentPercent.set(
        response.underwriting?.down_payment_percent ?? null,
      );
    }

    if (this.interestRate() === null) {
      this.interestRate.set(response.underwriting?.interest_rate ?? null);
    }
  }

  setActivePage(page: ResultPage): void {
    this.activePage.set(page);
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '--';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '--';
    }

    return `${value}%`;
  }

  getDealColor(): string {
    const recommendation = this.summary()?.recommendation?.toLowerCase() ?? '';
    const classification =
      this.dealExplanation()?.classification?.toLowerCase() ?? '';

    if (recommendation.includes('strong') || classification === 'strong') {
      return '#16a34a';
    }

    if (
      recommendation.includes('moderate') ||
      recommendation.includes('possible') ||
      classification === 'moderate'
    ) {
      return '#f59e0b';
    }

    return '#dc2626';
  }

  getScoreColor(score: number | null | undefined): string {
    if (score === null || score === undefined) return '#64748b';
    if (score >= 70) return '#16a34a';
    if (score >= 50) return '#f59e0b';
    return '#dc2626';
  }

  getMetricColor(
    value: number | null | undefined,
    goodThreshold: number,
    warningThreshold: number,
  ): string {
    if (value === null || value === undefined) return '#64748b';
    if (value >= goodThreshold) return '#16a34a';
    if (value >= warningThreshold) return '#f59e0b';
    return '#dc2626';
  }

  getCashFlowColor(value: number | null | undefined): string {
    if (value === null || value === undefined) return '#64748b';
    return value >= 0 ? '#16a34a' : '#dc2626';
  }

  getResilienceColor(): string {
    const rating = this.resilience()?.rating?.toLowerCase() ?? '';

    if (rating.includes('stable') || rating.includes('resilient')) {
      return '#16a34a';
    }

    if (rating.includes('fragile')) {
      return '#f59e0b';
    }

    return '#dc2626';
  }
}
