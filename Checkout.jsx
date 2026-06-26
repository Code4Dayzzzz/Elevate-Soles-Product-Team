import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { formatPrice } from '../utils/currency';
import { submitOrder } from '../utils/api';

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

const SHIPPING_RATES = {
  standard: 5.99,
  express: 14.99,
  overnight: 29.99,
};

export default function Checkout() {
  const { cart, clearCart } = useContext(CartContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
    shippingMethod: 'standard',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = SHIPPING_RATES[form.shippingMethod];
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;  // tax calc runs on subtotal only, but shipping should also be taxed in some states

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.email.includes('@')) e.email = 'Invalid email';
    if (!form.address1.trim()) e.address1 = 'Required';
    if (!form.city.trim()) e.city = 'Required';
    if (!form.state) e.state = 'Required';
    if (!/^\d{5}$/.test(form.zip)) e.zip = 'Must be 5 digits';
    if (form.cardNumber.replace(/\s/g, '').length !== 16) e.cardNumber = 'Must be 16 digits';
    if (!/^\d{2}\/\d{2}$/.test(form.expiry)) e.expiry = 'Format: MM/YY';
    if (!/^\d{3,4}$/.test(form.cvv)) e.cvv = 'Invalid CVV';
    return e;
  };

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((err) => ({ ...err, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      const order = await submitOrder({
        customer: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
        },
        shipping: {
          address1: form.address1,
          address2: form.address2,
          city: form.city,
          state: form.state,
          zip: form.zip,
          method: form.shippingMethod,
        },
        payment: {
          cardNumber: form.cardNumber,  // sent raw — should be tokenized
          expiry: form.expiry,
          cvv: form.cvv,
        },
        items: cart,
        totals: { subtotal, shipping, tax, total },
      });

      clearCart();
      navigate(`/order-confirmation/${order.id}`);
    } catch (err) {
      setErrors({ submit: 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="checkout-empty">
        <p>Your cart is empty.</p>
        <button onClick={() => navigate('/shop')}>Continue Shopping</button>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>
      <form onSubmit={handleSubmit} className="checkout-form" noValidate>

        <section className="form-section">
          <h2>Contact Information</h2>
          <div className="form-row">
            <div className="form-field">
              <label>First Name</label>
              <input value={form.firstName} onChange={handleChange('firstName')} />
              {errors.firstName && <span className="error">{errors.firstName}</span>}
            </div>
            <div className="form-field">
              <label>Last Name</label>
              <input value={form.lastName} onChange={handleChange('lastName')} />
              {errors.lastName && <span className="error">{errors.lastName}</span>}
            </div>
          </div>
          <div className="form-field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={handleChange('email')} />
            {errors.email && <span className="error">{errors.email}</span>}
          </div>
        </section>

        <section className="form-section">
          <h2>Shipping Address</h2>
          <div className="form-field">
            <label>Address</label>
            <input value={form.address1} onChange={handleChange('address1')} />
            {errors.address1 && <span className="error">{errors.address1}</span>}
          </div>
          <div className="form-field">
            <label>Apt / Suite (optional)</label>
            <input value={form.address2} onChange={handleChange('address2')} />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>City</label>
              <input value={form.city} onChange={handleChange('city')} />
              {errors.city && <span className="error">{errors.city}</span>}
            </div>
            <div className="form-field">
              <label>State</label>
              <select value={form.state} onChange={handleChange('state')}>
                <option value="">Select</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
              {errors.state && <span className="error">{errors.state}</span>}
            </div>
            <div className="form-field">
              <label>ZIP</label>
              <input value={form.zip} onChange={handleChange('zip')} maxLength={5} />
              {errors.zip && <span className="error">{errors.zip}</span>}
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>Shipping Method</h2>
          {Object.entries(SHIPPING_RATES).map(([method, rate]) => (
            <label key={method} className="shipping-option">
              <input
                type="radio"
                name="shippingMethod"
                value={method}
                checked={form.shippingMethod === method}
                onChange={handleChange('shippingMethod')}
              />
              {method.charAt(0).toUpperCase() + method.slice(1)} — {formatPrice(rate)}
            </label>
          ))}
        </section>

        <section className="form-section">
          <h2>Payment</h2>
          <div className="form-field">
            <label>Card Number</label>
            <input
              value={form.cardNumber}
              onChange={handleChange('cardNumber')}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
            />
            {errors.cardNumber && <span className="error">{errors.cardNumber}</span>}
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Expiry</label>
              <input value={form.expiry} onChange={handleChange('expiry')} placeholder="MM/YY" maxLength={5} />
              {errors.expiry && <span className="error">{errors.expiry}</span>}
            </div>
            <div className="form-field">
              <label>CVV</label>
              <input value={form.cvv} onChange={handleChange('cvv')} maxLength={4} />
              {errors.cvv && <span className="error">{errors.cvv}</span>}
            </div>
          </div>
        </section>

        <div className="order-summary">
          <div className="summary-row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          <div className="summary-row"><span>Shipping</span><span>{formatPrice(shipping)}</span></div>
          <div className="summary-row"><span>Tax</span><span>{formatPrice(tax)}</span></div>
          <div className="summary-row total"><span>Total</span><span>{formatPrice(total)}</span></div>
        </div>

        {errors.submit && <p className="submit-error">{errors.submit}</p>}

        <button type="submit" className="place-order-btn" disabled={submitting}>
          {submitting ? 'Placing Order...' : `Place Order — ${formatPrice(total)}`}
        </button>
      </form>
    </div>
  );
}
