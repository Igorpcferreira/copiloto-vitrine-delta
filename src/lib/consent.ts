"use client";

import { useSyncExternalStore } from "react";

export type ConsentValue = "granted" | "denied";

const STORAGE_KEY = "vitrine-consent";
const CHANGE_EVENT = "vitrine-consent-change";

let memoryConsent: ConsentValue | null = null;

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeConsent(value: ConsentValue): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    return;
  }
}

function readConsent(): ConsentValue | null {
  const stored = readStored();
  return stored === "granted" || stored === "denied" ? stored : memoryConsent;
}

export function saveConsent(value: ConsentValue): void {
  memoryConsent = value;
  storeConsent(value);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useConsent(): ConsentValue | null | undefined {
  return useSyncExternalStore<ConsentValue | null | undefined>(subscribe, readConsent, () => undefined);
}
