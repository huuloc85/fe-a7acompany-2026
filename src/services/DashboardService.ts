import axiosPrivate from '@/api/axiosInstance';
import { DashboardDataType } from '@/types/dashboardType';
import { SalaryType } from '@/types/salaryType';
import { handleApiError } from '@utils/handleApiError';
import { WorkCalendarTableType } from '@/types/dashboardType';

type DashboardDataResponse = {
  totalEmployee: number;
  totalRole: number;
  totalSalary: number;
  totalCelender: number;
  totalProduct: number;
  totalHistory: number;
  totalPlan: number;
  totalRecord: number;
  totalCheckEmployee: number;
  totalRequestForms: number;
  totalFeedback: number;
  salaryManagers: SalaryType[];
  celenders: WorkCalendarTableType[];
};

export const fetchDashboardData = async () => {
  try {
    const response: DashboardDataResponse = await axiosPrivate.get(
      '/api/admin/dashboard',
      { params: { include_top_users: false } }
    );

    const dashboardData: DashboardDataType = {
      totalEmployee: response.totalEmployee || 0,
      totalRole: response.totalRole || 0,
      totalSalary: response.totalSalary || 0,
      totalCalender: response.totalCelender || 0,
      totalProduct: response.totalProduct || 0,
      totalHistory: response.totalHistory || 0,
      totalPlan: response.totalPlan || 0,
      totalRecord: response.totalRecord || 0,
      totalCheckEmployee: response.totalCheckEmployee || 0,
      totalRequestForms: response.totalRequestForms || 0,
      totalFeedback: response.totalFeedback || 0
    };

    const salaryTableData: SalaryType[] = response.salaryManagers || [];

    const workCalendarTableData: WorkCalendarTableType[] =
      response.celenders || [];

    return { dashboardData, salaryTableData, workCalendarTableData };
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
