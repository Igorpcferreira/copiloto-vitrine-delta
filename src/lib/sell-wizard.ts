"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { submitSellRequest, uploadSellPhotos } from "@/lib/actions";
import { maskPhoneBR, unmaskPhone } from "@/lib/format";
import type { VitrineSections } from "@/lib/types";

export const SELL_STEPS = ["Contato", "Negócio", "Veículo", "Fotos"] as const;

const PHOTO_MAX_SIDE = 1920;
const PHOTO_QUALITY = 0.82;

export type SellFailure = "photos" | "request";

async function compressPhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", PHOTO_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export interface SellMode {
  id: string;
  flag: keyof VitrineSections;
  title: string;
  body: string;
}

export const SELL_MODES: SellMode[] = [
  {
    id: "venda",
    flag: "modalidadeVendaNaHora",
    title: "Vender Direto",
    body: "Envie os dados do veículo para conversar sobre venda direta",
  },
  {
    id: "troca",
    flag: "modalidadeTroca",
    title: "Trocar",
    body: "Converse com a loja sobre usar seu veículo em uma troca",
  },
  {
    id: "consignacao",
    flag: "modalidadeConsignacao",
    title: "Consignar",
    body: "Converse com a loja sobre a opção de consignação",
  },
];

export const SELL_VEHICLE_TYPES = [
  { value: "car", label: "Carro", modelPlaceholder: "Ex: Civic EXL" },
  { value: "motorcycle", label: "Moto", modelPlaceholder: "Ex: CG 160 Titan" },
  { value: "truck", label: "Caminhão", modelPlaceholder: "Ex: Constellation 24.280" },
] as const;

export interface SellFormState {
  vehicleType: string;
  name: string;
  phone: string;
  email: string;
  mode: string;
  brand: string;
  model: string;
  year: string;
  transmission: string;
  fuel: string;
  km: string;
  color: string;
  desiredPrice: string;
  description: string;
}

export interface SellPhoto {
  file: File;
  preview: string;
}

export function useSellWizard(sections: VitrineSections, defaultVehicleType = "car") {
  const modes = SELL_MODES.filter((m) => sections[m.flag]);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SellFormState>({
    vehicleType: defaultVehicleType,
    name: "",
    phone: "",
    email: "",
    mode: modes[0]?.id ?? "",
    brand: "",
    model: "",
    year: "",
    transmission: "",
    fuel: "",
    km: "",
    color: "",
    desiredPrice: "",
    description: "",
  });
  const [photos, setPhotos] = useState<SellPhoto[]>([]);
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState<SellFailure | null>(null);
  const photosRef = useRef(photos);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview)), []);

  const setValue = (key: keyof SellFormState, value: string) =>
    setForm((f) => ({
      ...f,
      [key]: key === "phone" ? maskPhoneBR(value) : value,
    }));

  const set =
    (k: keyof SellFormState) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setValue(k, e.target.value);

  const setMode = (mode: string) => setForm((f) => ({ ...f, mode }));

  const mode = modes.some((item) => item.id === form.mode)
    ? form.mode
    : (modes[0]?.id ?? "");

  const stepValid =
    modes.length > 0 &&
    [
      form.name.trim() !== "" &&
        unmaskPhone(form.phone).length >= 10 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()),
      modes.some((item) => item.id === mode),
      form.brand.trim() !== "" &&
        form.model.trim() !== "" &&
        form.year.trim() !== "" &&
        form.transmission.trim() !== "" &&
        form.fuel.trim() !== "" &&
        form.km.trim() !== "" &&
        form.color.trim() !== "" &&
        form.description.trim() !== "",
      true,
    ][step];

  const [photoWarning, setPhotoWarning] = useState<string | null>(null);

  const addPhotos = (files: FileList | File[]) => {
    const all = Array.from(files);
    const valid = all.filter(
      (f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024,
    );
    const list = valid.slice(0, 8 - photos.length);
    const rejected = all.length - valid.length;
    const overflow = valid.length - list.length;
    if (rejected > 0 || overflow > 0) {
      const parts: string[] = [];
      if (rejected > 0)
        parts.push(
          `${rejected} arquivo${rejected > 1 ? "s" : ""} ignorado${rejected > 1 ? "s" : ""} (apenas imagens de até 10MB)`,
        );
      if (overflow > 0) parts.push(`limite de 8 fotos atingido`);
      setPhotoWarning(parts.join("; "));
    } else {
      setPhotoWarning(null);
    }
    setPhotos((p) => [
      ...p,
      ...list.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
  };

  const removePhoto = (i: number) => {
    setPhotoWarning(null);
    setPhotos((p) => {
      URL.revokeObjectURL(p[i]?.preview);
      return p.filter((_, j) => j !== i);
    });
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const next = () => {
    if (!stepValid || pending) return;
    if (step < SELL_STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    setFailure(null);
    startTransition(async () => {
      try {
        const photoUrls: string[] = [];
        for (const photo of photos) {
          const formData = new FormData();
          formData.append("files", await compressPhoto(photo.file));
          const upload = await uploadSellPhotos(formData);
          if (!upload.ok) {
            setFailure("photos");
            return;
          }
          photoUrls.push(...upload.urls);
        }
        const res = await submitSellRequest({
          ...form,
          mode,
          phone: unmaskPhone(form.phone),
          desiredPrice: form.desiredPrice || undefined,
          photoUrls,
        });
        setSent(res.ok);
        setFailure(res.ok ? null : "request");
      } catch {
        setFailure("request");
      }
    });
  };

  const reset = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    setPhotoWarning(null);
    setForm((f) => ({
      ...f,
      brand: "",
      model: "",
      year: "",
      transmission: "",
      fuel: "",
      km: "",
      color: "",
      desiredPrice: "",
      description: "",
    }));
    setSent(false);
    setFailure(null);
    setStep(2);
  };

  return {
    modes,
    step,
    form: { ...form, mode },
    photos,
    pending,
    sent,
    failure,
    stepValid,
    set,
    setMode,
    setValue,
    addPhotos,
    photoWarning,
    removePhoto,
    back,
    next,
    reset,
  };
}
