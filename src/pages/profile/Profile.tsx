import BackButton from '@components/common/BackButton';
import { useAuth } from '@hooks/useAuth';
import { Avatar, Modal, Tag } from 'antd';
import { FaUser, FaEdit, FaIdBadge, FaBriefcase } from 'react-icons/fa';
import { ChangeAvatar } from './ChangeAvatar';
import { ChangeInfo } from './ChangeInfo';
import { ChangePassword } from './ChangePassword';
import { useState } from 'react';

export const Profile = () => {
  const { user } = useAuth();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const roleName = (user?.role?.name || '').toLowerCase();
  const isAdmin = roleName.includes('admin');

  const showAvatarModal = () => {
    setIsAvatarModalOpen(true);
  };

  const handleAvatarModalClose = () => {
    setIsAvatarModalOpen(false);
  };

  return (
    <>
      <BackButton to="/" />

      {/* ── User Profile Card ────────────────────────── */}
      <div className="ui-card liquid-glass-card mb-6 overflow-hidden rounded-2xl">
        <div className="ui-card-header flex flex-col justify-center px-4 py-3 text-left sm:px-6 sm:py-4">
          <h2 className="ui-page-title !m-0 flex items-center gap-3 text-xl leading-snug font-semibold text-gray-800 uppercase sm:text-2xl dark:text-white/90">
            <FaUser className="text-blue-500" />
            Hồ sơ
          </h2>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="relative inline-block">
              <Avatar
                src={user?.image_url}
                alt="Profile"
                size={100}
                icon={<FaUser />}
                className="cursor-pointer border-4 border-gray-100 shadow-lg transition-all duration-200 hover:shadow-xl dark:border-gray-700"
                onClick={showAvatarModal}
              />
              <div
                className="absolute -right-1 -bottom-1 cursor-pointer rounded-full border-2 border-white bg-blue-500 p-2 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:bg-blue-600"
                onClick={showAvatarModal}
                title="Chỉnh sửa ảnh đại diện"
              >
                <FaEdit size={12} />
              </div>
            </div>

            {/* Info */}
            <div className="space-y-2 text-center sm:text-left">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                {user?.name}
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Tag color="blue" className="!font-mono !text-xs">
                  <FaIdBadge className="mr-1 inline-block" />
                  {user?.id}
                </Tag>
                <Tag color="geekblue" className="!text-xs">
                  <FaBriefcase className="mr-1 inline-block" />
                  {user?.role.name}
                </Tag>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Forms Grid ───────────────────────────────────────── */}
      <div className={isAdmin ? '' : 'grid grid-cols-1 gap-4 sm:grid-cols-2'}>
        {!isAdmin && <ChangeInfo />}
        <ChangePassword />
      </div>

      {/* Avatar Edit Modal */}
      <Modal
        title="Cập nhật ảnh đại diện"
        open={isAvatarModalOpen}
        onCancel={handleAvatarModalClose}
        footer={null}
        width={480}
        centered
        className="avatar-edit-modal"
      >
        <ChangeAvatar onSuccess={handleAvatarModalClose} showCard={false} />
      </Modal>
    </>
  );
};
