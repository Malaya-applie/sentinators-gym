"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchProducts,
  fetchCategories,
  addToCart,
} from "@/store/slices/shopSlice";
import { CartSidebar } from "./cart-sidebar";

const UPLOADS_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace("/api", "");

function productImageSrc(image?: string | null): string {
  if (!image) return "/product-1.png";
  if (image.startsWith("http")) return image;
  if (image.startsWith("/uploads/")) return `${UPLOADS_BASE}${image}`;
  return image;
}

export function ShopProductsSection() {
  const dispatch = useAppDispatch();
  const { products, categories, loading, error } = useAppSelector(
    (s) => s.shop,
  );

  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [addedId, setAddedId] = useState<number | null>(null);

  const cartCount = useAppSelector((s) =>
    s.shop.cart.reduce((sum, c) => sum + c.quantity, 0),
  );

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchCategories());

    // Poll for stock updates every 30 seconds
    const interval = setInterval(() => {
      dispatch(fetchProducts());
    }, 30_000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Sync quantities when products load
  useEffect(() => {
    if (products.length > 0) {
      setQuantities((prev) => {
        const next: Record<number, number> = {};
        products.forEach((p) => {
          next[p.id] = prev[p.id] ?? 1;
        });
        return next;
      });
    }
  }, [products]);

  const updateQty = (id: number, delta: number) => {
    const product = products.find((p) => p.id === id);
    const max = product?.stock ?? 1;
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.min(max, Math.max(1, (prev[id] ?? 1) + delta)),
    }));
  };

  const handleAddToCart = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const qty = quantities[productId] ?? 1;
    dispatch(addToCart({ product, quantity: qty }));
    setAddedId(productId);
    setTimeout(() => setAddedId(null), 1500);
    // open cart only if not already open
    setCartOpen((prev) => prev || true);
  };

  // Filter by active category ("All" shows everything)
  const visibleProducts =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory);

  // Build tab list: use backend categories, fallback to "All" if empty
  const tabs = categories.length > 0 ? categories.map((c) => c.name) : ["All"];

  return (
    <section className="py-12 bg-transparent flex items-start">
      {/* Floating Cart Button — hide when sidebar is open */}
      {!cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-3 rounded-full text-white font-semibold text-sm shadow-lg shadow-purple-900/40 transition-transform hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)" }}
        >
          <ShoppingCart size={18} />
          {cartCount > 0 && (
            <span className="bg-white text-purple-700 text-xs font-extrabold rounded-full w-5 h-5 flex items-center justify-center">
              {cartCount}
            </span>
          )}
          {cartCount === 0 && <span>Cart</span>}
        </button>
      )}

      {/* Products Area */}
      <div className="flex-1 min-w-0 transition-all duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Category Tabs */}
          {/* Responsive Category Tabs (no horizontal scroll, always wraps) */}
          <div
            className="flex gap-2 mb-10 p-2 rounded-xl flex-wrap"
            style={{
              background: "#0300044D",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {tabs.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-white text-black"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          {loading && products.length === 0 ? (
            <p className="text-white/40 text-center py-12">Loading products…</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleProducts.map((product) => (
                <div
                  key={product.id}
                  className="rounded-xl border border-white/10 overflow-hidden flex flex-col"
                  style={{ background: "#0300044D" }}
                >
                  {/* Product Image */}
                  <div className="relative w-full aspect-4/3 bg-black/30">
                    <Image
                      src={productImageSrc(product.image)}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <h3 className="text-white font-semibold text-base">
                      {product.name}
                    </h3>
                    {product.features && product.features.length > 0 && (
                      <ul className="text-white/60 text-xs space-y-1">
                        {product.features.map((f, i) => (
                          <li key={i}>– {f}</li>
                        ))}
                      </ul>
                    )}

                    {/* Price + Qty */}
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-white font-bold text-lg">
                          {product.currency} {product.price}
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            product.stock === 0
                              ? "text-red-400"
                              : product.stock <= 3
                                ? "text-yellow-400"
                                : "text-white/40"
                          }`}
                        >
                          {product.stock === 0
                            ? "Out of stock"
                            : `${product.stock} in stock`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 border border-white/20 rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateQty(product.id, -1)}
                          disabled={product.stock === 0}
                          className="px-2 py-1 text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          −
                        </button>
                        <span className="px-3 text-white text-sm">
                          {quantities[product.id] ?? 1}
                        </span>
                        <button
                          onClick={() => updateQty(product.id, 1)}
                          disabled={
                            product.stock === 0 ||
                            (quantities[product.id] ?? 1) >= product.stock
                          }
                          className="px-2 py-1 text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <Button
                      onClick={() => handleAddToCart(product.id)}
                      disabled={product.stock === 0}
                      className="btn-gradient text-white font-semibold w-fit px-6 mt-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {product.stock === 0
                        ? "Out of Stock"
                        : addedId === product.id
                          ? "Added!"
                          : "Add to Cart"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Panel — in-page right column */}
      <div
        className={`transition-all mx-5 duration-300 ease-in-out overflow-hidden shrink-0 ${
          cartOpen ? "w-96" : "w-0"
        }`}
      >
        {cartOpen && (
          <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
        )}
      </div>
    </section>
  );
}
