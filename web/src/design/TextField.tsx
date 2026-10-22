import { useId } from "react";
import type { ChangeEvent, InputHTMLAttributes } from "react";
import "./design.css";
import { Label } from "./Label";
import { SignalLamp } from "./SignalLamp";
import { Text } from "./Text";

export interface TextFieldProps
  extends Pick<InputHTMLAttributes<HTMLInputElement>, "name" | "type" | "placeholder" | "autoComplete" | "inputMode" | "maxLength" | "required" | "autoFocus" | "onBlur" | "onFocus"> {
  /** Label shown above the field. Always present: no placeholder-only fields. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Outline box (default) or a single underline. */
  variant?: "outline" | "underline";
  /** Error message. Shows a red fill bar on the field and a red lamp by the message. Text stays plain. */
  error?: string;
  /** Short help under the field, hidden while there is an error. */
  hint?: string;
  disabled?: boolean;
}

/**
 * Label above, field below. The error state is a red filled bar down the left edge plus a red
 * lamp before the message; the message itself is ordinary text, never red.
 */
export function TextField({ label, value, onChange, variant = "outline", error, hint, disabled = false, type = "text", ...input }: TextFieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div className="ds-field">
      <Label as="label" htmlFor={id} strong>
        {label}
      </Label>
      <div className="ds-field-box" data-variant={variant} data-invalid={error ? "true" : undefined}>
        {error ? <span className="ds-field-marker" data-testid="field-error-marker" /> : null}
        <input
          {...input}
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          className="ds-field-input"
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        />
      </div>
      {note ? (
        <div id={noteId} role={error ? "alert" : undefined} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {error ? <SignalLamp state="red" size="sm" /> : null}
          <Text size="small" muted={!error}>
            {note}
          </Text>
        </div>
      ) : null}
    </div>
  );
}
