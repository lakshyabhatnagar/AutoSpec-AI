import { LegalPage } from "@/components/LegalPage";

const sections = [
  {
    title: "Acceptance of Terms",
    body: "By accessing or using AutoSpec AI, you agree to these Terms of Service and all applicable laws and regulations.",
  },
  {
    title: "Use of Service",
    body: "AutoSpec AI provides AI-assisted automotive retrieval, manual search, critical query workflows, and pipeline inspection tools. Outputs are for reference and validation support, not a replacement for official vehicle documentation or professional service advice.",
  },
  {
    title: "You Agree Not To",
    items: [
      "Use the service for illegal, unsafe, deceptive, or unauthorized purposes.",
      "Upload confidential, private, copyrighted, or non-automotive documents without proper rights.",
      "Rely on AI output as the sole source for safety-critical vehicle decisions.",
      "Attempt to reverse engineer, overload, disrupt, or compromise our systems.",
      "Share account credentials or bypass authentication and access controls.",
    ],
  },
  {
    title: "Content Ownership",
    body: "You retain ownership of content you submit. You grant AutoSpec AI permission to process, store, retrieve, and transform submitted content as needed to provide the service. Uploaded manuals may become part of the shared public knowledge base.",
  },
  {
    title: "Service Availability",
    body: "We aim to provide reliable service but do not guarantee uninterrupted availability. We may modify, suspend, or discontinue features with reasonable notice where practical.",
  },
  {
    title: "Limitation of Liability",
    body: "AutoSpec AI is provided as is without warranties. We are not liable for indirect, incidental, consequential, or safety-related damages arising from use of AI-generated outputs or uploaded content.",
  },
  {
    title: "Contact Information",
    body: "Questions about these Terms can be sent to lakshyabhatnagar1@gmail.com.",
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      updated="February 2026"
      intro="These Terms govern access to AutoSpec AI and the use of its automotive retrieval, AI response, upload, and debugging workflows."
      sections={sections}
    />
  );
}
