import React from 'react';

const CartWidget = () => {
  const itemCount = 3; // Puedes hacerlo dinámico más adelante

  return (
    <div className="cart-widget">
      🛒
      <span>{itemCount}</span>
    </div>
  );
};

export default CartWidget;
