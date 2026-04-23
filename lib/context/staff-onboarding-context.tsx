'use client'

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useEmployeeProfile } from '@/lib/queries/employee-clock'

export interface IEmployeeCertification {
  type: 'wwcc' | 'police_check' | 'food_safety' | 'rsa' | 'other'
  label?: string
  required: boolean
  provided: boolean
  expiryDate?: Date
  documentUrl?: string
}

export interface StaffOnboardingFormData {
  // Step 1: Personal Details
  legalFirstName: string
  legalLastName: string
  legalMiddleNames: string
  preferredName: string
  dob: string
  gender: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postcode: string
  country: string
  emergencyContactName: string
  emergencyContactRelationship: string
  emergencyContactPhone: string

  // Step 2: Work Eligibility (country-aware)
  workRightsType: string
  australianIdType: string
  australianIdNumber: string
  passportNumber: string
  passportExpiry: string
  visaSubclass: string
  visaGrantNumber: string
  visaWorkConditions: string
  maxHoursPerFortnight: number
  licenceIssuedState: string
  licenceExpiry: string
  licenceCardNumber: string
  passportIssuingCountry: string
  citizenshipCertNumber: string
  citizenshipIssuedDistrict: string
  citizenshipIssuedDate: string
  nationalIdNumber: string
  workPermitNumber: string
  workPermitExpiry: string

  // Step 3: Tax (country-aware)
  tfn: string
  taxFreeThreshold: boolean
  residencyStatusAU: string
  hasHelpDebt: boolean
  panNepal: string
  irdNumber: string
  taxCodeNZ: string
  panForTax: string

  // Step 4: Banking & Super (country-aware)
  bankName: string
  bsbCode: string
  accountNumber: string
  accountHolderName: string
  accountType: 'savings' | 'cheque'
  superFundName: string
  superUSI: string
  superMemberNumber: string
  nepalBankName: string
  nepalBranch: string
  nepalAccountNumber: string
  ssfNumber: string
  nzAccountNumber: string
  kiwiSaverOptIn: boolean
  kiwiSaverFund: string
  kiwiSaverRate: number

  // Step 5: Documents — country-specific doc URLs
  passportDocUrl: string
  visaDocUrl: string
  citizenshipDocFrontUrl: string
  citizenshipDocBackUrl: string

  // Step 6: Review & Submit
  consentGiven: boolean
}

export interface StaffOnboardingContextType {
  currentStep: number
  totalSteps: number
  formData: StaffOnboardingFormData
  onboardingCountry: 'AU' | 'NZ' | 'IN' | 'NP'
  certifications: IEmployeeCertification[]
  completedSteps: number[]
  setFormData: (data: Partial<StaffOnboardingFormData>) => void
  nextStep: () => void
  prevStep: () => void
  setCurrentStep: (step: number) => void
  isLoading: boolean
}

const StaffOnboardingContext = createContext<StaffOnboardingContextType | undefined>(undefined)

const initialFormData: StaffOnboardingFormData = {
  legalFirstName: '',
  legalLastName: '',
  legalMiddleNames: '',
  preferredName: '',
  dob: '',
  gender: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postcode: '',
  country: 'Australia',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
  workRightsType: '',
  australianIdType: '',
  australianIdNumber: '',
  passportNumber: '',
  passportExpiry: '',
  visaSubclass: '',
  visaGrantNumber: '',
  visaWorkConditions: '',
  maxHoursPerFortnight: 0,
  licenceIssuedState: '',
  licenceExpiry: '',
  licenceCardNumber: '',
  passportIssuingCountry: '',
  citizenshipCertNumber: '',
  citizenshipIssuedDistrict: '',
  citizenshipIssuedDate: '',
  nationalIdNumber: '',
  workPermitNumber: '',
  workPermitExpiry: '',
  tfn: '',
  taxFreeThreshold: true,
  residencyStatusAU: 'resident',
  hasHelpDebt: false,
  panNepal: '',
  irdNumber: '',
  taxCodeNZ: '',
  panForTax: '',
  bankName: '',
  bsbCode: '',
  accountNumber: '',
  accountHolderName: '',
  accountType: 'savings',
  superFundName: '',
  superUSI: '',
  superMemberNumber: '',
  nepalBankName: '',
  nepalBranch: '',
  nepalAccountNumber: '',
  ssfNumber: '',
  nzAccountNumber: '',
  kiwiSaverOptIn: false,
  kiwiSaverFund: '',
  kiwiSaverRate: 0,
  passportDocUrl: '',
  visaDocUrl: '',
  citizenshipDocFrontUrl: '',
  citizenshipDocBackUrl: '',
  consentGiven: false,
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormDataState] = useState<StaffOnboardingFormData>(initialFormData)
  const [isLoading, setIsLoading] = useState(true)
  const [onboardingCountry, setOnboardingCountry] = useState<'AU' | 'NZ' | 'IN' | 'NP'>('AU')
  const [certifications, setCertifications] = useState<IEmployeeCertification[]>([])
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const employeeProfileQuery = useEmployeeProfile()

  useEffect(() => {
    if (employeeProfileQuery.isLoading) return

    if (employeeProfileQuery.data?.data?.employee) {
      const employee = employeeProfileQuery.data.data.employee
      const nameParts = employee.name?.split(' ') || ['', '']

      setFormDataState(prev => ({
        ...prev,
        legalFirstName: (employee as any).legalFirstName || nameParts[0] || '',
        legalLastName: (employee as any).legalLastName || nameParts.slice(1).join(' ') || '',
        legalMiddleNames: (employee as any).legalMiddleNames || '',
        preferredName: (employee as any).preferredName || '',
        dob: (employee as any).dob || '',
        gender: (employee as any).gender || '',
        addressLine1: (employee as any)?.address?.line1 || '',
        addressLine2: (employee as any)?.address?.line2 || '',
        city: (employee as any)?.address?.city || '',
        state: (employee as any)?.address?.state || '',
        postcode: (employee as any)?.address?.postcode || '',
        country: (employee as any)?.address?.country || 'Australia',
        emergencyContactName: (employee as any)?.emergencyContact?.name || '',
        emergencyContactRelationship: (employee as any)?.emergencyContact?.relationship || '',
        emergencyContactPhone: (employee as any)?.emergencyContact?.phone || '',
      }))

      // Set onboarding country from employee record
      setOnboardingCountry((employee as any).onboardingCountry || 'AU')
      
      // Set certifications from employee record
      setCertifications((employee as any).certifications || [])
    }

    // Load saved progress from API
    fetch('/api/employee/onboarding-progress')
      .then(res => res.json())
      .then(data => {
        if (data.completedSteps) {
          setCompletedSteps(data.completedSteps)
          // Resume from first incomplete step (max 5)
          const nextStep = data.completedSteps.length + 1
          if (nextStep <= 5) {
            setCurrentStep(nextStep)
          }
        }
        if (data.onboardingCountry) {
          setOnboardingCountry(data.onboardingCountry)
        }
        if (data.certifications) {
          setCertifications(data.certifications)
        }

        // Hydrate saved step 2 (compliance) data for resume
        const compliance = data.savedData?.compliance as any
        if (compliance) {
          setFormDataState(prev => ({
            ...prev,
            workRightsType: compliance.workRightsType || prev.workRightsType,
            australianIdType: compliance.australianIdType || prev.australianIdType,
            australianIdNumber: compliance.australianIdNumber || prev.australianIdNumber,
            passportNumber: compliance.passportNumber || prev.passportNumber,
            passportExpiry: compliance.passportExpiry
              ? new Date(compliance.passportExpiry).toISOString().split('T')[0]
              : prev.passportExpiry,
            visaSubclass: compliance.visaSubclass || prev.visaSubclass,
            visaGrantNumber: compliance.visaGrantNumber || prev.visaGrantNumber,
            visaWorkConditions: compliance.visaWorkConditions || prev.visaWorkConditions,
            maxHoursPerFortnight: compliance.maxHoursPerFortnight || prev.maxHoursPerFortnight,
            citizenshipCertNumber: compliance.citizenshipCertNumber || prev.citizenshipCertNumber,
            citizenshipIssuedDistrict: compliance.citizenshipIssuedDistrict || prev.citizenshipIssuedDistrict,
            citizenshipIssuedDate: compliance.citizenshipIssuedDate
              ? new Date(compliance.citizenshipIssuedDate).toISOString().split('T')[0]
              : prev.citizenshipIssuedDate,
            nationalIdNumber: compliance.nationalIdNumber || prev.nationalIdNumber,
            panNepal: compliance.panNepal || prev.panNepal,
            irdNumber: compliance.irdNumber || prev.irdNumber,
            taxCodeNZ: compliance.taxCodeNZ || prev.taxCodeNZ,
            // Tax fields now stored on compliance
            tfn: compliance.tfn || prev.tfn,
            taxFreeThreshold: compliance.taxFreeThreshold ?? prev.taxFreeThreshold,
            hasHelpDebt: compliance.hasHelpDebt ?? prev.hasHelpDebt,
            // Document URLs
            passportDocUrl: compliance.passportDocUrl || prev.passportDocUrl,
            visaDocUrl: compliance.visaDocUrl || prev.visaDocUrl,
            citizenshipDocFrontUrl: compliance.citizenshipDocFrontUrl || prev.citizenshipDocFrontUrl,
            citizenshipDocBackUrl: compliance.citizenshipDocBackUrl || prev.citizenshipDocBackUrl,
          }))
        }

        // Hydrate saved step 3 (banking) data for resume
        const bankDetails = data.savedData?.bankDetails as any
        if (bankDetails) {
          setFormDataState(prev => ({
            ...prev,
            bankName: bankDetails.bankName || prev.bankName,
            bsbCode: bankDetails.bsbCode || prev.bsbCode,
            accountNumber: bankDetails.accountNumber || prev.accountNumber,
            accountHolderName: bankDetails.accountHolderName || prev.accountHolderName,
            accountType: bankDetails.accountType || prev.accountType,
            superFundName: bankDetails.superFundName || prev.superFundName,
            superUSI: bankDetails.superUSI || prev.superUSI,
            superMemberNumber: bankDetails.superMemberNumber || prev.superMemberNumber,
            nepalBankName: bankDetails.nepalBankName || prev.nepalBankName,
            nepalBranch: bankDetails.nepalBranch || prev.nepalBranch,
            nepalAccountNumber: bankDetails.nepalAccountNumber || prev.nepalAccountNumber,
            ssfNumber: bankDetails.ssfNumber || prev.ssfNumber,
          }))
        }
      })
      .catch(err => {
        console.error('Failed to load onboarding progress:', err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [employeeProfileQuery.data, employeeProfileQuery.isLoading])

  const setFormData = (data: Partial<StaffOnboardingFormData>) => {
    setFormDataState((prev) => ({ ...prev, ...data }))
  }

  const totalSteps = 5 // 5 steps after merging work eligibility + tax

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  return (
    <StaffOnboardingContext.Provider value={{
      currentStep,
      totalSteps,
      formData,
      onboardingCountry,
      certifications,
      completedSteps,
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
