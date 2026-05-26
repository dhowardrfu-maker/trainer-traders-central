import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});

const signUpSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  username: z
    .string()
    .min(3, "At least 3 characters")
    .max(20, "Max 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and _ only"),
});

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.35-2.1V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.83z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
  </svg>
);

const AuthPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    username: "",
  });

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  // ======================
  // SIGN IN
  // ======================
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = signInSchema.safeParse(signInData);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    setBusy(false);

    if (error) {
      toast.error(
        error.message === "Invalid login credentials"
          ? "Wrong email or password"
          : error.message
      );
      return;
    }

    toast.success("Welcome back 👟");
    navigate("/");
  };

  // ======================
  // SIGN UP
  // ======================
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = signUpSchema.safeParse(signUpData);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setBusy(true);

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { username: parsed.data.username },
      },
    });

    setBusy(false);

    if (error) {
      toast.error(
        error.message.includes("already")
          ? "That email is already registered"
          : error.message
      );
      return;
    }

    if (data.session) {
      toast.success("Account created 🎉");
      navigate("/");
    } else {
      toast.success("Account created 🎉 Please sign in.");
      navigate("/auth");
    }
  };

  // ======================
  // GOOGLE LOGIN
  // ======================
  const handleGoogle = async () => {
    setBusy(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://www.prelovedkicks.co.uk",
      },
    });

    if (error) {
      setBusy(false);
      toast.error("Couldn't start Google sign-in");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex flex-col">
      <header className="container py-5">
        <Link to="/" className="inline-flex items-center gap-3">
          <img src="/logo.png" alt="PrelovedKicks" className="h-24 w-auto" />
          <span className="font-display font-bold text-5xl tracking-tight">PreLoved<span className="text-primary">Kick's</span></span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 pb-16">
        <div className="w-full max-w-md bg-card rounded-3xl shadow-card p-8">

          <div className="text-center mb-6">
            <h1 className="font-display font-bold text-3xl tracking-tight">
              Join the community
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Sign in to sell, save and message
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 rounded-full font-semibold gap-2.5 bg-background"
            onClick={handleGoogle}
            disabled={busy}
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground tracking-wider">
                or with email
              </span>
            </div>
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted h-11 p-1">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-5 space-y-4">
              <Input
                placeholder="Email"
                value={signInData.email}
                onChange={(e) =>
                  setSignInData({ ...signInData, email: e.target.value })
                }
              />

              <Input
                type="password"
                placeholder="Password"
                value={signInData.password}
                onChange={(e) =>
                  setSignInData({ ...signInData, password: e.target.value })
                }
              />

              <Button onClick={handleSignIn} className="w-full" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="mt-5 space-y-4">
              <Input
                placeholder="Username"
                value={signUpData.username}
                onChange={(e) =>
                  setSignUpData({ ...signUpData, username: e.target.value })
                }
              />

              <Input
                placeholder="Email"
                value={signUpData.email}
                onChange={(e) =>
                  setSignUpData({ ...signUpData, email: e.target.value })
                }
              />

              <Input
                type="password"
                placeholder="Password"
                value={signUpData.password}
                onChange={(e) =>
                  setSignUpData({ ...signUpData, password: e.target.value })
                }
              />

              <Button onClick={handleSignUp} className="w-full" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
              </Button>
            </TabsContent>
          </Tabs>

        </div>
      </main>
    </div>
  );
};

export default AuthPage;