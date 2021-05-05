import React, { useCallback, useEffect, useState } from 'react';
import { GetServerSideProps } from "next";
import { loadStripe } from "@stripe/stripe-js";
import Stripe from "stripe";
import { createCheckoutSession } from "next-stripe/client";

//https://github.com/notrab/react-use-cart
import { CartProvider, useCart } from "react-use-cart";

interface IPrice extends Stripe.Price {
  product: Stripe.Product;
}

interface IProps {
  prices: IPrice[];
}

interface Product {
  price: string;
  quantity: number;
}

interface Item {
  id: string;
  price: number;
  quantity?: number;
  img: string;
}

function Page( {products} : any ) {
  const { addItem, inCart } = useCart();

  return (
    <div>
      {products.map( p => {
        const alreadyAdded = inCart(p.id);

        return (
          <div key={p.id}>
            <button onClick={() => addItem(p)}>
              {alreadyAdded ? "Add again" : "Add to Cart"}
            </button>
            <img style={{width:'50px', height:'50px'}} src={p.img} />
          </div>
        );
      })}
    </div>
  );
}

function Cart() {
  const {
    isEmpty,
    cartTotal,
    totalUniqueItems,
    items,
    updateItemQuantity,
    removeItem,
    emptyCart
  } = useCart();

  if (isEmpty) return <p>Your cart is empty</p>;

  return (
    <>
      <h1>
        Cart ({totalUniqueItems} - {cartTotal})
      </h1>

      hola mundo

      {!isEmpty && <button onClick={emptyCart}>Empty cart</button>}

      <ul>
        {items.map(item => (
          <li key={item.id}>
            {item.quantity} x {item.name}
            <button
              onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
            >
              -
            </button>
            <button
              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
            >
              +
            </button>
            <button onClick={() => removeItem(item.id)}>Remove &times;</button>
            <img style={{width:'50px', height:'50px'}} src={item.img} />
          </li>
        ))}
      </ul>
    </>
  );
}

function Purchase() {
  const { items, cartTotal } = useCart();
  const purchase = useCallback( async () => {

    // convert items to stripe product
    const cartStripe: Array<Product> = items.map( i => ({
      price: i.id,
      quantity: i.quantity || 0
    }));
    // delete all products with quantity <= 0
    const cartFiltered = cartStripe.filter( p => p.quantity > 0 );

    if(cartFiltered.length > 0) {
      const session = await createCheckoutSession({
        success_url: window.location.href,
        cancel_url: window.location.href,
        line_items: cartFiltered,
        payment_method_types: ["card"],
        mode: "payment",
      });
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);
      if (stripe) {
        stripe.redirectToCheckout({ sessionId: session.id });
      }
    } else {
      console.log(' El carrito esta vacio ');
    }
  },[items]);
  return(
    <button onClick={() => purchase()}>Purchase</button>
  );
}

export default function Home({ prices }: IProps) {

  const products: Array<any> = prices.map( p => ( {
    id: p.id,
    price: ((p.unit_amount as number) / 100).toFixed(2),
    quantity: 0,
    img: p.product.images[0],
  } ) );

  return (
    <>
      <CartProvider
        id="jamie"
        onItemAdd={item => console.log(`Item ${item.id} added!`)}
        onItemUpdate={item => console.log(`Item ${item.id} updated.!`)}
        onItemRemove={() => console.log(`Item removed!`)}
      >
        <Cart />
        <Page products={products} />
        <Purchase />
      </CartProvider>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2020-08-27",
  });

  const prices = await stripe.prices.list({
    active: true,
    limit: 10,
    expand: ["data.product"],
  });

  return { props: { prices: prices.data } };
};
