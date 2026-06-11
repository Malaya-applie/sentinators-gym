"use client";

import { useEffect } from "react";
import { X, Trash2, Plus, Minus, PackageCheck } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addToCart,
  removeFromCart,
  clearCart,
  placeOrder,
  clearShopMessages,
} from "@/store/slices/shopSlice";

interface CartSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function CartSidebar({ open, onClose }: CartSidebarProps) {
  const dispatch = useAppDispatch();
  const { cart, orderLoading, successMessage, error } = useAppSelector(
    (s) => s.shop,
  );
  const { user } = useAppSelector((s) => s.auth);

  const total = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  const currency = cart[0]?.product.currency ?? "CHF";

  const updateQty = (productId: number, delta: number) => {
    const item = cart.find((c) => c.product.id === productId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      dispatch(removeFromCart(productId));
    } else if (newQty <= item.product.stock) {
      dispatch(addToCart({ product: item.product, quantity: delta }));
    }
  };

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => dispatch(clearShopMessages()), 2000);
    return () => clearTimeout(t);
  }, [successMessage, dispatch]);

  const handlePlaceOrder = async () => {
    if (!user || cart.length === 0) return;
    const items = cart.map((c) => ({
      productId: c.product.id,
      quantity: c.quantity,
    }));
    await dispatch(placeOrder(items));
  };

  return (
    <div
      className="sticky top-8 flex flex-col w-full px-6 py-8 rounded-2xl"
      style={{
        background:
          "linear-gradient(160deg, rgba(124,58,237,0.06) 0%, rgba(13,0,20,0.4) 100%)",
        border: "1px solid rgba(124,58,237,0.25)",
        boxShadow:
          "0 0 32px rgba(124,58,237,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Heading row */}
      <div className="flex items-start justify-between mb-6">
        <h5 className="text-5xl font-bold text-white leading-none tracking-tight">
          Cart
        </h5>
        <button
          onClick={onClose}
          className="mt-1 p-1.5 rounded-lg text-white/30 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="flex items-center gap-2 text-green-400 text-xs mb-4">
          <PackageCheck size={14} />
          {successMessage}
        </div>
      )}
      {error && <div className="text-red-400 text-xs mb-3">{error}</div>}

      {/* Item list — no flex-1, grows with content */}
      <div className="space-y-0">
        {cart.length === 0 ? (
          <p className="text-white/20 text-sm mt-2">Nothing added yet.</p>
        ) : (
          cart.map((item) => (
            <div
              key={item.product.id}
              className="flex items-center justify-between py-3 border-b border-white/5 group"
            >
              {/* Left: name + qty controls */}
              <div className="flex flex-col gap-1.5 min-w-0 pr-3">
                <span className="text-white/80 text-sm font-medium leading-tight line-clamp-1">
                  {item.product.name}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQty(item.product.id, -1)}
                    className="w-5 h-5 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Minus size={10} />
                  </button>
                  <span className="text-white/50 text-xs w-5 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQty(item.product.id, 1)}
                    disabled={item.quantity >= item.product.stock}
                    className="w-5 h-5 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>

              {/* Right: price + remove */}
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className="text-sm font-semibold text-white px-2 py-0.5 rounded"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  {item.product.currency}{" "}
                  {(item.product.price * item.quantity).toFixed(0)}
                </span>
                <button
                  onClick={() => dispatch(removeFromCart(item.product.id))}
                  className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer — directly below items, no gap */}
      {cart.length > 0 && (
        <div className="mt-5 space-y-4">
          <div
            className="h-px"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />

          <div className="flex items-baseline justify-between">
            <span className="text-white/40 text-sm">Total</span>
            <span className="text-white font-bold text-3xl">
              {currency} {total.toFixed(0)}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => dispatch(clearCart())}
              className="px-3 py-2.5 rounded-lg text-white/30 hover:text-white text-xs font-medium transition-colors hover:bg-white/5"
            >
              Clear
            </button>
            <button
              onClick={handlePlaceOrder}
              disabled={orderLoading || !user}
              className="flex-1 py-2.5 rounded-lg text-white font-semibold text-sm btn-gradient transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {orderLoading
                ? "Placing…"
                : !user
                  ? "Login to Order"
                  : "Pick Now"}
            </button>
          </div>

          {!user && (
            <p className="text-white/20 text-xs text-center -mt-2">
              Log in to complete your purchase.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
