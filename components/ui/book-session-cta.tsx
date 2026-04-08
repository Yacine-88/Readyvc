"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { Calendar } from "lucide-react";

const CALENDLY_URL = "https://calendly.com/vcready/30min";

export function BookSessionCTA() {
  const { t } = useI18n();

  return (
    <Card className="bg-accent/5 border-accent/20">
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-accent" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold mb-1">{t("cta.bookSession")}</h3>
            <p className="text-sm text-muted">{t("cta.bookSession.desc")}</p>
          </div>
        </div>
        <Button
          href={CALENDLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          variant="primary"
          size="sm"
          className="shrink-0"
        >
          {t("cta.bookSession")} &rarr;
        </Button>
      </CardContent>
    </Card>
  );
}
