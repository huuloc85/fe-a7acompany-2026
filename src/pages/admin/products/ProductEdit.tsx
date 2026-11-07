import { productUpdateFields } from '@/configs/productForm.config';
import ComponentCard from '@components/common/ComponentCard';
import { UpdateForm } from '@components/ui/CRUD/UpdateForm';
import { productUpdateSchema } from '@schemas/product/productSchema.schema';
import { productService } from '@services/ProductService';
import BackButton from '@components/common/BackButton';
import { getRouteApi } from '@tanstack/react-router';

const routeApi = getRouteApi('/_authenticated/admin/products/edit/$id');

export default function ProductEdit() {
  const { id } = routeApi.useParams();
  return (
    <>
      <ComponentCard
        actions={<BackButton to="/admin/products" />}
        title="Cập nhật sản phẩm"
      >
        <UpdateForm
          id={id}
          fields={productUpdateFields}
          schema={productUpdateSchema}
          service={productService}
        />
      </ComponentCard>
    </>
  );
}
