import type { ComponentType, SVGProps } from "react";
import type { BoxIconProps } from "@boxicons/react";
import {
  ArrowDown, Camera, Fullscreen, Images, MapIcon, Menu, RotateCw, SliderAlt, SwapVertical, Undo,
} from "@boxicons/react";

/*
 * Ícones do Delta, só Boxicons (regra do usuário). Os que a base já tem vêm de
 * `@/components/icons`; aqui ficam os que o tema acrescenta, no mesmo formato.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function boxIcon(Icon: ComponentType<BoxIconProps>, pack?: BoxIconProps["pack"]) {
  return function DeltaIcon({ size = 16, ...props }: IconProps) {
    return <Icon width={size} height={size} pack={pack} aria-hidden="true" {...props} />;
  };
}

export {
  ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, CarIcon, CheckIcon, ChevronDownIcon, ClockIcon,
  FacebookIcon, GoogleIcon, InstagramIcon, MailIcon, PhoneIcon, PinIcon, SearchIcon, StarFilledIcon, WhatsAppIcon,
  XIcon, YoutubeIcon,
} from "@/components/icons";

export const ArrowDownIcon = boxIcon(ArrowDown);
export const MenuIcon = boxIcon(Menu);
export const FiltrosIcon = boxIcon(SliderAlt);
export const OrdemIcon = boxIcon(SwapVertical);
export const MapaIcon = boxIcon(MapIcon);
export const TelaCheiaIcon = boxIcon(Fullscreen);
export const FotosIcon = boxIcon(Images);
export const CameraIcon = boxIcon(Camera);
export const VirarIcon = boxIcon(RotateCw);
export const VoltarIcon = boxIcon(Undo);
