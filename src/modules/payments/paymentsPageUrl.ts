type PaymentsPageQuery = {
  amount?: number;
  purpose?: string;
  seva?: string;
  name?: string;
  phone?: string;
};

export const paymentsPageUrl = ({amount, purpose, seva, name, phone}: PaymentsPageQuery) => {
  const query = new URLSearchParams({from: 'app'});
  if (amount && Number.isFinite(amount) && amount > 0) {
    query.set('amount', String(Math.round(amount)));
  }
  const cleanPurpose = purpose?.trim();
  const cleanSeva = seva?.trim();
  const cleanName = name?.trim();
  const cleanPhone = phone?.replace(/\D/g, '').slice(-10);
  if (cleanPurpose) {
    query.set('purpose', cleanPurpose.slice(0, 80));
  }
  if (cleanSeva) {
    query.set('seva', cleanSeva.slice(0, 40));
  }
  if (cleanName) {
    query.set('name', cleanName.slice(0, 60));
  }
  if (cleanPhone && cleanPhone.length === 10) {
    query.set('phone', cleanPhone);
  }
  return `https://japasiddhi.com/payments?${query.toString()}`;
};
