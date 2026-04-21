import { EmployeePayrollDbQueries } from '@/lib/db/queries/employee-payroll';
import { apiErrors } from '@/lib/api/api-error';
import { connectDB } from '@/lib/db';

function computeStatus(expiryDate?: Date | null): 'current' | 'expired' | 'pending' {
  if (!expiryDate) return 'current';
  return new Date(expiryDate) < new Date() ? 'expired' : 'current';
}

function maskAccount(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) return '****';
  return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
}

const EXPIRY_WARNING_DAYS = 30;
function buildAlerts(compliance: any): Array<{ type: string; field: string; message: string; expiryDate?: string }> {
  const alerts: Array<{ type: string; field: string; message: string; expiryDate?: string }> = [];
  const now = new Date();
  const warningThreshold = new Date(now.getTime() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000);

  const checkExpiry = (dRaw: any, field: string, expiredMsg: string, soonMsg: string) => {
    if (!dRaw) return;
    const d = new Date(dRaw);
    if (d < now) alerts.push({ type: 'expired', field, message: expiredMsg, expiryDate: d.toISOString() });
    else if (d < warningThreshold) alerts.push({ type: 'expiring_soon', field, message: soonMsg, expiryDate: d.toISOString() });
  };

  checkExpiry(compliance.wwcExpiryDate, 'wwc', 'Working with Children Check has expired', 'Working with Children Check expires within 30 days');
  checkExpiry(compliance.policeClearanceExpiryDate, 'policeClearance', 'Police clearance has expired', 'Police clearance expires within 30 days');
  checkExpiry(compliance.foodHandlingExpiryDate, 'foodHandling', 'Food handling certificate has expired', 'Food handling certificate expires within 30 days');

  if (!compliance.inductionCompleted) alerts.push({ type: 'missing', field: 'induction', message: 'Induction has not been completed' });
  if (!compliance.codeOfConductSigned) alerts.push({ type: 'missing', field: 'codeOfConduct', message: 'Code of conduct has not been signed' });
  return alerts;
}

function formatQualification(q: any) {
  return {
    id: String(q._id),
    employeeId: String(q.employeeId),
    qualificationName: q.qualificationName,
    issuingBody: q.issuingBody,
    issueDate: q.issueDate?.toISOString() ?? null,
    expiryDate: q.expiryDate?.toISOString() ?? null,
    licenseNumber: q.licenseNumber || null,
    status: q.status,
    documentUrl: q.documentUrl || null,
  };
}

function formatContract(c: any) {
  return {
    id: String(c._id),
    employeeId: String(c.employeeId),
    startDate: c.startDate?.toISOString() ?? null,
    endDate: c.endDate?.toISOString() ?? null,
    contractType: c.contractType,
    noticePeriod: c.noticePeriod ?? null,
    probationPeriodEnd: c.probationPeriodEnd?.toISOString() ?? null,
    contractTermsUrl: c.contractTermsUrl || null,
    salary: c.salary ?? null,
    wageType: c.wageType,
    isActive: c.isActive,
  };
}

function formatCompliance(c: any) {
  return {
    id: String(c._id),
    employeeId: String(c.employeeId),
    workRightsType: c.workRightsType || null,
    australianIdType: c.australianIdType ?? null,
    australianIdNumber: c.australianIdNumber ?? null,
    visaType: c.visaType ?? null,
    visaNumber: c.visaNumber ?? null,
    workRightsStatus: c.workRightsStatus || null,
    workRightsLastCheckedAt: c.workRightsLastCheckedAt?.toISOString() ?? null,
    wwcStatus: c.wwcStatus || null,
    wwcNumber: c.wwcNumber || null,
    wwcExpiryDate: c.wwcExpiryDate?.toISOString() ?? null,
    policeClearanceStatus: c.policeClearanceStatus || null,
    policeClearanceNumber: c.policeClearanceNumber || null,
    policeClearanceExpiryDate: c.policeClearanceExpiryDate?.toISOString() ?? null,
    foodHandlingStatus: c.foodHandlingStatus || null,
    foodHandlingExpiryDate: c.foodHandlingExpiryDate?.toISOString() ?? null,
    healthSafetyCertifications: c.healthSafetyCertifications || [],
    inductionCompleted: c.inductionCompleted ?? false,
    inductionDate: c.inductionDate?.toISOString() ?? null,
    inductionDocUrl: c.inductionDocUrl || null,
    codeOfConductSigned: c.codeOfConductSigned ?? false,
    codeOfConductDate: c.codeOfConductDate?.toISOString() ?? null,
    codeOfConductDocUrl: c.codeOfConductDocUrl || null,
    lastComplianceCheckDate: c.lastComplianceCheckDate?.toISOString() ?? null,
    alerts: buildAlerts(c),
  };
}

export class EmployeePayrollService {
  async listQualifications(employeeId: string) {
    await connectDB();
    const employee = await EmployeePayrollDbQueries.findEmployeeByIdLean(employeeId);
    if (!employee) throw apiErrors.notFound('Employee not found');
    const qualifications = await EmployeePayrollDbQueries.listQualificationsLean(employeeId);
    return { qualifications: (qualifications as any[]).map(formatQualification) };
  }

  async addQualification(employeeId: string, body: any) {
    await connectDB();
    const employee = await EmployeePayrollDbQueries.findEmployeeByIdLean(employeeId);
    if (!employee) throw apiErrors.notFound('Employee not found');
    const expiryDate = body.expiryDate ? new Date(body.expiryDate) : undefined;
    const status = body.status || computeStatus(expiryDate);
    const qualification = await EmployeePayrollDbQueries.createQualification({
      employeeId,
      qualificationName: body.qualificationName,
      issuingBody: body.issuingBody,
      issueDate: new Date(body.issueDate),
      expiryDate,
      licenseNumber: body.licenseNumber,
      status,
      documentUrl: body.documentUrl,
    });
    return { qualification: formatQualification(qualification) };
  }

  async updateQualification(employeeId: string, body: any) {
    await connectDB();
    const { qualificationId, ...updateData } = body as any;
    if (!qualificationId) throw apiErrors.badRequest('qualificationId is required');

    const updates: Record<string, unknown> = {};
    if (updateData.qualificationName) updates.qualificationName = updateData.qualificationName;
    if (updateData.issuingBody) updates.issuingBody = updateData.issuingBody;
    if (updateData.issueDate) updates.issueDate = new Date(updateData.issueDate);
    if (updateData.expiryDate !== undefined) {
      updates.expiryDate = updateData.expiryDate ? new Date(updateData.expiryDate) : null;
      if (!updateData.status) updates.status = computeStatus(updateData.expiryDate ? new Date(updateData.expiryDate) : null);
    }
    if (updateData.licenseNumber !== undefined) updates.licenseNumber = updateData.licenseNumber;
    if (updateData.status) updates.status = updateData.status;
    if (updateData.documentUrl !== undefined) updates.documentUrl = updateData.documentUrl;

    const qualification = await EmployeePayrollDbQueries.updateQualificationLean({ qualificationId, employeeId, updates });
    if (!qualification) throw apiErrors.notFound('Qualification not found');
    return { qualification: formatQualification(qualification) };
  }

  async deleteQualification(employeeId: string, qualificationId: string) {
    await connectDB();
    const deleted = await EmployeePayrollDbQueries.deleteQualification({ qualificationId, employeeId });
    if (!deleted) throw apiErrors.notFound('Qualification not found');
    return { success: true };
  }

  async listContracts(employeeId: string) {
    await connectDB();
    const employee = await EmployeePayrollDbQueries.findEmployeeByIdLean(employeeId);
    if (!employee) throw apiErrors.notFound('Employee not found');
    const contracts = await EmployeePayrollDbQueries.listContractsLean(employeeId);
    return { contracts: (contracts as any[]).map(formatContract) };
  }

  async createContract(employeeId: string, body: any) {
    await connectDB();
    const employee = await EmployeePayrollDbQueries.findEmployeeByIdLean(employeeId);
    if (!employee) throw apiErrors.notFound('Employee not found');
    await EmployeePayrollDbQueries.deactivateActiveContracts(employeeId);
    const contract = await EmployeePayrollDbQueries.createContract({
      employeeId,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      contractType: body.contractType,
      noticePeriod: body.noticePeriod,
      probationPeriodEnd: body.probationPeriodEnd ? new Date(body.probationPeriodEnd) : undefined,
      contractTermsUrl: body.contractTermsUrl,
      salary: body.salary,
      wageType: body.wageType,
      isActive: true,
    });
    const updateFields: Record<string, unknown> = { contractId: (contract as any)._id };
    if (body.probationPeriodEnd) {
      updateFields.isProbationary = true;
      updateFields.probationEndDate = new Date(body.probationPeriodEnd);
    }
    await EmployeePayrollDbQueries.updateEmployeeById(employeeId, updateFields);
    return { contract: formatContract(contract) };
  }

  async updateActiveContract(employeeId: string, body: any) {
    await connectDB();
    const updates: Record<string, unknown> = {};
    if (body.startDate) updates.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updates.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.contractType) updates.contractType = body.contractType;
    if (body.noticePeriod !== undefined) updates.noticePeriod = body.noticePeriod;
    if (body.probationPeriodEnd !== undefined)
      updates.probationPeriodEnd = body.probationPeriodEnd ? new Date(body.probationPeriodEnd) : null;
    if (body.contractTermsUrl !== undefined) updates.contractTermsUrl = body.contractTermsUrl;
    if (body.salary !== undefined) updates.salary = body.salary;
    if (body.wageType) updates.wageType = body.wageType;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    const contract = await EmployeePayrollDbQueries.updateActiveContractLean({ employeeId, updates });
    if (!contract) throw apiErrors.notFound('No active contract found for this employee');
    return { contract: formatContract(contract) };
  }

  async getBankDetails(employeeId: string) {
    await connectDB();
    const employee = await EmployeePayrollDbQueries.findEmployeeByIdLean(employeeId);
    if (!employee) throw apiErrors.notFound('Employee not found');
    const bankDetails = await EmployeePayrollDbQueries.findBankDetailsLean(employeeId);
    if (!bankDetails) throw apiErrors.notFound('Bank details not found for this employee');
    return {
      bankDetails: {
        id: String((bankDetails as any)._id),
        employeeId: String((bankDetails as any).employeeId),
        accountNumber: maskAccount((bankDetails as any).accountNumber),
        bsbCode: (bankDetails as any).bsbCode,
        accountHolderName: (bankDetails as any).accountHolderName,
        bankName: (bankDetails as any).bankName || null,
        accountType: (bankDetails as any).accountType || null,
      },
    };
  }

  async createBankDetails(employeeId: string, body: any) {
    await connectDB();
    const employee = await EmployeePayrollDbQueries.findEmployeeByIdLean(employeeId);
    if (!employee) throw apiErrors.notFound('Employee not found');
    const existing = await EmployeePayrollDbQueries.findBankDetails(employeeId);
    if (existing) throw apiErrors.conflict('Bank details already exist. Use PATCH to update.');
    const bankDetails = await EmployeePayrollDbQueries.createBankDetails({ employeeId, ...body });
    await EmployeePayrollDbQueries.updateEmployeeById(employeeId, { bankDetailsId: (bankDetails as any)._id });
    return {
      bankDetails: {
        id: String((bankDetails as any)._id),
        employeeId: String((bankDetails as any).employeeId),
        accountNumber: maskAccount((bankDetails as any).accountNumber),
        bsbCode: (bankDetails as any).bsbCode,
        accountHolderName: (bankDetails as any).accountHolderName,
        bankName: (bankDetails as any).bankName || null,
        accountType: (bankDetails as any).accountType || null,
      },
    };
  }

  async updateBankDetails(employeeId: string, body: any) {
    await connectDB();
    const bankDetails = await EmployeePayrollDbQueries.updateBankDetailsLean({ employeeId, updates: body });
    if (!bankDetails) throw apiErrors.notFound('Bank details not found for this employee');
    return {
      bankDetails: {
        id: String((bankDetails as any)._id),
        employeeId: String((bankDetails as any).employeeId),
        accountNumber: maskAccount((bankDetails as any).accountNumber),
        bsbCode: (bankDetails as any).bsbCode,
        accountHolderName: (bankDetails as any).accountHolderName,
        bankName: (bankDetails as any).bankName || null,
        accountType: (bankDetails as any).accountType || null,
      },
    };
  }

  async getCompliance(employeeId: string) {
    await connectDB();
    const employee = await EmployeePayrollDbQueries.findEmployeeByIdLean(employeeId);
    if (!employee) throw apiErrors.notFound('Employee not found');
    let compliance = await EmployeePayrollDbQueries.findComplianceLean(employeeId);
    if (!compliance) {
      const created = await EmployeePayrollDbQueries.createCompliance({
        employeeId,
        tenantId: (employee as any).tenantId,
      });
      compliance = (created as any).toObject();
    }
    return { compliance: formatCompliance(compliance) };
  }

  async updateCompliance(employeeId: string, body: any) {
    await connectDB();
    const updates: Record<string, unknown> = {};
    const dateFields = [
      'wwcExpiryDate',
      'policeClearanceExpiryDate',
      'foodHandlingExpiryDate',
      'inductionDate',
      'codeOfConductDate',
      'lastComplianceCheckDate',
    ] as const;
    for (const [key, value] of Object.entries(body)) {
      if (dateFields.includes(key as any) && value) updates[key] = new Date(value as string);
      else updates[key] = value;
    }
    const compliance = await EmployeePayrollDbQueries.upsertComplianceLean({ employeeId, updates });
    return { compliance: formatCompliance(compliance) };
  }
}

export const employeePayrollService = new EmployeePayrollService();
