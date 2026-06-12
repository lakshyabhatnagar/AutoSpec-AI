import { LegalPage } from "@/components/LegalPage";

const sections = [
  {
    title: "Information We Collect",
    body: "We collect information you provide directly to AutoSpec AI, including account details, support messages, chat prompts, assistant responses, uploaded public vehicle manuals, and related usage metadata.",
  },
  {
    title: "How We Use Your Information",
    items: [
      "Provide authenticated access, chat history, and saved sessions.",
      "Process vehicle questions through retrieval, reranking, and AI response generation.",
      "Ingest public automotive manuals into a shared knowledge base.",
      "Improve reliability, security, debugging, and product performance.",
      "Communicate with you about your account, support requests, and service updates.",
    ],
  },
  {
    title: "Uploaded Manuals",
    body: "Manuals uploaded to AutoSpec AI are treated as public knowledge-base material, not private user-bounded content. Do not upload confidential, proprietary, or personal documents.",
  },
  {
    title: "Data Security",
    body: "We use reasonable technical and organizational safeguards to protect personal information from loss, misuse, unauthorized access, alteration, and disclosure. No internet-connected service can guarantee absolute security.",
  },
  {
    title: "Third-Party Services",
    body: "AutoSpec AI may use AI providers, reranking providers, database services, hosting platforms, analytics, and cloud infrastructure to deliver the service. These providers process data under their own security practices and privacy terms.",
  },
  {
    title: "Your Rights",
    body: "You may request access, correction, deletion, export, or restriction of your personal information where applicable. Some operational records may be retained when required for security, legal, or service-integrity reasons.",
  },
  {
    title: "Contact Us",
    body: "Questions about this Privacy Policy can be sent to lakshyabhatnagar1@gmail.com.",
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      updated="February 2026"
      intro="This Privacy Policy explains how AutoSpec AI collects, uses, stores, and protects information when you use our automotive AI workspace."
      sections={sections}
    />
  );
}
