import { LegalPage } from "@/components/LegalPage";

const sections = [
  {
    title: "What Are Cookies",
    body: "Cookies and similar browser storage technologies help websites remember sessions, preferences, and security state. AutoSpec AI uses minimal storage needed for a functional authenticated experience.",
  },
  {
    title: "How We Use Browser Storage",
    items: [
      "Keep you signed in to your AutoSpec AI account.",
      "Maintain session state for protected product routes.",
      "Remember basic interface preferences where implemented.",
      "Support reliability, abuse prevention, and service security.",
    ],
  },
  {
    title: "Types We Use",
    items: [
      "Essential storage required for authentication and core app behavior.",
      "Functional storage for preferences and product state.",
      "Analytics storage may be used in the future to understand product performance and improve the service.",
    ],
  },
  {
    title: "Managing Cookies",
    body: "You can control cookies and local storage through your browser settings. Disabling essential storage may prevent login, chat history, and protected pages from working correctly.",
  },
  {
    title: "Third-Party Cookies",
    body: "Some infrastructure, AI, analytics, or hosting providers may use their own cookies or similar technologies. Their usage is governed by their respective policies.",
  },
  {
    title: "Contact Us",
    body: "Questions about this Cookie Policy can be sent to lakshyabhatnagar1@gmail.com.",
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      eyebrow="Cookies"
      title="Cookie Policy"
      updated="February 2026"
      intro="This Cookie Policy explains how AutoSpec AI uses cookies and browser storage for authentication, product functionality, and service quality."
      sections={sections}
    />
  );
}
