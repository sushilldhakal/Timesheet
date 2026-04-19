'use client'

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useEmployeeProfile } from '@/lib/queries/employee-clock'

export interface StaffOnboardingFormData {
  // Step 1: Personal Information (pre-filled from employee record)
  firstName: string
  lastName: string
  email: string
  phone: string

  // Step 2: Legal Details
  legalFirstName: string
  legalMiddleNames: string
  legalLastName: string
  preferredName: string
  nationality: string
  timeZone: string
  locale: string

  // Step 3: Tax Information
  tfn: string
  abn: string
  superannuationFund: string
  superannuationMemberNumber: string
  taxWithholdingPercentage: number
  hasHelpDebt: boolean

  // Step 4: Banking Details
  bankName: string
  accountNumber: string
  bsbCode: string
  accountHolderName: string
  accountType: 'savings' | 'cheque'

  // Step 5: Employment Details
  contractType: 'permanent' | 'fixed-term' | 'casual' | 'contractor'
  startDate: string
  endDate: string
  wageType: 'salary' | 'hourly' | 'piecework'
  salary: number
  noticePeriod: number
  probationPeriodEnd: string

  // Step 6: Compliance & Certifications
  wwcStatus: 'not_required' | 'pending' | 'active' | 'expired'
  wwcExpiryDate: string
  policeClearanceStatus: 'pending' | 'active' | 'expired'
  policeClearanceExpiryDate: string
  foodHandlingStatus: 'current' | 'expired'
  foodHandlingExpiryDate: string
}

export interface StaffOnboardingContextType {
  currentStep: number
  formData: StaffOnboardingFormData
  setFormData: (data: Partial<StaffOnboardingFormData>) => void
  nextStep: () => void
  prevStep: () => void
  setCurrentStep: (step: number) => void
  isLoading: boolean
}

const StaffOnboardingContext = createContext<StaffOnboardingContextType | undefined>(undefined)

const initialFormData: StaffOnboardingFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  legalFirstName: '',
  legalMiddleNames: '',
  legalLastName: '',
  preferredName: '',
  nationality: '',
  timeZone: 'Australia/Sydney',
  locale: 'en-AU',
  tfn: '',
  abn: '',
  superannuationFund: '',
  superannuationMemberNumber: '',
  taxWithholdingPercentage: 0,
  hasHelpDebt: false,
  bankName: '',
  accountNumber: '',
  bsbCode: '',
  accountHolderName: '',
  accountType: 'savings',
  contractType: 'permanent',
  startDate: '',
  endDate: '',
  wageType: 'salary',
  salary: 0,
  noticePeriod: 2,
  probationPeriodEnd: '',
  wwcStatus: 'pending',
  wwcExpiryDate: '',
  policeClearanceStatus: 'pending',
  policeClearanceExpiryDate: '',
  foodHandlingStatus: 'current',
  foodHandlingExpiryDate: '',
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormDataState] = useState<StaffOnboardingFormData>(initialFormData)
  const [isLoading, setIsLoading] = useState(true)
  
  const employeeProfileQuery = useEmployeeProfile()

  // Pre-fill form data from employee profile
  useEffect(() => {
    if (employeeProfileQuery.data?.data?.employee) {
      const employee = employeeProfileQuery.data.data.employee
      const nameParts = employee.name?.split(' ') || ['', '']
      
      setFormDataState(prev => ({
        ...prev,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: employee.email || '',
        phone: employee.phone || '',
        // Pre-fill legal names with the same values initially
        legalFirstName: nameParts[0] || '',
        legalLastName: nameParts.slice(1).join(' ') || '',
      }))
      setIsLoading(false)
    }
  }, [employeeProfileQuery.data])

  const setFormData = (data: Partial<StaffOnboardingFormData>) => {
    setFormDataState((prev) => ({ ...prev, ...data }))
  }

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 7))
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  return (
    <StaffOnboardingContext.Provider value={{ 
      currentStep, 
      formData, 
      setFormData, 
      nextStep, 
      prevStep, 
      setCurrentStep,
      isLoading 
    }}>
      {children}
    </StaffOnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(StaffOnboardingContext)
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider')
  return context
}