import type { ComponentType, SVGProps } from "react";
import type { BoxIconProps } from "@boxicons/react";
import {
  ArrowDown, Camera, Motorcycle, Truck, Cookie, Fullscreen, Images, MapIcon, Menu, Pause, Play, RotateCw, SliderAlt, SwapVertical, Undo,
} from "@boxicons/react";
import { CarIcon } from "@/components/icons";

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
const MotorcycleIcon = boxIcon(Motorcycle);
const TruckIcon = boxIcon(Truck);

/** O ícone do tipo de veículo da loja (regra 22 da skill): nunca um carro fixo. */
export function VehicleTypeIcon({ type, ...props }: IconProps & { type?: string }) {
  if (type === "motorcycle") return <MotorcycleIcon {...props} />;
  if (type === "truck") return <TruckIcon {...props} />;
  return <CarIcon {...props} />;
}

export const MenuIcon = boxIcon(Menu);
export const PauseIcon = boxIcon(Pause);
export const PlayIcon = boxIcon(Play);
export const FiltrosIcon = boxIcon(SliderAlt);
export const OrdemIcon = boxIcon(SwapVertical);
export const MapaIcon = boxIcon(MapIcon);
export const CookieIcon = boxIcon(Cookie);
export const TelaCheiaIcon = boxIcon(Fullscreen);
export const FotosIcon = boxIcon(Images);
export const CameraIcon = boxIcon(Camera);
export const VirarIcon = boxIcon(RotateCw);
export const VoltarIcon = boxIcon(Undo);
