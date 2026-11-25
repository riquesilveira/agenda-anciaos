import {
  Backpack,
  Baby,
  BookOpen,
  Compass,
  DoorOpen,
  FileText,
  Flame,
  Flower2,
  HandCoins,
  HandHelping,
  HeartHandshake,
  HeartPulse,
  House,
  Megaphone,
  MessageCircleHeart,
  Music,
  Newspaper,
  Shield,
  Speaker,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { normalizarNome } from "@/lib/siglas";

/**
 * Ícone de cada departamento, escolhido pelo nome (ou sigla).
 * Ex: Música → nota musical, Desbravadores → bússola, Diaconato → mão que ajuda.
 */
const REGRAS: [RegExp, LucideIcon][] = [
  [/musica|louvor|\bmus\b|coral/, Music],
  [/sonoplast|som\b|audio|midia/, Speaker],
  [/desbravador|\bdbv\b/, Compass],
  [/aventur|\bave\b/, Backpack],
  [/crianca|infantil|\bmc\b|\bmca\b|adolescent/, Baby],
  [/mulher|\bmm\b/, Flower2],
  [/familia|\bmf\b/, House],
  [/escola sabatina|\bes\b/, BookOpen],
  [/ministerio pessoal|evangelismo|\bmp\b/, MessageCircleHeart],
  [/jove|\bja\b/, Flame],
  [/acao solidaria|\basa\b/, HeartHandshake],
  [/mordomia|\bmor\b/, HandCoins],
  [/comunica|\bcom\b/, Megaphone],
  [/diacon|\bdia\b/, HandHelping],
  [/recep/, DoorOpen],
  [/secretari|\bsec\b/, FileText],
  [/tesour|\btes\b/, Wallet],
  [/saude|\bsau\b/, HeartPulse],
  [/homens|\bmh\b/, Shield],
  [/publica|colport/, Newspaper],
];

export function iconeDoDepartamento(nome: string, sigla?: string | null): LucideIcon {
  const texto = `${normalizarNome(nome)} ${normalizarNome(sigla ?? "")}`;
  return REGRAS.find(([re]) => re.test(texto))?.[1] ?? Users;
}

export function IconeDepartamento({ nome, sigla, size = 15 }: { nome: string; sigla?: string | null; size?: number }) {
  const Icone = iconeDoDepartamento(nome, sigla);
  return <Icone size={size} aria-hidden />;
}
