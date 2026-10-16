import { STORAGE_URL } from '@/configs/environment.config';
import { ImageType } from '@/types/files/imageType';
import ComponentCard from '@components/common/ComponentCard';
import { SlideCarousel } from '@components/SlideCarousel';
import { deleteImage, fetchImages, uploadImage } from '@services/UploadService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { Image, message, Spin, Upload, UploadFile, UploadProps } from 'antd';
import ImgCrop from 'antd-img-crop';
import React, { useEffect, useState } from 'react';
import { AiOutlineUpload } from 'react-icons/ai';

export const SlideShow = () => {
  const [images, setImages] = React.useState<UploadFile[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewFile, setPreviewFile] = useState<UploadFile>();
  const previewUrl = useObjectUrl(previewFile?.originFileObj);
  const previewImage = previewFile?.url || previewUrl || previewFile?.preview;

  const handlePreview = (file: UploadFile) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
  };

  const queryClient = useQueryClient();

  const { mutateAsync: upload, isPending: isUploading } = useMutation({
    mutationKey: ['uploadImage'],
    mutationFn: (formData: FormData) => uploadImage(formData),
    onMutate: () => {
      message.loading({
        content: 'Đang tải lên...',
        key: 'upload'
      });
    },
    onError: () => {
      message.error({
        content: 'Tải lên thất bại',
        key: 'upload'
      });
    },
    onSuccess: () => {
      message.success({
        content: 'Tải lên thành công',
        key: 'upload'
      });
      queryClient.invalidateQueries({ queryKey: ['images'] });
    }
  });

  const { mutateAsync: deleteImg } = useMutation({
    mutationKey: ['deleteImage'],
    mutationFn: (id: string) => deleteImage(id),
    onMutate: () => {
      message.loading({
        content: 'Đang xóa...',
        key: 'delete'
      });
    },
    onError: () => {
      message.error({
        content: 'Xóa thất bại',
        key: 'delete'
      });
    },
    onSuccess: () => {
      message.success({
        content: 'Xóa thành công',
        key: 'delete'
      });
      queryClient.invalidateQueries({ queryKey: ['images'] });
    }
  });

  const uploadProp: UploadProps = {
    listType: 'picture-card',
    fileList: images,
    accept: '.jpg,.jpeg,.png',
    disabled: isUploading,
    beforeUpload: (file) => {
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        message.error('Chỉ có thể upload file JPG/PNG!');
        return Upload.LIST_IGNORE;
      }
      if (file.size > 2 * 1024 * 1024) {
        message.error('Ảnh không được vượt quá 2MB!');
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    customRequest: ({ file, onSuccess, onError }) => {
      const formData = new FormData();
      formData.append('image', file as File);
      void upload(formData).then(
        (response) => onSuccess?.(response),
        (error: Error) => onError?.(error)
      );
    },
    onRemove: async (file) => {
      if (file.status === 'uploading') return false;
      const id =
        file.response?.id ??
        imageList?.data.find((image) => image.id === file.uid)?.id;
      if (!id) return true;
      try {
        await deleteImg(id);
        return true;
      } catch {
        return false;
      }
    },
    onChange: (info) => {
      setImages(info.fileList);
    },
    onPreview: (file) => {
      handlePreview(file);
    },
    type: 'drag'
  };

  const { data: imageList, isLoading } = useQuery({
    queryKey: ['images'],
    queryFn: () =>
      fetchImages({
        limit: 0
      })
  });

  useEffect(() => {
    if (imageList?.data) {
      setImages(
        imageList.data.map((item: ImageType) => ({
          uid: item.id,
          name: item.title || `image-${item.id}`,
          status: 'done',
          url: `${STORAGE_URL}/${item.path}` // replace 'path' with the correct property for image URL in your ImageType
        }))
      );
    }
  }, [imageList]);
  return (
    <ComponentCard title="Chỉnh sửa Slide show">
      <SlideCarousel images={imageList?.data || []} />
      <Spin spinning={isLoading}>
        <ImgCrop
          aspect={5 / 2}
          beforeCrop={(file) =>
            ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type) &&
            file.size <= 2 * 1024 * 1024
          }
        >
          <Upload {...uploadProp}>
            <div className="py-5">
              <div className="flex justify-center">
                <AiOutlineUpload size={24} />
              </div>
              <p>Nhấn hoặc kéo ảnh vào khu vực này để tải lên</p>
            </div>
          </Upload>
        </ImgCrop>
      </Spin>
      {previewImage && (
        <Image
          wrapperStyle={{ display: 'none' }}
          preview={{
            visible: isPreviewOpen,
            onVisibleChange: (visible) => setIsPreviewOpen(visible),
            afterOpenChange: (visible) => !visible && setPreviewFile(undefined)
          }}
          src={previewImage}
        />
      )}
    </ComponentCard>
  );
};
