"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type SecurityLevel = "low" | "medium" | "high" | "fixed";
export type ColorTheme = "dark" | "light" | "matrix";

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  role: string;
  wallet_balance: number;
  full_name?: string;
}

export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface QueryLogItem {
  id: string;
  timestamp: string;
  endpoint?: string;
  vulnId?: string;
  sql: string;
  params?: unknown[];
  durationMs: number;
  rowCount?: number;
  error?: string;
  mode: string;
}

const DEFAULT_CART: CartItem[] = [
  {
    product_id: 1,
    name: "Flipper Zero Multi-Tool Lab Edition",
    price: 169.0,
    quantity: 1,
  },
];

interface LabContextValue {
  securityLevel: SecurityLevel;
  dbMode: string;
  currentUser: UserInfo | null;
  queryLogs: QueryLogItem[];
  cart: CartItem[];
  theme: ColorTheme;
  restoreVersion: number;
  lastRestoredAt: string | null;
  isLoading: boolean;
  refreshLabState: () => Promise<void>;
  changeSecurityLevel: (level: SecurityLevel) => Promise<void>;
  quickSwitchUser: (userId: number | null) => Promise<void>;
  resetDatabase: () => Promise<void>;
  setTheme: (theme: ColorTheme) => void;
  cycleTheme: () => void;
  addToCart: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  updateCartItem: (
    productId: number,
    updates: Partial<Pick<CartItem, "quantity" | "price">>
  ) => void;
  clearCart: () => void;
}

const LabContext = createContext<LabContextValue | undefined>(undefined);

export function LabProvider({ children }: { children: React.ReactNode }) {
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>("low");
  const [dbMode, setDbMode] = useState<string>("in-memory-postgres");
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [queryLogs, setQueryLogs] = useState<QueryLogItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>(DEFAULT_CART);
  const [theme, setThemeState] = useState<ColorTheme>("dark");
  const [restoreVersion, setRestoreVersion] = useState<number>(0);
  const [lastRestoredAt, setLastRestoredAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const applyTheme = useCallback((nextTheme: ColorTheme) => {
    setThemeState(nextTheme);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", nextTheme);
    }
    try {
      localStorage.setItem("vulnlab_theme", nextTheme);
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("vulnlab_theme") as ColorTheme | null;
      if (saved && ["dark", "light", "matrix"].includes(saved)) {
        applyTheme(saved);
      } else {
        applyTheme("dark");
      }
    } catch {
      applyTheme("dark");
    }
  }, [applyTheme]);

  const cycleTheme = useCallback(() => {
    const order: ColorTheme[] = ["dark", "light", "matrix"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    applyTheme(next);
  }, [theme, applyTheme]);

  const refreshLabState = useCallback(async () => {
    try {
      const res = await fetch("/api/lab", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setSecurityLevel(data.securityLevel || "low");
      setDbMode(data.dbMode || "in-memory-postgres");
      setCurrentUser(data.currentUser || null);
      setQueryLogs(data.queryLogs || []);
    } catch {
      // Ignore network poll errors
    }
  }, []);

  useEffect(() => {
    refreshLabState();
  }, [refreshLabState]);

  const changeSecurityLevel = async (level: SecurityLevel) => {
    setIsLoading(true);
    try {
      await fetch("/api/lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ securityLevel: level }),
      });
      await refreshLabState();
    } finally {
      setIsLoading(false);
    }
  };

  const quickSwitchUser = async (userId: number | null) => {
    setIsLoading(true);
    try {
      if (userId === null) {
        await fetch("/api/auth/logout", { method: "POST" });
      } else {
        await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quickLoginUserId: userId }),
        });
      }
      await refreshLabState();
    } finally {
      setIsLoading(false);
    }
  };

  const resetDatabase = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/lab/reset", { method: "POST" });
      // Reset all client-side parameters, cart, user session, and remount active page forms
      setCart(DEFAULT_CART.map((item) => ({ ...item })));
      setCurrentUser(null);
      setSecurityLevel("low");
      setRestoreVersion((v) => v + 1);
      setLastRestoredAt(new Date().toLocaleTimeString());
      await refreshLabState();
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (item: Omit<CartItem, "quantity">, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === item.product_id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === item.product_id
            ? { ...i, quantity: i.quantity + qty }
            : i
        );
      }
      return [...prev, { ...item, quantity: qty }];
    });
  };

  const updateCartItem = (
    productId: number,
    updates: Partial<Pick<CartItem, "quantity" | "price">>
  ) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, ...updates } : item
      )
    );
  };

  const clearCart = () => setCart([]);

  return (
    <LabContext.Provider
      value={{
        securityLevel,
        dbMode,
        currentUser,
        queryLogs,
        cart,
        theme,
        restoreVersion,
        lastRestoredAt,
        isLoading,
        refreshLabState,
        changeSecurityLevel,
        quickSwitchUser,
        resetDatabase,
        setTheme: applyTheme,
        cycleTheme,
        addToCart,
        updateCartItem,
        clearCart,
      }}
    >
      <div key={restoreVersion}>{children}</div>
    </LabContext.Provider>
  );
}

export function useLab() {
  const ctx = useContext(LabContext);
  if (!ctx) {
    throw new Error("useLab must be used inside LabProvider");
  }
  return ctx;
}
