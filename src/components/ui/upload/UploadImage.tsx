import { useObjectUrl } from '@/hooks/useObjectUrl';
import { Image, Upload, UploadFile, UploadProps } from 'antd';
import ImgCrop from 'antd-img-crop';
import React, { useEffect, useState } from 'react';
import { AiOutlineUpload } from 'react-icons/ai';

interface UploadImageProps extends UploadProps {
  imageList?: () => UploadFile[];
}

export const UploadImage: React.FC<UploadImageProps> = ({
  imageList,
  ...restProps
}) => {
  const [images, setImages] = React.useState<UploadFile[]>(imageList || []);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewFile, setPreviewFile] = useState<UploadFile>();
  const previewUrl = useObjectUrl(previewFile?.originFileObj);
  const previewImage = previewFile?.url || previewUrl || previewFile?.preview;

  useEffect(() => {
    const list = imageList?.();
    if ((list ?? []).length > 0) {
      setImages(list ?? []);
    }
  }, [setImages, imageList]);

  const handlePreview = (file: UploadFile) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
  };

  const imageProp: UploadProps = {
    ...restProps,
    listType: 'picture-card',
    fileList: images,
    accept: '.jpg,.jpeg,.png',
    maxCount: restProps?.maxCount,
    onChange: (info) => {
      setImages(info.fileList);
      restProps.onChange?.(info);
    },
    onPreview: (file) => {
      handlePreview(file);
      restProps.onPreview?.(file);
    }
  };

  return (
    <>
      <ImgCrop>
        <Upload {...imageProp}>
          {images.length < (restProps?.maxCount || Infinity) && (
            <div>
              <AiOutlineUpload size={24} />
            </div>
          )}
        </Upload>
      </ImgCrop>
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
    </>
  );
};
