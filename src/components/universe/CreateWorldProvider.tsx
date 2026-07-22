"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CreateWorldDialog } from "./CreateWorldDialog";

interface CreateWorldContextValue {
  openDialog: () => void;
  closeDialog: () => void;
}

const CreateWorldContext = createContext<CreateWorldContextValue | null>(null);

export function CreateWorldProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openDialog = useCallback(() => setOpen(true), []);
  const closeDialog = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ openDialog, closeDialog }),
    [openDialog, closeDialog],
  );

  return (
    <CreateWorldContext.Provider value={value}>
      {children}
      <CreateWorldDialog open={open} onOpenChange={setOpen} />
    </CreateWorldContext.Provider>
  );
}

export function useCreateWorldDialog(): CreateWorldContextValue {
  const context = useContext(CreateWorldContext);
  if (!context) {
    throw new Error("useCreateWorldDialog must be used within CreateWorldProvider");
  }
  return context;
}
