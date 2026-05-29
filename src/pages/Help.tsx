import { useState } from "react";
import { ChevronDown, ChevronUp, Smartphone, ShoppingBag, Tag, CreditCard, Truck, AlertTriangle, User } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";
import { useSEO } from "@/hooks/useSEO";
import { cn } from "@/lib/utils";

useSEO;

interface FAQItem {
  q: string;
  a: string | React.ReactNode;
}

interface Section {
  id: string;
  icon: React.ReactNode;
  title: string;
  items: FAQItem[];
}

const sections: Section[] = [
  {
    id: "get-the-app",
    icon: <Smartphone className="h-5 w-5" />,
    title: "Get the App",
    items: [
      {
        q: "How do I install PrelovedKicks on my Android phone?",
        a: (
          <ol className="list-decimal pl-4 space-y-1">
            <li>Open <strong>Chrome</strong> on your Android phone</li>
            <li>Go to <strong>prelovedkicks.co.uk</strong></li>
            <li>Tap the <strong>three dots menu</strong> (top right)</li>
            <li>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></li>
            <li>Tap <strong>Install</strong> the app icon will appear on your home screen</li>
          </ol>
        ),
      },
      {
        q: "How do I install PrelovedKicks on my iPhone?",
        a: (
          <ol className="list-decimal pl-4 space-y-1">
            <li>Open <strong>Safari</strong> on your iPhone (must be Safari, not Chrome)</li>
            <li>Go to <strong>prelovedkicks.co.uk</strong></li>
            <li>Tap the <strong>Share button</strong> (the box with an arrow at the bottom)</li>
            <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
            <li>Tap <strong>Add</strong> the app icon will appear on your home screen</li>
          </ol>
        ),
      },
      {
        q: "Is the app free?",
        a: "Yes, completely free to install and use. There are no subscription fees.",
      },
      {
        q: "Is there an app in the App Store or Google Play?",
        a: "Not yet but the installed version works just like a native app. You get a home screen icon, full screen experience and fast loading. We're working on a full app store listing.",
      },
    ],
  },
  {
    id: "buying",
    icon: <ShoppingBag className="h-5 w-5" />,
    title: "Buying",
    items: [
      {
        q: "How do I buy a pair of trainers?",
        a: "Find a listing you like, tap Buy Now, enter your delivery address and pay securely with card, Apple Pay, Google Pay, Klarna, or Revolut Pay. The seller will be notified and ship within a few days.",
      },
      {
        q: "What is Buyer Protection?",
        a: "Every purchase includes Buyer Protection. If your item never arrives, arrives damaged, or is significantly not as described, you can raise a dispute and receive a full refund. You have 48 hours from confirmed delivery to raise any issues.",
      },
      {
        q: "How do I make an offer?",
        a: "On any listing tap Make an Offer and enter your price. The seller will accept or decline you'll get a notification either way. If accepted, you'll be taken straight to checkout to complete the purchase.",
      },
      {
        q: "Can I cancel an order after paying?",
        a: "Yes, but only before the item has shipped. Go to the order page and request a cancellation both you and the seller must agree. Once agreed a full refund is issued automatically. After shipping, you'll need to raise a dispute instead.",
      },
      {
        q: "How long does delivery take?",
        a: "Most items are shipped via Evri Standard which takes 2–4 working days. The seller has a few days to ship after your order you'll receive tracking details once they've sent the label.",
      },
      {
        q: "What if my item doesn't arrive?",
        a: "If your tracking shows the parcel is lost or it hasn't arrived within a reasonable time, raise a dispute from your order page. Select 'I have an issue' and describe the problem. We'll help resolve it.",
      },
    ],
  },
  {
    id: "selling",
    icon: <Tag className="h-5 w-5" />,
    title: "Selling",
    items: [
      {
        q: "How do I list a pair of trainers?",
        a: "Tap Sell in the header or navigation. Fill in the details brand, title, size, condition, price and photos. Your listing goes through a quick AI moderation check then goes live. The whole process takes under 2 minutes.",
      },
      {
        q: "How many photos can I add?",
        a: "You can add up to 8 photos per listing. We recommend including shots of both shoes, the soles, the box if you have it, and any wear or marks so buyers know exactly what they're getting.",
      },
      {
        q: "How do I price my trainers?",
        a: "Search for similar listings on PrelovedKicks to get an idea of market price. Consider the condition, original retail price, and how quickly you want to sell. Competitive pricing gets more views and offers.",
      },
      {
        q: "How do I ship an order?",
        a: "Once a buyer pays, go to your Orders tab and tap Ship this order. We'll generate an Evri shipping label automatically just print it, pack the trainers securely and drop them off at your nearest Evri ParcelShop.",
      },
      {
        q: "Do I need to set up payouts before selling?",
        a: "Yes you need to connect your bank account via Stripe before you can receive payments. Go to Profile → Payments → Set up payouts. It takes about 2 minutes and requires ID verification.",
      },
      {
        q: "When do I get paid?",
        a: "You're paid automatically 48 hours after the buyer confirms delivery. If they confirm receipt sooner, payment is processed immediately. Payouts typically arrive in your bank within 2 business days.",
      },
      {
        q: "What fees does PrelovedKicks charge sellers?",
        a: "We don't charge sellers a listing fee or commission. Buyers pay a 4% Buyer Protection fee on top of the item price. Postage is also paid by the buyer on top.",
      },
    ],
  },
  {
    id: "payments",
    icon: <CreditCard className="h-5 w-5" />,
    title: "Payments",
    items: [
      {
        q: "What payment methods are accepted?",
        a: "We accept Visa, Mastercard, American Express, Google Pay, Apple Pay, Klarna (Buy Now Pay Later), Amazon Pay, and Revolut Pay. All payments are processed securely by Stripe.",
      },
      {
        q: "Is it safe to pay on PrelovedKicks?",
        a: "Yes. All payments are handled by Stripe, one of the world's most trusted payment processors. Your card details are never stored on our servers. Every purchase includes Buyer Protection.",
      },
      {
        q: "What is the 4% Buyer Protection fee?",
        a: "The Buyer Protection fee covers the cost of protecting your purchase if anything goes wrong we can issue a refund. It's calculated on the item price only and shown clearly at checkout before you pay.",
      },
      {
        q: "How do seller payouts work?",
        a: "Sellers receive payment via Stripe Connect directly to their bank account. Once a buyer confirms receipt (or 48 hours after tracked delivery with no dispute), the payout is processed automatically.",
      },
      {
        q: "Can I get a refund?",
        a: "Yes if you cancel before shipping (with seller agreement), or raise a successful dispute after delivery. Refunds are issued back to your original payment method and typically take 3–5 business days to appear.",
      },
    ],
  },
  {
    id: "shipping",
    icon: <Truck className="h-5 w-5" />,
    title: "Shipping",
    items: [
      {
        q: "How does shipping work?",
        a: "All orders are shipped via Evri. When a buyer purchases, the seller generates a pre-paid label from their Orders tab and drops the parcel at an Evri ParcelShop. Buyers can track their order with the provided tracking number.",
      },
      {
        q: "Who pays for postage?",
        a: "The buyer pays for postage at checkout. Postage costs are set by the seller when listing and shown clearly on every listing page.",
      },
      {
        q: "How do I track my order?",
        a: "Once the seller ships, a tracking number appears on your order page. You can track the parcel directly at evri.com. You'll also be able to see the status on your PrelovedKicks order page.",
      },
      {
        q: "What if the seller doesn't ship?",
        a: "Sellers are expected to ship within 3 days of an order. If your order hasn't moved after a few days, contact the seller via messages. If there's no response, raise a dispute from your order page for a full refund.",
      },
      {
        q: "What if my parcel is lost or damaged?",
        a: "Raise a dispute from your order page tap 'I have an issue' and describe what happened. Include photos if the item arrived damaged. We'll review and issue a refund if the claim is valid.",
      },
    ],
  },
  {
    id: "disputes",
    icon: <AlertTriangle className="h-5 w-5" />,
    title: "Disputes & Returns",
    items: [
      {
        q: "How do I raise a dispute?",
        a: "Go to your order page and tap 'I have an issue'. Describe the problem, add photos if relevant, and submit. The seller will be notified and can choose to issue a refund or request a return. You have 48 hours from delivery to raise an issue.",
      },
      {
        q: "What counts as a valid dispute?",
        a: "Valid disputes include: item never arrived, item significantly not as described (wrong size, different colourway, major undisclosed damage), or item arrived damaged. Minor cosmetic differences that were visible in photos do not qualify.",
      },
      {
        q: "How do returns work?",
        a: "If a seller requests a return, a return label will be generated for you. Pack the item securely and drop it off. Once the seller confirms receipt, a refund will be issued.",
      },
      {
        q: "What if I can't resolve the dispute with the seller?",
        a: "Contact us at support@prelovedkicks.co.uk with your order reference and we'll step in to help resolve it.",
      },
    ],
  },
  {
    id: "account",
    icon: <User className="h-5 w-5" />,
    title: "Account & Safety",
    items: [
      {
        q: "How do I create an account?",
        a: "Tap Sign in at the top of the page and choose to sign up with Google or with your email address. You'll need to verify your email before you can buy or sell.",
      },
      {
        q: "How do I reset my password?",
        a: "Go to Profile → Account → Send reset email. We'll send a password reset link to your registered email address.",
      },
      {
        q: "How do I delete my account?",
        a: "Go to Profile → Account → Delete account and follow the instructions, or email support@prelovedkicks.co.uk and we'll process it within 5 working days.",
      },
      {
        q: "How do I report a suspicious listing or user?",
        a: "On any listing page scroll to the bottom and tap Report. You can report listings, users, or messages. Our team reviews all reports and takes action where necessary.",
      },
      {
        q: "Is my personal information safe?",
        a: "Yes. We take data protection seriously and comply with UK GDPR. We never sell your personal data. See our Privacy Policy for full details.",
      },
    ],
  },
];

const FAQAccordion = ({ items }: { items: FAQItem[] }) => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="divide-y divide-border">
      {items.map((item, i) => (
        <div key={i}>
          <button
            className="w-full text-left py-4 flex items-center justify-between gap-3 hover:text-primary transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="font-medium text-sm">{item.q}</span>
            {open === i ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
          </button>
          {open === i && (
            <div className="pb-4 text-sm text-muted-foreground leading-relaxed">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const Help = () => {
  const [activeSection, setActiveSection] = useState<string>("get-the-app");

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />
      <main className="container py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl md:text-4xl tracking-tight">Help Centre</h1>
          <p className="text-muted-foreground mt-2">Everything you need to know about buying and selling on PrelovedKicks.</p>
        </div>

        <div className="grid md:grid-cols-[240px_1fr] gap-8">
          {/* Sidebar */}
          <nav className="space-y-1 md:sticky md:top-24 self-start">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSection(s.id);
                  document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={cn(
                  "w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  activeSection === s.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {s.icon}
                {s.title}
              </button>
            ))}
            <div className="pt-4 border-t border-border mt-4">
              <p className="text-xs text-muted-foreground px-3 mb-2">Still need help?</p>
              <a
                href="mailto:support@prelovedkicks.co.uk"
                className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                Contact support
              </a>
            </div>
          </nav>

          {/* Content */}
          <div className="space-y-10">
            {sections.map((s) => (
              <section key={s.id} id={s.id}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    {s.icon}
                  </div>
                  <h2 className="font-display font-bold text-xl">{s.title}</h2>
                </div>
                <div className="rounded-2xl border border-border px-5">
                  <FAQAccordion items={s.items} />
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
};

export default Help;