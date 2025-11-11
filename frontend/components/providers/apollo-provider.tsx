"use client"; // Hada darori ykon Client Component

import React from "react";
import { ApolloProvider } from "@apollo/client/react";
import client from "@/lib/apollo-client"; // L-client li yalah qadina
// import client from "@/lib/apollo-client"; // L-client li yalah qadina

export function ApolloClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}