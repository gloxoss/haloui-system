"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

type ConfirmSubmitButtonProps = React.ComponentProps<typeof Button> & {
  message: string;
};

export function ConfirmSubmitButton({
  message,
  onClick,
  ...props
}: ConfirmSubmitButtonProps) {
  return (
    <Button
      {...props}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
          return;
        }

        onClick?.(event);
      }}
    />
  );
}
