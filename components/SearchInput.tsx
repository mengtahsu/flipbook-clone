"use client";

import { useRef, useEffect } from "react";

interface SearchInputProps {
  placeholder?: string;
  disabled?: boolean;
  onSearch: (query: string) => void;
}

export default function SearchInput({
  placeholder = "輸入任意關鍵詞探索",
  disabled = false,
  onSearch,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputRef.current?.value.trim()) {
      e.preventDefault();
      onSearch(inputRef.current.value.trim());
      inputRef.current.value = "";
    }
  };

  return (
    <input
      ref={inputRef}
      className="browser-address-input"
      placeholder={placeholder}
      disabled={disabled}
      autoComplete="off"
      spellCheck={false}
      enterKeyHint="search"
      type="search"
      aria-label="Search"
      onKeyDown={handleKeyDown}
    />
  );
}
