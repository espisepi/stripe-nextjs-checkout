import React, { useEffect, useState } from 'react';
import { GetServerSideProps } from "next";
import { loadStripe } from "@stripe/stripe-js";
import Stripe from "stripe";
import { createCheckoutSession } from "next-stripe/client";

interface IPrice extends Stripe.Price {
  product: Stripe.Product;
}

interface IProps {
  prices: IPrice[];
}

interface Product {
  price: string,
  quantity: number
}

export default function OldHome({ prices }: IProps) {

  const [cart, setCart] = useState< Array<Product> >([]);
  const buy = async () => {

    // delete all products with quantity <= 0
    const cartFiltered = cart.filter( p => p.quantity > 0 );

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
    
  };

  const addCart = (priceId: string) => {
    const product = cart.find( p => p.price === priceId );
    if(product){
      product.quantity++;
    } else {
      cart.push({ price: priceId, quantity: 1 });
    }
    console.log(cart)
  }

  const removeCart = (priceId: string) => {
    const product = cart.find( p => p.price === priceId );
    if(product && product.quantity > 0){
      product.quantity--;
    }
    console.log(cart);
  }


  return (
    <div>
      <h1>Programmer For Hire</h1>

      <ul>
        {prices.map((price) => (
          <li key={price.id}>
            <h2>{price.product.name}</h2>
            <img src={price.product.images[0]} />
            <p>Cost: ${((price.unit_amount as number) / 100).toFixed(2)}</p>
            <button onClick={() => addCart(price.id)}>Add</button>
            <button onClick={() => removeCart(price.id)}>Remove</button>
          </li>
        ))}
      </ul>
      <button onClick={() => buy()}>Buy</button>
    </div>
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
