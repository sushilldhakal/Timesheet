import mongoose from 'mongoose';
import { Employee } from '@/lib/db/schemas/employee';
import { Employer } from '@/lib/db/schemas/employer';
import { Location } from '@/lib/db/schemas/location';
import { Team } from '@/lib/db/schemas/team';

export class EmployeeDbQueries {
  static async findEmployees(filter: Record<string, unknown>, opts: { sort: Record<string, 1 | -1>; offset: number; limit: number }) {
    return Employee.find(filter).sort(opts.sort).skip(opts.offset).limit(opts.limit).lean();
  }

  static async countEmployees(filter: Record<string, unknown>) {
    return Employee.countDocuments(filter);
  }

  static async aggregateEmployees(pipeline: object[]) {
    return Employee.aggregate(pipeline as any);
  }

  static async findEmployeeById(id: string) {
    return Employee.findById(id);
  }

  static async findEmployeeLean(filter: Record<string, unknown>) {
    return Employee.findOne(filter).lean();
  }

  static async findEmployee(filter: Record<string, unknown>) {
    return Employee.findOne(filter);
  }

  static async findEmployeeByPin(pin: string, tenantId?: string) {
    const filter: any = { pin };
    if (tenantId) {
      filter.tenantId = new mongoose.Types.ObjectId(tenantId);
    }
    return Employee.findOne(filter);
  }

  static async findDuplicatePin(pin: string, excludeId: string, tenantId?: string) {
    const filter: any = { pin, _id: { $ne: excludeId } };
    if (tenantId) {
      filter.tenantId = new mongoose.Types.ObjectId(tenantId);
    }
    return Employee.findOne(filter);
  }

  static async deleteEmployee(filter: Record<string, unknown>) {
    return Employee.findOneAndDelete(filter);
  }

  static async createEmployee(data: any) {
    return Employee.create(data);
  }

  static async updateEmployeeById(id: string, updates: Record<string, unknown>) {
    return Employee.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).lean();
  }

  static async findEmployersByNames(names: string[]) {
    return Employer.find({ name: { $in: names } }).select('_id name color').lean();
  }

  static async findLocationsByIds(ids: string[]) {
    return Location.find({ _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } }).lean();
  }

  static async findTeamsByNames(names: string[]) {
    return Team.find({ name: { $in: names } }).lean();
  }

  static async findLocationsByNames(names: string[]) {
    console.log('=== findLocationsByNames DEBUG ===');
    console.log('Searching for locations with names:', names);
    const result = await Location.find({ name: { $in: names } }).lean();
    console.log('Found locations:', JSON.stringify(result, null, 2));
    
    // If no exact match, try case-insensitive search
    if (result.length === 0 && names.length > 0) {
      console.log('No exact match, trying case-insensitive search...');
      const caseInsensitiveResult = await Location.find({ 
        name: { $in: names.map(n => new RegExp(`^${n}$`, 'i')) } 
      }).lean();
      console.log('Case-insensitive result:', JSON.stringify(caseInsensitiveResult, null, 2));
      return caseInsensitiveResult;
    }
    
    return result;
  }
}

