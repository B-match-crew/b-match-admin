"use client";

import { useEffect } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { fetchAds } from "../api/ad-api";
import { useAdStore } from "../model/ad-store";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { formatDate } from "@/src/shared/lib/format-date";
import { AD_TYPE, DEFAULT_PAGE_SIZE } from "@/src/shared/config/constants";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

export function BannerAdTable() {
  const supabase = useSupabase();
  const { ads, total, page, isLoading, setAds, setPage, setIsLoading } =
    useAdStore();

  const totalPages = Math.ceil(total / DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setIsLoading(true);
    fetchAds(supabase, {
      type: AD_TYPE.BANNER,
      page,
      limit: DEFAULT_PAGE_SIZE,
    })
      .then(({ data, total }) => setAds(data, total))
      .finally(() => setIsLoading(false));
  }, [supabase, page, setAds, setIsLoading]);

  if (isLoading) return <LoadingSpinner />;

  if (ads.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState description="등록된 배너 광고가 없습니다" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>광고주</TableHead>
              <TableHead>이미지</TableHead>
              <TableHead>랜딩 URL</TableHead>
              <TableHead>노출 순서</TableHead>
              <TableHead>기간</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ads.map((ad) => (
              <TableRow key={ad.id}>
                <TableCell className="font-medium">
                  {ad.advertiser_id}
                </TableCell>
                <TableCell>
                  {ad.image_url ? (
                    <img
                      src={ad.image_url}
                      alt="광고 이미지"
                      className="h-10 w-20 rounded object-cover"
                    />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {ad.landing_url ? (
                    <a
                      href={ad.landing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      링크
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>{ad.display_order}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(ad.start_date)} ~ {formatDate(ad.end_date)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={ad.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
