import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const BRANDS = ['Nike', 'Adidas', 'New Balance', 'HOKA', 'Brooks', 'Asics', 'On Running', 'Saucony'];
const CATEGORIES = ['running', 'casual', 'basketball', 'training', 'hiking', 'dress', 'sandals'];
const PRICE_RANGES = [
  { label: 'Under $50', min: 0, max: 50 },
  { label: '$50 – $100', min: 50, max: 100 },
  { label: '$100 – $150', min: 100, max: 150 },
  { label: '$150+', min: 150, max: null },
];

export default function FilterSidebar({ onFiltersChange }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedBrands, setSelectedBrands] = useState(
    searchParams.getAll('brand')
  );
  const [selectedCategories, setSelectedCategories] = useState(
    searchParams.getAll('category')
  );
  const [priceRange, setPriceRange] = useState({
    min: searchParams.get('minPrice') || '',
    max: searchParams.get('maxPrice') || '',
  });
  const [inStockOnly, setInStockOnly] = useState(
    searchParams.get('inStock') === 'true'
  );

  useEffect(() => {
    const params = new URLSearchParams();
    selectedBrands.forEach((b) => params.append('brand', b));
    selectedCategories.forEach((c) => params.append('category', c));
    if (priceRange.min) params.set('minPrice', priceRange.min);
    if (priceRange.max) params.set('maxPrice', priceRange.max);
    if (inStockOnly) params.set('inStock', 'true');

    setSearchParams(params);
    onFiltersChange(Object.fromEntries(params));  // URLSearchParams.fromEntries loses multi-value brands/categories
  }, [selectedBrands, selectedCategories, priceRange, inStockOnly]);
  // missing dependency: onFiltersChange — stale closure if parent re-renders

  const toggleBrand = (brand) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const applyPricePreset = ({ min, max }) => {
    setPriceRange({ min: min ?? '', max: max ?? '' });
  };

  const clearAll = () => {
    setSelectedBrands([]);
    setSelectedCategories([]);
    setPriceRange({ min: '', max: '' });
    setInStockOnly(false);
  };

  return (
    <aside className="filter-sidebar">
      <div className="filter-header">
        <h2>Filter</h2>
        <button className="clear-btn" onClick={clearAll}>Clear All</button>
      </div>

      <section className="filter-group">
        <h3>Brand</h3>
        {BRANDS.map((brand) => (
          <label key={brand} className="filter-checkbox">
            <input
              type="checkbox"
              checked={selectedBrands.includes(brand)}
              onChange={() => toggleBrand(brand)}
            />
            {brand}
          </label>
        ))}
      </section>

      <section className="filter-group">
        <h3>Category</h3>
        {CATEGORIES.map((cat) => (
          <label key={cat} className="filter-checkbox">
            <input
              type="checkbox"
              checked={selectedCategories.includes(cat)}
              onChange={() => toggleCategory(cat)}
            />
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </label>
        ))}
      </section>

      <section className="filter-group">
        <h3>Price</h3>
        {PRICE_RANGES.map((range) => (
          <button
            key={range.label}
            className={`price-preset ${priceRange.min == range.min && priceRange.max == range.max ? 'active' : ''}`}
            onClick={() => applyPricePreset(range)}
          >
            {range.label}
          </button>
        ))}
        <div className="price-custom">
          <input
            type="number"
            placeholder="Min"
            value={priceRange.min}
            onChange={(e) => setPriceRange((p) => ({ ...p, min: e.target.value }))}
          />
          <span>–</span>
          <input
            type="number"
            placeholder="Max"
            value={priceRange.max}
            onChange={(e) => setPriceRange((p) => ({ ...p, max: e.target.value }))}
          />
        </div>
      </section>

      <section className="filter-group">
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
          />
          In stock only
        </label>
      </section>
    </aside>
  );
}
