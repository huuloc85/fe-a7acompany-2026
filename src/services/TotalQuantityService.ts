import axiosPrivate from '@/api/axiosInstance';
import { QueryParams } from '@/types/queryParams';
import { PaginatedResponse } from '@/types/responseTypes';
import { TotalMonthQuantityType } from '@/types/totalMonthQuantityType';

export interface AddProductQuantitiesRequest {
  products: {
    date: string;
    status: number;
    shift?: number;
    productId: string;
    quantity: number;
  }[];
}

const ENDPOINT = '/api/quantities';

export const getMonthlyQuantity = async ({
  productId,
  month,
  status
}: {
  productId: string;
  month: string;
  status?: number;
}) => {
  const response = await axiosPrivate.get<
    TotalMonthQuantityType,
    PaginatedResponse<TotalMonthQuantityType>
  >(`${ENDPOINT}/monthly`, {
    params: {
      productId: productId,
      month: month,
      status: status
    }
  });
  return response.data;
};

export const getMonthlyQuantities = async (params: QueryParams) => {
  const response = await axiosPrivate.get<
    TotalMonthQuantityType,
    PaginatedResponse<TotalMonthQuantityType>
  >(`${ENDPOINT}/monthly`, {
    params: { ...params, include: params.include?.join(',') }
  });
  return response.data;
};

export const updateMonthlyQuantities = async ({
  month,
  status,
  products
}: {
  status: number;
  month: string;
  products: {
    productId: string;
    quantity: number;
  }[];
}) => {
  const response = await axiosPrivate.patch(`${ENDPOINT}/monthly/updateList`, {
    month: month,
    status: status,
    products: products
  });
  return response;
};

export const addProductsQuantity = async ({
  products
}: AddProductQuantitiesRequest) => {
  const response = await axiosPrivate.post(`${ENDPOINT}/addList`, {
    products: products
  });
  return response;
};
