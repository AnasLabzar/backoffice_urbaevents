"use client";

import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

// Kan-golo lih: Ila kayn variable f .env st3mlha, sinu st3ml localhost par défaut
const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URI ||
    ((typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
      ? "http://localhost:5002/graphql"
      : "https://backoffice.urbagroupe.ma/graphql"),
});

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
  // 👇 HNA FIN ZEDNA L-FIX DYAL CACHE 👇
  cache: new InMemoryCache({
    typePolicies: {
      // Hado homa les types li kano kay-crashiw hit ma3ndhomch ID
      Stages: {
        keyFields: false, // Ma3ndoch ID unique, Apollo khasso y-ignorer l-check
        merge: true,      // Y9bel y-fusionner les données jdida m3a lqdima
      },
      Stage: {
        keyFields: false,
        merge: true,
      }
    }
  }),
});

export default client;