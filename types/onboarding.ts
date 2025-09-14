// Onboarding types and interfaces

export type BusinessType =
  | 'restaurant'
  | 'retail'
  | 'barbershop'
  | 'grocery'
  | 'pharmacy'
  | 'electronics'
  | 'clothing'
  | 'other';

export type POSSystem =
  | 'manual'
  | 'square'
  | 'shopify'
  | 'zettle'
  | 'toast'
  | 'clover'
  | 'custom'
  | 'other'
  | 'none';

export type VerificationPreference = 'automated' | 'manual_upload' | 'hybrid' | 'simple' | 'advanced';

export type FeedbackVolumeExpectation = 'conservative' | 'realistic' | 'ambitious';

export type BusinessGoal =
  | 'increase_retention'
  | 'improve_satisfaction'
  | 'discover_opportunities'
  | 'reduce_complaints'
  | 'optimize_operations'
  | 'benchmark_performance';

export type PrimaryGoal =
  | 'increase_satisfaction'
  | 'reduce_complaints'
  | 'discover_opportunities'
  | 'improve_staff'
  | 'optimize_operations'
  | 'understand_preferences';

export interface OnboardingStep1Data {
  hasViewedValueProp: boolean;
  hasViewedSuccessStories: boolean;
  hasUsedROICalculator: boolean;
}

export interface OnboardingStep2Data {
  hasViewedEducation: boolean;
  hasWatchedDemo: boolean;
  understoodBenefits: boolean;
}

export interface OnboardingStep3Data {
  businessType: BusinessType;
  storeCount: number;
  geographicCoverage: 'single_city' | 'region' | 'national';
  avgTransactionValue: number;
  expectedCustomerVolume: number;
  monthlyFeedbackBudget: number;
}

export interface OnboardingStep4Data {
  posSystem: POSSystem;
  verificationPreference: VerificationPreference;
  needsHelp?: boolean;
  hasExistingIntegration?: boolean;
}

export interface OnboardingStep5Data {
  primaryGoals: BusinessGoal[];
  expectedFeedbackVolume: number;
  customGoal?: string;
}

export interface OnboardingStep6Data {
  businessSpecialty: string;
  commonCompliment: string;
  improvementArea: string;
  uniqueOffering?: string;
  targetCustomer?: string;
  aiResponse?: string;
}

export interface OnboardingData {
  currentStep: number;
  completedSteps: number[];
  step1?: OnboardingStep1Data;
  step2?: OnboardingStep2Data;
  step3?: OnboardingStep3Data;
  step4?: OnboardingStep4Data;
  step5?: OnboardingStep5Data;
  step6?: OnboardingStep6Data;
}

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  percentComplete: number;
  estimatedTimeRemaining: number; // in minutes
}

export interface SuccessStory {
  id: string;
  businessName: string;
  metric: string;
  improvement: string;
  timeframe: string;
  quote?: string;
  icon?: string;
}

export interface ROICalculation {
  monthlyCustomers: number;
  participationRate: number;
  avgTransactionValue: number;
  expectedFeedbackCount: number;
  avgRewardPercentage: number;
  totalRewardCost: number;
  platformFee: number;
  totalMonthlyCost: number;
  costPerInsight: number;
  comparisonToTraditional: number;
}

export interface IndustryBenefit {
  industry: BusinessType;
  benefits: string[];
  commonInsights: string[];
  avgROI: string;
}

export interface ContextTemplate {
  businessType: BusinessType;
  departments: string[];
  staffRoles: string[];
  commonIssues: string[];
  fraudIndicators: string[];
  customQuestions: string[];
}

// Database update types
export interface BusinessOnboardingUpdate {
  onboarding_step?: number;
  onboarding_completed?: boolean;
  business_type?: string;
  store_count?: number;
  avg_transaction_value?: number;
  expected_feedback_volume?: string;
  pos_system?: string;
  verification_preference?: string;
  primary_goals?: string[];
  quick_context?: {
    businessSpecialty?: string;
    commonCompliment?: string;
    improvementArea?: string;
  };
}

// Component props types
export interface OnboardingStepProps {
  data: OnboardingData;
  onNext: (stepData: any) => void;
  onBack: () => void;
  onSkip?: () => void;
}

export interface OnboardingProgressBarProps {
  progress: OnboardingProgress;
  onStepClick?: (step: number) => void;
}

// Validation schemas for each step
export const ONBOARDING_VALIDATION = {
  step1: {
    required: false, // Welcome step has no required fields
  },
  step2: {
    required: false, // Educational step has no required fields
  },
  step3: {
    required: ['businessType', 'storeCount'],
    optional: ['geographicCoverage', 'avgTransactionValue', 'expectedCustomerVolume', 'monthlyFeedbackBudget'],
  },
  step4: {
    required: ['posSystem', 'verificationPreference'],
    optional: ['needsHelp'],
  },
  step5: {
    required: ['primaryGoals', 'expectedFeedbackVolume'],
  },
  step6: {
    required: ['businessSpecialty'],
    optional: ['commonCompliment', 'improvementArea'],
  },
};

// Constants
export const TOTAL_ONBOARDING_STEPS = 6;

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  restaurant: 'Restaurant/Café',
  retail: 'Retail Store',
  barbershop: 'Barbershop/Salon',
  grocery: 'Grocery Store',
  pharmacy: 'Pharmacy',
  electronics: 'Electronics Store',
  clothing: 'Clothing Store',
  other: 'Other',
};

export const POS_SYSTEM_LABELS: Record<POSSystem, string> = {
  manual: 'Manual Verification',
  square: 'Square',
  shopify: 'Shopify POS',
  zettle: 'Zettle',
  toast: 'Toast',
  clover: 'Clover',
  custom: 'Custom/Other',
  other: 'Other',
  none: 'No POS System',
};

export const PRIMARY_GOAL_LABELS: Record<PrimaryGoal, string> = {
  increase_satisfaction: 'Increase customer satisfaction',
  reduce_complaints: 'Reduce complaints',
  discover_opportunities: 'Discover new opportunities',
  improve_staff: 'Improve staff performance',
  optimize_operations: 'Optimize operations',
  understand_preferences: 'Understand customer preferences',
};

export const FEEDBACK_VOLUME_LABELS: Record<FeedbackVolumeExpectation, string> = {
  conservative: 'Conservative: 5-10% of customers',
  realistic: 'Realistic: 10-20% of customers',
  ambitious: 'Ambitious: 20%+ of customers',
};

// Success stories data
export const SUCCESS_STORIES: SuccessStory[] = [
  {
    id: '1',
    businessName: 'Stockholm Grocery',
    metric: 'Customer Satisfaction',
    improvement: '+23%',
    timeframe: '3 months',
    quote: 'Vocilia helped us identify and fix issues we didn\'t even know existed.',
    icon: '🛒',
  },
  {
    id: '2',
    businessName: 'Café Nordic',
    metric: 'Customer Complaint',
    improvement: 'Fixed #1 issue',
    timeframe: '2 weeks',
    quote: 'We discovered our WiFi was the biggest pain point and fixed it immediately.',
    icon: '☕',
  },
  {
    id: '3',
    businessName: 'Fashion Boutique',
    metric: 'Product Demand',
    improvement: '50K SEK/month',
    timeframe: '1 month',
    quote: 'Customer feedback revealed untapped demand we completely missed.',
    icon: '👗',
  },
];

// Industry templates
export const INDUSTRY_TEMPLATES: Record<BusinessType, ContextTemplate> = {
  restaurant: {
    businessType: 'restaurant',
    departments: ['Dining area', 'Bar', 'Kitchen', 'Restroom', 'Outdoor seating'],
    staffRoles: ['Servers', 'Bartenders', 'Hosts', 'Chefs'],
    commonIssues: ['Wait times', 'Food temperature', 'Menu variety'],
    fraudIndicators: ['Claims about dishes not on menu', 'Wrong hours'],
    customQuestions: ['How was the food quality?', 'How was the service?'],
  },
  retail: {
    businessType: 'retail',
    departments: ['Entrance', 'Aisles', 'Checkout', 'Fitting rooms', 'Customer service'],
    staffRoles: ['Cashiers', 'Floor staff', 'Managers'],
    commonIssues: ['Product availability', 'Sizing', 'Pricing clarity'],
    fraudIndicators: ['Products not carried', 'Impossible department claims'],
    customQuestions: ['Did you find what you were looking for?', 'How was the checkout experience?'],
  },
  grocery: {
    businessType: 'grocery',
    departments: ['Produce', 'Meat', 'Dairy', 'Bakery', 'Frozen', 'Checkout'],
    staffRoles: ['Cashiers', 'Department specialists', 'Stockers'],
    commonIssues: ['Freshness', 'Stock levels', 'Queue times'],
    fraudIndicators: ['Seasonal items out of season', 'Wrong price ranges'],
    customQuestions: ['How fresh were the products?', 'Were items in stock?'],
  },
  barbershop: {
    businessType: 'barbershop',
    departments: ['Reception', 'Waiting area', 'Service chairs'],
    staffRoles: ['Receptionists', 'Barbers/Stylists', 'Managers'],
    commonIssues: ['Wait times', 'Service quality', 'Booking system'],
    fraudIndicators: ['Services not offered', 'Impossible time slots'],
    customQuestions: ['How was your stylist?', 'Was the wait time acceptable?'],
  },
  pharmacy: {
    businessType: 'pharmacy',
    departments: ['Prescription counter', 'OTC sections', 'Consultation area'],
    staffRoles: ['Pharmacists', 'Pharmacy technicians', 'Cashiers'],
    commonIssues: ['Wait times', 'Stock availability', 'Staff knowledge'],
    fraudIndicators: ['Prescription claims without pickup', 'Wrong medication names'],
    customQuestions: ['Was the pharmacist helpful?', 'Did you receive proper guidance?'],
  },
  electronics: {
    businessType: 'electronics',
    departments: ['Computer section', 'Mobile section', 'Audio/Video', 'Gaming', 'Service desk'],
    staffRoles: ['Sales associates', 'Tech support', 'Cashiers'],
    commonIssues: ['Product knowledge', 'Pricing', 'Warranty information'],
    fraudIndicators: ['Products not in inventory', 'Impossible tech specs'],
    customQuestions: ['Did staff have good product knowledge?', 'Were prices clearly marked?'],
  },
  clothing: {
    businessType: 'clothing',
    departments: ['Men\'s section', 'Women\'s section', 'Fitting rooms', 'Accessories', 'Checkout'],
    staffRoles: ['Sales associates', 'Fitting room attendants', 'Cashiers'],
    commonIssues: ['Size availability', 'Fitting room wait', 'Return policy'],
    fraudIndicators: ['Brands not carried', 'Impossible size combinations'],
    customQuestions: ['Did you find your size?', 'How was the fitting room experience?'],
  },
  other: {
    businessType: 'other',
    departments: [],
    staffRoles: [],
    commonIssues: [],
    fraudIndicators: [],
    customQuestions: [],
  },
};