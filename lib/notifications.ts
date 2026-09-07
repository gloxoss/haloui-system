import React from "react";

export type NotificationOptions = {
  id?: string;
  title?: React.ReactNode;
  message: React.ReactNode;
  color?: string;
  icon?: React.ReactNode;
  autoClose?: number | boolean;
};

export const notifications = {
  show: (options: NotificationOptions) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("app-notification", {
          detail: options,
        })
      );
    }
  },
};
