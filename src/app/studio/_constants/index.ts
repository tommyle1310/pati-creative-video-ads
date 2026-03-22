import {
  Database,
  Sparkles,
  Upload,
  Clapperboard,
  Image as ImageIcon,
  Video,
  Play,
} from "lucide-react";

export const STEPS = [
  { label: "Source", icon: Database },
  { label: "Analyze", icon: Sparkles },
  { label: "Product", icon: Upload },
  { label: "Script", icon: Clapperboard },
  { label: "Storyboard", icon: ImageIcon },
  { label: "Generate", icon: Video },
  { label: "Preview", icon: Play },
];

export const VOICES = ["Kore", "Puck", "Charon", "Fenrir", "Zephyr"];

export const MOTIVATORS = [
  { value: "pain-point", label: "Pain Point", desc: "Address a frustration or problem", hook: "Tired of [problem]? / Stop wasting [time/money] on [bad solution]" },
  { value: "aspiration", label: "Pleasure / Aspiration", desc: "Promise a desired outcome", hook: "Imagine waking up to [desired outcome] / Finally feel [desired emotion]" },
  { value: "social-proof", label: "Social Proof", desc: "Leverage others' validation", hook: "[Number] people can't be wrong / Why everyone's switching to [product]" },
  { value: "curiosity", label: "Curiosity", desc: "Create information gap", hook: "The secret [industry] doesn't want you to know / This changes everything about [category]" },
  { value: "urgency", label: "Fear / Urgency", desc: "Drive immediate action", hook: "Last chance to [benefit] / [Time limit] left to get [offer]" },
  { value: "identity", label: "Identity", desc: "Speak to who they are", hook: "For [persona] who [behavior] / Not for everyone. Just for [identity]" },
  { value: "feature-led", label: "Feature-Led", desc: "Highlight specific attributes", hook: "Made for [specific need] / The only [product] with [feature]" },
  { value: "problem-solution", label: "Problem / Solution", desc: "Classic before/after", hook: "Tired of X? Here's how to fix it / Before vs. After" },
  { value: "authority", label: "Authority / Expert", desc: "Leverage credibility", hook: "Doctor-recommended / Expert-approved [product]" },
  { value: "comparison", label: "Comparison", desc: "Position against alternatives", hook: "Why this beats your current solution / [Product] vs. the rest" },
] as const;

export const EMOTIONAL_TONES = [
  { value: "inspirational", label: "Inspirational", desc: "Aspiration, transformation" },
  { value: "relatable", label: "Relatable / Problem-first", desc: "Pain point acknowledgment" },
  { value: "urgent", label: "Urgent / Limited-time", desc: "Promotions, scarcity" },
  { value: "calm", label: "Calm / Reassuring", desc: "Trust-building, premium" },
  { value: "humorous", label: "Humorous / Satirical", desc: "Pattern interrupt, shareability" },
  { value: "educational", label: "Educational", desc: "Complex products, consideration" },
  { value: "emotional", label: "Emotional / Heartfelt", desc: "Gift-giving, meaningful purchases" },
] as const;

export const STORYLINE_TYPES = [
  { value: "founder-story", label: "Founder Origin Story", desc: "Why the brand/product was created" },
  { value: "day-in-the-life", label: "Day-in-the-Life", desc: "Product integrated into daily routine" },
  { value: "problem-solution", label: "Problem / Solution", desc: "Before state → After state" },
  { value: "things-you-didnt-know", label: "Things You Didn't Know", desc: "Educational, surprising facts" },
  { value: "behind-the-scenes", label: "Behind the Scenes", desc: "How it's made, company culture" },
  { value: "testimonial", label: "Testimonial / Review", desc: "Customer sharing experience" },
  { value: "unboxing", label: "Unboxing / First Impression", desc: "Discovery moment" },
] as const;
