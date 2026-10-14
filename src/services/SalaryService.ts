import axiosPrivate from '@/api/axiosInstance';
import type { PayrollDraft } from '@/utils/payrollCalculation';
import { QueryParams } from '@/types/queryParams';
import { PaginatedResponse } from '@/types/responseTypes';
import {
  AttendanceTableType,
  CategoryTableType,
  SalaryDetailTableType,
  SalaryTableType,
  SalaryType
} from '@/types/salaryType';
import { CrudService } from '@utils/crudService';
import { handleApiError } from '@utils/handleApiError';

type FilterSalary = {
  title?: string;
  start_date?: string;
  end_date?: string;
  total?: string;
  sort?: string;
};

export type FetchSalariesParams = {
  page?: number;
  limit?: number;
  filters?: FilterSalary;
};

export type FetchSalaryParams = {
  id: string;
  company?: string;
};

type SalaryTableResponse = {
  snapshot?: PayrollDraft | null;
  manager?: SalaryType;
  category: CategoryTableType[];
  salary: SalaryTableType[];
  salaryDetail: SalaryDetailTableType[];
  attendance: AttendanceTableType[];
};

export type AddSalaryParams = {
  title: string;
  start_date: string;
  end_date: string;
  importA7A: File;
  importVVP: File;
};

const ENDPOINT = '/api/salaries';
const EMP_ENDPOINT = '/api/employee/salaries';

export const salariesService = new CrudService<SalaryType, SalaryType>(
  ENDPOINT
);

// TODO: optimization for this function
// Fetch a salary by id
export const fetchSalary = async ({ id, company }: FetchSalaryParams) => {
  const response: SalaryTableResponse = await axiosPrivate.get(
    `${ENDPOINT}/${id}`,
    {
      params: {
        company: company
      }
    }
  );

  return {
    snapshot: response.snapshot,
    manager: response.manager,
    category: response.category,
    salary: response.salary,
    salaryDetail: response.salaryDetail,
    attendance: response.attendance
  };
};

// Add a salary
export const addSalary = async ({
  title,
  start_date,
  end_date,
  importA7A,
  importVVP
}: AddSalaryParams) => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('start_date', start_date);
  formData.append('end_date', end_date);
  formData.append('file_a7a', importA7A);
  formData.append('file_vvp', importVVP);

  try {
    const response = await axiosPrivate.post(ENDPOINT, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Delete a salary
export const deleteSalary = async (id: string) => {
  try {
    const response = await axiosPrivate.delete(`${ENDPOINT}/${id}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/* EMPLOYEE */
export const fetchEmpSalaries = async (params: QueryParams) => {
  const response = await axiosPrivate.get<
    SalaryType,
    PaginatedResponse<SalaryType>
  >(EMP_ENDPOINT, { params: params });
  return response;
};

export const fetchSalaryDetail = async (id: string) => {
  const response = await axiosPrivate.get<
    SalaryDetailTableType,
    SalaryDetailTableType
  >(`${EMP_ENDPOINT}/${id}`);
  return response;
};
