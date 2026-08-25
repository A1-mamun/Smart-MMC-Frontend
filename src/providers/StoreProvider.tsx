"use client";
import { AppStore, makeStore } from "@/redux/store";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import { Provider } from "react-redux";
import { persistStore } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";

const StoreProvider = ({ children }: { children: ReactNode }) => {
  const storeRef = useRef<AppStore | undefined>(undefined);
  const [persistor, setPersistor] = useState<any>(null);
  if (!storeRef.current) storeRef.current = makeStore();

  useEffect(() => {
    const _persistor = persistStore(storeRef.current!);
    setPersistor(_persistor);
  }, []);

  if (!persistor) {
    return <p className="p-6 text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <Provider store={storeRef.current}>
      <PersistGate loading={<p className="p-6 text-sm text-muted-foreground">Loading...</p>} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
};

export default StoreProvider;