"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface CurrencyContextType {
  displayCurrency: string;
  setDisplayCurrency: (currency: string) => void;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [displayCurrency, setDisplayCurrency] = useState("USD");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const settings = await response.json();
          setDisplayCurrency(settings.displayCurrency || "USD");
        }
      } catch (error) {
        console.error("Failed to fetch currency settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSetDisplayCurrency = async (currency: string) => {
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayCurrency: currency }),
      });

      if (response.ok) {
        setDisplayCurrency(currency);
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent("currencyChanged", {
          detail: { displayCurrency: currency }
        }));
      } else {
        console.error("Failed to update display currency");
      }
    } catch (error) {
      console.error("Error updating display currency:", error);
    }
  };

  return (
    <CurrencyContext.Provider
      value={{
        displayCurrency,
        setDisplayCurrency: handleSetDisplayCurrency,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
