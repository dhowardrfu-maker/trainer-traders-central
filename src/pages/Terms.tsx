import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />
      <main className="container py-8 max-w-3xl">
        <h1 className="font-display font-bold text-4xl tracking-tight mb-2">Terms and Conditions</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: 27 May 2026</p>

        <section className="prose prose-sm max-w-none space-y-8 text-foreground">

          <div>
            <h2 className="font-bold text-xl mb-2">1. About Us</h2>
            <p>PrelovedKicks is a peer-to-peer online marketplace for buying and selling second-hand trainers and footwear, operated by David Howard, based in England, United Kingdom.</p>
            <p className="mt-2">Contact: <a href="mailto:support@prelovedkicks.co.uk" className="underline">support@prelovedkicks.co.uk</a></p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">2. Acceptance of Terms</h2>
            <p>By accessing or using PrelovedKicks, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our platform. We may update these terms from time to time and will notify registered users of material changes.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">3. Eligibility</h2>
            <p>You must be at least 18 years old to use PrelovedKicks. By registering, you confirm that you are 18 or over and have the legal capacity to enter into a binding agreement.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">4. Your Account</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You must provide accurate and truthful information when registering.</li>
              <li>You must not create multiple accounts or impersonate another person.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">5. Selling on PrelovedKicks</h2>
            <h3 className="font-semibold mt-3 mb-1">5.1 Listing Requirements</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>All items listed must be genuine trainers or footwear.</li>
              <li>Listings must be accurate — photos must be of the actual item you are selling.</li>
              <li>Counterfeit, fake, or replica goods are strictly prohibited and may result in permanent account suspension.</li>
              <li>You must own the item you are listing or have the legal right to sell it.</li>
              <li>Prices must be set in pounds sterling (GBP).</li>
            </ul>
            <h3 className="font-semibold mt-3 mb-1">5.2 Seller Responsibilities</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Once a sale is confirmed, you must ship the item within 3 business days.</li>
              <li>Items must be securely packaged to prevent damage in transit.</li>
              <li>You are responsible for the accuracy of your listings including condition, size, and brand.</li>
            </ul>
            <h3 className="font-semibold mt-3 mb-1">5.3 Seller Payouts</h3>
            <p>To receive payment for your sales, you must connect a UK bank account via our secure payment provider, Stripe. Payouts are made automatically once the buyer confirms receipt of the item, or after 48 hours from confirmed delivery with no dispute raised. PrelovedKicks retains the buyer protection fee and postage costs from each transaction.</p>
            <h3 className="font-semibold mt-3 mb-1">5.4 Prohibited Items</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Counterfeit or replica goods</li>
              <li>Items that infringe intellectual property rights</li>
              <li>Stolen goods</li>
              <li>Items that are illegal to sell in the United Kingdom</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">6. Buying on PrelovedKicks</h2>
            <h3 className="font-semibold mt-3 mb-1">6.1 Purchases</h3>
            <p>By completing a purchase, you enter into a contract with the seller, not with PrelovedKicks. PrelovedKicks acts as an intermediary platform only.</p>
            <h3 className="font-semibold mt-3 mb-1">6.2 Buyer Protection Fee</h3>
            <p>A buyer protection fee of 4% of the item price is added to every purchase. This fee helps fund platform operations and dispute resolution, is non-refundable except where a refund is granted due to an item not as described, and is displayed clearly at checkout before payment is taken.</p>
            <h3 className="font-semibold mt-3 mb-1">6.3 Postage</h3>
            <p>Postage costs are paid by the buyer and are displayed at checkout. Postage fees are non-refundable once an item has been dispatched.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">7. Payments</h2>
            <p>All payments are processed securely via Stripe. PrelovedKicks does not store your card details. By making a purchase you agree to Stripe's Terms of Service available at stripe.com/legal.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">8. Cancellations</h2>
            <h3 className="font-semibold mt-3 mb-1">8.1 Pre-Shipping Cancellations</h3>
            <p>Either the buyer or seller may request a cancellation before an item has been shipped (whilst the order status is "Pending postage" or "Label created"). To request a cancellation:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>The requesting party must provide a reason for the cancellation.</li>
              <li>The other party will be notified and must agree to the cancellation.</li>
              <li>If both parties agree, the order will be cancelled, the listing reinstated, and a full refund issued automatically.</li>
              <li>If the other party does not agree, they may contact our support team at support@prelovedkicks.co.uk to raise a dispute.</li>
            </ul>
            <h3 className="font-semibold mt-3 mb-1">8.2 Post-Shipping Cancellations</h3>
            <p>Once an item has been shipped, cancellations are not available. Instead, buyers may raise a dispute if there is an issue with their order (see Section 9).</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">9. Returns, Refunds and Disputes</h2>
            <h3 className="font-semibold mt-3 mb-1">9.1 Confirming Receipt</h3>
            <p>Once your item has been shipped, you will be able to confirm receipt through your order page. You have two options:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Item received, all ok</strong> — the seller will be paid out immediately.</li>
              <li><strong>I have an issue</strong> — you must describe the issue and may upload photos as evidence.</li>
            </ul>
            <h3 className="font-semibold mt-3 mb-1">9.2 Raising a Dispute</h3>
            <p>If you have an issue with your order, you must raise it within 48 hours of Evri confirming delivery. If no action is taken within 48 hours of confirmed delivery, the seller will be paid out automatically.</p>
            <p className="mt-2">When a dispute is raised, the seller will be notified and may choose to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Issue a full refund</strong> — the buyer receives a full refund with no return required.</li>
              <li><strong>Request a return</strong> — a return shipping label will be generated for the buyer.</li>
            </ul>
            <p className="mt-2">If the dispute cannot be resolved between the parties, our support team will review the evidence and make a final decision.</p>
            <h3 className="font-semibold mt-3 mb-1">9.3 Item Not as Described</h3>
            <p>If an item arrives significantly not as described, you may be eligible for a full refund. You must raise a dispute within 48 hours of confirmed delivery and provide photographic evidence.</p>
            <h3 className="font-semibold mt-3 mb-1">9.4 Change of Mind</h3>
            <p>We do not offer refunds for change of mind purchases once an item has been shipped. You may request a pre-shipping cancellation (see Section 8) if the item has not yet been dispatched.</p>
            <h3 className="font-semibold mt-3 mb-1">9.5 Counterfeit Items</h3>
            <p>If you receive an item you believe to be counterfeit, contact us immediately at support@prelovedkicks.co.uk.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">10. Offers and Negotiations</h2>
            <p>An accepted offer creates a binding obligation for both parties to complete the transaction. Sellers must not accept an offer and then refuse to fulfil it without good reason.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">11. Reviews and Ratings</h2>
            <p>Reviews must be honest and based on genuine transactions. You must not post false, misleading, or defamatory reviews. We reserve the right to remove reviews that violate these terms.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">12. Prohibited Conduct</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use PrelovedKicks for any unlawful purpose</li>
              <li>Harass, abuse, or threaten other users</li>
              <li>Attempt to circumvent our platform by transacting outside of PrelovedKicks</li>
              <li>Post false or misleading listings</li>
              <li>Manipulate reviews or ratings</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">13. Limitation of Liability</h2>
            <p>PrelovedKicks is a marketplace platform. We are not party to transactions between buyers and sellers and are not liable for the quality, safety, or legality of items listed, the accuracy of listings, or loss or damage arising from transactions between users.</p>
            <p className="mt-2">Nothing in these terms limits our liability for death, personal injury caused by our negligence, fraud, or any other liability that cannot be excluded by law.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">14. Governing Law</h2>
            <p>These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">15. Consumer Rights</h2>
            <p>Nothing in these terms affects your statutory rights as a consumer under UK law, including the Consumer Rights Act 2015 and the Consumer Contracts Regulations 2013.</p>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2">16. Contact Us</h2>
            <p>Email: <a href="mailto:support@prelovedkicks.co.uk" className="underline">support@prelovedkicks.co.uk</a></p>
          </div>

        </section>
      </main>
      <MobileTabBar />
    </div>
  );
};

export default Terms;
