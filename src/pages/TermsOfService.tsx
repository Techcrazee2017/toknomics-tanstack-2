import { ShieldCheck } from "lucide-react";
import { Link } from "@/lib/router-compat";

const sections = [
  {
    title: "1. Acceptance of Terms",
    body: 'By accessing or using TokNomics (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service. These Terms apply to all visitors, registered users, and authenticated accounts.',
  },
  {
    title: "2. Description of Service",
    body: "TokNomics is a real-time analytics platform that tracks TikTok live stream gift transactions. The Service aggregates publicly available gift data via the Euler Stream WebSocket API, stores transaction records, and presents them through an interactive dashboard including incoming/outgoing feeds, leaderboards, and watchlist monitoring.",
  },
  {
    title: "3. Account Registration & Authentication",
    body: "Access to the Service requires authentication via TikTok OAuth through Supabase Auth. You are responsible for maintaining the security of your TikTok account and for all activities that occur under your account. You agree to provide accurate and current information during the authentication process and to update your profile details as needed.",
  },
  {
    title: "4. Permitted Use",
    body: "You may use the Service to monitor gift transaction activity for handles you own or have permission to track. You may submit arbitrary TikTok handles to the watchlist for monitoring purposes. You agree not to use the Service for any unlawful purpose, to violate any applicable law, or to infringe upon the rights of any third party.",
  },
  {
    title: "5. Prohibited Conduct",
    body: "You agree not to: (a) attempt to access data or accounts that do not belong to you; (b) use the Service to harass, stalk, or monitor individuals without consent; (c) reverse engineer, decompile, or disassemble any part of the Service; (d) introduce malware or malicious code; (e) attempt to overload, crash, or disrupt the Service; or (f) use automated scripts or bots to scrape data at a rate that degrades Service performance.",
  },
  {
    title: "6. Data Ownership & Privacy",
    body: "You retain ownership of your profile data (display name, handle, avatar). Gift transaction data is derived from public TikTok live stream activity and is stored for analytical purposes. TokNomics does not claim ownership of TikTok-derived data. Your use of the Service is also governed by our Privacy Policy, which is incorporated herein by reference.",
  },
  {
    title: "7. Third-Party Services",
    body: "The Service integrates with TikTok and the Euler Stream API. TokNomics is not affiliated with, endorsed by, or sponsored by TikTok or Euler Stream. We are not responsible for the availability, accuracy, or reliability of third-party data. Your use of TikTok is subject to TikTok's own Terms of Service and Community Guidelines.",
  },
  {
    title: "8. Service Availability",
    body: 'The Service is provided on an "as-is" and "as-available" basis. We do not guarantee uninterrupted or error-free operation. Maintenance, updates, and outages may occur without prior notice. We are not liable for any downtime, data loss, or interruption of service resulting from third-party API failures, network issues, or scheduled maintenance.',
  },
  {
    title: "9. Disclaimers",
    body: "The Service is provided without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the data displayed is accurate, complete, or current. All gift transaction figures are derived from third-party feeds and may contain errors or omissions.",
  },
  {
    title: "10. Limitation of Liability",
    body: "To the maximum extent permitted by law, TokNomics and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service. Our total aggregate liability for any claim arising from these Terms shall not exceed the amount you paid for the Service in the preceding twelve months (which, for free-tier users, is zero).",
  },
  {
    title: "11. Indemnification",
    body: "You agree to indemnify and hold harmless TokNomics and its affiliates from any claims, damages, losses, or expenses (including reasonable attorneys' fees) arising from your use of the Service, your violation of these Terms, or your infringement of any third-party rights.",
  },
  {
    title: "12. Account Termination",
    body: "You may terminate your account at any time by signing out and revoking TikTok OAuth access. We reserve the right to suspend or terminate access to the Service at our sole discretion, without notice, if we believe you have violated these Terms or engaged in conduct harmful to the Service or other users.",
  },
  {
    title: "13. Changes to These Terms",
    body: 'We may update these Terms from time to time. Material changes will be communicated through the Service or by other reasonable means. Your continued use of the Service after changes take effect constitutes acceptance of the revised Terms. The "Last updated" date below indicates when these Terms were last revised.',
  },
  {
    title: "14. Governing Law",
    body: "These Terms shall be governed by and construed in accordance with applicable law, without regard to conflict-of-law principles. Any disputes arising from these Terms or your use of the Service shall be resolved through binding arbitration or in a court of competent jurisdiction as determined by applicable law.",
  },
  {
    title: "15. Contact",
    body: "If you have questions about these Terms of Service, you may contact us through the in-app support channels or by visiting the Service's contact page. We will make reasonable efforts to respond to inquiries in a timely manner.",
  },
];

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-primary" />
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
            <span className="text-gradient">Terms of Service</span>
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
            By using TokNomics, you acknowledge that you have read, understood,
            and agree to be bound by these Terms of Service.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/privacy"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy Policy
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

export default TermsOfService;
