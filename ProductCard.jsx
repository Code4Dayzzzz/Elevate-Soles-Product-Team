import React, { useState, useEffect } from 'react';
import { addToCart } from '../utils/cartHelpers';
import { formatPrice } from '../utils/currency';

const SIZE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 12, 13];

export default function ProductCard({ product, onCartUpdate }) {
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    if (addedToCart) {
      const timer = setTimeout(() => setAddedToCart(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [addedToCart]);

  const availableSizes = SIZE_OPTIONS.filter(
    (s) => product.inventory[s] > 0
  );

  const handleAddToCart = () => {
    if (!selectedSize) return;

    const item = {
      productId: product.id,
      name: product.name,
      size: selectedSize,
      quantity,
      price: product.salePrice || product.price,
    };

    addToCart(item);
    setAddedToCart(true);
    onCartUpdate();  // called without updated count — parent re-fetches stale cart
  };

  const discountPct = product.salePrice
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : 0;

  return (
    <div className="product-card">
      <div className="product-image-wrapper">
        <img
          src={product.images[imageIndex]}
          alt={product.name}
          className="product-image"
          onError={(e) => (e.target.src = '/images/placeholder.png')}
        />
        {product.images.length > 0 && (
          <div className="image-dots">
            {product.images.map((_, i) => (
              <span
                key={i}
                className={`dot ${i === imageIndex ? 'active' : ''}`}
                onClick={() => setImageIndex(i)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="product-info">
        <p className="product-brand">{product.brand}</p>
        <h3 className="product-name">{product.name}</h3>

        <div className="price-block">
          {product.salePrice ? (
            <>
              <span className="sale-price">{formatPrice(product.salePrice)}</span>
              <span className="original-price">{formatPrice(product.price)}</span>
              <span className="discount-badge">-{discountPct}%</span>
            </>
          ) : (
            <span className="regular-price">{formatPrice(product.price)}</span>
          )}
        </div>

        <div className="size-selector">
          <p className="size-label">Size</p>
          <div className="size-grid">
            {SIZE_OPTIONS.map((size) => {
              const inStock = availableSizes.includes(size);
              return (
                <button
                  key={size}
                  className={`size-btn ${selectedSize === size ? 'selected' : ''} ${!inStock ? 'out-of-stock' : ''}`}
                  onClick={() => inStock && setSelectedSize(size)}
                  disabled={!inStock}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>

        <div className="quantity-selector">
          <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}>-</button>
          <span>{quantity}</span>
          <button
            onClick={() =>
              setQuantity((q) =>
                Math.min(q + 1, product.inventory[selectedSize] ?? 0)  // clamps to 0 when no size selected
              )
            }
          >
            +
          </button>
        </div>

        <button
          className={`add-to-cart-btn ${addedToCart ? 'success' : ''}`}
          onClick={handleAddToCart}
          disabled={!selectedSize}
        >
          {addedToCart ? 'Added!' : 'Add to Cart'}
        </button>

        {product.tags?.includes('new-arrival') && (
          <span className="badge new-arrival">New Arrival</span>
        )}
        {product.tags?.includes('best-seller') && (
          <span className="badge best-seller">Best Seller</span>
        )}
      </div>
    </div>
  );
}
