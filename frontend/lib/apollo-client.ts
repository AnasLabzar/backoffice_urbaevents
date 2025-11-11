"use client";

import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

// Rg3nah l-createHttpLink l-3adi
const httpLink = createHttpLink({
  uri: "https://backoffice.urbagroupe.ma/graphql",
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('auth-token');
  return {
    headers: { ...headers, authorization: token ? `Bearer ${token}` : "" }
  }
});

const client = new ApolloClient({
  link: authLink.concat(httpLink), // L-Link l-3adi
  cache: new InMemoryCache(),
});

export default client;