const currencyFormatterNaira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
});

export const formatToNaira = (value: number) => currencyFormatterNaira.format(value);
