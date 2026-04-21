'use client'

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useEmployeeProfile } from '@/lib/queries/employee-clock'

export interface StaffOnboardingFormData {
  // Step 1: Personal & Legal
  firstName: string
  lastName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postcode: string
  country: string
  legalFirstName: string
  legalMiddleNames: string
  legalLastName: string
  preferredName: string
  nationality: string
  timeZone: string
  emergencyContactName: string
  emergencyContactPhone: string
  australianIdType: 'drivers_licence' | 'medicare' | 'passport' | ''
  australianIdNumber: string
  visaType: string
  visaNumber: string
  maxHoursPerFortnight: number

  // Step 2: Tax & Banking
  tfn: string
  taxFreeThreshold: boolean
  superannuationFund: string
  superannuationMemberNumber: string
  hasHelpDebt: boolean
  bankName: string
  accountNumber: string
  bsbCode: string
  accountHolderName: string
  accountType: 'savings' | 'cheque'

  // Step 3: Compliance (only if requiresCompliance)
  wwcStatus: 'not_required' | 'pending' | 'active' | 'expired'
  wwcExpiryDate: string
  policeClearanceStatus: 'pending' | 'active' | 'expired'
  policeClearanceExpiryDate: string
  foodHandlingStatus: 'current' | 'expired'
  foodHandlingExpiryDate: string
}

export interface StaffOnboardingContextType {
  currentStep: number
  totalSteps: number
  formData: StaffOnboardingFormData
  requiresCompliance: boolean
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
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postcode: '',
  country: 'Australia',
  legalFirstName: '',
  legalMiddleNames: '',
  legalLastName: '',
  preferredName: '',
  nationality: '',
  timeZone: 'Australia/Melbourne',
  emergencyContactName: '',
  emergencyContactPhone: '',
  australianIdType: '',
  australianIdNumber: '',
  visaType: '',
  visaNumber: '',
  maxHoursPerFortnight: 0,
  tfn: '',
  taxFreeThreshold: true,
  superannuationFund: '',
  superannuationMemberNumber: '',
  hasHelpDebt: false,
  bankName: '',
  accountNumber: '',
  bsbCode: '',
  accountHolderName: '',
  accountType: 'savings',
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
  const [requiresCompliance, setRequiresCompliance] = useState(false)

  const employeeProfileQuery = useEmployeeProfile()

  useEffect(() => {
    if (employeeProfileQuery.isLoading) return

    if (employeeProfileQuery.data?.data?.employee) {
      const employee = employeeProfileQuery.data.data.employee
      const nameParts = employee.name?.split(' ') || ['', '']

      setFormDataState(prev => ({
        ...prev,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: employee.email || '',
        phone: employee.phone || '',
        legalFirstName: nameParts[0] || '',
        legalLastName: nameParts.slice(1).join(' ') || '',
        timeZone: (employee as any).timeZone || prev.timeZone,
        nationality: (employee as any).nationality || prev.nationality,
        preferredName: (employee as any).preferredName || prev.preferredName,
        legalMiddleNames: (employee as any).legalMiddleNames || prev.legalMiddleNames,
        addressLine1: (employee as any)?.address?.line1 || prev.addressLine1,
        addressLine2: (employee as any)?.address?.line2 || prev.addressLine2,
        city: (employee as any)?.address?.city || prev.city,
        state: (employee as any)?.address?.state || prev.state,
        postcode: (employee as any)?.address?.postcode || prev.postcode,
        country: (employee as any)?.address?.country || prev.country,
        emergencyContactName: (employee as any)?.emergencyContact?.name || prev.emergencyContactName,
        emergencyContactPhone: (employee as any)?.emergencyContact?.phone || prev.emergencyContactPhone,
      }))

      // Set by admin when creating the employee - derive from certifications array
      const hasCertifications = Array.isArray((employee as any).certifications) && (employee as any).certifications.length > 0
      setRequiresCompliance(hasCertifications)
    }

    setIsLoading(false)
  }, [employeeProfileQuery.data, employeeProfileQuery.isLoading, employeeProfileQuery.isError])

  const setFormData = (data: Partial<StaffOnboardingFormData>) => {
    setFormDataState((prev) => ({ ...prev, ...data }))
  }

  // Base: Step 1 (Personal+Legal), Step 2 (Tax+Banking), Step 3 (Review)
  // +1 if compliance required: Step 3 (Compliance), Step 4 (Review)
  const totalSteps = requiresCompliance ? 4 : 3

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  return (
    <StaffOnboardingContext.Provider value={{
      currentStep,
      totalSteps,
      formData,
      requiresCompliance,
      setFormData,
      nextStep,
      prevStep,
      setCurrentStep,
      isLoading,
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
