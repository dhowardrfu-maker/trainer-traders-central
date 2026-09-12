import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const CompleteProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [authLoading, user, navigate]);

  // Skip straight past this page once a display name has actually been chosen.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("has_chosen_display_name, display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.has_chosen_display_name) {
        navigate("/", { replace: true });
        return;
      }
      // Pre-fill with whatever the signup trigger auto-generated, so the
      // user can just confirm it if they're happy with it rather than
      // typing from scratch.
      setDisplayName(data?.display_name ?? "");
      setChecking(false);
    })();
  }, [user, navigate]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        location: location.trim() || null,
        has_chosen_display_name: true,
      })
      .eq("user_id", user.id);
    setSaving(false);

    if (error) {
      toast.error("Couldn't save, please try again");
      return;
    }

    toast.success("Welcome to PrelovedKicks 👟");
    navigate("/", { replace: true });
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft flex flex-col">
      <header className="container py-5">
        <div className="inline-flex items-center gap-3">
          <img src="/logo.png" alt="PrelovedKicks" className="h-16 w-auto" />
          <span className="font-display font-bold text-3xl tracking-tight">
            PreLoved<span className="text-primary">Kick's</span>
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 pb-16">
        <div className="w-full max-w-md bg-card rounded-3xl shadow-card p-8">
          <h1 className="font-display font-bold text-2xl tracking-tight mb-1">Welcome! Tell us about you</h1>
          <p className="text-sm text-muted-foreground mb-6">This is how other users will see you on PrelovedKicks.</p>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="display_name">Display name <span className="text-destructive">*</span></Label>
              <Input
                id="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. SneakerHead92"
                maxLength={60}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location <span className="text-muted-foreground font-normal">(public, optional)</span></Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="London, UK"
                maxLength={80}
              />
            </div>
          </div>

          <Button className="w-full rounded-full font-semibold mt-8" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Continue
          </Button>
        </div>
      </main>
    </div>
  );
};

export default CompleteProfile;
