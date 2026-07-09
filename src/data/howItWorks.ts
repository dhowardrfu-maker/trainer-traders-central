import { Camera, MessageCircle, Package, Star, type LucideIcon } from "lucide-react";

export interface HowItWorksStep {
  icon: LucideIcon;
  title: string;
  body: string;
}

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  { icon: Camera, title: "List in minutes", body: "Snap a few photos, set your price, and post your trainers. Our AI checks photos automatically." },
  { icon: MessageCircle, title: "Chat & negotiate", body: "Buyers can message you in real time and send offers. Accept, reject, or counter - it's up to you." },
  { icon: Package, title: "Ship safely", body: "Evri Standard Delivery at checkout. Print your label at home and drop off at any Evri ParcelShop." },
  { icon: Star, title: "Earn your reputation", body: "Once an order is confirmed, the buyer can leave a verified review on your profile." },
];