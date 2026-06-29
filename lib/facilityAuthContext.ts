import { createContext, useContext } from "react";

type FacilityAuthContextValue = {
  logout: () => void;
};

export const FacilityAuthContext = createContext<FacilityAuthContextValue | null>(
  null,
);

export function useFacilityAuthContext(): FacilityAuthContextValue {
  const ctx = useContext(FacilityAuthContext);
  if (!ctx) {
    throw new Error(
      "useFacilityAuthContext must be used within FacilityAuthContext.Provider",
    );
  }
  return ctx;
}
