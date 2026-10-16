import ComponentCard from '@components/common/ComponentCard';
import { useOnboarding } from '@/components/onboarding/OnboardingContext';
import { changeAvatar } from '@services/ProfileService';
import { authStore, updateUserImage } from '@stores/authStore';
import { useMutation } from '@tanstack/react-query';
import { Avatar, Button, message, Typography, Upload } from 'antd';
import ImgCrop from 'antd-img-crop';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import { useState } from 'react';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { FaImage, FaUser } from 'react-icons/fa';

const { Text } = Typography;

interface ChangeAvatarResponse {
  message: string;
  data: {
    id: string;
    photo: string;
  };
}

interface ChangeAvatarProps {
  onSuccess?: () => void;
  showCard?: boolean;
}

export const ChangeAvatar = ({
  onSuccess,
  showCard = true
}: ChangeAvatarProps) => {
  const { user } = authStore.state;
  const { recordTask } = useOnboarding();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const previewImage = useObjectUrl(fileList[0]?.originFileObj);

  const { mutate: updateAvatar, isPending } = useMutation({
    mutationKey: ['changeAvatar'],
    mutationFn: changeAvatar,
    onMutate: () => {
      message.loading({
        content: 'Đang cập nhật ảnh đại diện...',
        key: 'changeAvatar'
      });
    },
    onSuccess: (response: unknown) => {
      recordTask('avatar_updated');
      const typedResponse = response as ChangeAvatarResponse;
      message.success({
        content: 'Cập nhật ảnh đại diện thành công',
        key: 'changeAvatar',
        duration: 2
      });

      // Update user in store with new avatar URL
      if (user && typedResponse.data?.photo) {
        const baseStorageUrl =
          import.meta.env.VITE_STORAGE_URL ||
          `${import.meta.env.VITE_BASE_API_URL}/storage`;
        const imageUrl = `${baseStorageUrl}/${typedResponse.data.photo}`;
        updateUserImage(imageUrl);
      }

      // Clear preview and file list
      setFileList([]);

      // Call parent onSuccess callback if provided
      onSuccess?.();
    },
    onError: (error: Error) => {
      console.error('Avatar update error:', error);
      message.error({
        content: 'Cập nhật ảnh đại diện thất bại',
        key: 'changeAvatar',
        duration: 2
      });
    }
  });

  const beforeUpload = (file: RcFile, notify = true) => {
    const isJpgOrPng =
      file.type === 'image/jpeg' ||
      file.type === 'image/png' ||
      file.type === 'image/jpg';
    if (!isJpgOrPng) {
      if (notify) message.error('Chỉ có thể upload file JPG/PNG!');
      return false;
    }
    return true;
  };

  const handleUpload = () => {
    if (fileList.length > 0 && fileList[0].originFileObj) {
      updateAvatar(fileList[0].originFileObj);
    }
  };

  const handleRemove = () => {
    setFileList([]);
  };

  const currentImageUrl = previewImage || user?.image_url;

  const avatarEditor = (
    <div className="space-y-6 text-center">
      {/* Current Avatar Display */}
      <div className="flex justify-center">
        <div className="relative">
          <Avatar
            src={currentImageUrl}
            alt="Profile"
            size={140}
            icon={<FaUser />}
            className="border-4 border-white shadow-xl"
          />
          {previewImage && (
            <div className="absolute top-2 left-2 rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white shadow-md">
              Xem trước
            </div>
          )}
        </div>
      </div>

      {/* Avatar Actions - Facebook Style */}
      <div className="space-y-3">
        <Text className="mb-4 block text-gray-600">
          Cập nhật ảnh đại diện của bạn
        </Text>

        {/* Upload Photo Button - Only show when no preview image */}
        {!previewImage && (
          <ImgCrop
            rotationSlider
            showReset
            aspect={1}
            cropShape="round"
            modalTitle="Cắt ảnh đại diện"
            modalOk="Lưu"
            modalCancel="Hủy"
            resetText="Đặt lại"
            quality={0.9}
            beforeCrop={(file) => beforeUpload(file, false)}
          >
            <Upload
              accept="image/jpeg,image/png,image/jpg"
              beforeUpload={(file) => {
                if (!beforeUpload(file)) return Upload.LIST_IGNORE;
                setFileList([
                  {
                    uid: file.uid,
                    name: file.name,
                    originFileObj: file
                  }
                ]);
                return false;
              }}
              maxCount={1}
              fileList={fileList}
              disabled={isPending}
              showUploadList={false}
              className="block"
            >
              <Button
                size="large"
                type="primary"
                className="flex h-12 w-full items-center justify-center gap-2 text-base font-medium"
                disabled={isPending}
              >
                <FaImage />
                Chọn ảnh
              </Button>
            </Upload>
          </ImgCrop>
        )}

        {/* Action Buttons - Show only when image is selected */}
        {fileList.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex gap-3">
              <Button
                type="primary"
                size="large"
                onClick={handleUpload}
                loading={isPending}
                disabled={fileList.length === 0}
                className="h-12 flex-1 text-base font-medium"
              >
                {isPending ? 'Đang cập nhật...' : 'Lưu ảnh đại diện'}
              </Button>
              <Button
                size="large"
                onClick={handleRemove}
                disabled={isPending}
                className="h-12 px-6"
              >
                Hủy
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return showCard ? (
    <ComponentCard title="Ảnh đại diện">{avatarEditor}</ComponentCard>
  ) : (
    avatarEditor
  );
};
