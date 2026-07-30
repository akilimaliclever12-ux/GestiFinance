import Image from "next/image";

/** Marque GestiEcole/GestiFinance (image du logo). `size` = côté en px. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="GestiFinance"
      width={size}
      height={size}
      className="object-contain"
      priority
    />
  );
}
