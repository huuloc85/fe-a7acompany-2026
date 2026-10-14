import { useState } from 'react';
import { BankOutlined } from '@ant-design/icons';
import { payrollBanks, payrollBankName } from '@/utils/payrollBanks';

export default function PayrollBankLabel({ bin }: { bin: string }) {
  const bank = payrollBanks.find((item) => item.bin === bin);
  const [failedLogo, setFailedLogo] = useState<string>();
  return (
    <span className="vvp-bank-label">
      <span className="vvp-bank-logo" aria-hidden="true">
        {bank?.logo && failedLogo !== bank.logo ? (
          <img
            src={bank.logo}
            alt=""
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setFailedLogo(bank.logo)}
          />
        ) : (
          <BankOutlined />
        )}
      </span>
      <span className="vvp-bank-name" title={payrollBankName(bin)}>
        {bank?.code ?? payrollBankName(bin)}
      </span>
    </span>
  );
}
