'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useOnboarding } from '@/lib/context/staff-onboarding-context'
import { staffOnboardingStep4Schema, type StaffOnboardingStep4Data } from '@/lib/validations/staff-onboarding'
import { useState } from 'react'
import { Loader2, ChevronLeft, CheckCircle, AlertCircle, X, FileText, Image } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'

function FilePreview({ url, onRemove, disabled }: { url: string; onRemove: () => void; disabled?: boolean }) {
  const isPdf = url.toLowerCase().includes('.pdf') || url.includes('application/pdf')
  const filename = url.split('/').pop()?.split('?')[0] || 'Uploaded file'
  return (
    <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md text-sm">
      {isPdf
        ? <FileText className="h-4 w-4 text-green-600 shrink-0" />
        : <Image className="h-4 w-4 text-green-600 shrink-0" />}
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex-1 truncate text-green-700 dark:text-green-400 hover:underline text-xs">
        {filename}
      </a>
      <button type="button" onClick={onRemove} disabled={disabled}
        className="shrink-0 text-muted-foreground hover:text-red-500 disabled:opacity-50">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

interface UploadFieldProps {
  label: string
  required?: boolean
  docKey: string
  uploadedDocs: Record<string, string>
  uploadingKeys: Set<string>
  uploadErrors: Record<string, string>
  onUpload: (file: File, key: string) => Promise<string | null>
  onRemove: (key: string) => void
}

function UploadField({ label, required, docKey, uploadedDocs, uploadingKeys, uploadErrors, onUpload, onRemove }: UploadFieldProps) {
  const url = uploadedDocs[docKey]
  const uploading = uploadingKeys.has(docKey)
  return (
    <div className="space-y-2">
      <Label>{label}{required ? ' *' : ''}</Label>
      {url ? (
        <FilePreview url={url} onRemove={() => onRemove(docKey)} disabled={uploading} />
      ) : (
        <div className="flex flex-col sm:flex-row gap-2 items-start">
          <input
            type="file"
            accept="image/*,.pdf"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) {
                await onUpload(file, docKey)
                e.target.value = ''
              }
            }}
            className="flex-1 text-sm"
          />
          {uploading && <Loader2 className="h-5 w-5 animate-spin shrink-0 mt-1" />}
        </div>
      )}
      {uploadErrors[docKey] && <p className="text-xs text-red-500">{uploadErrors[docKey]}</p>}
    </div>
  )
}

export function StaffOnboardingStep4() {
  const { formData, setFormData, nextStep, prevStep, onboardingCountry, certifications } = useOnboarding()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialise from persisted formData so uploads survive navigation / page reload
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    if (formData.passportDocUrl) init.passport = formData.passportDocUrl
    if (formData.visaDocUrl) init.visa = formData.visaDocUrl
    if (formData.citizenshipDocFrontUrl) init.citizenshipFront = formData.citizenshipDocFrontUrl
    if (formData.citizenshipDocBackUrl) init.citizenshipBack = formData.citizenshipDocBackUrl
    certifications.forEach(c => { if (c.documentUrl) init[c.type] = c.documentUrl })
    return init
  })
  const [uploadingKeys, setUploadingKeys] = useState<Set<string>>(new Set())
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({})

  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StaffOnboardingStep4Data>({
    resolver: zodResolver(staffOnboardingStep4Schema),
    defaultValues: {
      country: onboardingCountry,
      workRightsType: formData.workRightsType,
      australianIdType: formData.australianIdType,
      certifications: certifications.map(c => ({
        type: c.type,
        label: c.label,
        required: c.required,
        provided: c.provided,
        documentUrl: c.documentUrl,
        expiryDate: c.expiryDate ? new Date(c.expiryDate).toISOString().split('T')[0] : undefined,
      })),
      passportDocUrl: formData.passportDocUrl || undefined,
      visaDocUrl: formData.visaDocUrl || undefined,
      citizenshipDocFrontUrl: formData.citizenshipDocFrontUrl || undefined,
      citizenshipDocBackUrl: formData.citizenshipDocBackUrl || undefined,
    },
  })

  const syncToForm = (key: string, url: string | undefined) => {
    if (key === 'passport') setValue('passportDocUrl', url, { shouldValidate: true })
    else if (key === 'visa') setValue('visaDocUrl', url, { shouldValidate: true })
    else if (key === 'citizenshipFront') setValue('citizenshipDocFrontUrl', url, { shouldValidate: true })
    else if (key === 'citizenshipBack') setValue('citizenshipDocBackUrl', url, { shouldValidate: true })
    else {
      const certIndex = certifications.findIndex(c => c.type === key)
      if (certIndex !== -1) setValue(`certifications.${certIndex}.documentUrl`, url, { shouldValidate: true })
    }
  }

  const handleFileUpload = async (file: File, key: string): Promise<string | null> => {
    setUploadingKeys(prev => new Set(prev).add(key))
    setUploadErrors(prev => { const n = { ...prev }; delete n[key]; return n })
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'onboarding-docs')
      const res = await fetch('/api/employee/upload/image', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      const { url } = await res.json()
      setUploadedDocs(prev => ({ ...prev, [key]: url }))
      syncToForm(key, url)
      return url
    } catch {
      setUploadErrors(prev => ({ ...prev, [key]: 'Upload failed. Please try again.' }))
      return null
    } finally {
      setUploadingKeys(prev => { const n = new Set(prev); n.delete(key); return n })
    }
  }

  const handleRemove = (key: string) => {
    setUploadedDocs(prev => { const n = { ...prev }; delete n[key]; return n })
    syncToForm(key, undefined)
  }

  const onSubmit = async (data: StaffOnboardingStep4Data) => {
    setIsSubmitting(true)
    try {
      const updatedCertifications = certifications.map(cert => ({
        ...cert,
        documentUrl: uploadedDocs[cert.type] || cert.documentUrl,
        provided: !!uploadedDocs[cert.type] || cert.provided,
      }))

      await fetch('/api/employee/onboarding-progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 4,
          data: {
            country: onboardingCountry,
            workRightsType: formData.workRightsType,
            australianIdType: formData.australianIdType,
            certifications: updatedCertifications,
            citizenshipDocFrontUrl: uploadedDocs.citizenshipFront,
            citizenshipDocBackUrl: uploadedDocs.citizenshipBack,
            passportDocUrl: uploadedDocs.passport,
            visaDocUrl: uploadedDocs.visa,
          },
        }),
      })

      // Persist URLs into context so they survive step navigation
      setFormData({
        passportDocUrl: uploadedDocs.passport || '',
        visaDocUrl: uploadedDocs.visa || '',
        citizenshipDocFrontUrl: uploadedDocs.citizenshipFront || '',
        citizenshipDocBackUrl: uploadedDocs.citizenshipBack || '',
      })

      nextStep()
    } catch (error) {
      console.error('Failed to save progress:', error)
      alert('Failed to save progress. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const requiredCerts = certifications.filter(c => c.required)
  const optionalCerts = certifications.filter(c => !c.required)

  const uploadFieldProps = { uploadedDocs, uploadingKeys, uploadErrors, onUpload: handleFileUpload, onRemove: handleRemove }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground sm:text-2xl">Documents</h2>
        <p className="text-sm text-muted-foreground">Upload required documents and certifications</p>
      </div>

      {/* AU identity documents */}
      {onboardingCountry === 'AU' && (
        (((formData.workRightsType === 'au_citizen' || formData.workRightsType === 'au_resident') && formData.australianIdType === 'passport') ||
        formData.workRightsType === 'visa_holder')
      ) && (
        <div className="space-y-4">
          <h3 className="text-base sm:text-lg font-medium">Identity Documents</h3>
          <Card className="p-4 space-y-4">
            <UploadField
              label={formData.workRightsType === 'visa_holder' ? 'Passport Scan — required for visa holders' : 'Passport Scan — required to verify your identity'}
              required
              docKey="passport"
              {...uploadFieldProps}
            />
            {formData.workRightsType === 'visa_holder' && (
              <UploadField label="Visa Grant Notice" required docKey="visa" {...uploadFieldProps} />
            )}
          </Card>
        </div>
      )}

      {/* NP citizenship documents */}
      {onboardingCountry === 'NP' && (
        <div className="space-y-4">
          <h3 className="text-base sm:text-lg font-medium">Citizenship Documents</h3>
          <Card className="p-4 space-y-4">
            <UploadField label="Citizenship Certificate (Front)" required docKey="citizenshipFront" {...uploadFieldProps} />
            <UploadField label="Citizenship Certificate (Back)" docKey="citizenshipBack" {...uploadFieldProps} />
          </Card>
        </div>
      )}

      {/* Required Certifications */}
      {requiredCerts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base sm:text-lg font-medium">Required Certifications</h3>
          <div className="space-y-3">
            {requiredCerts.map((cert, i) => (
              <Card key={cert.type} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Label className="text-base">{cert.label || cert.type}</Label>
                    {cert.expiryDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {uploadedDocs[cert.type] && <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />}
                </div>
                <UploadField label="" required docKey={cert.type} {...uploadFieldProps} />
                {errors.certifications?.[i]?.documentUrl && (
                  <p className="text-xs text-red-500">{errors.certifications[i]?.documentUrl?.message}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Optional Certifications */}
      {optionalCerts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base sm:text-lg font-medium">Optional Certifications</h3>
          <p className="text-sm text-muted-foreground">You can upload these now or provide them later</p>
          <div className="space-y-3">
            {optionalCerts.map((cert) => (
              <Card key={cert.type} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Label className="text-base">{cert.label || cert.type}</Label>
                    <p className="text-xs text-muted-foreground mt-1">Optional</p>
                  </div>
                  {uploadedDocs[cert.type] && <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />}
                </div>
                <UploadField label="" docKey={cert.type} {...uploadFieldProps} />
              </Card>
            ))}
          </div>
        </div>
      )}

      {certifications.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs sm:text-sm">
            No certifications required for your role. You can proceed to the next step.
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs sm:text-sm">
          Accepted formats: JPG, PNG, PDF (max 10MB per file)
        </AlertDescription>
      </Alert>

      <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4">
        <Button type="button" variant="outline" onClick={prevStep} className="w-full sm:w-auto">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" disabled={isSubmitting || uploadingKeys.size > 0} className="w-full sm:w-auto">
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Next'}
        </Button>
      </div>
    </form>
  )
}
