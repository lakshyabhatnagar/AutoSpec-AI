import {
  AlertTriangle,
  Bug,
  Gauge,
  MessageSquare,
  ShieldCheck,
  Siren,
  Stethoscope,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  section: string;
};

export const mainNavItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Gauge, section: "Main" },
  { href: "/chat", label: "Chat", icon: MessageSquare, section: "Main" },
  { href: "/critical", label: "Critical", icon: AlertTriangle, section: "Main" },
];

export const developerNavItems: NavItem[] = [
  { href: "/debug", label: "Debugger", icon: Bug, section: "Developer" },
];

export const allNavItems = [...mainNavItems, ...developerNavItems];

export const pageMeta: Record<string, { title: string; description: string }> = {
  "/": {
    title: "AutoSpec AI",
    description: "Specify. Validate. Deliver.",
  },
  "/chat": {
    title: "Chat",
    description: "Grounded answers",
  },
  "/critical": {
    title: "Critical",
    description: "Structured answers",
  },
  "/debug": {
    title: "Debugger",
    description: "Inspect retrieval",
  },
  "/maintenance": {
    title: "Critical",
    description: "Maintenance",
  },
  "/warranty": {
    title: "Critical",
    description: "Warranty",
  },
  "/safety": {
    title: "Critical",
    description: "Safety",
  },
  "/emergency": {
    title: "Critical",
    description: "Emergency",
  },
  "/malfunctions": {
    title: "Critical",
    description: "Diagnostics",
  },
};

export type CriticalQueryType = "maintenance" | "warranty" | "safety" | "emergency" | "diagnostics";

export type CriticalQueryConfig = {
  value: CriticalQueryType;
  label: string;
  shortLabel: string;
  hint: string;
  example: string;
  contextHint: string;
  icon: LucideIcon;
  legacyHref: string;
  tone: {
    accent: string;
    soft: string;
    border: string;
    text: string;
    glow: string;
  };
};

export const criticalQueryConfigs: CriticalQueryConfig[] = [
  {
    value: "maintenance",
    label: "Maintenance",
    shortLabel: "Intervals",
    hint: "Schedules and service actions.",
    example: "When should I replace brake fluid?",
    contextHint: "maintenance schedule intervals and actions",
    icon: Wrench,
    legacyHref: "/maintenance",
    tone: {
      accent: "text-emerald-300",
      soft: "bg-emerald-400/10",
      border: "border-emerald-300/25",
      text: "text-emerald-100",
      glow: "shadow-[0_0_34px_rgba(52,211,153,0.20)]",
    },
  },
  {
    value: "warranty",
    label: "Warranty Info",
    shortLabel: "Coverage",
    hint: "Coverage and exclusions.",
    example: "Is my battery replacement covered?",
    contextHint: "warranty conditions exclusions coverages",
    icon: ShieldCheck,
    legacyHref: "/warranty",
    tone: {
      accent: "text-violet-300",
      soft: "bg-violet-400/10",
      border: "border-violet-300/25",
      text: "text-violet-100",
      glow: "shadow-[0_0_34px_rgba(196,181,253,0.20)]",
    },
  },
  {
    value: "safety",
    label: "Safety Alerts",
    shortLabel: "Warnings",
    hint: "Risks and precautions.",
    example: "Can I drive with an ABS warning?",
    contextHint: "safety warnings precautions risks prohibited actions",
    icon: AlertTriangle,
    legacyHref: "/safety",
    tone: {
      accent: "text-red-300",
      soft: "bg-red-500/10",
      border: "border-red-400/35",
      text: "text-red-100",
      glow: "shadow-[0_0_38px_rgba(248,113,113,0.24)]",
    },
  },
  {
    value: "emergency",
    label: "Emergency",
    shortLabel: "Steps",
    hint: "Urgent procedures.",
    example: "My engine is overheating. What should I do?",
    contextHint: "emergency procedure steps what to do",
    icon: Siren,
    legacyHref: "/emergency",
    tone: {
      accent: "text-orange-300",
      soft: "bg-orange-400/10",
      border: "border-orange-300/35",
      text: "text-orange-100",
      glow: "shadow-[0_0_38px_rgba(251,146,60,0.24)]",
    },
  },
  {
    value: "diagnostics",
    label: "Diagnostics",
    shortLabel: "Symptoms",
    hint: "Causes and actions.",
    example: "My car vibrates above 80 km/h.",
    contextHint: "malfunction diagnosis symptoms possible causes actions",
    icon: Stethoscope,
    legacyHref: "/malfunctions",
    tone: {
      accent: "text-cyan-300",
      soft: "bg-cyan-400/10",
      border: "border-cyan-300/25",
      text: "text-cyan-100",
      glow: "shadow-[0_0_34px_rgba(103,232,249,0.20)]",
    },
  },
];

export const criticalQueryConfigByType = Object.fromEntries(
  criticalQueryConfigs.map((config) => [config.value, config])
) as Record<CriticalQueryType, CriticalQueryConfig>;
