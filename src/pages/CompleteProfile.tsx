import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const STEPS = ["About you", "Shipping address"];

const CompleteProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [fullName, setFullName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [authLoading, user, navigate]);

  // If profile already complete skip wizard
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, full_name, address_line1, city, postcode")
        .eq("user_id", user.id)
        .maybeSingle();
      if (
        data?.display_name &&
        data?.full_name &&
        data?.address_line1 &&
        data?.city &&
        data?.postcode
      ) {
        navigate("/", { replace: true });
      } else {
        setChecking(false);
      }
    })();
  }, [user, navigate]);

  const handleNext = async () => {
    if (step === 0) {
      if (!displayName.trim()) {
        toast.error("Please enter a display name");
        return;
      }
      setStep(1);
      return;
    }

    // Step 1 — save everything
    if (!fullName.trim() || !addressLine1.trim() || !city.trim() || !postcode.trim()) {
      toast.error("Please fill in all required address fields");
      return;
    }

    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        location: location.trim() || null,
        full_name: fullName.trim(),
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim() || null,
        city: city.trim(),
        postcode: postcode.trim().toUpperCase(),
        phone: phone.trim() || null,
      })
      .eq("user_id", user.id);
    setSaving(false);

    if (error) {
      toast.error("Couldn't save profile, please try again");
      return;
    }

    toast.success("Profile complete — welcome to PrelovedKicks 👟");
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

          {/* Progress */}
          <div className="flex items-center gap-2 mb-6">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`h-2 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mb-1">Step {step + 1} of {STEPS.length}</p>
          <h1 className="font-display font-bold text-2xl tracking-tight mb-1">
            {step === 0 ? "Welcome! Tell us about you" : "Where are you shipping from?"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {step === 0
              ? "This is how other users will see you on PrelovedKicks."
              : "Required to generate shipping labels when you sell."}
          </p>

          {step === 0 && (
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
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="full_name">Full name <span className="text-destructive">*</span></Label>
                <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" maxLength={100} autoFocus />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address_line1">Address line 1 <span className="text-destructive">*</span></Label>
                <Input id="address_line1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="47 Example Street" maxLength={120} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address_line2">Address line 2 <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input id="address_line2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Apartment, flat, etc." maxLength={120} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="city">Town / City <span className="text-destructive">*</span></Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="London" maxLength={60} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="postcode">Postcode <span className="text-destructive">*</span></Label>
                  <Input id="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value.toUpperCase())} placeholder="SW1A 1AA" maxLength={8} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone number <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07700 900000" maxLength={20} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mt-8">
            {step > 0 && (
              <Button variant="outline" className="rounded-full flex-1" onClick={() => setStep(step - 1)} disabled={saving}>
                Back
              </Button>
            )}
            <Button className="rounded-full flex-1 font-semibold" onClick={handleNext} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {step === STEPS.length - 1 ? "Finish" : "Next"}
            </Button>
          </div>

        </div>
      </main>
    </div>
  );
};

export default CompleteProfile;
