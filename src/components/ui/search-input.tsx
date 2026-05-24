"use client";

import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> & {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  containerClassName?: string;
};

export const SearchInput = React.forwardRef<HTMLInputElement, Props>(function SearchInput(
  { value, onChange, onClear, placeholder = "Cari...", className, containerClassName, ...rest },
  ref
) {
  const handleClear = () => {
    onChange("");
    onClear?.();
  };

  return (
    <div className={cn("relative", containerClassName)}>
      <FontAwesomeIcon
        icon={faMagnifyingGlass}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
      />
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={rest["aria-label"] ?? placeholder}
        className={cn("pl-9 pr-9 h-9", className)}
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Bersihkan pencarian"
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
        </button>
      )}
    </div>
  );
});
