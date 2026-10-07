"use client";
import { AppStore, makeStore } from "@/redux/store";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import { Provider } from "react-redux";
import { persistStore } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";

/**
 * Wraps the app in the Redux Provider + PersistGate.
 *
 * SSR behaviour: the server renders a small placeholder
 * instead of the children. This is required because several
 * pages call `useSearchParams()` without a Suspense boundary
 * and Next.js will refuse to prerender them if children mount
 * during the server pass.
 *
 * Client behaviour: after hydration the persistor is created
 * synchronously inside `useEffect` (so it only runs once) and
 * we mount the Provider+PersistGate. Crucially, we set
 * `loading={null}` on the PersistGate so children mount
 * immediately while the REHYDRATE action is in flight — the
 * previous `<p>Loading…</p>` placeholder was what users saw
 * as a long flash before the signup form appeared. Individual
 * pages (e.g. FreeClassLanding) already handle the "user is
 * still null" case with a brief splash and a 1.5 s
 * stale-session fallback, so the lack of a global loading
 * state is fine.
 */
const StoreProvider = ({ children }: { children: ReactNode }) => {
  const storeRef = useRef<AppStore | undefined>(undefined);
  const persistorRef = useRef<ReturnType<typeof persistStore> | null>(null);
  const [persistor, setPersistor] = useState<ReturnType<typeof persistStore> | null>(
    null,
  );

  useEffect(() => {
    if (!storeRef.current) {
      storeRef.current = makeStore();
    }
    if (!persistorRef.current) {
      persistorRef.current = persistStore(storeRef.current);
    }
    setPersistor(persistorRef.current);
  }, []);

  // SSR / pre-hydration: render a minimal placeholder so we
  // don't mount children that depend on browser-only APIs
  // (e.g. useSearchParams without a Suspense boundary). The
  // original `<p>Loading…</p>` was the culprit behind the
  // long flash before the signup form rendered — it was
  // also unmounted as soon as the client took over, so
  // replacing it with a no-op keeps the page from
  // double-rendering.
  if (!persistor) {
    return <div suppressHydrationWarning />;
  }

  return (
    <Provider store={storeRef.current!}>
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
};

export default StoreProvider;