import Image from "next/image";

export function BrandLogo() {
  return (
    <Image
      className="brand-mark"
      src="/images/favicon.ico"
      alt=""
      aria-hidden="true"
      width={32}
      height={32}
    />
  );
}
