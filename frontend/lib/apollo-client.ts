"use client";

import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

// --- HNA L-CHANGE ---
// Kan-golo lih: Ila kayn variable f .env st3mlha, sinu st3ml localhost par défaut
const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URI || "http://localhost:5002/graphql",
});
// --------------------

const authLink = setContext((_, { headers }) => {
  // Check sur wach code khdam f browser (localStorage makaynch f server side)
  let token = "";
  if (typeof window !== "undefined") {
    token = localStorage.getItem('auth-token') || "";
  }

  return {
    headers: { ...headers, authorization: token ? `Bearer ${token}` : "" }
  }
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

export default client;