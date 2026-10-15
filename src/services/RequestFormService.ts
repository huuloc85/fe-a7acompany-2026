import axiosPrivate from '@/api/axiosInstance';
import {
  CreateRequestFormDto,
  UpdateRequestFormDto,
  RequestFormFilters,
  RequestFormListResponse,
  RequestFormDetailResponse,
  RequestFormTypesResponse,
  RequestFormStatisticsResponse,
  ApproveRequestFormDto,
  AuthorizableEmployeesResponse,
  AuthorizedToMeResponse
} from '@/types/requestFormType';

// Employee RequestForm Service
export const employeeRequestFormService = {
  // Get employee's request forms with filters
  getList: async (
    filters?: RequestFormFilters
  ): Promise<RequestFormListResponse> => {
    const params = new URLSearchParams();

    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.employee_id) params.append('employee_id', filters.employee_id);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.per_page)
      params.append('per_page', filters.per_page.toString());
    if (filters?.page) params.append('page', filters.page.toString());

    const queryString = params.toString();
    const url = queryString
      ? `/api/employee/request-forms?${queryString}`
      : '/api/employee/request-forms';

    return await axiosPrivate.get(url);
  },

  // Get request form types and statuses
  getTypes: async (): Promise<RequestFormTypesResponse> => {
    return await axiosPrivate.get('/api/employee/request-forms/types');
  },

  // Get authorizable employees for delegation forms
  getAuthorizableEmployees:
    async (): Promise<AuthorizableEmployeesResponse> => {
      return await axiosPrivate.get(
        '/api/employee/request-forms/authorizable-employees'
      );
    },

  // Get signature fields information by form type
  getSignatureFields: async (
    type: string
  ): Promise<{
    success: boolean;
    data: {
      type: string;
      required_signatures: string[];
      signature_order: string[];
      description: string;
    };
  }> => {
    return await axiosPrivate.get(
      `/api/employee/request-forms/signature-fields?type=${type}`
    );
  },

  // Get detail of specific request form
  getDetail: async (id: number): Promise<RequestFormDetailResponse> => {
    return await axiosPrivate.get(`/api/employee/request-forms/${id}`);
  },

  // Create new request form
  create: async (
    data: CreateRequestFormDto | FormData
  ): Promise<RequestFormDetailResponse> => {
    const config =
      data instanceof FormData
        ? {
            headers: {
              'Content-Type': undefined // Let axios auto-set with boundary
            }
          }
        : {};

    return await axiosPrivate.post('/api/employee/request-forms', data, config);
  },

  // Update existing request form (only pending status)
  update: async (
    id: number,
    data: UpdateRequestFormDto | FormData
  ): Promise<RequestFormDetailResponse> => {
    const config =
      data instanceof FormData
        ? {
            headers: {
              'Content-Type': undefined // Let axios auto-set with boundary
            }
          }
        : {};

    return await axiosPrivate.put(
      `/api/employee/request-forms/${id}`,
      data,
      config
    );
  },

  // Delete request form (only pending status)
  delete: async (
    id: number
  ): Promise<{ success: boolean; message: string }> => {
    return await axiosPrivate.delete(`/api/employee/request-forms/${id}`);
  },

  // Sign delegation form (user signs delegator or authorized signature)
  signDelegation: async (
    id: number,
    data: {
      digital_signature_delegator?: File;
      digital_signature_authorized?: File;
    }
  ): Promise<RequestFormDetailResponse> => {
    const formData = new FormData();

    if (data.digital_signature_delegator) {
      formData.append(
        'digital_signature_delegator',
        data.digital_signature_delegator
      );
    }

    if (data.digital_signature_authorized) {
      formData.append(
        'digital_signature_authorized',
        data.digital_signature_authorized
      );
    }

    return await axiosPrivate.post(
      `/api/employee/request-forms/${id}/sign-delegation`,
      formData,
      {
        headers: {
          'Content-Type': undefined // Let axios auto-set with boundary
        }
      }
    );
  },

  // Get authorized request forms (forms delegated to current user)
  getAuthorizedToMe: async (filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<AuthorizedToMeResponse> => {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString
      ? `/api/employee/request-forms/authorized-to-me?${queryString}`
      : '/api/employee/request-forms/authorized-to-me';

    return await axiosPrivate.get(url);
  },

  // Approve request as authorized person (with digital signature file)
  approveAsAuthorized: async (
    id: number,
    digitalSignatureFile: File
  ): Promise<RequestFormDetailResponse> => {
    const formData = new FormData();
    formData.append('digital_signature_authorized', digitalSignatureFile);

    // Let axios auto-set Content-Type with boundary
    return await axiosPrivate.post(
      `/api/employee/request-forms/${id}/approve-as-authorized`,
      formData,
      {
        headers: {
          'Content-Type': undefined
        }
      }
    );
  },

  // Reject request as authorized person (with reason)
  rejectAsAuthorized: async (
    id: number,
    rejectionReason: string
  ): Promise<RequestFormDetailResponse> => {
    return await axiosPrivate.post(
      `/api/employee/request-forms/${id}/reject-as-authorized`,
      { rejection_reason: rejectionReason }
    );
  }
};

// Supervisor RequestForm Service
export const supervisorRequestFormService = {
  // Get request forms assigned to supervisor
  getList: async (
    filters?: RequestFormFilters
  ): Promise<RequestFormListResponse> => {
    const params = new URLSearchParams();
    if (filters?.search?.trim()) params.append('search', filters.search.trim());

    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.employee_id) params.append('employee_id', filters.employee_id);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.per_page)
      params.append('per_page', filters.per_page.toString());
    if (filters?.page) params.append('page', filters.page.toString());

    const queryString = params.toString();
    const url = queryString
      ? `/api/employee/request-forms/as-supervisor?${queryString}`
      : '/api/employee/request-forms/as-supervisor';

    return await axiosPrivate.get(url);
  },

  // Get detail of specific request form
  getDetail: async (id: number): Promise<RequestFormDetailResponse> => {
    return await axiosPrivate.get(
      `/api/employee/request-forms/as-supervisor/${id}`
    );
  },

  // Approve or reject request form
  approveOrReject: async (
    id: number,
    data: ApproveRequestFormDto
  ): Promise<RequestFormDetailResponse> => {
    const endpoint =
      data.action === 'reject'
        ? `/api/employee/request-forms/as-supervisor/${id}/reject`
        : `/api/employee/request-forms/as-supervisor/${id}/approve`;
    return await axiosPrivate.post(endpoint, data);
  },

  // Approve with supervisor signature
  approveOrRejectWithSignatures: async (
    id: number,
    data: {
      action: 'approve' | 'reject';
      digital_signature_supervisor?: File;
      rejection_reason?: string;
    }
  ): Promise<RequestFormDetailResponse> => {
    const formData = new FormData();
    formData.append('action', data.action);

    if (data.rejection_reason) {
      formData.append('rejection_reason', data.rejection_reason);
    }

    if (data.digital_signature_supervisor) {
      formData.append(
        'digital_signature_supervisor',
        data.digital_signature_supervisor
      );
    }

    const endpoint =
      data.action === 'reject'
        ? `/api/employee/request-forms/as-supervisor/${id}/reject`
        : `/api/employee/request-forms/as-supervisor/${id}/approve`;
    return await axiosPrivate.post(endpoint, formData, {
      headers: {
        'Content-Type': undefined
      }
    });
  }
};

// Admin RequestForm Service
export const adminRequestFormService = {
  delete: async (
    id: number
  ): Promise<{ success: boolean; message: string }> => {
    return await axiosPrivate.delete(`/api/request-forms/${id}`);
  },
  // Get all request forms with filters
  getList: async (
    filters?: RequestFormFilters
  ): Promise<RequestFormListResponse> => {
    const params = new URLSearchParams();
    if (filters?.search?.trim()) params.append('search', filters.search.trim());

    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.employee_id) params.append('employee_id', filters.employee_id);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.per_page)
      params.append('per_page', filters.per_page.toString());
    if (filters?.page) params.append('page', filters.page.toString());

    const queryString = params.toString();
    const url = queryString
      ? `/api/request-forms?${queryString}`
      : '/api/request-forms';

    return await axiosPrivate.get(url);
  },

  // Get statistics
  getStatistics: async (): Promise<RequestFormStatisticsResponse> => {
    return await axiosPrivate.get('/api/request-forms/statistics');
  },

  // Get detail of specific request form
  getDetail: async (id: number): Promise<RequestFormDetailResponse> => {
    return await axiosPrivate.get(`/api/request-forms/${id}`);
  },

  // Approve or reject request form (delegation forms - simple approval)
  approveOrReject: async (
    id: number,
    data: ApproveRequestFormDto
  ): Promise<RequestFormDetailResponse> => {
    return await axiosPrivate.post(`/api/request-forms/${id}/approve`, data);
  },

  // Approve regular forms with supervisor/manager signatures
  approveOrRejectWithSignatures: async (
    id: number,
    data: {
      action: 'approve' | 'reject';
      digital_signature_supervisor?: File;
      digital_signature_manager?: File;
      rejection_reason?: string;
    }
  ): Promise<RequestFormDetailResponse> => {
    const formData = new FormData();
    formData.append('action', data.action);

    if (data.rejection_reason) {
      formData.append('rejection_reason', data.rejection_reason);
    }

    if (data.digital_signature_supervisor) {
      formData.append(
        'digital_signature_supervisor',
        data.digital_signature_supervisor
      );
    }

    if (data.digital_signature_manager) {
      formData.append(
        'digital_signature_manager',
        data.digital_signature_manager
      );
    }

    return await axiosPrivate.post(
      `/api/request-forms/${id}/approve`,
      formData,
      {
        headers: {
          'Content-Type': undefined // Let axios auto-set with boundary
        }
      }
    );
  }
};

// Export all services
export const requestFormService = {
  employee: employeeRequestFormService,
  supervisor: supervisorRequestFormService,
  admin: adminRequestFormService
};
