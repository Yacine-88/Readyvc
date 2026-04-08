import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-ink text-white/50 mt-auto">
      <div className="max-w-[var(--container-max)] mx-auto px-6 py-6">
        <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image
              src="/logo-white.png"
              alt="VCReady"
              width={100}
              height={28}
              className="h-6 w-auto opacity-80"
            />
            <p className="text-xs">
              by <span className="text-white/80 font-medium">Yacine CHIKHAR</span>{" "}
              &middot; &copy; {new Date().getFullYear()}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-white text-xs font-semibold hover:text-white/80 transition-colors"
          >
            Open dashboard &rarr;
          </Link>
        </div>
      </div>
    </footer>
  );
}
