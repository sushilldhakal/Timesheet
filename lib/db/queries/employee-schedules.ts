import { Employee } from '@/lib/db/schemas/employee';

export class EmployeeSchedulesDbQueries {
  static async findEmployeeLean(filter: Record<string, unknown>) {
    return Employee.findOne(filter).lean();
  }

  static async findEmployee(filter: Record<string, unknown>) {
    return Employee.findOne(filter);
  }
}

