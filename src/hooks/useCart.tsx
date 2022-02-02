import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>(cart);

  useEffect(() => {
    prevCartRef.current = cart;
  })

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExists = updatedCart.findIndex(product => product.id === productId);

      const { data: StockProduct } = await api.get<Stock>(`/stock/${productId}`);

      if (productExists >= 0) {
        if (StockProduct.amount <= updatedCart[productExists].amount) {

          toast.error("Quantidade solicitada fora de estoque");

        } else {

          updatedCart[productExists].amount += 1;
          setCart(updatedCart);

        }
      } else {

        const stockAmount = StockProduct.amount;

        if (stockAmount > 0) {
          const { data: DataProduct } = await api.get<Product>(`/products/${productId}`);

          updatedCart.push({
            id: productId,
            amount: 1,
            price: DataProduct.price,
            title: DataProduct.title,
            image: DataProduct.image,
          });

          setCart(updatedCart);
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExists = updatedCart.findIndex(product => product.id === productId);

      if (productExists >= 0) {
        updatedCart.splice(productExists, 1);
        setCart(updatedCart);
      } else {
        throw Error()
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const { data: StockProduct } = await api.get<Stock>(`/stock/${productId}`);

      const stockAmount = StockProduct.amount;

      if (amount > stockAmount) {
        return toast.error('Quantidade solicitada fora de estoque');
      }

      const updatedCart = [...cart];

      const productExists = updatedCart.find(product => product.id === productId);

      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
