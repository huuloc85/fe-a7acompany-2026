import axiosPrivate from '@/api/axiosInstance';
import {
  ProductCreateType,
  ProductHistoryDetailType,
  ProductHistoryStatusType,
  ProductType,
  ProductUpdateType
} from '@/types/productType';
import { CrudService } from '@utils/crudService';

const ENDPOINT = '/api/products';

export const productService = new CrudService<
  ProductType,
  ProductCreateType,
  ProductUpdateType
>(ENDPOINT);

export const fetchProductHistoryDetail = async (
  id: ProductType['id'],
  month?: string
) => {
  const response = axiosPrivate.get<
    ProductHistoryDetailType,
    ProductHistoryDetailType
  >(`${ENDPOINT}/detail/${id}`, { params: { month: month } });
  return response;
};

export const updateProductHistoryDetail = async (
  id: ProductHistoryStatusType['id'],
  productId: ProductType['id'],
  status: ProductHistoryStatusType['status'],
  quantity: ProductHistoryStatusType['quantity']
) => {
  await axiosPrivate.put(`${ENDPOINT}/detail`, {
    dailyId: id,
    product_id: productId,
    status: status,
    quantity: quantity
  });
};

export const deleteProductHistoryDetail = async (
  id: ProductHistoryStatusType['id'],
  status?: ProductHistoryStatusType['status']
) => {
  await axiosPrivate.delete(`${ENDPOINT}/detail/${id}`, {
    params: { status }
  });
};

export const updateProductQuantity = async (
  productId: ProductType['id'],
  date: string,
  quantity: ProductHistoryStatusType['quantity'],
  status: ProductHistoryStatusType['status'],
  shift?: 'Ca 1' | 'Ca 2'
) => {
  await axiosPrivate.put(`${ENDPOINT}/addQuantityDetail`, {
    product_id: productId,
    status: status,
    quantity: quantity,
    date: date,
    shift
  });
};
