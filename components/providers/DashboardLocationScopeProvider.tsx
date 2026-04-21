"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isAdminOrSuperAdmin } from "@/lib/config/roles";
import { useAuth } from "@/lib/hooks/use-auth";
import { useLocations } from "@/lib/queries/locations";

const STORAGE_KEY = "dashboard:selected-location-ids";

export type DashboardScopedLocation = {
  id: string;
  name: string;
  code?: string;
  color?: string;
};

type DashboardLocationScopeValue = {
  accessibleLocations: DashboardScopedLocation[];
  selectedLocationIds: string[];
  selectedLocationNames: string[];
  primaryLocationId: string | null;
  primaryLocationName: string | null;
  canSelectMultiple: boolean;
  isReady: boolean;
  setSelectedLocationIds: (ids: string[]) => void;
};

const DashboardLocationScopeContext = createContext<DashboardLocationScopeValue | null>(null);

function normalizeIds(ids: string[], accessibleLocations: DashboardScopedLocation[]) {
  const allowed = new Set(accessibleLocations.map((location) => location.id));
  return ids.filter((id, index) => allowed.has(id) && ids.indexOf(id) === index);
}

function withFallback(ids: string[], accessibleLocations: DashboardScopedLocation[]) {
  if (ids.length > 0) return ids;
  return accessibleLocations[0] ? [accessibleLocations[0].id] : [];
}

export function DashboardLocationScopeProvider({ children }: { children: ReactNode }) {
  const { user, isHydrated } = useAuth();
  const locationsQuery = useLocations({ enabled: isHydrated });
  const [selectedLocationIds, setSelectedLocationIdsState] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  const accessibleLocations = useMemo<DashboardScopedLocation[]>(() => {
    const allLocations =
      locationsQuery.data?.locations
        ?.filter((location) => location.isActive !== false)
        .map((location) => ({
          id: location.id,
          name: location.name,
          code: location.code,
          color: location.color,
        })) ?? [];

    if (!user) return [];
    if (isAdminOrSuperAdmin(user.role)) return allLocations;

    const assignedNames = new Set((user.location ?? []).map((name) => String(name).trim()).filter(Boolean));
    if (assignedNames.size === 0) return allLocations;

    return allLocations.filter((location) => assignedNames.has(location.name));
  }, [locationsQuery.data?.locations, user]);

  const setSelectedLocationIds = useCallback(
    (ids: string[]) => {
      setSelectedLocationIdsState(withFallback(normalizeIds(ids, accessibleLocations), accessibleLocations));
    },
    [accessibleLocations],
  );

  useEffect(() => {
    if (!isHydrated) return;
    if (locationsQuery.isLoading) return;

    if (accessibleLocations.length === 0) {
      setSelectedLocationIdsState([]);
      setInitialized(true);
      return;
    }

    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    let storedIds: string[] = [];
    if (storedValue) {
      try {
        const parsed = JSON.parse(storedValue);
        storedIds = Array.isArray(parsed) ? normalizeIds(parsed.map(String), accessibleLocations) : [];
      } catch {
        storedIds = [];
      }
    }
    const nextIds = withFallback(storedIds, accessibleLocations);

    setSelectedLocationIdsState(nextIds);
    setInitialized(true);
  }, [accessibleLocations, isHydrated, locationsQuery.isLoading]);

  useEffect(() => {
    if (!initialized) return;

    const validIds = normalizeIds(selectedLocationIds, accessibleLocations);
    if (validIds.length !== selectedLocationIds.length) {
      const fallbackIds = withFallback(validIds, accessibleLocations);
      setSelectedLocationIdsState(fallbackIds);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(withFallback(validIds, accessibleLocations)));
  }, [accessibleLocations, initialized, selectedLocationIds]);

  const selectedLocations = useMemo(() => {
    const selectedSet = new Set(selectedLocationIds);
    return accessibleLocations.filter((location) => selectedSet.has(location.id));
  }, [accessibleLocations, selectedLocationIds]);

  const value = useMemo<DashboardLocationScopeValue>(
    () => ({
      accessibleLocations,
      selectedLocationIds,
      selectedLocationNames: selectedLocations.map((location) => location.name),
      primaryLocationId: selectedLocations[0]?.id ?? null,
      primaryLocationName: selectedLocations[0]?.name ?? null,
      canSelectMultiple: accessibleLocations.length > 1,
      isReady: initialized && isHydrated,
      setSelectedLocationIds,
    }),
    [accessibleLocations, initialized, isHydrated, selectedLocationIds, selectedLocations, setSelectedLocationIds],
  );

  return (
    <DashboardLocationScopeContext.Provider value={value}>
      {children}
    </DashboardLocationScopeContext.Provider>
  );
}

export function useDashboardLocationScope() {
  const context = useContext(DashboardLocationScopeContext);
  if (!context) {
    throw new Error("useDashboardLocationScope must be used within DashboardLocationScopeProvider");
  }
  return context;
}
