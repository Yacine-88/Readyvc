"use client";

import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();
  
  return (
    <footer className="bg-ink text-white/50 mt-auto">
      <div className="max-w-[var(--container-max)] mx-auto px-6 py-6">
        <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image
              src="/logo-white.png"
              alt="VCReady"
              width={100}
              height={20}
              className="h-5 w-auto opacity-80"
            />
            <p className="text-xs">
              {t("footer.by")} <span className="text-white/80 font-medium">Yacine CHIKHAR</span>{" "}
              &middot; &copy; {new Date().getFullYear()}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-white text-xs font-semibold hover:text-white/80 transition-colors"
          >
            {t("nav.dashboard")} &rarr;
          </Link>
        </div>
      </div>
    </footer>
  );
}
