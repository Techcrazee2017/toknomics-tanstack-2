import { Lock } from "lucide-react";
import { Link } from "@/lib/router-compat";

const sections = [
  {
    title: "1. Introduction",
    body: 'This Privacy Policy explains how TokNomics ("we", "us", or "our") collects, uses, stores, and protects your information when you use our real-time TikTok live stream gift analytics platform (the "Service"). We are committed to safeguarding your privacy and being transparent about our data practices. By using the Service, you consent to the collection and use of your information as described in this Privacy Policy.',
  },
  {
    title: "2. Information We Collect",
    body: "We collect the following categories of information: (a) Authentication Data — your TikTok user ID, unique handle, display name, and avatar URL, obtained via TikTok OAuth through Supabase Auth when you log in. (b) Transaction Data — gift transaction records derived from public TikTok live stream activity via the Euler Stream WebSocket API, including sender and receiver handles, gift names, repeat counts, and diamond costs. (c) Watchlist Data — TikTok handles you submit for monitoring through the watchlist manager. (d) Usage Data — aggregated, anonymized analytics about how you interact with the Service, such as page views and feature usage.",
  },
  {
    title: "3. How We Use Your Information",
    body: "We use your information to: (a) authenticate your identity and manage your account session; (b) display personalized incoming and outgoing gift transaction feeds; (c) generate leaderboards and aggregate analytics; (d) monitor TikTok handles you add to your watchlist; (e) maintain and improve the Service's performance, reliability, and features; (f) detect, prevent, and address technical issues, fraud, or abuse; and (g) comply with applicable legal obligations.",
  },
  {
    title: "4. TikTok OAuth & Third-Party Data",
    body: "When you authenticate via TikTok OAuth, we receive only the profile details TikTok makes available through its authorization scope — specifically your user ID, handle, display name, and avatar. We do not request access to your TikTok direct messages, contacts, or private content. Gift transaction data is sourced from publicly observable live stream activity through the Euler Stream API. TokNomics is not affiliated with, endorsed by, or sponsored by TikTok or Euler Stream. Your use of TikTok is governed by TikTok's own Privacy Policy and Terms of Service.",
  },
  {
    title: "5. Data Storage & Security",
    body: "Your data is stored in a Supabase PostgreSQL database hosted in a secure cloud environment. Authentication credentials are managed by Supabase Auth using industry-standard token-based session management. We employ Row Level Security (RLS) policies to ensure users can only read and modify their own profile data. The background WebSocket worker uses a service role key restricted to the server environment and never exposed to the client. We do not store payment information, passwords, or sensitive financial data.",
  },
  {
    title: "6. Data Retention",
    body: "Profile data is retained for as long as your account is active. When you revoke TikTok OAuth access or your account is deleted, your profile record is automatically removed via cascading database triggers. Gift transaction records derived from public live stream activity are retained indefinitely for historical analytics purposes, as they represent aggregated public data rather than personal information. Watchlist entries can be removed at any time through the Service interface.",
  },
  {
    title: "7. Data Sharing & Disclosure",
    body: "We do not sell, rent, or trade your personal information. We may share data in the following limited circumstances: (a) with our infrastructure providers (Supabase, hosting) who process data on our behalf under contractual obligations; (b) when required by law, court order, or government regulation; (c) to protect our rights, property, or safety, or that of others; and (d) in connection with a merger, acquisition, or asset sale, subject to confidentiality obligations. Aggregated, anonymized data that cannot identify you may be used for analytics and service improvement.",
  },
  {
    title: "8. Cookies & Local Storage",
    body: "The Service uses browser local storage and session tokens to maintain your authenticated session and preserve user preferences. We do not use third-party advertising cookies or tracking pixels. Supabase Auth uses secure HTTP-only cookies for session management. You can clear local storage and cookies at any time through your browser settings, which will sign you out of the Service.",
  },
  {
    title: "9. Your Privacy Rights",
    body: "Depending on your jurisdiction, you may have the right to: (a) access the personal data we hold about you; (b) request correction of inaccurate data; (c) request deletion of your data, subject to legal retention obligations; (d) object to or restrict certain processing of your data; (e) data portability — receiving your data in a structured, machine-readable format; and (f) withdraw consent to data processing that relies on consent. To exercise these rights, contact us through the in-app support channels.",
  },
  {
    title: "10. Children's Privacy",
    body: "The Service is not directed to individuals under the age of 13 (or the minimum age required by applicable law in your jurisdiction). We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately, and we will take steps to delete such information.",
  },
  {
    title: "11. International Data Transfers",
    body: "Your data may be processed and stored in countries other than your own, including the United States and other regions where our infrastructure providers operate. We take reasonable measures to ensure your data is protected in accordance with this Privacy Policy and applicable data protection laws, including standard contractual clauses and similar safeguards where required.",
  },
  {
    title: "12. Changes to This Privacy Policy",
    body: 'We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. Material changes will be communicated through the Service or by other reasonable means. Your continued use of the Service after changes take effect constitutes acceptance of the revised Privacy Policy. The "Last updated" date below indicates when this Policy was last revised.',
  },
  {
    title: "13. Contact",
    body: "If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, you may contact us through the in-app support channels or by visiting the Service's contact page. We will make reasonable efforts to respond to privacy-related inquiries in a timely manner and in accordance with applicable law.",
  },
];

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <Lock className="h-6 w-6 text-primary" />
            <span className="font-heading text-lg font-bold">TokNomics</span>
          </Link>
          <Link
            to="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-10 text-center">
          <h1 className="mb-3 font-heading text-4xl font-bold tracking-tight">
            <span className="text-gradient">Privacy Policy</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: August 22, 2026
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-2 font-heading text-xl font-semibold text-foreground">
                {section.title}
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-lg border border-border/50 bg-card/60 p-6 text-center backdrop-blur">
          <p className="text-sm text-muted-foreground">
            By using TokNomics, you acknowledge that you have read and
            understood this Privacy Policy and agree to the collection and use
            of your information as described herein.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/terms"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms of Service
            </Link>
            <span className="text-border">·</span>
            <Link
              to="/"
              className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              Return to TokNomics
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
