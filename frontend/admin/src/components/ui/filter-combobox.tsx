"use client";

import { Children, isValidElement, useState, type ChangeEvent, type ReactElement, type SelectHTMLAttributes } from "react";
import { Combobox } from "@/components/ui/combobox";

/** Keeps filter form values while rendering a spacious, searchable popup. */
export function FilterCombobox({ children, value, defaultValue, onChange, name, className }: SelectHTMLAttributes<HTMLSelectElement>) {
  const options = Children.toArray(children).filter(isValidElement).map((child) => {
    const option = child as ReactElement<{ value: string | number; children: string }>;
    return { value: String(option.props.value), label: String(option.props.children) };
  });
  const [localValue, setLocalValue] = useState(String(defaultValue ?? options[0]?.value ?? ""));
  const placeholder = options.find((option) => option.value === "")?.label ?? "";
  const selectedValue = value === undefined ? localValue : String(value);
  return (
    <>
      {name && <input type="hidden" name={name} value={selectedValue} />}
      <Combobox
        value={selectedValue}
        onChange={(next) => {
          setLocalValue(next);
          onChange?.({ target: { value: next }, currentTarget: { value: next } } as ChangeEvent<HTMLSelectElement>);
        }}
        options={options.filter((option) => option.value !== "")}
        placeholder={placeholder}
        ariaLabel={placeholder}
        searchPlaceholder={placeholder}
        className={className}
        expanded
      />
    </>
  );
}
