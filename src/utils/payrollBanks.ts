import type { PayrollProfile } from './payrollCalculation';

// Transfer-supported banks from https://api.vietqr.io/v2/banks (2026-10-10).
export const payrollBanks = [
  {
    bin: '970415',
    name: 'VietinBank',
    code: 'ICB',
    logo: 'https://cdn.vietqr.io/img/ICB.png'
  },
  {
    bin: '970436',
    name: 'Vietcombank',
    code: 'VCB',
    logo: 'https://cdn.vietqr.io/img/VCB.png'
  },
  {
    bin: '970418',
    name: 'BIDV',
    code: 'BIDV',
    logo: 'https://cdn.vietqr.io/img/BIDV.png'
  },
  {
    bin: '970405',
    name: 'Agribank',
    code: 'VBA',
    logo: 'https://cdn.vietqr.io/img/VBA.png'
  },
  {
    bin: '970448',
    name: 'OCB',
    code: 'OCB',
    logo: 'https://cdn.vietqr.io/img/OCB.png'
  },
  {
    bin: '970422',
    name: 'MBBank',
    code: 'MB',
    logo: 'https://cdn.vietqr.io/img/MB.png'
  },
  {
    bin: '970407',
    name: 'Techcombank',
    code: 'TCB',
    logo: 'https://cdn.vietqr.io/img/TCB.png'
  },
  {
    bin: '970416',
    name: 'ACB',
    code: 'ACB',
    logo: 'https://cdn.vietqr.io/img/ACB.png'
  },
  {
    bin: '970432',
    name: 'VPBank',
    code: 'VPB',
    logo: 'https://cdn.vietqr.io/img/VPB.png'
  },
  {
    bin: '970423',
    name: 'TPBank',
    code: 'TPB',
    logo: 'https://cdn.vietqr.io/img/TPB.png'
  },
  {
    bin: '970403',
    name: 'Sacombank',
    code: 'STB',
    logo: 'https://cdn.vietqr.io/img/STB.png'
  },
  {
    bin: '970437',
    name: 'HDBank',
    code: 'HDB',
    logo: 'https://cdn.vietqr.io/img/HDB.png'
  },
  {
    bin: '970454',
    name: 'VietCapitalBank',
    code: 'VCCB',
    logo: 'https://cdn.vietqr.io/img/VCCB.png'
  },
  {
    bin: '970429',
    name: 'SCB',
    code: 'SCB',
    logo: 'https://cdn.vietqr.io/img/SCB.png'
  },
  {
    bin: '970441',
    name: 'VIB',
    code: 'VIB',
    logo: 'https://cdn.vietqr.io/img/VIB.png'
  },
  {
    bin: '970443',
    name: 'SHB',
    code: 'SHB',
    logo: 'https://cdn.vietqr.io/img/SHB.png'
  },
  {
    bin: '970431',
    name: 'Eximbank',
    code: 'EIB',
    logo: 'https://cdn.vietqr.io/img/EIB.png'
  },
  {
    bin: '970426',
    name: 'MSB',
    code: 'MSB',
    logo: 'https://cdn.vietqr.io/img/MSB.png'
  },
  {
    bin: '546034',
    name: 'CAKE',
    code: 'CAKE',
    logo: 'https://cdn.vietqr.io/img/CAKE.png'
  },
  {
    bin: '546035',
    name: 'Ubank',
    code: 'UBANK',
    logo: 'https://cdn.vietqr.io/img/UBANK.png'
  },
  {
    bin: '963388',
    name: 'Timo',
    logo: 'https://vietqr.net/portal-service/resources/icons/TIMO.png'
  },
  {
    bin: '970400',
    name: 'SaigonBank',
    code: 'SGICB',
    logo: 'https://cdn.vietqr.io/img/SGICB.png'
  },
  {
    bin: '970409',
    name: 'BacABank',
    code: 'BAB',
    logo: 'https://cdn.vietqr.io/img/BAB.png'
  },
  {
    bin: '971025',
    name: 'MoMo',
    code: 'MOMO',
    logo: 'https://cdn.vietqr.io/img/momo.png'
  },
  {
    bin: '971133',
    name: 'PVcomBank Pay',
    code: 'PVCB',
    logo: 'https://cdn.vietqr.io/img/PVCB.png'
  },
  {
    bin: '970412',
    name: 'PVcomBank',
    code: 'PVCB',
    logo: 'https://cdn.vietqr.io/img/PVCB.png'
  },
  {
    bin: '970414',
    name: 'MBV',
    code: 'MBV',
    logo: 'https://cdn.vietqr.io/img/MBV.png'
  },
  {
    bin: '970419',
    name: 'NCB',
    code: 'NCB',
    logo: 'https://cdn.vietqr.io/img/NCB.png'
  },
  {
    bin: '970424',
    name: 'ShinhanBank',
    code: 'SHBVN',
    logo: 'https://cdn.vietqr.io/img/SHBVN.png'
  },
  {
    bin: '970425',
    name: 'ABBANK',
    code: 'ABB',
    logo: 'https://cdn.vietqr.io/img/ABB.png'
  },
  {
    bin: '970427',
    name: 'VietABank',
    code: 'VAB',
    logo: 'https://cdn.vietqr.io/img/VAB.png'
  },
  {
    bin: '970428',
    name: 'NamABank',
    code: 'NAB',
    logo: 'https://cdn.vietqr.io/img/NAB.png'
  },
  {
    bin: '970430',
    name: 'PGBank',
    code: 'PGB',
    logo: 'https://cdn.vietqr.io/img/PGB.png'
  },
  {
    bin: '970433',
    name: 'VietBank',
    code: 'VIETBANK',
    logo: 'https://cdn.vietqr.io/img/VIETBANK.png'
  },
  {
    bin: '970438',
    name: 'BaoVietBank',
    code: 'BVB',
    logo: 'https://cdn.vietqr.io/img/BVB.png'
  },
  {
    bin: '970440',
    name: 'SeABank',
    code: 'SEAB',
    logo: 'https://cdn.vietqr.io/img/SEAB.png'
  },
  {
    bin: '970446',
    name: 'COOPBANK',
    code: 'COOPBANK',
    logo: 'https://cdn.vietqr.io/img/COOPBANK.png'
  },
  {
    bin: '970449',
    name: 'LPBank',
    code: 'LPB',
    logo: 'https://cdn.vietqr.io/img/LPB.png'
  },
  {
    bin: '970452',
    name: 'KienLongBank',
    code: 'KLB',
    logo: 'https://cdn.vietqr.io/img/KLB.png'
  },
  {
    bin: '668888',
    name: 'KBank',
    code: 'KBANK',
    logo: 'https://cdn.vietqr.io/img/KBANK.png'
  },
  {
    bin: '422589',
    name: 'CIMB',
    code: 'CIMB',
    logo: 'https://cdn.vietqr.io/img/CIMB.png'
  },
  {
    bin: '970457',
    name: 'Woori',
    code: 'WVN',
    logo: 'https://cdn.vietqr.io/img/WVN.png'
  }
];

export function payrollBankBin(
  profile: Pick<PayrollProfile, 'bankBin' | 'company'>
) {
  return (
    profile.bankBin ??
    (profile.company?.trim().toLowerCase() === 'a7a' ? '' : '970436')
  );
}
export function payrollBankName(bin: string) {
  return (
    payrollBanks.find((bank) => bank.bin === bin)?.name ??
    (bin || 'Chưa chọn ngân hàng')
  );
}
