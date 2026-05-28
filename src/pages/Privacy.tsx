import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />
      <main className="container py-8 max-w-3xl">
        <h1 className="font-display font-bold text-4xl tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: 28 May 2026</p>

        <section className="prose prose-sm max-w-none space-y-8 text-foreground">

          <div>
            <h2 className="font-bold text-xl mb-2">1. About This Policy</h2>
            <p>This Privacy Policy explains how PrelovedKicks collects, uses, and protects your personal data when you use our website at www.prelovedkicks.co.uk.</p>
            <p className="mt-2">We are committed to protecting your privacy and complying with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.</p>
            <p className="mt-2"><strong>Data Controller:</strong> David Howard, PrelovedKicks<br />
            <strong>Contact:</strong> <a href="mailto:support@prelovedkicks.co.uk" className="underline">support@prelovedkicks.co.uk</a></p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">2. What Data We Collect</h2>
            <h3 className="font-semibold mt-3 mb-1">2.1 Account Information</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Name and username</li>
              <li>Email address</li>
              <li>Password (stored securely and encrypted, we never see your plain-text password)</li>
              <li>Profile photo (if provided)</li>
              <li>Location (town/city, if provided)</li>
            </ul>
            <h3 className="font-semibold mt-3 mb-1">2.2 Seller Address Data</h3>
            <p>If you sell on PrelovedKicks, we collect your full shipping address (name, address lines, town/city, postcode, and phone number). This data is required to generate Evri shipping labels via Sendcloud and is used as the sender address on all outbound parcels. This information is stored securely, is never shared publicly, and is never displayed to buyers within the platform.</p>
            <h3 className="font-semibold mt-3 mb-1">2.3 Transaction Data</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Items purchased or sold</li>
              <li>Buyer delivery address (used for shipping label generation only, shared with Evri via Sendcloud and not displayed to sellers within the platform)</li>
              <li>Payment information (processed by Stripe, we do not store card details)</li>
              <li>Order history and tracking information</li>
              <li>Dispute descriptions and photos submitted as evidence</li>
              <li>Cancellation requests and reasons</li>
            </ul>
            <h3 className="font-semibold mt-3 mb-1">2.4 Listing Data</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Photos and descriptions you upload</li>
              <li>Pricing and item details</li>
            </ul>
            <h3 className="font-semibold mt-3 mb-1">2.5 Communications</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Messages sent between buyers and sellers through our platform</li>
              <li>Offers made and received</li>
              <li>Reviews and ratings</li>
            </ul>
            <h3 className="font-semibold mt-3 mb-1">2.6 Technical Data</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device type</li>
              <li>Pages visited and time spent</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
            <h3 className="font-semibold mt-3 mb-1">2.7 Stripe Connect Data</h3>
            <p>If you set up seller payouts, you will complete Stripe&apos;s identity verification process directly with Stripe. This includes your bank account details, date of birth, and National Insurance number (last 4 digits). This information is held securely by Stripe and is never stored by PrelovedKicks.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Creating and managing your account (Contract)</li>
              <li>Processing transactions and payments (Contract)</li>
              <li>Generating shipping labels using your sender address (Contract)</li>
              <li>Communicating with you about your orders (Contract)</li>
              <li>Processing seller payouts via Stripe Connect (Contract)</li>
              <li>Sending important service updates (Legitimate interest)</li>
              <li>Resolving disputes between buyers and sellers (Legitimate interest)</li>
              <li>Preventing fraud and ensuring platform security (Legitimate interest)</li>
              <li>Complying with legal obligations (Legal obligation)</li>
              <li>Improving our platform and services (Legitimate interest)</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">4. Sharing Your Data</h2>
            <p>We do not sell your personal data. We share your data only in the following circumstances:</p>
            <h3 className="font-semibold mt-3 mb-1">4.1 With Other Users</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your username and profile information is visible to other users.</li>
              <li>Your buyer delivery address is passed to Evri via Sendcloud for shipping label generation. It is not displayed to sellers within the PrelovedKicks platform.</li>
              <li>Your seller city and postcode may be visible to buyers for transparency purposes.</li>
            </ul>
            <h3 className="font-semibold mt-3 mb-1">4.2 With Service Providers</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Stripe</strong>: payment processing and seller payouts via Stripe Connect. Stripe&apos;s privacy policy applies to data processed by Stripe.</li>
              <li><strong>Supabase</strong>: secure database and authentication hosting</li>
              <li><strong>Vercel</strong>: website hosting and deployment</li>
              <li><strong>Sendcloud / Evri</strong>: shipping label generation using buyer delivery address and seller sender address</li>
              <li><strong>Zoho Mail</strong>: transactional email communications</li>
            </ul>
            <p className="mt-2">All service providers are required to handle your data securely and in accordance with applicable data protection law.</p>
            <h3 className="font-semibold mt-3 mb-1">4.3 Legal Requirements</h3>
            <p>We may disclose your data if required by law, court order, or to protect the rights and safety of our users or the public.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">5. Cookies</h2>
            <p>We use cookies to keep you logged in, remember your preferences, analyse how our site is used, and improve performance and security. When you first visit PrelovedKicks, you will be asked to accept or decline non-essential cookies. Essential cookies are required for the platform to function and cannot be declined. You can change your cookie preferences at any time through your browser settings, though disabling them may affect some features.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">6. Data Retention</h2>
            <p>We retain your personal data for as long as your account is active. If you delete your account:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Your profile and listings are removed within 30 days</li>
              <li>Transaction records are retained for 7 years for legal and tax compliance</li>
              <li>Messages may be retained for up to 12 months for dispute resolution purposes</li>
              <li>Dispute evidence (photos and descriptions) is retained for the duration of any open dispute and up to 12 months thereafter</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">7. Your Rights</h2>
            <p>Under UK GDPR, you have the following rights:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Right of access</strong>: request a copy of the data we hold about you</li>
              <li><strong>Right to rectification</strong>: ask us to correct inaccurate data</li>
              <li><strong>Right to erasure</strong>: ask us to delete your data (subject to legal retention obligations)</li>
              <li><strong>Right to restrict processing</strong>: ask us to limit how we use your data</li>
              <li><strong>Right to data portability</strong>: receive your data in a portable format</li>
              <li><strong>Right to object</strong>: object to processing based on legitimate interests</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, contact us at <a href="mailto:support@prelovedkicks.co.uk" className="underline">support@prelovedkicks.co.uk</a>. We will respond within 30 days.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">8. Data Security</h2>
            <p>We take the security of your personal data seriously. Our security measures include:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Encrypted connections (HTTPS) across our entire platform</li>
              <li>Row-level security so users can only access their own data</li>
              <li>Secure authentication via Supabase</li>
              <li>Private storage for listing photos and dispute evidence</li>
              <li>No storage of payment card details, all handled by Stripe</li>
              <li>Seller bank details and identity documents are held securely by Stripe and never stored by PrelovedKicks</li>
            </ul>
            <p className="mt-2">In the event of a data breach that is likely to result in a risk to your rights and freedoms, we will notify you and the ICO as required by UK GDPR.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">9. Children&apos;s Privacy</h2>
            <p>PrelovedKicks is not intended for users under 18 years of age. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us at <a href="mailto:support@prelovedkicks.co.uk" className="underline">support@prelovedkicks.co.uk</a> and we will delete it promptly.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">10. International Transfers</h2>
            <p>Some of our service providers (including Supabase, Vercel, and Stripe) may process data outside the UK. Where this occurs, we ensure appropriate safeguards are in place, such as Standard Contractual Clauses or adequacy decisions, in accordance with UK GDPR requirements.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify registered users of significant changes by email. The date at the top of this page will always reflect when the policy was last updated.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">12. Complaints</h2>
            <p>If you are unhappy with how we handle your data, you have the right to complain to the Information Commissioner&apos;s Office (ICO):</p>
            <p className="mt-2"><strong>Website:</strong> ico.org.uk<br />
            <strong>Phone:</strong> 0303 123 1113</p>
            <p className="mt-2">We would appreciate the opportunity to address your concerns first, so please contact us at <a href="mailto:support@prelovedkicks.co.uk" className="underline">support@prelovedkicks.co.uk</a> before contacting the ICO.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">13. Contact Us</h2>
            <p>Email: <a href="mailto:support@prelovedkicks.co.uk" className="underline">support@prelovedkicks.co.uk</a></p>
          </div>

        </section>
      </main>
      <MobileTabBar />
    </div>
  );
};

export default Privacy;