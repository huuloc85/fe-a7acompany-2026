import { Link, LinkProps } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import AppButton from '@components/common/AppButton';

import { FaArrowLeft } from 'react-icons/fa6';

const BackButton: React.FC<LinkProps> = ({ ...props }) => {
  return (
    <>
      <Link to={props.to || '..'} className="inline-block">
        <motion.div
          whileHover={{ x: -4, scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          className="inline-block"
        >
          <AppButton tone="neutral" icon={<FaArrowLeft />}>
            Quay lại
          </AppButton>
        </motion.div>
      </Link>
    </>
  );
};

export default BackButton;
