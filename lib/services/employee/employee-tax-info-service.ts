import mongoose from 'mongoose';
import { apiErrors } from '@/lib/api/api-error';
import type { AuthWithLocations } from '@/lib/auth/auth-api';
import { getCountryConfig, getTaxSchema, getBankSchema, type CountryCode } from '@/lib/config/countries';
import { encryptTaxData, extractLast4, getMaskedTaxId, getMaskedBankRouting } from '@/lib/utils/tax-encryption';
import { connectDB } from '@/lib/db';
import { EmployeeTaxInfoDbQueries } from '@/lib/db/queries/employee-tax-info';

function buildMaskedResponse(taxInfo: any, countryConfig: any) {
  return {
    id: taxInfo._id.toString(),
    countrySnapshot: taxInfo.countrySnapshot,
    taxIdMasked: getMaskedTaxId(taxInfo.taxId.type, taxInfo.taxId.last4 || ''),
    taxIdType: taxInfo.taxId.type,
    bankAccountMasked: `••••${taxInfo.bank.accountLast4}`,
    bankRoutingMasked: getMaskedBankRouting(taxInfo.bank.routing.type, taxInfo.bank.routing.last4 || ''),
    bankRoutingType: taxInfo.bank.routing.type,
    bankAccountName: taxInfo.bank.accountName,
    bankName: taxInfo.bank.bankName || null,
    countryName: countryConfig.name,
    currency: countryConfig.currency,
  };
}

export class EmployeeTaxInfoService {
  async getTaxInfo(ctx: AuthWithLocations, employeeId: string) {
    await connectDB();
    const employee = await EmployeeTaxInfoDbQueries.findEmployeeByIdLean(employeeId);
    if (!employee) throw apiErrors.notFound('Employee not found');

    const taxInfo = await EmployeeTaxInfoDbQueries.findTaxInfoLean({ employeeId, tenantId: ctx.tenantId });
    if (!taxInfo) throw apiErrors.notFound('Tax info not found for this employee');

    await EmployeeTaxInfoDbQueries.pushAccessLog(taxInfo._id, ctx.auth.sub, 'VIEW_TAX');

    const countryConfig = getCountryConfig(taxInfo.countrySnapshot as CountryCode);
    return { taxInfo: buildMaskedResponse(taxInfo, countryConfig) };
  }

  async createTaxInfo(ctx: AuthWithLocations, employeeId: string, body: any) {
    await connectDB();
    const employee = await EmployeeTaxInfoDbQueries.findEmployeeByIdLean(employeeId);
    if (!employee) throw apiErrors.notFound('Employee not found');

    const existing = await EmployeeTaxInfoDbQueries.findTaxInfo({ employeeId, tenantId: ctx.tenantId });
    if (existing) throw apiErrors.conflict('Tax info already exists for this employee. Use PATCH to update.');

    const { countrySnapshot, taxData, bankData } = body;
    const countryConfig = getCountryConfig(countrySnapshot as CountryCode);

    const taxSchema = getTaxSchema(countrySnapshot as CountryCode);
    const validatedTaxData = taxSchema.parse(taxData) as any;

    const bankSchema = getBankSchema(countrySnapshot as CountryCode);
    const validatedBankData = bankSchema.parse(bankData) as any;

    const taxIdValue =
      validatedTaxData.taxId ||
      validatedTaxData.pan ||
      validatedTaxData.nric ||
      validatedTaxData.ssn ||
      validatedTaxData.sin ||
      validatedTaxData.irdNumber ||
      validatedTaxData.taxCode;
    const encryptedTaxId = encryptTaxData(String(taxIdValue));
    const taxIdLast4 = extractLast4(String(taxIdValue));

    const encryptedAccount = encryptTaxData(validatedBankData.accountNumber);
    const accountLast4 = extractLast4(validatedBankData.accountNumber);

    let routingValue = '';
    let routingType = '';
    if (validatedBankData.bsb) {
      routingValue = validatedBankData.bsb;
      routingType = 'bsb';
    } else if (validatedBankData.ifsc) {
      routingValue = validatedBankData.ifsc;
      routingType = 'ifsc';
    } else if (validatedBankData.iban) {
      routingValue = validatedBankData.iban;
      routingType = 'iban';
    } else if (validatedBankData.routingNumber) {
      routingValue = validatedBankData.routingNumber;
      routingType = 'routing';
    } else if (validatedBankData.transitNumber) {
      routingValue = `${validatedBankData.transitNumber}-${validatedBankData.institutionNumber}`;
      routingType = 'routing';
    }

    const encryptedRouting = routingValue ? encryptTaxData(routingValue) : encryptTaxData('N/A');
    const routingLast4 = routingValue ? extractLast4(routingValue) : '0000';

    const taxInfo = await EmployeeTaxInfoDbQueries.createTaxInfo({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      tenantId: new mongoose.Types.ObjectId(ctx.tenantId),
      countrySnapshot,
      taxId: {
        type: countryConfig.taxIdType,
        valueEncrypted: encryptedTaxId,
        last4: taxIdLast4,
      },
      tax: {
        type: countrySnapshot,
        version: '2024',
        data: validatedTaxData,
      },
      bank: {
        accountName: validatedBankData.accountName,
        accountNumberEncrypted: encryptedAccount,
        accountLast4,
        routing: {
          type: routingType || countryConfig.bankRoutingTypes[0] || 'swift',
          valueEncrypted: encryptedRouting,
          last4: routingLast4,
        },
        bankName: validatedBankData.bankName,
        swiftCode: validatedBankData.swiftCode,
      },
      accessLogs: [
        {
          userId: new mongoose.Types.ObjectId(ctx.auth.sub),
          action: 'EDIT_TAX',
          timestamp: new Date(),
        },
      ],
      createdBy: new mongoose.Types.ObjectId(ctx.auth.sub),
    });

    await EmployeeTaxInfoDbQueries.setEmployeeTaxInfoId(employeeId, taxInfo._id);
    return { taxInfo: buildMaskedResponse(taxInfo, countryConfig) };
  }

  async updateTaxInfo(ctx: AuthWithLocations, employeeId: string, body: any) {
    await connectDB();
    const existing = await EmployeeTaxInfoDbQueries.findTaxInfoLean({ employeeId, tenantId: ctx.tenantId });
    if (!existing) throw apiErrors.notFound('Tax info not found for this employee');

    const countryCode = (body.countrySnapshot || existing.countrySnapshot) as CountryCode;
    const countryConfig = getCountryConfig(countryCode);
    const updates: Record<string, unknown> = {};

    if (body.taxData) {
      const taxSchema = getTaxSchema(countryCode);
      const validatedTaxData = taxSchema.parse(body.taxData) as any;
      const taxIdValue =
        validatedTaxData.taxId ||
        validatedTaxData.pan ||
        validatedTaxData.nric ||
        validatedTaxData.ssn ||
        validatedTaxData.sin ||
        validatedTaxData.irdNumber ||
        validatedTaxData.taxCode;

      updates['taxId'] = {
        type: countryConfig.taxIdType,
        valueEncrypted: encryptTaxData(String(taxIdValue)),
        last4: extractLast4(String(taxIdValue)),
      };
      updates['tax'] = { type: countryCode, version: '2024', data: validatedTaxData };
    }

    if (body.bankData) {
      const bankSchema = getBankSchema(countryCode);
      const validatedBankData = bankSchema.parse(body.bankData) as any;

      let routingValue = '';
      let routingType = '';
      if (validatedBankData.bsb) {
        routingValue = validatedBankData.bsb;
        routingType = 'bsb';
      } else if (validatedBankData.ifsc) {
        routingValue = validatedBankData.ifsc;
        routingType = 'ifsc';
      } else if (validatedBankData.iban) {
        routingValue = validatedBankData.iban;
        routingType = 'iban';
      } else if (validatedBankData.routingNumber) {
        routingValue = validatedBankData.routingNumber;
        routingType = 'routing';
      } else if (validatedBankData.transitNumber) {
        routingValue = `${validatedBankData.transitNumber}-${validatedBankData.institutionNumber}`;
        routingType = 'routing';
      }

      updates['bank'] = {
        accountName: validatedBankData.accountName,
        accountNumberEncrypted: encryptTaxData(validatedBankData.accountNumber),
        accountLast4: extractLast4(validatedBankData.accountNumber),
        routing: {
          type: routingType || countryConfig.bankRoutingTypes[0] || 'swift',
          valueEncrypted: routingValue ? encryptTaxData(routingValue) : encryptTaxData('N/A'),
          last4: routingValue ? extractLast4(routingValue) : '0000',
        },
        bankName: validatedBankData.bankName,
        swiftCode: validatedBankData.swiftCode,
      };
    }

    if (body.countrySnapshot) updates['countrySnapshot'] = body.countrySnapshot;

    const updated = await EmployeeTaxInfoDbQueries.updateTaxInfoById(existing._id, updates, ctx.auth.sub);
    if (!updated) throw apiErrors.notFound('Failed to update tax info');
    return { taxInfo: buildMaskedResponse(updated, countryConfig) };
  }
}

export const employeeTaxInfoService = new EmployeeTaxInfoService();

