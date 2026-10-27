import type { ComponentType, SVGProps } from "react";
import type { BoxIconProps } from "@boxicons/react";
import {
  ArrowLeft, ArrowRight, ArrowUp, Car, Check, ChevronDown, Clock, Envelope, Facebook, Google, Instagram, Location,
  Phone, Search, Star, Whatsapp, X, Youtube,
} from "@boxicons/react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function boxIcon(Icon: ComponentType<BoxIconProps>, pack?: BoxIconProps["pack"]) {
  return function ApexIcon({ size = 16, ...props }: IconProps) {
    return <Icon width={size} height={size} pack={pack} aria-hidden="true" {...props} />;
  };
}

// Keep the existing component names so presentation components retain their behavior.
export const SearchIcon = boxIcon(Search);
export const PhoneIcon = boxIcon(Phone);
export const WhatsAppIcon = boxIcon(Whatsapp, "brands");
export const MailIcon = boxIcon(Envelope);
export const ClockIcon = boxIcon(Clock);
export const PinIcon = boxIcon(Location);
export const CarIcon = boxIcon(Car);
export const ChevronDownIcon = boxIcon(ChevronDown);
export const ArrowRightIcon = boxIcon(ArrowRight);
export const ArrowLeftIcon = boxIcon(ArrowLeft);
export const CheckIcon = boxIcon(Check);
export const FacebookIcon = boxIcon(Facebook, "brands");
export const InstagramIcon = boxIcon(Instagram, "brands");
export const YoutubeIcon = boxIcon(Youtube, "brands");
export const XIcon = boxIcon(X);
export const ArrowUpIcon = boxIcon(ArrowUp);
export const GoogleIcon = boxIcon(Google, "brands");
export const StarFilledIcon = boxIcon(Star, "filled");
