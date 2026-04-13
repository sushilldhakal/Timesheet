'use client'

import React, { createContext, useContext, useState, type ReactNode } from 'react'

export interface OnboardingFormData {
  firstName: string
  lastName: string
  email: string
  phone: string

  legalFirstName: string
  legalMiddleNames: string
  legalLastName: string
  preferredName: string
  nationality: string
  timeZone: string
  locale: string

  tfn: string
  abn: string
  superannuationFund: string
  superannuationMemberNumber: string
  taxWithholdingPercentage: number
  hasHelpDebt: boolean

  bankName: string
  accountNumber: string
  bsbCode: string
  accountHolderName: string
  accountType: 'savings' | 'cheque'

  contractType: 'permanent' | 'fixed-term' | 'casual' | 'contractor'
  startDate: string
  endDate: string
  wageType: 'salary' | 'hourly' | 'piecework'
  salary: number
  noticePeriod: number
  probationPeriodEnd: string

  wwcStatus: string
  wwcExpiryDate: string
  policeClearanceStatus: string
  policeClearanceExpiryDate: string
  foodHandlingStatus: string
  foodHandlingExpiryDate: string
}

export interface OnboardingContextType {
  currentStep: number
  formData: OnboardingFormData
  setFormData: (data: Partial<OnboardingFormData>) => void
  nextStep: () => void
  prevStep: () => void
  setCurrentStep: (step: number) => void
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

const initialFormData: OnboardingFormData = {
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
  const [formData, setFormDataState] = useState<OnboardingFormData>(initialFormData)

  const setFormData = (data: Partial<OnboardingFormData>) => {
    setFormDataState((prev) => ({ ...prev, ...data }))
  }

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 7))
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  return (
    <OnboardingContext.Provider value={{ currentStep, formData, setFormData, nextStep, prevStep, setCurrentStep }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider')
  return context
}
