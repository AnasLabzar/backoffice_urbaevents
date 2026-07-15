"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { useGoogleLogin } from '@react-oauth/google';
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

const GOOGLE_LOGIN_MUTATION = gql`
  mutation GoogleLogin($token: String!) {
    googleLogin(token: $token) {
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
  const [login, { loading: loginLoading }] = useMutation(LOGIN_MUTATION, {
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

  const [googleLoginMutation, { loading: googleLoading }] = useMutation(GOOGLE_LOGIN_MUTATION, {
    onCompleted: (data) => {
      const token = data.googleLogin.token;
      localStorage.setItem('auth-token', token);
      toast.success(`Marhba bik, ${data.googleLogin.user.name}!`);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: (codeResponse) => {
      // Send the access token to the backend
      googleLoginMutation({
        variables: { token: codeResponse.access_token }
      });
    },
    onError: (error) => {
      toast.error('Google Login Failed');
      console.log('Login Failed:', error);
    }
  });

  const loading = loginLoading || googleLoading;

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
            <CardFooter className="mt-6 flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loginLoading ? "Kayt-connecta..." : "Login"}
              </Button>
              
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="flex justify-center w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 text-muted-foreground hover:text-foreground transition-all duration-200"
                  onClick={() => handleGoogleLogin()}
                  disabled={loading}
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  {googleLoading ? "Connecting to Google..." : "Continue with Google"}
                </Button>
              </div>
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