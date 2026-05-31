import type { AddressBookEntry, AddressBookFile } from '../types';

const STORAGE_KEY = 'fundtracer_address_book';

export function getAddressBook(): AddressBookEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data: AddressBookFile = JSON.parse(raw);
    return data.addresses || [];
  } catch {
    return [];
  }
}

export function saveAddressBook(entries: AddressBookEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ addresses: entries }));
  } catch {}
}

export function addAddress(entry: AddressBookEntry): void {
  const book = getAddressBook();
  const existing = book.findIndex(e => e.address.toLowerCase() === entry.address.toLowerCase());
  if (existing >= 0) {
    book[existing] = { ...book[existing], ...entry };
  } else {
    book.push(entry);
  }
  saveAddressBook(book);
}

export function removeAddress(address: string): void {
  const book = getAddressBook().filter(e => e.address.toLowerCase() !== address.toLowerCase());
  saveAddressBook(book);
}

export function findAddress(address: string): AddressBookEntry | undefined {
  return getAddressBook().find(e => e.address.toLowerCase() === address.toLowerCase());
}
