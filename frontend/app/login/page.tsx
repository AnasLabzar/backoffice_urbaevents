"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 1. N-definiw l-Mutation dyal LOGIN (Nafs l-code)
const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
      }
    }
  }
`;

// 2. L-Component dyal L-Page (Nafs l-logic)
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 3. Nst3mlo l-hook dyal useMutation (Nafs l-logic)
  const [login, { loading }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      const token = data.login.token;
      localStorage.setItem('auth-token', token);
      toast.success(`Marhba bik, ${data.login.user.name}!`);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // 5. L-Function dyal Submit (Nafs l-logic)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Khassk tdkhel l-email w l-password");
      return;
    }
    login({
      variables: { email, password },
    });
  };

  // 6. L-Interface (UI) - HNA FIN KAYN T-TBDIL
  return (
    <>
      <Toaster position="top-center" richColors />

      {/* 1. L-Container L-Ra2issi: Kaychd l-page kamla o kay7t footer l-t7t */}
      <div className="relative flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        
        {/* 2. L-Logo (Barra L-Card) */}
        <div className="mb-8"> {/* Zdt chwiya dyal l-espace l-t7t */}
          {/* 1. Light Mode Logo (Dark text) */}
          <img
            src="/logo/logo-black-urba-events.png"
            alt="URBA EVENTS BackOffice"
            className="h-12 dark:hidden" // Kbrt l-logo chwiya
          />
          {/* 2. Dark Mode Logo (White text) */}
          <img
            src="/logo/logo-white-urba-events.png"
            alt="URBA EVENTS BackOffice"
            className="h-12 hidden dark:block" // Kbrt l-logo chwiya
          />
        </div>

        {/* 3. L-Card (Bla Logo) */}
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            {/* 7iydna l-logo mn hna */}
            <CardTitle className="text-2xl">BackOffice Login</CardTitle>
            <CardDescription>
              Dkhel l-ma3lomat dyalk bach t-connecta.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@urbagroupe.ma"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter className="mt-6">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Kayt-connecta..." : "Login"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* 4. L-Footer L-I7trafi */}
        <footer className="absolute bottom-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} URBA EVENTS INTERNATIONAL. All rights reserved.
        </footer>
        
      </div>
    </>
  );
}