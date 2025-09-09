export interface Product {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
}

export const products: Product[] = [
  {
    id: 'prod_T1YINCv176njWc',
    priceId: 'price_1S5VCLLB0JPPXSZZFrurGd7D',
    name: 'APInow',
    description: 'generate APIs fast and easy',
    mode: 'subscription',
    price: 29.00
  }
];

export const getProductByPriceId = (priceId: string): Product | undefined => {
  return products.find(product => product.priceId === priceId);
};

export const getProductById = (id: string): Product | undefined => {
  return products.find(product => product.id === id);
};