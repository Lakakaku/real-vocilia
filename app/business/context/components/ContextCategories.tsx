'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ContextCategoryModal } from './ContextCategoryModal'

export interface ContextCategory {
  id: string
  title: string
  description: string
  icon: string
  completion: number
  fields: ContextField[]
  priority: 'high' | 'medium' | 'low'
}

export interface ContextField {
  id: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'multiselect'
  value: string | string[] | number
  options?: string[]
  required: boolean
  placeholder?: string
  description?: string
}

interface ContextCategoriesProps {
  contextData?: any
  businessId?: string
  onCategoryUpdate: (categoryId: string, data: any) => void
  className?: string
}

const defaultCategories: ContextCategory[] = [
  {
    id: 'business-details',
    title: 'Business Details',
    description: 'Basic business information, locations, and operating hours',
    icon: '🏢',
    completion: 0,
    priority: 'high',
    fields: [
      {
        id: 'business_name',
        label: 'Business Name',
        type: 'text',
        value: '',
        required: true,
        placeholder: 'Enter your business name'
      },
      {
        id: 'business_type',
        label: 'Business Type',
        type: 'select',
        value: '',
        required: true,
        options: ['restaurant', 'retail', 'service', 'grocery', 'other'],
        description: 'Primary business category'
      },
      {
        id: 'locations',
        label: 'Number of Locations',
        type: 'number',
        value: 1,
        required: true,
        description: 'How many physical locations do you have?'
      },
      {
        id: 'operating_hours',
        label: 'Operating Hours',
        type: 'textarea',
        value: '',
        required: false,
        placeholder: 'Mon-Fri 9:00-17:00, Sat 10:00-16:00'
      }
    ]
  },
  {
    id: 'products-services',
    title: 'Products & Services',
    description: 'Your catalog, pricing structure, and popular items',
    icon: '🛍️',
    completion: 0,
    priority: 'high',
    fields: [
      {
        id: 'main_products',
        label: 'Main Products/Services',
        type: 'multiselect',
        value: [],
        required: true,
        options: ['Food & Beverages', 'Clothing', 'Electronics', 'Home & Garden', 'Health & Beauty', 'Services', 'Other'],
        description: 'Select all that apply'
      },
      {
        id: 'popular_items',
        label: 'Popular Items',
        type: 'textarea',
        value: '',
        required: false,
        placeholder: 'List your most popular products or services'
      },
      {
        id: 'price_range',
        label: 'Typical Price Range',
        type: 'select',
        value: '',
        required: false,
        options: ['Under 50 SEK', '50-200 SEK', '200-500 SEK', '500-1000 SEK', 'Over 1000 SEK']
      },
      {
        id: 'seasonal_items',
        label: 'Seasonal Offerings',
        type: 'textarea',
        value: '',
        required: false,
        placeholder: 'Any seasonal products or services'
      }
    ]
  },
  {
    id: 'customer-demographics',
    title: 'Customer Demographics',
    description: 'Your typical customers, age groups, and preferences',
    icon: '👥',
    completion: 0,
    priority: 'medium',
    fields: [
      {
        id: 'primary_age_groups',
        label: 'Primary Age Groups',
        type: 'multiselect',
        value: [],
        required: false,
        options: ['Under 18', '18-25', '26-35', '36-45', '46-55', '56-65', 'Over 65']
      },
      {
        id: 'customer_types',
        label: 'Customer Types',
        type: 'multiselect',
        value: [],
        required: false,
        options: ['Families', 'Young Professionals', 'Students', 'Seniors', 'Tourists', 'Regular Locals', 'Business Customers']
      },
      {
        id: 'peak_times',
        label: 'Peak Customer Times',
        type: 'textarea',
        value: '',
        required: false,
        placeholder: 'When do you get the most customers? (e.g., lunch rush, weekends)'
      },
      {
        id: 'customer_preferences',
        label: 'Customer Preferences',
        type: 'textarea',
        value: '',
        required: false,
        placeholder: 'What do customers typically prefer or request?'
      }
    ]
  },
  {
    id: 'transaction-patterns',
    title: 'Transaction Patterns',
    description: 'Payment methods, transaction values, and purchase patterns',
    icon: '💳',
    completion: 0,
    priority: 'medium',
    fields: [
      {
        id: 'avg_transaction_value',
        label: 'Average Transaction Value (SEK)',
        type: 'number',
        value: 0,
        required: true,
        description: 'Typical amount per purchase'
      },
      {
        id: 'payment_methods',
        label: 'Accepted Payment Methods',
        type: 'multiselect',
        value: [],
        required: true,
        options: ['Cash', 'Card', 'Swish', 'Klarna', 'Other Mobile Pay']
      },
      {
        id: 'purchase_patterns',
        label: 'Common Purchase Patterns',
        type: 'textarea',
        value: '',
        required: false,
        placeholder: 'Single items, bulk purchases, repeat customers, etc.'
      },
      {
        id: 'busy_periods',
        label: 'Busy Periods',
        type: 'select',
        value: '',
        required: false,
        options: ['Morning Rush', 'Lunch Time', 'Afternoon', 'Evening', 'Weekends', 'Holidays']
      }
    ]
  },
  {
    id: 'operations',
    title: 'Operations',
    description: 'Staff count, departments, and operational processes',
    icon: '📋',
    completion: 0,
    priority: 'low',
    fields: [
      {
        id: 'staff_count',
        label: 'Total Staff Count',
        type: 'number',
        value: 0,
        required: false,
        description: 'Including part-time and full-time employees'
      },
      {
        id: 'departments',
        label: 'Departments/Areas',
        type: 'multiselect',
        value: [],
        required: false,
        options: ['Sales', 'Kitchen', 'Customer Service', 'Management', 'Warehouse', 'Cleaning', 'Security']
      },
      {
        id: 'pos_system',
        label: 'POS System',
        type: 'select',
        value: '',
        required: false,
        options: ['Square', 'Shopify POS', 'Klarna', 'Manual Register', 'Custom System', 'Other']
      },
      {
        id: 'quality_control',
        label: 'Quality Control Process',
        type: 'textarea',
        value: '',
        required: false,
        placeholder: 'How do you ensure quality and handle issues?'
      }
    ]
  },
  {
    id: 'business-goals',
    title: 'Business Goals',
    description: 'Your targets, KPIs, and focus areas',
    icon: '🎯',
    completion: 0,
    priority: 'medium',
    fields: [
      {
        id: 'primary_goals',
        label: 'Primary Business Goals',
        type: 'multiselect',
        value: [],
        required: false,
        options: ['Increase Sales', 'Improve Customer Satisfaction', 'Reduce Costs', 'Expand Locations', 'Better Reviews', 'Process Improvement']
      },
      {
        id: 'success_metrics',
        label: 'Success Metrics',
        type: 'textarea',
        value: '',
        required: false,
        placeholder: 'How do you measure success? (sales targets, customer ratings, etc.)'
      },
      {
        id: 'improvement_areas',
        label: 'Areas for Improvement',
        type: 'textarea',
        value: '',
        required: false,
        placeholder: 'What would you like to improve about your business?'
      },
      {
        id: 'competitive_advantage',
        label: 'Competitive Advantage',
        type: 'textarea',
        value: '',
        required: false,
        placeholder: 'What makes your business unique?'
      }
    ]
  }
]

export function ContextCategories({ contextData, businessId, onCategoryUpdate, className }: ContextCategoriesProps) {
  const [selectedCategory, setSelectedCategory] = useState<ContextCategory | null>(null)
  const [categories, setCategories] = useState<ContextCategory[]>(() => {
    // Initialize categories with data from contextData if available
    return defaultCategories.map(category => ({
      ...category,
      completion: calculateCategoryCompletion(category, contextData),
      fields: category.fields.map(field => ({
        ...field,
        value: getFieldValueFromContext(field.id, contextData) ?? field.value
      }))
    }))
  })

  const handleCategoryClick = (category: ContextCategory) => {
    setSelectedCategory(category)
  }

  const handleCategoryUpdate = async (categoryId: string, updatedFields: ContextField[]) => {
    // Update local state
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId
        ? {
            ...cat,
            fields: updatedFields,
            completion: calculateCategoryCompletion({ ...cat, fields: updatedFields })
          }
        : cat
    ))

    // Call parent update handler
    const categoryData = updatedFields.reduce((acc, field) => {
      acc[field.id] = field.value
      return acc
    }, {} as any)

    await onCategoryUpdate(categoryId, categoryData)
    setSelectedCategory(null)
  }

  const getCompletionColor = (completion: number) => {
    if (completion >= 80) return 'text-green-600'
    if (completion >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusIcon = (completion: number) => {
    if (completion >= 80) return '✓'
    if (completion >= 40) return '...'
    return '○'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50'
      case 'medium': return 'border-yellow-200 bg-yellow-50'
      case 'low': return 'border-green-200 bg-green-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const totalCompletion = categories.reduce((sum, cat) => sum + cat.completion, 0) / categories.length

  return (
    <div className={className}>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Context Categories</h3>
          <Badge variant={totalCompletion >= 85 ? 'default' : 'secondary'}>
            {Math.round(totalCompletion)}% Complete
          </Badge>
        </div>
        <Progress value={totalCompletion} className="w-full" />
        <p className="text-sm text-gray-600 mt-1">
          Target: 85% for optimal fraud detection
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((category) => (
          <Card
            key={category.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${getPriorityColor(category.priority)}`}
            onClick={() => handleCategoryClick(category)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{category.icon}</span>
                  <CardTitle className="text-base">{category.title}</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-lg ${getCompletionColor(category.completion)}`}>
                    {getStatusIcon(category.completion)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(category.completion)}%
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm mb-3">
                {category.description}
              </CardDescription>
              <Progress value={category.completion} className="w-full h-2" />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {category.fields.filter(f => isFieldComplete(f)).length} / {category.fields.length} fields
                </span>
                <Badge
                  variant={category.priority === 'high' ? 'destructive' : category.priority === 'medium' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {category.priority}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedCategory && businessId && (
        <ContextCategoryModal
          businessId={businessId}
          category={selectedCategory}
          isOpen={!!selectedCategory}
          onClose={() => setSelectedCategory(null)}
          onSave={handleCategoryUpdate}
        />
      )}
    </div>
  )
}

// Helper functions
function calculateCategoryCompletion(category: ContextCategory, contextData?: any): number {
  const fields = category.fields
  if (!fields || fields.length === 0) return 0

  const completedFields = fields.filter(field => isFieldComplete(field))
  return Math.round((completedFields.length / fields.length) * 100)
}

function isFieldComplete(field: ContextField): boolean {
  if (!field.value) return false

  if (Array.isArray(field.value)) {
    return field.value.length > 0
  }

  if (typeof field.value === 'string') {
    return field.value.trim().length > 0
  }

  if (typeof field.value === 'number') {
    return field.value > 0 || field.id === 'avg_transaction_value' // Allow 0 for transaction value
  }

  return false
}

function getFieldValueFromContext(fieldId: string, contextData?: any): any {
  if (!contextData || !contextData.context_data) return null

  const data = contextData.context_data

  // Map field IDs to context data properties
  const fieldMappings: Record<string, string> = {
    'business_type': 'businessType',
    'locations': 'storeCount',
    'avg_transaction_value': 'avgTransactionValue',
    'primary_goals': 'primaryGoals',
    'pos_system': 'posSystem',
    'departments': 'departments',
    'staff_roles': 'staffRoles',
    'popular_items': 'businessSpecialty',
    'improvement_areas': 'improvementArea',
    'competitive_advantage': 'uniqueOffering',
    'customer_preferences': 'targetCustomer'
  }

  const contextKey = fieldMappings[fieldId]
  return contextKey ? data[contextKey] : null
}